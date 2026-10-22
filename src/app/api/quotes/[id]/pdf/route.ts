import type { NextRequest } from "next/server";
import { loadQuoteForViewer } from "@/lib/orders/orders";
import { renderQuotePdf } from "@/lib/pdf/render";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await loadQuoteForViewer(id, request.nextUrl.searchParams.get("t"));
  if (!quote) return new Response("Quotation not found", { status: 404 });
  const pdf = await renderQuotePdf(quote);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${request.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="JC-Solar-${quote.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
