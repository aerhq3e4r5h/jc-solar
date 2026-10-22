// PayFast once-off payments: building the signed payment form and verifying
// payment notifications (ITN). Pure functions with injectable network
// checks so every rule is unit-tested.
//
// Reference: https://developers.payfast.co.za/docs (custom integration).

import { createHash } from "node:crypto";

export const PAYFAST_HOSTS = {
  sandbox: "sandbox.payfast.co.za",
  live: "www.payfast.co.za",
} as const;

/** Hosts PayFast sends notifications from; their IPs are resolved at check time. */
export const PAYFAST_NOTIFY_HOSTS = ["www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"];

/**
 * PHP urlencode(), which PayFast's servers use to build the signature
 * string: everything except letters, digits and "-_." is %XX-encoded, and
 * spaces become "+". encodeURIComponent alone leaves !'()*~ unencoded,
 * which would break signatures for names like "O'Neil (Pty)".
 */
export function phpUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, "+");
}

export type Field = [name: string, value: string];

/** "key=value&..." in the given order, values trimmed and encoded. */
export function paramString(fields: Field[], { skipEmpty }: { skipEmpty: boolean }): string {
  return fields
    .filter(([, v]) => !skipEmpty || v.trim() !== "")
    .map(([k, v]) => `${k}=${phpUrlEncode(v.trim())}`)
    .join("&");
}

export function signature(fields: Field[], passphrase: string | null, opts: { skipEmpty: boolean }): string {
  let s = paramString(fields, opts);
  if (passphrase) s += `&passphrase=${phpUrlEncode(passphrase.trim())}`;
  return createHash("md5").update(s).digest("hex");
}

export type PayFastConfig = {
  merchantId: string;
  merchantKey: string;
  passphrase: string | null;
  sandbox: boolean;
};

export type PaymentRequest = {
  orderId: string;
  orderNumber: string;
  amount: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
};

/** Amount as PayFast expects: rand with two decimals, no thousands separator. */
export function formatAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

/** SA cell number as 10 digits starting with 0, or null if it isn't one. */
export function payfastCell(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (/^0[6-8]\d{8}$/.test(digits)) return digits;
  if (/^27[6-8]\d{8}$/.test(digits)) return `0${digits.slice(2)}`;
  return null;
}

/**
 * The fields for the payment form, in the order PayFast documents (the
 * signature depends on the order). Empty fields are left out.
 */
export function buildPaymentFields(req: PaymentRequest, config: PayFastConfig): { action: string; fields: Field[] } {
  const fields: Field[] = (
    [
      ["merchant_id", config.merchantId],
      ["merchant_key", config.merchantKey],
      ["return_url", req.returnUrl],
      ["cancel_url", req.cancelUrl],
      ["notify_url", req.notifyUrl],
      ["name_first", req.firstName.slice(0, 100)],
      ["name_last", req.lastName.slice(0, 100)],
      ["email_address", req.email.slice(0, 100)],
      ["cell_number", payfastCell(req.phone) ?? ""],
      ["m_payment_id", req.orderId],
      ["amount", formatAmount(req.amount)],
      // Kept plain so it reads well on the PayFast page and bank statement.
      ["item_name", `JC Solar order ${req.orderNumber}`],
    ] satisfies Field[]
  ).filter(([, v]) => v.trim() !== "");
  fields.push(["signature", signature(fields, config.passphrase, { skipEmpty: true })]);
  const host = config.sandbox ? PAYFAST_HOSTS.sandbox : PAYFAST_HOSTS.live;
  return { action: `https://${host}/eng/process`, fields };
}

// --- Notifications (ITN) ------------------------------------------------

/** Parses the form-encoded ITN body, keeping PayFast's field order. */
export function parseItn(body: string): Field[] {
  return [...new URLSearchParams(body).entries()];
}

export type ItnChecks = {
  /** IP addresses the PayFast hosts currently resolve to. */
  resolvePayfastIps: () => Promise<string[]>;
  /** POSTs the parameter string to PayFast's validate endpoint; true if it answers "VALID". */
  confirmWithPayfast: (host: string, paramString: string) => Promise<boolean>;
};

export type VerifiedItn = {
  orderId: string;
  pfPaymentId: string;
  paymentStatus: string;
  amountGross: number;
  method: string | null;
  raw: Record<string, string>;
};

export type ItnResult = { ok: true; itn: VerifiedItn } | { ok: false; reason: string };

/**
 * Runs PayFast's security checks on a notification: signature, source
 * address and PayFast's own confirmation. (The amount is checked against
 * the order in the database, which is the only reliable source of it.)
 */
export async function verifyItn(body: string, sourceIp: string | null, config: PayFastConfig, checks: ItnChecks): Promise<ItnResult> {
  const fields = parseItn(body);
  const data = Object.fromEntries(fields);
  const unsigned = fields.filter(([k]) => k !== "signature");

  const expected = signature(unsigned, config.passphrase, { skipEmpty: false });
  if (!data.signature || data.signature !== expected) return { ok: false, reason: "bad signature" };
  if (data.merchant_id !== config.merchantId) return { ok: false, reason: "wrong merchant" };

  const ips = await checks.resolvePayfastIps();
  if (!sourceIp || !ips.includes(sourceIp)) return { ok: false, reason: `source ${sourceIp ?? "unknown"} is not PayFast` };

  const host = config.sandbox ? PAYFAST_HOSTS.sandbox : PAYFAST_HOSTS.live;
  if (!(await checks.confirmWithPayfast(host, paramString(unsigned, { skipEmpty: false })))) {
    return { ok: false, reason: "PayFast did not confirm the notification" };
  }

  const amountGross = Number(data.amount_gross);
  if (!data.m_payment_id || !data.pf_payment_id || !Number.isFinite(amountGross)) {
    return { ok: false, reason: "missing fields" };
  }
  return {
    ok: true,
    itn: {
      orderId: data.m_payment_id,
      pfPaymentId: data.pf_payment_id,
      paymentStatus: data.payment_status ?? "",
      amountGross,
      method: data.payment_method ?? null,
      raw: data,
    },
  };
}
