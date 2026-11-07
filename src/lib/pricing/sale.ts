// Sale pricing. A product is on sale when its "was" price (compare-at) is
// above its price; the shop then shows the old price struck through and a
// "-X%" ribbon on the photo. Admins never have to type the was-price: lowering
// a price keeps the higher previous price as the was-price, and raising it back
// to (or above) the was-price ends the sale.

export type SalePrice = { price: number; compareAt: number | null };

const cents = (n: number) => Math.round(n * 100) / 100;

/** Whole-number percentage off, or null when not on sale (or under 1%). */
export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (compareAt === null || compareAt === undefined || !(compareAt > price) || compareAt <= 0) return null;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct >= 1 ? pct : null;
}

/** New price and was-price after an admin sets the price to `newPrice`. */
export function changePrice(current: SalePrice, newPrice: number): SalePrice {
  const price = cents(newPrice);
  // The highest price the customer has seen recently is the honest "was" price.
  const was = Math.max(current.compareAt ?? 0, current.price);
  if (price < was) return { price, compareAt: cents(was) };
  return { price, compareAt: null };
}

/** Takes `percent` off the current price (keeping the original was-price). */
export function applyDiscount(current: SalePrice, percent: number): SalePrice {
  const p = Math.min(90, Math.max(1, percent));
  const base = current.compareAt && current.compareAt > current.price ? current.compareAt : current.price;
  return { price: cents(base * (1 - p / 100)), compareAt: cents(base) };
}

/** Ends a sale: back to the was-price. */
export function endSale(current: SalePrice): SalePrice {
  return current.compareAt && current.compareAt > current.price
    ? { price: current.compareAt, compareAt: null }
    : { price: current.price, compareAt: null };
}
