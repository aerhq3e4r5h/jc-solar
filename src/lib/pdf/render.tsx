import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { site } from "@/config/site";
import { siteUrl } from "@/lib/env";
import { eftDetails } from "@/lib/env.server";
import type { OrderView, QuoteView } from "@/lib/orders/orders";
import { SalesDocument, type SalesDocumentProps } from "./sales-document";

function supplier(): SalesDocumentProps["supplier"] {
  const c = site.company;
  return {
    name: c.legalName ?? site.name,
    lines: [c.registrationNumber && `Reg. no. ${c.registrationNumber}`, c.address, c.email, c.phone].filter((l): l is string => !!l),
    vatNumber: c.vatNumber,
    website: siteUrl().replace(/^https?:\/\//, ""),
  };
}

function addressLines(a: Record<string, string> | null): string[] {
  if (!a) return [];
  return [a.line1, a.line2, [a.suburb, a.city].filter(Boolean).join(", "), [a.province, a.postalCode].filter(Boolean).join(" ")].filter(Boolean);
}

export async function renderQuotePdf(q: QuoteView): Promise<Buffer> {
  return renderToBuffer(
    <SalesDocument
      kind="quote"
      number={q.code}
      issuedAt={q.createdAt}
      validUntil={q.validUntil}
      reference={q.code}
      supplier={supplier()}
      customer={{ name: q.customerName, company: q.company, email: q.email, phone: q.phone }}
      items={q.items}
      total={q.total}
      vat={q.vat}
      installationRequested={q.installationRequested}
      bank={eftDetails()}
      payOnlineUrl={`${siteUrl()}/cart`}
    />,
  );
}

/** Pro forma while unpaid; invoice once paid (numbered from the invoice sequence). */
export async function renderOrderPdf(o: OrderView): Promise<Buffer> {
  const paid = o.invoice !== null;
  return renderToBuffer(
    <SalesDocument
      kind={paid ? "invoice" : "proforma"}
      number={paid ? o.invoice!.code : o.orderNumber}
      issuedAt={paid ? o.invoice!.issuedAt : o.createdAt}
      reference={o.orderNumber}
      supplier={supplier()}
      customer={{ name: o.customerName, email: o.email, phone: o.phone, address: addressLines(o.shippingAddress) }}
      items={o.items}
      total={o.total}
      vat={o.vat}
      installationRequested={o.installationRequested}
      bank={eftDetails()}
      paidAt={o.paidAt}
    />,
  );
}
