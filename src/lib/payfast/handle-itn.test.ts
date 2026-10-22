import { describe, expect, it, vi } from "vitest";
import { handleItn, type ItnDeps } from "./handle-itn";
import { signature, type Field } from "./payfast";

const config = { merchantId: "10000100", merchantKey: "46f0cd694581a", passphrase: "jt7NOE43FZPn", sandbox: true };
const fields: Field[] = [
  ["m_payment_id", "8a0e5b2c-1111-4222-8333-444455556666"],
  ["pf_payment_id", "1089250"],
  ["payment_status", "COMPLETE"],
  ["item_name", "JC Solar order JC-100001"],
  ["amount_gross", "27662.20"],
  ["merchant_id", "10000100"],
];
const body = new URLSearchParams([...fields, ["signature", signature(fields, config.passphrase, { skipEmpty: false })]]).toString();

function deps(over: Partial<ItnDeps> = {}): ItnDeps {
  return {
    config,
    checks: { resolvePayfastIps: async () => ["197.97.145.144"], confirmWithPayfast: async () => true },
    apply: vi.fn(async () => ({ result: "paid" as const, invoiceNumber: 1 })),
    onPaid: vi.fn(async () => {}),
    log: vi.fn(),
    ...over,
  };
}

describe("handleItn", () => {
  it("records a verified payment and sends the confirmation", async () => {
    const d = deps();
    expect(await handleItn(body, "197.97.145.144", d)).toEqual({ status: 200, message: "paid" });
    expect(d.apply).toHaveBeenCalledWith(expect.objectContaining({ orderId: "8a0e5b2c-1111-4222-8333-444455556666", amountGross: 27662.2 }));
    expect(d.onPaid).toHaveBeenCalledWith("8a0e5b2c-1111-4222-8333-444455556666");
  });

  it("never touches the database for an unverified notification", async () => {
    const d = deps();
    expect((await handleItn(body.replace("27662.20", "1.00"), "197.97.145.144", d)).status).toBe(400);
    expect((await handleItn(body, "10.0.0.1", d)).status).toBe(400);
    expect(d.apply).not.toHaveBeenCalled();
  });

  it("asks PayFast to retry when the database is unavailable", async () => {
    const d = deps({ apply: vi.fn(async () => Promise.reject(new Error("timeout"))) });
    expect((await handleItn(body, "197.97.145.144", d)).status).toBe(500);
    expect(d.onPaid).not.toHaveBeenCalled();
  });

  it("does not email for a problem payment, but logs it", async () => {
    const d = deps({ apply: vi.fn(async () => ({ result: "problem" as const, error: "payment_amount_mismatch" })) });
    expect(await handleItn(body, "197.97.145.144", d)).toEqual({ status: 200, message: "problem" });
    expect(d.onPaid).not.toHaveBeenCalled();
    expect(d.log).toHaveBeenCalledWith(expect.stringContaining("payment_amount_mismatch"));
  });

  it("still acknowledges the payment if the email fails", async () => {
    const d = deps({ onPaid: vi.fn(async () => Promise.reject(new Error("smtp down"))) });
    expect((await handleItn(body, "197.97.145.144", d)).status).toBe(200);
  });
});
