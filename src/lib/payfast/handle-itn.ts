// Processes one PayFast notification. Dependencies are passed in so the
// whole flow (verify -> record -> email) is unit-tested without network.

import { verifyItn, type ItnChecks, type PayFastConfig, type VerifiedItn } from "./payfast";

export type ApplyResult = { result: "paid" | "recorded" | "problem"; invoiceNumber?: number; error?: string };

export type ItnDeps = {
  config: PayFastConfig;
  checks: ItnChecks;
  apply: (itn: VerifiedItn) => Promise<ApplyResult>;
  onPaid: (orderId: string) => Promise<void>;
  log: (message: string) => void;
};

export async function handleItn(body: string, sourceIp: string | null, deps: ItnDeps): Promise<{ status: number; message: string }> {
  const verified = await verifyItn(body, sourceIp, deps.config, deps.checks);
  if (!verified.ok) {
    deps.log(`PayFast ITN rejected: ${verified.reason}`);
    return { status: 400, message: "rejected" };
  }
  const { itn } = verified;
  let applied: ApplyResult;
  try {
    applied = await deps.apply(itn);
  } catch (e) {
    // Unknown order or database error: a non-200 makes PayFast retry later.
    deps.log(`PayFast ITN for ${itn.orderId} not applied: ${(e as Error).message}`);
    return { status: 500, message: "not applied" };
  }
  if (applied.result === "problem") deps.log(`PayFast payment ${itn.pfPaymentId} needs attention: ${applied.error}`);
  if (applied.result === "paid") {
    try {
      await deps.onPaid(itn.orderId);
    } catch (e) {
      deps.log(`Payment confirmation email failed for ${itn.orderId}: ${(e as Error).message}`);
    }
  }
  return { status: 200, message: applied.result };
}
