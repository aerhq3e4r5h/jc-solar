"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { applyDiscount, endSale, type SalePrice } from "@/lib/pricing/sale";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true; saved: number } | { ok: false; error: string };

const money = z.number().finite().min(0, "Prices can't be negative").max(10_000_000);

const rowSchema = z.object({
  id: z.uuid(),
  price: money,
  compareAt: money.nullable(),
  stockQty: z.number().int().min(0, "Stock can't be negative").max(1_000_000),
  isActive: z.boolean(),
});
export type ProductEdit = z.infer<typeof rowSchema>;

// Price changes must show at once (not after one stale view), so expire the catalogue now.
function refresh() {
  updateTag(CATALOGUE_TAG);
  revalidatePath("/admin/products");
}

/** Save edited rows: price, was-price, stock and whether it's on sale in the shop. */
export async function saveProducts(rows: ProductEdit[]): Promise<SaveResult> {
  const user = await requireRole(["admin"], "/admin/products");
  const parsed = z.array(rowSchema).min(1).max(300).safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("products")
    .select("id, stock_qty")
    .in(
      "id",
      parsed.data.map((r) => r.id),
    );
  if (readError) return { ok: false, error: readError.message };
  const stockBefore = new Map((current ?? []).map((c) => [c.id, c.stock_qty]));

  for (const r of parsed.data) {
    // A was-price only makes sense above the price; otherwise there's no sale.
    const compareAt = r.compareAt !== null && r.compareAt > r.price ? r.compareAt : null;
    const { error } = await supabase
      .from("products")
      .update({ price_incl_vat: r.price, compare_at_price_incl_vat: compareAt, stock_qty: r.stockQty, is_active: r.isActive })
      .eq("id", r.id);
    if (error) return { ok: false, error: error.message };
    const delta = r.stockQty - (stockBefore.get(r.id) ?? r.stockQty);
    if (delta !== 0) {
      await supabase
        .from("inventory_movements")
        .insert({ product_id: r.id, delta, reason: "manual_adjustment", reference: "admin price list", created_by: user.id });
    }
  }
  refresh();
  return { ok: true, saved: parsed.data.length };
}

const bulkSchema = z.object({ ids: z.array(z.uuid()).min(1).max(300), percent: z.number().int().min(1).max(90).optional() });

/** Put the selected products on sale at `percent` off their original price, or end their sale. */
export async function bulkSale(input: { ids: string[]; percent?: number; end?: boolean }): Promise<SaveResult> {
  await requireRole(["admin"], "/admin/products");
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success || (!input.end && !parsed.data.percent)) return { ok: false, error: "Choose products and a percentage between 1 and 90." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("id, price_incl_vat, compare_at_price_incl_vat").in("id", parsed.data.ids);
  if (error) return { ok: false, error: error.message };
  for (const p of data ?? []) {
    const current: SalePrice = { price: Number(p.price_incl_vat), compareAt: p.compare_at_price_incl_vat === null ? null : Number(p.compare_at_price_incl_vat) };
    const next = input.end ? endSale(current) : applyDiscount(current, parsed.data.percent!);
    const { error: e } = await supabase
      .from("products")
      .update({ price_incl_vat: next.price, compare_at_price_incl_vat: next.compareAt })
      .eq("id", p.id);
    if (e) return { ok: false, error: e.message };
  }
  refresh();
  return { ok: true, saved: data?.length ?? 0 };
}
