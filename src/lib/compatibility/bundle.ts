import { availability, specNum, type Product } from "@/lib/catalogue/types";
import { checkPair, planStrings, type Override } from "./engine";

// "Complete the system" on a product page: the other parts that make a
// working system with this one, picked only from in-stock products the
// compatibility rules accept.

export type BundleLine = { product: Product; quantity: number; why: string };

const inStock = (p: Product) => availability(p).state === "in_stock" || availability(p).state === "low_stock";

/** Compatible batteries for an inverter: same brand first, then cheapest. */
function bestBattery(inverter: Product, catalogue: Product[], overrides: Override[]) {
  return catalogue
    .filter((b) => b.category === "batteries" && inStock(b))
    .map((b) => ({ b, r: checkPair(inverter, b, overrides) }))
    .filter(({ r }) => r.status === "confirmed" || r.status === "likely")
    .sort((x, y) => Number(y.b.brand === inverter.brand) - Number(x.b.brand === inverter.brand) || x.b.priceInclVat - y.b.priceInclVat)[0];
}

/** Compatible inverters for a battery: same brand first, then cheapest. */
function bestInverter(battery: Product, catalogue: Product[], overrides: Override[]) {
  return catalogue
    .filter((i) => i.category === "inverters" && inStock(i))
    .map((i) => ({ i, r: checkPair(i, battery, overrides) }))
    .filter(({ r }) => r.status === "confirmed" || r.status === "likely")
    .sort((x, y) => Number(y.i.brand === battery.brand) - Number(x.i.brand === battery.brand) || x.i.priceInclVat - y.i.priceInclVat)[0];
}

/**
 * Panels for an inverter: a mainstream in-stock panel (400 to 650 W, best
 * price per watt) and the count that fills the inverter's PV input without
 * breaking its string voltage limit.
 */
function panelsFor(inverter: Product, catalogue: Product[]): BundleLine | null {
  const pvW = specNum(inverter, "max_pv_power_w") ?? (specNum(inverter, "rated_power_kw") ?? 0) * 1000;
  if (!pvW) return null;
  const candidates = catalogue
    .filter((p) => p.category === "solar-panels" && inStock(p))
    .map((p) => ({ p, w: specNum(p, "wattage_w") ?? 0 }))
    .filter(({ w }) => w >= 400 && w <= 650)
    .sort((a, b) => a.p.priceInclVat / a.w - b.p.priceInclVat / b.w);
  for (const { p, w } of candidates) {
    // Most panels that fit the PV input, then step down until the strings work.
    for (let n = Math.min(Math.floor(pvW / w), Math.min(p.stockQty, 40)); n >= 4; n--) {
      const plan = planStrings(p, inverter, n);
      if (plan.status === "ok") {
        const strings = plan.strings === 1 ? "1 string" : `${plan.strings} strings of ${plan.perString}`;
        return { product: p, quantity: n, why: `${n} x ${w} W fills the inverter's solar input in ${strings}` };
      }
    }
  }
  return null;
}

/** The parts that complete a system with `product`, or null when there's nothing sensible to suggest. */
export function completeTheSystem(product: Product, catalogue: Product[], overrides: Override[] = []): BundleLine[] | null {
  const lines: BundleLine[] = [];
  if (product.category === "inverters") {
    const battery = bestBattery(product, catalogue, overrides);
    if (battery) lines.push({ product: battery.b, quantity: 1, why: battery.r.reason });
    const panels = panelsFor(product, catalogue);
    if (panels) lines.push(panels);
  } else if (product.category === "batteries") {
    const inverter = bestInverter(product, catalogue, overrides);
    if (inverter) {
      lines.push({ product: inverter.i, quantity: 1, why: inverter.r.reason });
      const panels = panelsFor(inverter.i, catalogue);
      if (panels) lines.push(panels);
    }
  }
  return lines.length ? lines : null;
}
