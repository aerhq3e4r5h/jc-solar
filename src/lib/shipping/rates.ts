import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isServiceRoleConfigured } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShippingClass } from "./types";

export const SHIPPING_TAG = "shipping";

export type ProvinceRates = {
  province: string;
  rates: Partial<Record<ShippingClass, { base: number; perItem: number; etaMin: number | null; etaMax: number | null }>>;
};

/** Province-wide delivery rates for the public delivery page. Refreshed when an admin edits them. */
export async function getProvinceRates(): Promise<{ carrier: string; provinces: ProvinceRates[] }> {
  "use cache";
  cacheLife("hours");
  cacheTag(SHIPPING_TAG);
  if (!isServiceRoleConfigured()) return { carrier: "DSV", provinces: [] };
  const admin = createAdminClient();
  const [{ data: rows }, { data: settings }] = await Promise.all([
    admin
      .from("shipping_rate_table")
      .select("shipping_class, province, base_price_incl_vat, per_item_incl_vat, eta_days_min, eta_days_max")
      .eq("is_active", true)
      .is("postal_code_from", null)
      .order("province"),
    admin.from("shipping_settings").select("carrier_name").maybeSingle(),
  ]);
  const byProvince = new Map<string, ProvinceRates>();
  for (const r of rows ?? []) {
    const entry = byProvince.get(r.province) ?? { province: r.province, rates: {} };
    const existing = entry.rates[r.shipping_class];
    // Keep the cheapest active province-wide rate per class, as checkout does.
    if (!existing || Number(r.base_price_incl_vat) < existing.base) {
      entry.rates[r.shipping_class] = {
        base: Number(r.base_price_incl_vat),
        perItem: Number(r.per_item_incl_vat),
        etaMin: r.eta_days_min,
        etaMax: r.eta_days_max,
      };
    }
    byProvince.set(r.province, entry);
  }
  return { carrier: settings?.carrier_name ?? "DSV", provinces: [...byProvince.values()] };
}
