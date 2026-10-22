import { Truck, Wrench } from "lucide-react";
import { formatRand, vatPortion } from "@/lib/pricing/vat";
import type { SummaryDelivery } from "@/lib/shipping/format";

type Line = { key: string; name: string; quantity: number; lineTotal: number };

/** Itemised summary used at checkout and on the order page (ECT Act: full order shown before payment). */
export function OrderSummary({
  lines,
  productsTotal,
  delivery,
  installationRequested,
  title = "Order summary",
  totalLabel = "Total to pay now",
}: {
  lines: Line[];
  productsTotal: number;
  delivery: SummaryDelivery;
  installationRequested: boolean;
  title?: string;
  totalLabel?: string;
}) {
  const total = productsTotal + (delivery.amount ?? 0);
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-6">
      <h2 className="font-sans text-lg font-semibold">{title}</h2>
      <ul className="space-y-3 text-sm">
        {lines.map((l) => (
          <li key={l.key} className="flex justify-between gap-4">
            <span className="min-w-0">
              <span className="num font-medium">{l.quantity} x </span>
              <span className="text-muted-foreground">{l.name}</span>
            </span>
            <span className="num shrink-0">{formatRand(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <dt>Products</dt>
          <dd className="num">{formatRand(productsTotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Delivery</dt>
          <dd className={delivery.amount === null || delivery.amount === 0 ? "text-right text-muted-foreground" : "num text-right"}>
            {delivery.amount !== null && delivery.amount > 0 ? formatRand(delivery.amount) : delivery.label}
          </dd>
        </div>
        {installationRequested && (
          <div className="flex justify-between text-muted-foreground">
            <dt>Installation</dt>
            <dd>Quoted after site assessment</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-3 text-base font-semibold">
          <dt>{totalLabel}</dt>
          <dd className="num">{formatRand(total)}</dd>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <dt>Includes VAT of</dt>
          <dd className="num">{formatRand(vatPortion(total))}</dd>
        </div>
      </dl>
      {delivery.pending && (
        <p className="flex gap-2 text-xs text-muted-foreground">
          <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Part of the delivery can&apos;t be priced online for your area yet. We&apos;ll confirm it before dispatch and you only pay it once you agree.
        </p>
      )}
      {installationRequested && (
        <p className="flex gap-2 rounded-lg bg-accent p-3 text-sm">
          <Wrench className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden="true" />
          Our technician will contact you to assess your site and quote the installation.
        </p>
      )}
    </div>
  );
}
