"use server";

import { productTitle, productUrl } from "@/lib/catalogue/types";
import { loadCart } from "./load";

export type MiniCart = {
  count: number;
  subtotal: number;
  canCheckout: boolean;
  issues: number;
  items: {
    id: string;
    title: string;
    brand: string | null;
    url: string;
    image: string | null;
    quantity: number;
    unitPrice: number;
    compareAt: number | null;
    lineTotal: number;
    installation: boolean;
    problem: string | null;
  }[];
};

/** The visitor's cart for the slide-out mini cart. */
export async function getMiniCart(): Promise<MiniCart> {
  const cart = await loadCart();
  return {
    count: cart.count,
    subtotal: cart.subtotalInclVat,
    canCheckout: cart.canCheckout,
    issues: cart.issues.filter((i) => i.level === "error").length,
    items: cart.items.map((i) => ({
      id: i.product.id,
      title: productTitle(i.product),
      brand: i.product.brand,
      url: productUrl(i.product),
      image: i.product.images[0]?.url ?? null,
      quantity: i.quantity,
      unitPrice: i.product.priceInclVat,
      compareAt: i.product.compareAtPriceInclVat,
      lineTotal: i.lineTotal,
      installation: i.installation,
      problem: i.unavailable ? "No longer available" : i.overStock ? `Only ${i.available} in stock` : null,
    })),
  };
}
