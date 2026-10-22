// Builds the cart the customer sees from the cookie lines and the live
// catalogue: fresh prices, stock limits, VAT and system compatibility checks.

import type { Product } from "@/lib/catalogue/types";
import { canPurchase } from "@/lib/catalogue/types";
import { checkSystem, type CartIssue, type Override } from "@/lib/compatibility/engine";
import { fromCents, toCents, vatPortion } from "@/lib/pricing/vat";
import type { CartCookieLine } from "./cart";

export type CartItem = {
  product: Product;
  quantity: number;
  installation: boolean;
  lineTotal: number;
  available: number;
  /** More requested than in stock (and no backorder). */
  overStock: boolean;
  unavailable: boolean;
};

export type CartSummary = {
  items: CartItem[];
  count: number;
  subtotalInclVat: number;
  vatIncluded: number;
  installationRequested: boolean;
  issues: CartIssue[];
  /** Lines dropped because the product no longer exists. */
  removed: number;
  canCheckout: boolean;
};

export function buildCartSummary(
  lines: CartCookieLine[],
  catalogue: Product[],
  available: Map<string, number> = new Map(),
  overrides: Override[] = [],
): CartSummary {
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  const items: CartItem[] = [];
  let removed = 0;
  for (const line of lines) {
    const product = byId.get(line.id);
    if (!product) {
      removed += 1;
      continue;
    }
    const avail = available.get(product.id) ?? product.stockQty;
    const unavailable = !canPurchase(product, avail);
    items.push({
      product,
      quantity: line.q,
      installation: line.i && product.installationEligible,
      lineTotal: fromCents(toCents(product.priceInclVat) * line.q),
      available: avail,
      overStock: !product.allowBackorder && line.q > avail,
      unavailable,
    });
  }
  const subtotal = fromCents(items.reduce((sum, i) => sum + toCents(i.lineTotal), 0));
  const issues = checkSystem(items.map((i) => ({ product: i.product, quantity: i.quantity })), overrides);
  return {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    subtotalInclVat: subtotal,
    vatIncluded: vatPortion(subtotal),
    installationRequested: items.some((i) => i.installation),
    issues,
    removed,
    canCheckout: items.length > 0 && items.every((i) => !i.unavailable && !i.overStock) && !issues.some((i) => i.level === "error"),
  };
}
