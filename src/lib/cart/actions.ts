"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCatalogue } from "@/lib/catalogue/queries";
import { canPurchase } from "@/lib/catalogue/types";
import { cartOps, MAX_QTY, readCart, writeCart } from "./cart";

export type CartActionResult = { ok: true; count: number } | { ok: false; error: string };

const addSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_QTY),
  installation: z.boolean(),
});

async function done(lines: Awaited<ReturnType<typeof readCart>>): Promise<CartActionResult> {
  await writeCart(lines);
  revalidatePath("/cart");
  return { ok: true, count: lines.reduce((n, l) => n + l.q, 0) };
}

export async function addToCart(input: z.input<typeof addSchema>): Promise<CartActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That quantity isn't valid." };
  const product = (await getCatalogue()).find((p) => p.id === parsed.data.productId);
  if (!product) return { ok: false, error: "This product is no longer available." };
  if (!canPurchase(product)) return { ok: false, error: "This product is out of stock." };
  const installation = parsed.data.installation && product.installationEligible;
  return done(cartOps.add(await readCart(), product.id, parsed.data.quantity, installation));
}

const idSchema = z.uuid();

export async function setCartQuantity(productId: string, quantity: number): Promise<CartActionResult> {
  if (!idSchema.safeParse(productId).success || !Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QTY) {
    return { ok: false, error: "That quantity isn't valid." };
  }
  return done(cartOps.setQuantity(await readCart(), productId, quantity));
}

export async function setCartInstallation(productId: string, on: boolean): Promise<CartActionResult> {
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Unknown product." };
  return done(cartOps.setInstallation(await readCart(), productId, on === true));
}

export async function removeFromCart(productId: string): Promise<CartActionResult> {
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Unknown product." };
  return done(cartOps.remove(await readCart(), productId));
}

/** Adds several products at once (used by kits and "add system to cart"). */
export async function addManyToCart(items: { productId: string; quantity: number }[], installation: boolean): Promise<CartActionResult> {
  const parsed = z.array(addSchema.omit({ installation: true })).max(20).safeParse(items);
  if (!parsed.success) return { ok: false, error: "Those items aren't valid." };
  const catalogue = await getCatalogue();
  let lines = await readCart();
  for (const item of parsed.data) {
    const product = catalogue.find((p) => p.id === item.productId);
    if (!product || !canPurchase(product)) return { ok: false, error: "One of these products is out of stock." };
    lines = cartOps.add(lines, product.id, item.quantity, installation && product.installationEligible);
  }
  return done(lines);
}
