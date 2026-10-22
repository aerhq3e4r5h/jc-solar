import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";
import type { PROVINCES } from "@/lib/checkout/schema";
import { SHIPPING_CLASS_LABEL } from "@/lib/shipping/format";
import type { ShippingClass } from "@/lib/shipping/types";
import { createClient } from "@/lib/supabase/server";
import { RateTable, SettingsEditor, type RateValues } from "./editors";

const CLASSES: { key: ShippingClass; hint: string }[] = [
  { key: "standard", hint: "Inverters, accessories and other boxed items." },
  { key: "oversized", hint: "Solar panels, usually on a pallet by road freight." },
  { key: "dangerous_goods", hint: "Lithium batteries (UN3480, Class 9). Use DSV's dangerous-goods service." },
];

const str = (n: number | null) => (n === null ? "" : String(Number(n)));

async function DeliveryAdmin() {
  await requireRole(["admin"], "/admin/delivery");
  const supabase = await createClient();
  const [{ data: settings }, { data: rates }] = await Promise.all([
    supabase.from("shipping_settings").select("*").maybeSingle(),
    supabase.from("shipping_rate_table").select("*").order("province").order("postal_code_from", { nullsFirst: true }),
  ]);
  if (!settings) return <p className="text-destructive">Delivery settings are missing. Run the latest database migration.</p>;

  const rows = (rates ?? []).map(
    (r): RateValues => ({
      id: r.id,
      shippingClass: r.shipping_class,
      province: r.province as (typeof PROVINCES)[number],
      postalCodeFrom: r.postal_code_from ?? "",
      postalCodeTo: r.postal_code_to ?? "",
      base: str(r.base_price_incl_vat),
      perItem: str(r.per_item_incl_vat),
      perKg: str(r.per_kg_incl_vat),
      etaMin: str(r.eta_days_min),
      etaMax: str(r.eta_days_max),
      isActive: r.is_active,
    }),
  );

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="font-sans text-lg font-semibold">Settings</h2>
        <SettingsEditor
          initial={{
            carrierName: settings.carrier_name,
            trackingUrlTemplate: settings.tracking_url_template ?? "",
            freeDeliveryWithInstallation: settings.free_delivery_with_installation,
            freeDeliveryThreshold: str(settings.free_delivery_threshold_incl_vat),
            quoteAfterOrderWhenUnavailable: settings.quote_after_order_when_unavailable,
            collectionEnabled: settings.collection_enabled,
            collectionAddress: settings.collection_address ?? "",
          }}
        />
      </section>
      {CLASSES.map((c) => (
        <section key={c.key} className="space-y-3 rounded-2xl border bg-card p-6">
          <div>
            <h2 className="font-sans text-lg font-semibold">{SHIPPING_CLASS_LABEL[c.key]}</h2>
            <p className="text-sm text-muted-foreground">{c.hint}</p>
          </div>
          <RateTable shippingClass={c.key} rows={rows.filter((r) => r.shippingClass === c.key)} />
        </section>
      ))}
    </div>
  );
}

export default function DeliveryAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Delivery</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Checkout prices delivery from these rates (incl. VAT): the first item, plus each extra item of the same type, plus a per-kg amount if
          products have weights. Each type travels as its own shipment. The starting rates are estimates: replace them with your DSV prices.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <DeliveryAdmin />
      </Suspense>
    </div>
  );
}
