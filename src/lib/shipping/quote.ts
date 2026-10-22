import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeliveryAddress, DeliveryMethod, DeliveryQuote } from "./types";

export type CartItemRef = { productId: string; quantity: number; installation: boolean };

const ERRORS: Record<string, string> = {
  address_required: "Choose your province to see delivery options.",
  invalid_postal_code: "Postal codes have 4 digits.",
  delivery_unavailable: "We can't deliver this order to your area online yet. Please contact us for a delivery quote.",
  collection_unavailable: "Collection isn't available.",
  product_unavailable: "One of the products in your cart is no longer available.",
  empty_cart: "Your cart is empty.",
};

/**
 * Delivery price for the cart, worked out by the database from the admin's
 * rate table (the same function prices the order itself).
 */
export async function quoteDelivery(
  items: CartItemRef[],
  address: DeliveryAddress,
  method: DeliveryMethod = "courier",
): Promise<{ ok: true; quote: DeliveryQuote } | { ok: false; error: string }> {
  const { data, error } = await createAdminClient().rpc("quote_delivery", {
    p_items: items,
    p_address: address,
    p_method: method,
  });
  if (error || !data) {
    const key = Object.keys(ERRORS).find((k) => error?.message.includes(k));
    return { ok: false, error: key ? ERRORS[key] : "We couldn't work out delivery right now. You can still order; we'll confirm delivery after." };
  }
  const q = data as DeliveryQuote;
  return {
    ok: true,
    quote: {
      ...q,
      total: Number(q.total),
      shipments: q.shipments.map((s) => ({ ...s, price: s.price === null ? null : Number(s.price), weightKg: Number(s.weightKg) })),
    },
  };
}
