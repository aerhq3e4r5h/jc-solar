import { describe, expect, it, vi } from "vitest";
import { buildPaymentFields, formatAmount, payfastCell, phpUrlEncode, signature, verifyItn, type Field, type PayFastConfig } from "./payfast";

// PayFast's public sandbox merchant (from their developer docs).
const sandbox: PayFastConfig = { merchantId: "10000100", merchantKey: "46f0cd694581a", passphrase: "jt7NOE43FZPn", sandbox: true };

// Expected signatures were computed independently with Python's
// urllib.parse.quote_plus (same rules as PHP urlencode) and hashlib.md5.
const REQUEST_FIELDS: Field[] = [
  ["merchant_id", "10000100"],
  ["merchant_key", "46f0cd694581a"],
  ["return_url", "https://jcsolar.example/order/abc?paid=1"],
  ["cancel_url", "https://jcsolar.example/order/abc"],
  ["notify_url", "https://jcsolar.example/api/payfast/itn"],
  ["name_first", "Thandi"],
  ["name_last", "O'Neil (Pty)"],
  ["email_address", "thandi+solar@example.com"],
  ["cell_number", "0821234567"],
  ["m_payment_id", "8a0e5b2c-1111-4222-8333-444455556666"],
  ["amount", "27662.20"],
  ["item_name", "JC Solar order JC-100001"],
  ["item_description", ""],
];

const ITN_FIELDS: Field[] = [
  ["m_payment_id", "8a0e5b2c-1111-4222-8333-444455556666"],
  ["pf_payment_id", "1089250"],
  ["payment_status", "COMPLETE"],
  ["item_name", "JC Solar order JC-100001"],
  ["item_description", ""],
  ["amount_gross", "27662.20"],
  ["amount_fee", "-636.23"],
  ["amount_net", "27025.97"],
  ["custom_str1", ""],
  ["name_first", "Thandi"],
  ["name_last", "O'Neil (Pty)"],
  ["email_address", "thandi+solar@example.com"],
  ["merchant_id", "10000100"],
];
const ITN_SIGNATURE = "8182c3485902c097df9351b829ed6517";

function itnBody(fields: Field[], sig: string) {
  // Encoded the way PayFast posts it (form encoding).
  return new URLSearchParams([...fields, ["signature", sig]]).toString();
}

describe("encoding and signatures", () => {
  it("encodes like PHP urlencode", () => {
    expect(phpUrlEncode("O'Neil (Pty)")).toBe("O%27Neil+%28Pty%29");
    expect(phpUrlEncode("a+b@c.co")).toBe("a%2Bb%40c.co");
    expect(phpUrlEncode("100% ~*!")).toBe("100%25+%7E%2A%21");
  });
  it("matches the reference signature for a payment request (empty fields skipped)", () => {
    expect(signature(REQUEST_FIELDS, "jt7NOE43FZPn", { skipEmpty: true })).toBe("a5a3ef68e670ee6f76f553fb95fe2c93");
  });
  it("matches the reference signature for a notification (empty fields kept)", () => {
    expect(signature(ITN_FIELDS, "jt7NOE43FZPn", { skipEmpty: false })).toBe(ITN_SIGNATURE);
  });
});

describe("buildPaymentFields", () => {
  it("builds the documented field order with a valid signature", () => {
    const { action, fields } = buildPaymentFields(
      {
        orderId: "8a0e5b2c-1111-4222-8333-444455556666",
        orderNumber: "JC-100001",
        amount: 27662.2,
        firstName: "Thandi",
        lastName: "O'Neil (Pty)",
        email: "thandi+solar@example.com",
        phone: "+27 82 123 4567",
        returnUrl: "https://jcsolar.example/order/abc?paid=1",
        cancelUrl: "https://jcsolar.example/order/abc",
        notifyUrl: "https://jcsolar.example/api/payfast/itn",
      },
      sandbox,
    );
    expect(action).toBe("https://sandbox.payfast.co.za/eng/process");
    expect(fields.map(([k]) => k)).toEqual([
      "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url", "name_first", "name_last",
      "email_address", "cell_number", "m_payment_id", "amount", "item_name", "signature",
    ]);
    // Same values as the reference request, so the same signature.
    expect(fields.at(-1)).toEqual(["signature", "a5a3ef68e670ee6f76f553fb95fe2c93"]);
  });
  it("formats amounts and phone numbers for PayFast", () => {
    expect(formatAmount(1234.5)).toBe("1234.50");
    expect(formatAmount(0.1 + 0.2)).toBe("0.30");
    expect(payfastCell("+27 82 123 4567")).toBe("0821234567");
    expect(payfastCell("011 123 4567")).toBeNull(); // landline: left out
  });
});

describe("verifyItn", () => {
  const checks = (ips = ["197.97.145.144"], confirmed = true) => ({
    resolvePayfastIps: vi.fn(async () => ips),
    confirmWithPayfast: vi.fn(async () => confirmed),
  });

  it("accepts a genuine notification and passes the exact string to PayFast for confirmation", async () => {
    const c = checks();
    const r = await verifyItn(itnBody(ITN_FIELDS, ITN_SIGNATURE), "197.97.145.144", sandbox, c);
    expect(r).toMatchObject({ ok: true, itn: { orderId: "8a0e5b2c-1111-4222-8333-444455556666", pfPaymentId: "1089250", paymentStatus: "COMPLETE", amountGross: 27662.2 } });
    expect(c.confirmWithPayfast).toHaveBeenCalledWith("sandbox.payfast.co.za", expect.stringContaining("name_last=O%27Neil+%28Pty%29"));
  });
  it("rejects a tampered amount", async () => {
    const tampered = ITN_FIELDS.map(([k, v]) => [k, k === "amount_gross" ? "1.00" : v] as Field);
    expect(await verifyItn(itnBody(tampered, ITN_SIGNATURE), "197.97.145.144", sandbox, checks())).toEqual({ ok: false, reason: "bad signature" });
  });
  it("rejects notifications from other addresses or that PayFast does not confirm", async () => {
    expect((await verifyItn(itnBody(ITN_FIELDS, ITN_SIGNATURE), "203.0.113.9", sandbox, checks())).ok).toBe(false);
    expect((await verifyItn(itnBody(ITN_FIELDS, ITN_SIGNATURE), "197.97.145.144", sandbox, checks(undefined, false))).ok).toBe(false);
  });
  it("rejects a signature made without the passphrase", async () => {
    const noPass = signature(ITN_FIELDS, null, { skipEmpty: false });
    expect((await verifyItn(itnBody(ITN_FIELDS, noPass), "197.97.145.144", sandbox, checks())).ok).toBe(false);
  });
});
