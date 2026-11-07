import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";
import { bundledPhotos, bundledThumb } from "@/lib/catalogue/queries";
import { CATEGORIES, isCategorySlug } from "@/lib/catalogue/types";
import { storagePublicUrl } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { ProductsEditor, type AdminProductRow } from "./products-editor";

async function Products() {
  await requireRole(["admin"], "/admin/products");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, sku, slug, name, price_incl_vat, compare_at_price_incl_vat, stock_qty, is_active, brands(name), categories(slug), product_images(storage_path, sort_order)",
    )
    .is("deleted_at", null)
    .order("name");
  if (error) return <p className="text-destructive">Could not load products: {error.message}</p>;

  const rows: AdminProductRow[] = (data ?? [])
    .filter((p) => isCategorySlug(p.categories?.slug ?? ""))
    .map((p) => {
      const category = p.categories!.slug as keyof typeof CATEGORIES;
      const uploaded = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
      const supplier = bundledPhotos(p.sku);
      const photos: AdminProductRow["photos"] = uploaded
        ? { source: "uploaded", count: p.product_images.length }
        : supplier.length
          ? { source: supplier[0].sameRange ? "range" : "supplier", count: supplier.length }
          : { source: "none", count: 0 };
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brands?.name ?? null,
        category,
        url: `/shop/${category}/${p.slug}`,
        thumb: uploaded ? storagePublicUrl("product-images", uploaded.storage_path) : bundledThumb(p.sku),
        price: Number(p.price_incl_vat),
        compareAt: p.compare_at_price_incl_vat === null ? null : Number(p.compare_at_price_incl_vat),
        stockQty: p.stock_qty,
        isActive: p.is_active,
        photos,
      };
    });

  return <ProductsEditor initial={rows} categories={Object.entries(CATEGORIES).map(([slug, c]) => ({ slug, name: c.name }))} />;
}

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Products and prices</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Change prices, stock and what&apos;s for sale. Lower a price and its old price becomes the &ldquo;was&rdquo; price automatically, so the
          shop shows a discount ribbon on the photo. Put the price back up to end the sale. Prices include VAT.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Products />
      </Suspense>
    </div>
  );
}
