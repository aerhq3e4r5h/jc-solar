import type { NextRequest } from "next/server";
import { paymentReceivedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/env";
import { payfastConfig } from "@/lib/env.server";
import { loadOrderInternal } from "@/lib/orders/orders";
import { handleItn, type ApplyResult } from "@/lib/payfast/handle-itn";
import { payfastNetworkChecks, requestIp } from "@/lib/payfast/server";
import { renderOrderPdf } from "@/lib/pdf/render";
import { createAdminClient } from "@/lib/supabase/admin";

// PayFast's Instant Transaction Notification. This, not the browser
// returning from PayFast, is what marks an order paid.
export async function POST(request: NextRequest) {
  const body = await request.text();
  const admin = createAdminClient();
  const result = await handleItn(body, requestIp(request.headers), {
    config: payfastConfig(),
    checks: payfastNetworkChecks,
    log: (m) => console.warn(m),
    async apply(itn) {
      const { data, error } = await admin.rpc("apply_payfast_itn", {
        p: {
          orderId: itn.orderId,
          pfPaymentId: itn.pfPaymentId,
          amountGross: itn.amountGross,
          paymentStatus: itn.paymentStatus,
          method: itn.method,
          raw: itn.raw,
        },
      });
      if (error) throw new Error(error.message);
      return data as unknown as ApplyResult;
    },
    async onPaid(orderId) {
      const order = await loadOrderInternal(orderId);
      if (!order) return;
      const pdf = await renderOrderPdf(order);
      await sendEmail({
        ...paymentReceivedEmail({
          to: order.email,
          name: order.customerName,
          orderNumber: order.orderNumber,
          orderUrl: `${siteUrl()}/order/${order.id}`,
          total: order.total,
        }),
        attachments: [{ filename: `JC-Solar-Invoice-${order.invoice?.code ?? order.orderNumber}.pdf`, content: pdf }],
      });
    },
  });
  return new Response(result.message, { status: result.status });
}
