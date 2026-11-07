import { availability, specNum, specText, type Product } from "@/lib/catalogue/types";
import type { CalculatorPrices } from "@/components/home/savings-calculator";

const inStock = (p: Product) => availability(p).state === "in_stock" || availability(p).state === "low_stock";

/** Current stock prices for the savings calculator: panel price per watt and hybrid inverters by size. */
export function calculatorPrices(products: Product[]): CalculatorPrices {
  const perWatt = products
    .filter((p) => p.category === "solar-panels" && inStock(p))
    .map((p) => ({ w: specNum(p, "wattage_w") ?? 0, price: p.priceInclVat }))
    .filter(({ w }) => w >= 400 && w <= 650)
    .map(({ w, price }) => price / w)
    .sort((a, b) => a - b);
  const bySize = new Map<number, number>();
  for (const p of products) {
    if (p.category !== "inverters" || !inStock(p) || specText(p, "inverter_type") !== "Hybrid") continue;
    const kw = specNum(p, "rated_power_kw");
    if (!kw || kw > 30) continue;
    bySize.set(kw, Math.min(bySize.get(kw) ?? Infinity, p.priceInclVat));
  }
  const battery = products
    .filter((p) => p.category === "batteries" && inStock(p))
    .map((p) => ({ kwh: specNum(p, "capacity_kwh") ?? 0, v: specNum(p, "nominal_voltage_v") ?? 0, price: p.priceInclVat }))
    .filter((b) => b.kwh >= 4.8 && b.kwh <= 5.5 && b.v >= 44 && b.v <= 58)
    .sort((a, b) => a.price - b.price)[0];
  return {
    battery: battery ? { kwh: battery.kwh, price: battery.price } : null,
    // The median-ish cheap panel, not the single cheapest, so one clearance item doesn't skew it.
    panelPerWatt: perWatt.length ? perWatt[Math.min(perWatt.length - 1, 2)] : 3,
    inverters: [...bySize.entries()].map(([kw, price]) => ({ kw, price })).sort((a, b) => a.kw - b.kw),
  };
}
