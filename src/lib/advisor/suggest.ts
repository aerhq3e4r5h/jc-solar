// Picks real, in-stock products for the advisor: a whole system for a
// sized need, or the partners that work with one product. Doing this in one
// tool call (instead of the model searching and checking pairs one by one)
// keeps an answer to two or three model calls, which is what makes the
// advisor quick and keeps it inside Google's per-minute limits.

import { specNum, specText, type Product } from "@/lib/catalogue/types";
import { checkPair, planStrings, type Override, type PairResult } from "@/lib/compatibility/engine";

const inStock = (p: Product) => p.stockQty > 0;
const works = (r: PairResult) => r.status === "confirmed" || r.status === "likely";
const MAX_BATTERIES = 6;

export type SystemNeed = {
  inverterKw: number;
  /** Rated (nameplate) battery capacity needed, kWh. 0 for none. */
  batteryKwh: number;
  /** Solar array size, or null when solar wasn't sized. */
  solarKwp: number | null;
  phase?: "single" | "three";
};

export type SystemSuggestion = {
  inverter: Product;
  battery: {
    product: Product;
    quantity: number;
    totalKwh: number;
    pair: PairResult;
  } | null;
  panels: {
    product: Product;
    quantity: number;
    kwp: number;
    strings: string | null;
  } | null;
  total: number;
};

const phaseOf = (p: Product) => (specText(p, "phases")?.startsWith("Three") ? "three" : "single");
const pvInputW = (inverter: Product) => specNum(inverter, "max_pv_power_w") ?? (specNum(inverter, "rated_power_kw") ?? 0) * 1300;

/** The cheapest set of one battery model that reaches `kwh` on this inverter. Same brand wins when it costs about the same. */
function batteriesFor(inverter: Product, kwh: number, catalogue: Product[], overrides: Override[]) {
  if (kwh <= 0) return null;
  return (
    catalogue
      .filter((b) => b.category === "batteries" && inStock(b))
      .map((b) => {
        const each = specNum(b, "capacity_kwh") ?? 0;
        const quantity = each > 0 ? Math.max(1, Math.ceil(kwh / each - 1e-9)) : 0;
        return {
          product: b,
          quantity,
          totalKwh: Math.round(each * quantity * 100) / 100,
          pair: checkPair(inverter, b, overrides),
        };
      })
      .filter((o) => o.quantity > 0 && o.quantity <= MAX_BATTERIES && o.quantity <= o.product.stockQty && works(o.pair))
      .map((o) => ({ ...o, cost: o.product.priceInclVat * o.quantity }))
      // A confirmed pair first; then price, with a small preference for the inverter's own brand.
      .sort(
        (x, y) =>
          Number(y.pair.status === "confirmed") - Number(x.pair.status === "confirmed") ||
          x.cost * (x.product.brand === inverter.brand ? 0.9 : 1) - y.cost * (y.product.brand === inverter.brand ? 0.9 : 1),
      )[0] ?? null
  );
}

/** Mainstream panels (400 to 650 W, best price per watt) that reach `kwp` and string up on this inverter. */
function panelsFor(inverter: Product, kwp: number, catalogue: Product[]): SystemSuggestion["panels"] {
  const candidates = catalogue
    .filter((p) => p.category === "solar-panels" && inStock(p))
    .map((p) => ({ p, w: specNum(p, "wattage_w") ?? 0 }))
    .filter(({ w }) => w >= 400 && w <= 650)
    .map(({ p, w }) => ({
      p,
      w,
      n: Math.max(1, Math.ceil((kwp * 1000) / w - 1e-9)),
    }))
    .filter(({ p, n }) => n <= p.stockQty)
    .sort((a, b) => a.p.priceInclVat / a.w - b.p.priceInclVat / b.w);
  let unplanned: SystemSuggestion["panels"] = null;
  for (const { p, w, n } of candidates) {
    const plan = planStrings(p, inverter, n);
    const kw = Math.round(n * w) / 1000;
    if (plan.status === "ok") {
      return {
        product: p,
        quantity: n,
        kwp: kw,
        strings: plan.strings === 1 ? `1 string of ${n}` : `${plan.strings} strings of up to ${plan.perString}`,
      };
    }
    // No voltage data on file: still a usable suggestion, the technician plans the strings.
    if (plan.status === "unknown") unplanned ??= { product: p, quantity: n, kwp: kw, strings: null };
  }
  return unplanned;
}

/** The lowest-priced in-stock inverter, batteries and panels that meet a sized need, or null when stock can't cover it. */
export function suggestSystem(catalogue: Product[], overrides: Override[], need: SystemNeed): SystemSuggestion | null {
  const wantsSolar = need.solarKwp !== null && need.solarKwp > 0;
  const fits = (i: Product) => {
    const kw = specNum(i, "rated_power_kw") ?? 0;
    // Big enough, but not a commercial unit for a home just because it is cheap per kW.
    return kw >= need.inverterKw && kw <= Math.max(need.inverterKw * 3, need.inverterKw + 5);
  };
  const all = catalogue.filter((i) => i.category === "inverters" && inStock(i) && fits(i) && specText(i, "inverter_type") !== "Grid-tie");
  const phase = all.filter((i) => phaseOf(i) === (need.phase ?? "single"));
  // Without a stated supply, a home is single phase; fall back to anything that fits rather than suggest nothing.
  const pool = phase.length || need.phase ? phase : all;
  // With solar, the inverter's solar input has to take the array, and a hybrid is the right type next to the grid.
  const takesArray = pool.filter((i) => !wantsSolar || pvInputW(i) >= need.solarKwp! * 1000 * 0.95);
  const hybrid = takesArray.filter((i) => !wantsSolar || specText(i, "inverter_type") === "Hybrid");
  const inverters = hybrid.length ? hybrid : takesArray.length ? takesArray : pool;

  const options: SystemSuggestion[] = [];
  for (const inverter of inverters) {
    const battery = batteriesFor(inverter, need.batteryKwh, catalogue, overrides);
    if (need.batteryKwh > 0 && !battery) continue;
    const panels = wantsSolar ? panelsFor(inverter, need.solarKwp!, catalogue) : null;
    options.push({
      inverter,
      battery: battery && {
        product: battery.product,
        quantity: battery.quantity,
        totalKwh: battery.totalKwh,
        pair: battery.pair,
      },
      panels,
      total: inverter.priceInclVat + (battery?.cost ?? 0) + (panels ? panels.product.priceInclVat * panels.quantity : 0),
    });
  }
  // A system with panels planned beats one without when solar was asked for; then price.
  return options.sort((a, b) => Number(!!b.panels) - Number(!!a.panels) || a.total - b.total)[0] ?? null;
}

// --- What works with one product -----------------------------------------

const FILLER = new Set(["a", "an", "the", "for", "with", "and", "inverter", "inverters", "battery", "batteries", "lithium", "solar", "my", "our"]);

/**
 * Finds the inverter or battery a customer means from a SKU or from words
 * like "Deye 5 kW hybrid": a size with a unit is matched against the
 * product's size, the other words against its brand, name, type and SKU.
 */
export function findProducts(catalogue: Product[], text: string): Product[] {
  const want = text.trim().toLowerCase();
  const pool = catalogue.filter((p) => p.category === "inverters" || p.category === "batteries");
  const exact = pool.find((p) => p.sku.toLowerCase() === want);
  if (exact) return [exact];

  const size = /(\d+(?:[.,]\d+)?)\s*(kwh|kw)\b/.exec(want);
  const amount = size ? Number(size[1].replace(",", ".")) : null;
  const words = (size ? want.replace(size[0], " ") : want).split(/[^a-z0-9.-]+/).filter((w) => w && !FILLER.has(w));
  return pool
    .filter((p) => {
      if (size) {
        if (p.category !== (size[2] === "kw" ? "inverters" : "batteries")) return false;
        const actual = specNum(p, size[2] === "kw" ? "rated_power_kw" : "capacity_kwh");
        if (actual === null || Math.abs(actual - amount!) > amount! * 0.08) return false;
      }
      const hay = `${p.brand ?? ""} ${p.name} ${p.sku} ${specText(p, "inverter_type") ?? ""} ${specText(p, "phases") ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => Number(inStock(b)) - Number(inStock(a)) || a.priceInclVat - b.priceInclVat);
}

/** In-stock batteries for an inverter, or inverters for a battery: confirmed pairs first, then the same brand, then price. */
export function compatiblePartners(product: Product, catalogue: Product[], overrides: Override[]): { product: Product; pair: PairResult }[] {
  const wanted = product.category === "inverters" ? "batteries" : "inverters";
  return catalogue
    .filter((p) => p.category === wanted && inStock(p))
    .map((p) => ({
      product: p,
      pair: product.category === "inverters" ? checkPair(product, p, overrides) : checkPair(p, product, overrides),
    }))
    .filter((o) => works(o.pair))
    .sort(
      (x, y) =>
        Number(y.pair.status === "confirmed") - Number(x.pair.status === "confirmed") ||
        Number(y.product.brand === product.brand) - Number(x.product.brand === product.brand) ||
        x.product.priceInclVat - y.product.priceInclVat,
    );
}
