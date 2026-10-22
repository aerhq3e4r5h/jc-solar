// South African VAT helpers. All money is handled in cents internally so
// rounding happens exactly once, at the edge.

export const VAT_RATE = 0.15;

export function toCents(rand: number): number {
  return Math.round(rand * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Price including VAT, rounded to the cent. */
export function addVat(amountExclVat: number, rate = VAT_RATE): number {
  return fromCents(Math.round(toCents(amountExclVat) * (1 + rate)));
}

/** The VAT portion of a VAT-inclusive amount, rounded to the cent. */
export function vatPortion(amountInclVat: number, rate = VAT_RATE): number {
  const cents = toCents(amountInclVat);
  return fromCents(Math.round((cents * rate) / (1 + rate)));
}

/**
 * "R14,375.00". Formatted by hand rather than with Intl, because Node and
 * browsers ship different en-ZA rules ("R 14 375,00" vs "R 14,375.00"),
 * which would show two formats on one page and break hydration.
 */
export function formatRand(amount: number): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0 ? "-" : ""}R${whole}.${String(cents % 100).padStart(2, "0")}`;
}
