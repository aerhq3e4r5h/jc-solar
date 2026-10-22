import { CheckCircle2, ExternalLink, Package, Truck } from "lucide-react";
import type { OrderView } from "@/lib/orders/orders";
import { SHIPPING_CLASS_LABEL } from "@/lib/shipping/format";
import { trackingLink } from "@/lib/shipping/providers";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<OrderView["shipments"][number]["status"], string> = {
  pending: "Being prepared",
  booked: "Booked with courier",
  collected: "Collected by courier",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed: "Delivery problem: we'll contact you",
  cancelled: "Cancelled",
};

const STEPS = ["booked", "in_transit", "out_for_delivery", "delivered"] as const;
const stepIndex = (status: string) => (status === "collected" ? 1 : Math.max(0, STEPS.indexOf(status as (typeof STEPS)[number])));

const date = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });

/** Shipments and tracking for an order, newest first. */
export function ShipmentTracking({ shipments }: { shipments: OrderView["shipments"] }) {
  if (shipments.length === 0) return null;
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6" aria-labelledby="tracking-heading">
      <h2 id="tracking-heading" className="flex items-center gap-2 font-sans text-lg font-semibold">
        <Truck className="size-5 text-amber-ink" aria-hidden="true" /> Delivery and tracking
      </h2>
      <ul className="space-y-5">
        {shipments.map((s) => {
          const link = trackingLink({ provider: s.provider, tracking_number: s.trackingNumber, tracking_url: s.trackingUrl });
          const step = stepIndex(s.status);
          return (
            <li key={s.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {s.status === "delivered" ? (
                      <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                    ) : (
                      <Package className="size-4 text-amber-ink" aria-hidden="true" />
                    )}
                    {STATUS_LABEL[s.status]}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.provider}
                    {s.shippingClass ? ` · ${SHIPPING_CLASS_LABEL[s.shippingClass]}` : ""}
                    {s.trackingNumber ? ` · Tracking ${s.trackingNumber}` : ""}
                  </p>
                </div>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
                  >
                    Track with {s.provider} <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
              {s.status !== "failed" && (
                <ol className="grid grid-cols-4 gap-1" aria-label="Delivery progress">
                  {STEPS.map((name, i) => (
                    <li key={name} className="space-y-1.5">
                      <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-sun" : "bg-muted")} />
                      <span className={cn("block text-[11px] leading-tight", i <= step ? "text-foreground" : "text-muted-foreground")}>
                        {STATUS_LABEL[name].replace(" with courier", "")}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {s.events.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {[...s.events].reverse().map((e, i) => (
                    <li key={i}>
                      <span className="num">{date(e.at)}</span>: {STATUS_LABEL[e.status as keyof typeof STATUS_LABEL] ?? e.status}
                      {e.note ? `, ${e.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
