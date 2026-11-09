import { availability, productFullTitle, productUrl, specNum, specText, type Product } from "@/lib/catalogue/types";
import { checkPair, planStrings, type Override } from "@/lib/compatibility/engine";

// Data for the "Build your system" page, worked out on the server so the
// browser gets only what it needs: which panel counts each inverter can take
// (string voltage and PV input checked) and which batteries suit it.

export type BuilderItem = {
  id: string;
  name: string;
  brand: string | null;
  url: string;
  image: string | null;
  price: number;
  /** How many we can sell now. */ stock: number;
};
export type BuilderPanel = BuilderItem & { watts: number };
export type BuilderInverter = BuilderItem & { kw: number; counts: Record<string, number[]>; batteryIds: string[] };
export type BuilderBattery = BuilderItem & { kwh: number; voltage: number | null };
export type BuilderData = { panels: BuilderPanel[]; inverters: BuilderInverter[]; batteries: BuilderBattery[] };

const MAX_PANELS = 30;
/** Batteries of one model the builder offers; the technician confirms how many the inverter takes. */
export const MAX_BATTERIES = 8;
const MIN_PANEL_STOCK = 6;
const inStock = (p: Product) => availability(p).state === "in_stock" || availability(p).state === "low_stock";
const item = (p: Product): BuilderItem => ({
  id: p.id,
  name: productFullTitle(p),
  brand: p.brand,
  url: productUrl(p),
  image: p.images[0]?.url ?? null,
  price: p.priceInclVat,
  stock: p.allowBackorder ? 999 : p.stockQty,
});

export function builderData(products: Product[], overrides: Override[] = []): BuilderData {
  // A few mainstream panels: best value per watt, one per brand.
  const seen = new Set<string | null>();
  const panels = products
    // enough in stock for a real system, not just a couple of panels
    .filter((p) => p.category === "solar-panels" && inStock(p) && (p.allowBackorder || p.stockQty >= MIN_PANEL_STOCK) && specNum(p, "voc_v") !== null)
    .map((p) => ({ p, w: specNum(p, "wattage_w") ?? 0 }))
    .filter(({ w }) => w >= 400 && w <= 650)
    .sort((a, b) => a.p.priceInclVat / a.w - b.p.priceInclVat / b.w)
    .filter(({ p }) => !seen.has(p.brand) && seen.add(p.brand))
    .slice(0, 4);

  const batteries = products.filter(
    (b) => b.category === "batteries" && inStock(b) && specNum(b, "capacity_kwh") !== null && b.priceInclVat < 80_000,
  );

  const inverters: BuilderInverter[] = [];
  for (const inv of products) {
    if (inv.category !== "inverters" || !inStock(inv) || specText(inv, "inverter_type") === "Grid-tie") continue;
    const kw = specNum(inv, "rated_power_kw");
    const maxPvW = specNum(inv, "max_pv_power_w") ?? (kw ?? 0) * 1000;
    if (!kw || kw > 16 || !maxPvW) continue;
    const counts: Record<string, number[]> = {};
    for (const { p, w } of panels) {
      const ok: number[] = [];
      for (let n = 1; n <= Math.min(MAX_PANELS, Math.floor(maxPvW / w)); n++) if (planStrings(p, inv, n).status === "ok") ok.push(n);
      if (ok.length) counts[p.id] = ok;
    }
    if (!Object.keys(counts).length) continue;
    const batteryIds = batteries
      .filter((b) => {
        const r = checkPair(inv, b, overrides).status;
        return r === "confirmed" || r === "likely";
      })
      .map((b) => b.id);
    inverters.push({ ...item(inv), kw, counts, batteryIds });
  }
  inverters.sort((a, b) => a.price - b.price);

  const usedBatteries = new Set(inverters.flatMap((i) => i.batteryIds));
  return {
    panels: panels.map(({ p, w }) => ({ ...item(p), watts: w })),
    inverters,
    batteries: batteries
      .filter((b) => usedBatteries.has(b.id))
      .map((b) => ({ ...item(b), kwh: specNum(b, "capacity_kwh")!, voltage: specNum(b, "nominal_voltage_v") }))
      .sort((a, b) => a.price - b.price),
  };
}
