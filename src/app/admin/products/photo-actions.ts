"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { createClient } from "@/lib/supabase/server";

export type PhotoResult = { ok: true } | { ok: false; error: string };

const BUCKET = "product-images";

function refresh(productId: string) {
  updateTag(CATALOGUE_TAG);
  revalidatePath(`/admin/products/${productId}/photos`);
  revalidatePath("/admin/products");
}

/**
 * Record photos the browser has just uploaded to storage (the upload goes
 * straight to Supabase as the signed-in admin, so large files never pass
 * through this server). Paths must sit in the product's own folder.
 */
export async function addPhotos(productId: string, paths: string[]): Promise<PhotoResult> {
  await requireRole(["admin"], "/admin/products");
  const parsed = z
    .object({ productId: z.uuid(), paths: z.array(z.string().min(1).max(300)).min(1).max(20) })
    .safeParse({ productId, paths });
  if (!parsed.success) return { ok: false, error: "Choose up to 20 photos." };
  if (!paths.every((p) => p.startsWith(`${productId}/`) && !p.includes(".."))) return { ok: false, error: "Those files aren't in this product's folder." };

  const supabase = await createClient();
  const [{ data: product, error: pe }, { data: existing, error: ee }] = await Promise.all([
    supabase.from("products").select("name").eq("id", productId).single(),
    supabase.from("product_images").select("sort_order").eq("product_id", productId),
  ]);
  if (pe || !product) return { ok: false, error: pe?.message ?? "Product not found." };
  if (ee) return { ok: false, error: ee.message };
  const start = Math.max(-1, ...(existing ?? []).map((e) => e.sort_order)) + 1;
  const { error } = await supabase
    .from("product_images")
    .insert(paths.map((storage_path, i) => ({ product_id: productId, storage_path, alt: product.name, sort_order: start + i })));
  if (error) return { ok: false, error: error.message };
  refresh(productId);
  return { ok: true };
}

/** Save the order the admin dragged the photos into (first is the main photo). */
export async function reorderPhotos(productId: string, ids: string[]): Promise<PhotoResult> {
  await requireRole(["admin"], "/admin/products");
  const parsed = z.object({ productId: z.uuid(), ids: z.array(z.uuid()).min(1).max(50) }).safeParse({ productId, ids });
  if (!parsed.success) return { ok: false, error: "Couldn't read the new order." };
  const supabase = await createClient();
  for (const [i, id] of ids.entries()) {
    const { error } = await supabase.from("product_images").update({ sort_order: i }).eq("id", id).eq("product_id", productId);
    if (error) return { ok: false, error: error.message };
  }
  refresh(productId);
  return { ok: true };
}

/** Delete an uploaded photo, from the list and from storage. */
export async function deletePhoto(productId: string, id: string): Promise<PhotoResult> {
  await requireRole(["admin"], "/admin/products");
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(productId).success) return { ok: false, error: "Unknown photo." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_images").delete().eq("id", id).eq("product_id", productId).select("storage_path").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Photo not found." };
  // The list no longer shows it either way; a leftover file is harmless, so don't fail on this.
  await supabase.storage.from(BUCKET).remove([data.storage_path]);
  refresh(productId);
  return { ok: true };
}
