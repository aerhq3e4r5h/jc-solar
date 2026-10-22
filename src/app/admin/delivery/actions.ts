"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { PROVINCES } from "@/lib/checkout/schema";
import { SHIPPING_TAG } from "@/lib/shipping/rates";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true } | { ok: false; error: string };

const money = z.coerce.number().min(0, "Amounts can't be negative").max(1_000_000);
const days = z.union([z.literal("").transform(() => null), z.coerce.number().int().min(0).max(60)]);

const settingsSchema = z.object({
  carrierName: z.string().trim().min(1, "Enter the courier's name").max(60),
  trackingUrlTemplate: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === "" || (v.startsWith("https://") && v.includes("{tracking}")),
      "The tracking link must start with https:// and contain {tracking}",
    ),
  freeDeliveryWithInstallation: z.boolean(),
  freeDeliveryThreshold: z.union([z.literal("").transform(() => null), money]),
  quoteAfterOrderWhenUnavailable: z.boolean(),
  collectionEnabled: z.boolean(),
  collectionAddress: z.string().trim().max(300),
});

function done() {
  revalidateTag(SHIPPING_TAG, "max");
  revalidatePath("/admin/delivery");
  return { ok: true as const };
}

export async function saveDeliverySettings(input: z.input<typeof settingsSchema>): Promise<SaveResult> {
  await requireRole(["admin"], "/admin/delivery");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the settings." };
  const f = parsed.data;
  if (f.collectionEnabled && !f.collectionAddress) return { ok: false, error: "Enter the collection address, or switch collection off." };
  const { error } = await (
    await createClient()
  )
    .from("shipping_settings")
    .update({
      carrier_name: f.carrierName,
      tracking_url_template: f.trackingUrlTemplate || null,
      free_delivery_with_installation: f.freeDeliveryWithInstallation,
      free_delivery_threshold_incl_vat: f.freeDeliveryThreshold,
      quote_after_order_when_unavailable: f.quoteAfterOrderWhenUnavailable,
      collection_enabled: f.collectionEnabled,
      collection_address: f.collectionAddress || null,
    })
    .eq("id", true);
  return error ? { ok: false, error: error.message } : done();
}

const rateSchema = z
  .object({
    id: z.uuid().optional(),
    shippingClass: z.enum(["standard", "oversized", "dangerous_goods"]),
    province: z.enum(PROVINCES),
    postalCodeFrom: z.union([z.literal(""), z.string().regex(/^\d{4}$/, "Postal codes have 4 digits")]),
    postalCodeTo: z.union([z.literal(""), z.string().regex(/^\d{4}$/, "Postal codes have 4 digits")]),
    base: money,
    perItem: money,
    perKg: money,
    etaMin: days,
    etaMax: days,
    isActive: z.boolean(),
  })
  .refine((r) => !r.postalCodeTo || r.postalCodeFrom, "Enter the first postal code of the range")
  .refine((r) => !r.postalCodeTo || r.postalCodeTo >= r.postalCodeFrom, "The range must go from the lower to the higher postal code")
  .refine((r) => r.etaMin === null || r.etaMax === null || r.etaMax >= r.etaMin, "The longest delivery time can't be shorter than the quickest");

export async function saveRate(input: z.input<typeof rateSchema>): Promise<SaveResult> {
  await requireRole(["admin"], "/admin/delivery");
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the rate." };
  const r = parsed.data;
  const row = {
    shipping_class: r.shippingClass,
    province: r.province,
    postal_code_from: r.postalCodeFrom || null,
    postal_code_to: r.postalCodeTo || null,
    base_price_incl_vat: r.base,
    per_item_incl_vat: r.perItem,
    per_kg_incl_vat: r.perKg,
    eta_days_min: r.etaMin,
    eta_days_max: r.etaMax,
    is_active: r.isActive,
  };
  const supabase = await createClient();
  const { error } = r.id
    ? await supabase.from("shipping_rate_table").update(row).eq("id", r.id)
    : await supabase.from("shipping_rate_table").insert(row);
  return error ? { ok: false, error: error.message } : done();
}

export async function deleteRate(id: string): Promise<SaveResult> {
  await requireRole(["admin"], "/admin/delivery");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown rate." };
  const { error } = await (await createClient()).from("shipping_rate_table").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : done();
}
