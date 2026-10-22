import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

/** Secrets for server code only (route handlers, server actions). */
export function serverEnv() {
  return serverSchema.parse({ SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY });
}

export function isServiceRoleConfigured(): boolean {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length >= 20;
}

// PayFast's public test merchant from their developer docs. Used only in
// sandbox mode when no merchant details are set.
const PAYFAST_SANDBOX_DEFAULTS = { merchantId: "10000100", merchantKey: "46f0cd694581a", passphrase: "jt7NOE43FZPn" };

export function payfastConfig() {
  const sandbox = (process.env.PAYFAST_SANDBOX ?? "true").toLowerCase() !== "false";
  const merchantId = process.env.PAYFAST_MERCHANT_ID || (sandbox ? PAYFAST_SANDBOX_DEFAULTS.merchantId : "");
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY || (sandbox ? PAYFAST_SANDBOX_DEFAULTS.merchantKey : "");
  const passphrase = process.env.PAYFAST_PASSPHRASE || (sandbox && !process.env.PAYFAST_MERCHANT_ID ? PAYFAST_SANDBOX_DEFAULTS.passphrase : null);
  if (!merchantId || !merchantKey) throw new Error("PayFast live mode needs PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY");
  if (!sandbox && !passphrase) throw new Error("PayFast live mode needs PAYFAST_PASSPHRASE");
  return { merchantId, merchantKey, passphrase, sandbox };
}

/** Bank details printed on quotes and EFT orders. Blank until the business supplies them. */
export function eftDetails() {
  const d = {
    bank: process.env.EFT_BANK_NAME ?? "",
    accountName: process.env.EFT_ACCOUNT_NAME ?? "",
    accountNumber: process.env.EFT_ACCOUNT_NUMBER ?? "",
    branchCode: process.env.EFT_BRANCH_CODE ?? "",
    accountType: process.env.EFT_ACCOUNT_TYPE ?? "",
  };
  return d.bank && d.accountNumber ? d : null;
}
