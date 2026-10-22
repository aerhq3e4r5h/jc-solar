import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient, storagePublicUrl } from "@/lib/supabase/public";
import productImages from "@/data/product-images.json";
import { isCategorySlug, type Product } from "./types";

export const CATALOGUE_TAG = "catalogue";

// Photos supplied by Solar Europe, shipped with the site under public/products.
// Used until an admin uploads images for the product in Supabase Storage.
const BUNDLED_IMAGES: Record<string, { src: string }[]> = productImages;

function bundledImages(sku: string, name: string) {
  return (BUNDLED_IMAGES[sku] ?? []).map((img, i) => ({ url: img.src, alt: i === 0 ? name : `${name}, view ${i + 1}` }));
}

const PRODUCT_COLUMNS = `
  id, sku, slug, name, price_incl_vat, compare_at_price_incl_vat, stock_qty, allow_backorder,
  shipping_class, is_dangerous_goods, installation_eligible, warranty_months,
  performance_warranty_years, nrs_097_2_1_approved, is_featured, short_description,
  description, datasheet_path, created_at,
  brands(name), categories(slug),
  product_images(storage_path, alt, sort_order),
  product_specs(key, label, value_text, value_num, unit, sort_order)
`;

/**
 * Every active product with its specs and images. The catalogue is small
 * (a few hundred rows), so pages filter it in memory. Cached for an hour
 * and refreshed immediately after an import (revalidateTag).
 */
export async function getCatalogue(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAG);

  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS).order("name");
  if (error) throw new Error(`Could not load the catalogue: ${error.message}`);

  const products: Product[] = [];
  for (const row of data ?? []) {
    const category = row.categories?.slug ?? "";
    if (!isCategorySlug(category)) continue;
    products.push({
      id: row.id,
      sku: row.sku,
      slug: row.slug,
      name: row.name,
      brand: row.brands?.name ?? null,
      category,
      priceInclVat: Number(row.price_incl_vat),
      compareAtPriceInclVat: row.compare_at_price_incl_vat === null ? null : Number(row.compare_at_price_incl_vat),
      stockQty: row.stock_qty,
      allowBackorder: row.allow_backorder,
      shippingClass: row.shipping_class,
      isDangerousGoods: row.is_dangerous_goods,
      installationEligible: row.installation_eligible,
      warrantyMonths: row.warranty_months,
      performanceWarrantyYears: row.performance_warranty_years,
      nrsApproved: row.nrs_097_2_1_approved,
      isFeatured: row.is_featured,
      shortDescription: row.short_description,
      description: row.description,
      datasheetUrl: row.datasheet_path ? storagePublicUrl("datasheets", row.datasheet_path) : null,
      images: row.product_images.length
        ? [...row.product_images]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((img) => ({ url: storagePublicUrl("product-images", img.storage_path), alt: img.alt }))
        : bundledImages(row.sku, row.name),
      specs: [...row.product_specs]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          key: s.key,
          label: s.label,
          valueText: s.value_text,
          valueNum: s.value_num === null ? null : Number(s.value_num),
          unit: s.unit,
        })),
      createdAt: row.created_at,
    });
  }
  return products;
}

export type CompatibilityOverride = { inverterId: string; batteryId: string; status: "confirmed" | "incompatible"; reason: string | null };

/** Battery/inverter pairs an admin has confirmed or ruled out. */
export async function getCompatibilityOverrides(): Promise<CompatibilityOverride[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAG);

  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_compatibility")
    .select("inverter_id, battery_id, status, reason")
    .neq("status", "proposed");
  if (error) throw new Error(`Could not load compatibility: ${error.message}`);
  return (data ?? []).map((r) => ({
    inverterId: r.inverter_id,
    batteryId: r.battery_id,
    status: r.status as "confirmed" | "incompatible",
    reason: r.reason,
  }));
}

export type Review = { id: string; rating: number; title: string | null; body: string; author: string; verified: boolean; createdAt: string };

export async function getApprovedReviews(productId: string): Promise<Review[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOGUE_TAG, `reviews:${productId}`);

  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, title, body, author_display_name, is_verified_purchase, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    author: r.author_display_name,
    verified: r.is_verified_purchase,
    createdAt: r.created_at,
  }));
}
