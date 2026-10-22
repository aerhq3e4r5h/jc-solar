import type { NextRequest } from "next/server";
import { loadOrderForViewer } from "@/lib/orders/orders";
import { renderOrderPdf } from "@/lib/pdf/render";

/** Pro forma while unpaid, invoice once paid. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await loadOrderForViewer(id, request.nextUrl.searchParams.get("t"));
  if (!order) return new Response("Order not found", { status: 404 });
  const pdf = await renderOrderPdf(order);
  const name = order.invoice ? `Invoice-${order.invoice.code}` : `Pro-forma-${order.orderNumber}`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${request.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="JC-Solar-${name}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
