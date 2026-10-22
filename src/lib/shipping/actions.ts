"use server";

import { z } from "zod";
import { loadCart } from "@/lib/cart/load";
import { PROVINCES } from "@/lib/checkout/schema";
import { isServiceRoleConfigured } from "@/lib/env.server";
import { quoteDelivery } from "./quote";
import type { DeliveryQuote } from "./types";

const input = z.object({
  province: z.enum(PROVINCES),
  postalCode: z.union([z.string().regex(/^\d{4}$/), z.literal("")]).optional(),
});

/** Delivery options for the visitor's cart to an address (prices come from the database). */
export async function getDeliveryQuote(address: {
  province: string;
  postalCode?: string;
}): Promise<{ ok: true; quote: DeliveryQuote } | { ok: false; error: string }> {
  const parsed = input.safeParse(address);
  if (!parsed.success) return { ok: false, error: "Choose your province to see delivery options." };
  if (!isServiceRoleConfigured()) return { ok: false, error: "Delivery is confirmed before dispatch." };
  const cart = await loadCart();
  if (cart.items.length === 0) return { ok: false, error: "Your cart is empty." };
  return quoteDelivery(
    cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity, installation: i.installation })),
    { province: parsed.data.province, postalCode: parsed.data.postalCode || undefined },
  );
}

/** Delivery cost of one product to a province, for the product page. */
export async function estimateProductDelivery(productId: string, province: string): Promise<{ ok: true; quote: DeliveryQuote } | { ok: false; error: string }> {
  const parsed = z.object({ productId: z.uuid(), province: z.enum(PROVINCES) }).safeParse({ productId, province });
  if (!parsed.success) return { ok: false, error: "Choose a province." };
  if (!isServiceRoleConfigured()) return { ok: false, error: "Delivery is worked out at checkout." };
  return quoteDelivery([{ productId: parsed.data.productId, quantity: 1, installation: false }], { province: parsed.data.province });
}
