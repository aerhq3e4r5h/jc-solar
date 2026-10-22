// Loads the catalogue for export in the same spreadsheet layout it is
// imported from. Works with any Supabase client allowed to read products
// (the service role in scripts, an admin session in the app).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ExportProduct } from "./workbook";

export async function loadExportProducts(
  supabase: SupabaseClient<Database>,
  siteUrl: string,
): Promise<ExportProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "sku, name, slug, price_incl_vat, stock_qty, allow_backorder, description, brands(name), categories(slug), product_images(id)",
    )
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(`Could not load products: ${error.message}`);
  return (data ?? []).map((p) => ({
    name: p.name,
    sku: p.sku,
    brand: p.brands?.name ?? null,
    category: p.categories?.slug ?? "",
    priceInclVat: Number(p.price_incl_vat),
    stockQty: p.stock_qty,
    allowBackorder: p.allow_backorder,
    imageCount: p.product_images.length,
    descriptionLength: p.description?.length ?? 0,
    url: `${siteUrl.replace(/\/$/, "")}/shop/${p.categories?.slug ?? "products"}/${p.slug}`,
  }));
}
