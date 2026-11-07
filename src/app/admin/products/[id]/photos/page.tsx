import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";
import { bundledPhotos } from "@/lib/catalogue/queries";
import { productFullTitle } from "@/lib/catalogue/types";
import { storagePublicUrl } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { PhotoManager } from "./photo-manager";

async function Photos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["admin"], `/admin/products/${id}/photos`);
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select("id, sku, name, slug, brands(name), categories(slug), product_images(id, storage_path, sort_order)")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const uploaded = [...p.product_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ id: i.id, url: storagePublicUrl("product-images", i.storage_path) }));
  const name = productFullTitle({ name: p.name, brand: p.brands?.name ?? null, sku: p.sku });

  return (
    <>
      <div>
        <h1 className="text-3xl font-semibold">Photos</h1>
        <p className="mt-1 text-muted-foreground">
          {name} <span className="font-mono text-sm">({p.sku})</span>
          {p.categories?.slug && (
            <>
              {" "}
              <a href={`/shop/${p.categories.slug}/${p.slug}`} target="_blank" rel="noopener" className="underline underline-offset-4">
                View in shop
              </a>
            </>
          )}
        </p>
      </div>
      <PhotoManager productId={p.id} uploaded={uploaded} supplier={bundledPhotos(p.sku)} />
    </>
  );
}

export default function ProductPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Products and prices
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Photos params={params} />
      </Suspense>
    </div>
  );
}
