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

export function formatRand(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(amount);
}
