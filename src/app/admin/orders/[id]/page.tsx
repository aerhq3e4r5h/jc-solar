import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRand } from "@/lib/pricing/vat";
import { etaText, SHIPPING_CLASS_LABEL } from "@/lib/shipping/format";
import { trackingLink } from "@/lib/shipping/providers";
import type { ShippingClass } from "@/lib/shipping/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { STATUS_TONE } from "../status";
import { DispatchForm, ShipmentStatusControl } from "./dispatch-form";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });

async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: quotes }, { data: shipments }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("sku, name, quantity, line_total_incl_vat, shipping_class").eq("order_id", id).order("name"),
    supabase.from("shipping_quotes").select("shipping_class, price_incl_vat, eta_days_min, eta_days_max, service_name").eq("order_id", id),
    supabase.from("shipments").select("*").eq("order_id", id).order("created_at"),
    supabase.from("shipping_settings").select("carrier_name, tracking_url_template").maybeSingle(),
  ]);
  if (!order) notFound();
  const addr = order.shipping_address as Record<string, string> | null;
  const classes = [...new Set((items ?? []).map((i) => i.shipping_class).filter((c): c is ShippingClass => !!c))];
  const canShip = ["paid", "processing", "shipped"].includes(order.status);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Orders
        </Link>
        <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold">
          <span className="font-mono">{order.order_number}</span>
          <Badge variant="outline" className={cn("border-0 text-sm", STATUS_TONE[order.status])}>
            {order.status.replace(/_/g, " ")}
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          Placed {dateTime(order.created_at)}
          {order.paid_at ? ` · paid ${dateTime(order.paid_at)}` : ""} · {order.payment_method === "eft" ? "EFT" : "PayFast"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-2 rounded-2xl border bg-card p-5 text-sm" aria-label="Customer">
          <h2 className="font-sans font-semibold">Customer</h2>
          <p>{order.customer_name}</p>
          <p>
            <a href={`mailto:${order.email}`} className="underline underline-offset-4">
              {order.email}
            </a>
          </p>
          {order.phone && (
            <p>
              <a href={`tel:${order.phone}`} className="underline underline-offset-4">
                {order.phone}
              </a>
            </p>
          )}
          {order.customer_notes && <p className="rounded-lg bg-accent p-2">Note: {order.customer_notes}</p>}
        </section>
        <section className="space-y-1 rounded-2xl border bg-card p-5 text-sm" aria-label="Delivery address">
          <h2 className="mb-1 font-sans font-semibold">Deliver to</h2>
          {addr ? (
            <>
              <p>{addr.line1}</p>
              {addr.line2 && <p>{addr.line2}</p>}
              <p>{[addr.suburb, addr.city].filter(Boolean).join(", ")}</p>
              <p>
                {addr.province} {addr.postalCode}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No address</p>
          )}
          {order.delivery_method === "installer_delivery" && <p className="pt-2 font-medium">Installation booked: the installer delivers.</p>}
        </section>
        <section className="space-y-2 rounded-2xl border bg-card p-5 text-sm" aria-label="Totals">
          <h2 className="font-sans font-semibold">Totals (incl. VAT)</h2>
          <p className="flex justify-between">
            <span>Products</span> <span className="num">{formatRand(Number(order.subtotal_incl_vat))}</span>
          </p>
          <p className="flex justify-between">
            <span>Delivery charged</span> <span className="num">{formatRand(Number(order.shipping_incl_vat))}</span>
          </p>
          {order.delivery_pending && (
            <p className="rounded-lg bg-sun/20 p-2">Part of the delivery wasn&apos;t priced: agree it with the customer before dispatch.</p>
          )}
          <p className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span> <span className="num">{formatRand(Number(order.total_incl_vat))}</span>
          </p>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5" aria-labelledby="items-heading">
        <h2 id="items-heading" className="mb-3 font-sans font-semibold">
          Items to pack
        </h2>
        <ul className="divide-y text-sm">
          {(items ?? []).map((i) => (
            <li key={i.sku} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <span className="num font-semibold">{i.quantity} x</span> {i.name}{" "}
                <span className="font-mono text-xs text-muted-foreground">{i.sku}</span>
              </span>
              <span className="text-muted-foreground">{i.shipping_class ? SHIPPING_CLASS_LABEL[i.shipping_class] : ""}</span>
            </li>
          ))}
        </ul>
        {quotes && quotes.length > 0 && (
          <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
            <p className="mb-1 font-medium">Delivery as priced at checkout</p>
            <ul className="space-y-0.5 text-muted-foreground">
              {quotes.map((q, i) => (
                <li key={i}>
                  {SHIPPING_CLASS_LABEL[q.shipping_class]}: {formatRand(Number(q.price_incl_vat))}
                  {etaText(q.eta_days_min, q.eta_days_max) ? `, promised ${etaText(q.eta_days_min, q.eta_days_max)}` : ""} ({q.service_name})
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5" aria-labelledby="shipments-heading">
        <h2 id="shipments-heading" className="font-sans font-semibold">
          Shipments
        </h2>
        {(shipments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No shipments yet.</p>}
        <ul className="space-y-3">
          {(shipments ?? []).map((s) => {
            const link = trackingLink(s, settings?.tracking_url_template);
            return (
              <li key={s.id} className="space-y-3 rounded-xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-medium">{s.provider}</span> · {s.shipping_class ? SHIPPING_CLASS_LABEL[s.shipping_class] : "Whole order"} ·{" "}
                    <span className="font-mono">{s.tracking_number}</span>
                    {s.waybill_number && <span className="text-muted-foreground"> (waybill {s.waybill_number})</span>}
                    {s.cost_incl_vat !== null && <span className="text-muted-foreground"> · cost {formatRand(Number(s.cost_incl_vat))}</span>}
                  </p>
                  <Badge variant="outline">{s.status.replace(/_/g, " ")}</Badge>
                </div>
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
                    Tracking page <ExternalLink className="size-3.5" />
                  </a>
                )}
                <ShipmentStatusControl orderId={order.id} shipmentId={s.id} status={s.status} />
              </li>
            );
          })}
        </ul>
        {canShip ? (
          <div className="border-t pt-4">
            <h3 className="mb-3 font-sans text-sm font-semibold">Record a shipment</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Book the collection with {settings?.carrier_name ?? "the courier"} (from the warehouse), then enter the tracking number here. Batteries
              must go on a dangerous-goods service.
            </p>
            <DispatchForm orderId={order.id} carrier={settings?.carrier_name ?? "DSV"} classes={classes} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This order can be shipped once it&apos;s paid.</p>
        )}
      </section>
    </div>
  );
}

export default function AdminOrderPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <OrderDetail {...props} />
    </Suspense>
  );
}
