// Shop filters, sorting and facet counts. Pure functions over the cached
// catalogue so they are fast and unit-testable. Filters live in the URL
// (?brand=Deye&brand=Dyness&min=5000&stock=1&sort=price_asc).

import { z } from "zod";
import type { CategorySlug } from "./classify";
import { discountPercent } from "@/lib/pricing/sale";
import { availability, specNum, specText, type Product } from "./types";

/** The headline size spec used for the size filter and sort in each category. */
export const SIZE_SPEC: Record<CategorySlug, { key: string; label: string; unit: string; step: number }> = {
  "solar-panels": { key: "wattage_w", label: "Wattage", unit: "W", step: 5 },
  batteries: { key: "capacity_kwh", label: "Capacity", unit: "kWh", step: 0.5 },
  inverters: { key: "rated_power_kw", label: "Power", unit: "kW", step: 0.5 },
  kits: { key: "inverter_power_kw", label: "Inverter size", unit: "kW", step: 0.5 },
  "voltage-stabilizers": { key: "capacity_kva", label: "Capacity", unit: "kVA", step: 1 },
  "air-conditioners": { key: "cooling_btu", label: "Cooling", unit: "BTU", step: 1000 },
};

/** The spec shown as "Type" for each category. */
export const TYPE_SPEC: Partial<Record<CategorySlug, string>> = {
  "solar-panels": "cell_type",
  inverters: "inverter_type",
  kits: "config",
  "voltage-stabilizers": "stabilizer_type",
};

export const SORTS = {
  featured: "Featured",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  size_desc: "Size: largest first",
  size_asc: "Size: smallest first",
  name: "Name A–Z",
} as const;
export type SortKey = keyof typeof SORTS;

const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).map((s) => s.slice(0, 80)).filter(Boolean).slice(0, 30));

const num = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    const s = Array.isArray(v) ? v[0] : v;
    if (s === undefined || s.trim() === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

const flag = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v[0] : v) === "1");

/** Results per "page" before "Load more". */
export const PAGE_SIZE = 24;

const filterSchema = z.object({
  q: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => ((Array.isArray(v) ? v[0] : v) ?? "").trim().slice(0, 100)),
  brand: list,
  type: list,
  phase: list,
  min: num,
  max: num,
  smin: num,
  smax: num,
  stock: flag,
  nrs: flag,
  sale: flag,
  sort: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      const s = Array.isArray(v) ? v[0] : v;
      return (s && s in SORTS ? s : "featured") as SortKey;
    }),
  /** Grid of tiles, or a list with spec columns (for installers). */
  view: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => ((Array.isArray(v) ? v[0] : v) === "list" ? "list" : "grid") as "grid" | "list"),
  /** How many results to show ("Load more" adds a page). */
  show: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      const n = Number(Array.isArray(v) ? v[0] : v);
      return Number.isInteger(n) && n > PAGE_SIZE ? Math.min(n, 480) : PAGE_SIZE;
    }),
});


export type Filters = z.output<typeof filterSchema>;
export type SearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(params: SearchParams): Filters {
  return filterSchema.parse(params);
}

export function activeFilterCount(f: Filters): number {
  return (
    f.brand.length +
    f.type.length +
    f.phase.length +
    (f.min !== null || f.max !== null ? 1 : 0) +
    (f.smin !== null || f.smax !== null ? 1 : 0) +
    (f.stock ? 1 : 0) +
    (f.nrs ? 1 : 0) +
    (f.sale ? 1 : 0) +
    (f.q ? 1 : 0)
  );
}

function phaseOf(p: Product): string | null {
  const phases = specText(p, "phases");
  if (!phases) return null;
  return phases.startsWith("Three") ? "three" : "single";
}

function matchesSearch(p: Product, q: string): boolean {
  const haystack = `${p.name} ${p.sku} ${p.brand ?? ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

export function applyFilters(products: Product[], f: Filters, category?: CategorySlug): Product[] {
  const sizeKey = category ? SIZE_SPEC[category].key : null;
  const typeKey = category ? TYPE_SPEC[category] : undefined;
  return products.filter((p) => {
    if (f.q && !matchesSearch(p, f.q)) return false;
    if (f.brand.length && !f.brand.includes(p.brand ?? "")) return false;
    if (f.min !== null && p.priceInclVat < f.min) return false;
    if (f.max !== null && p.priceInclVat > f.max) return false;
    if (sizeKey && (f.smin !== null || f.smax !== null)) {
      const size = specNum(p, sizeKey);
      if (size === null) return false;
      if (f.smin !== null && size < f.smin) return false;
      if (f.smax !== null && size > f.smax) return false;
    }
    if (typeKey && f.type.length && !f.type.includes(specText(p, typeKey) ?? "")) return false;
    if (f.phase.length && !f.phase.includes(phaseOf(p) ?? "")) return false;
    if (f.stock && availability(p).state === "out_of_stock") return false;
    if (f.nrs && p.nrsApproved !== true) return false;
    if (f.sale && !discountPercent(p.priceInclVat, p.compareAtPriceInclVat)) return false;
    return true;
  });
}

const stockRank = (p: Product) => (availability(p).state === "out_of_stock" ? 1 : 0);

export function sortProducts(products: Product[], sort: SortKey, category?: CategorySlug): Product[] {
  const sizeKey = category ? SIZE_SPEC[category].key : null;
  const size = (p: Product) => (sizeKey ? specNum(p, sizeKey) : null);
  const sorted = [...products];
  const bySize = (dir: 1 | -1) => (a: Product, b: Product) => {
    const sa = size(a);
    const sb = size(b);
    if (sa === null && sb === null) return 0;
    if (sa === null) return 1;
    if (sb === null) return -1;
    return (sa - sb) * dir;
  };
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.priceInclVat - b.priceInclVat);
    case "price_desc":
      return sorted.sort((a, b) => b.priceInclVat - a.priceInclVat);
    case "size_asc":
      return sorted.sort(bySize(1));
    case "size_desc":
      return sorted.sort(bySize(-1));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "featured":
    default:
      // Featured first, then in stock, then by size, so the useful products lead.
      return sorted.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          stockRank(a) - stockRank(b) ||
          bySize(1)(a, b) ||
          a.priceInclVat - b.priceInclVat,
      );
  }
}

export type Facets = {
  brands: { value: string; count: number }[];
  types: { value: string; count: number }[];
  phases: { value: "single" | "three"; label: string; count: number }[];
  price: { min: number; max: number } | null;
  /** How many products fall in each of 24 price bands between min and max (for the slider's histogram). */
  priceBands: number[];
  /** "log" when prices span more than 20x (a few huge systems), so the bands and slider are spread evenly by ratio. */
  priceScale: "linear" | "log";
  size: { min: number; max: number } | null;
  /** Distinct sizes with counts, for "Shop by size". */
  sizes: { value: number; count: number }[];
  hasNrs: boolean;
  hasSale: boolean;
};

function counts(values: (string | null)[]) {
  const m = new Map<string, number>();
  values.forEach((v) => v && m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
}

function priceScaleOf(values: number[]): "linear" | "log" {
  return values.length && Math.min(...values) > 0 && Math.max(...values) / Math.min(...values) > 20 ? "log" : "linear";
}

function bands(values: number[], n: number, scale: "linear" | "log"): number[] {
  if (!values.length) return [];
  const f = scale === "log" ? Math.log : (v: number) => v;
  const lo = f(Math.floor(Math.min(...values)));
  const hi = f(Math.ceil(Math.max(...values)));
  const out = new Array(n).fill(0);
  for (const v of values) out[Math.min(n - 1, Math.floor(((f(v) - lo) / Math.max(1e-9, hi - lo)) * n))] += 1;
  return out;
}

/** Filter options for a category, counted over all its products. */
export function buildFacets(products: Product[], category: CategorySlug): Facets {
  const sizes = products.map((p) => specNum(p, SIZE_SPEC[category].key)).filter((n): n is number => n !== null);
  const prices = products.map((p) => p.priceInclVat);
  const typeKey = TYPE_SPEC[category];
  const phaseCounts = counts(products.map(phaseOf));
  return {
    brands: counts(products.map((p) => p.brand)),
    types: typeKey ? counts(products.map((p) => specText(p, typeKey))) : [],
    phases: phaseCounts.map(({ value, count }) => ({
      value: value as "single" | "three",
      label: value === "three" ? "Three phase" : "Single phase",
      count,
    })),
    price: prices.length ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) } : null,
    priceBands: bands(prices, 24, priceScaleOf(prices)),
    priceScale: priceScaleOf(prices),
    size: sizes.length ? { min: Math.min(...sizes), max: Math.max(...sizes) } : null,
    sizes: [...sizes.reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map<number, number>())]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value - b.value),
    hasNrs: products.some((p) => p.nrsApproved === true),
    hasSale: products.some((p) => discountPercent(p.priceInclVat, p.compareAtPriceInclVat) !== null),
  };
}

/** Builds a query string from filters, dropping empty values. */
export function filtersToQuery(f: Partial<Filters>): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  f.brand?.forEach((b) => params.append("brand", b));
  f.type?.forEach((t) => params.append("type", t));
  f.phase?.forEach((p) => params.append("phase", p));
  for (const key of ["min", "max", "smin", "smax"] as const) {
    const v = f[key];
    if (v !== null && v !== undefined) params.set(key, String(v));
  }
  if (f.stock) params.set("stock", "1");
  if (f.nrs) params.set("nrs", "1");
  if (f.sale) params.set("sale", "1");
  if (f.sort && f.sort !== "featured") params.set("sort", f.sort);
  if (f.view === "list") params.set("view", "list");
  if (f.show && f.show > PAGE_SIZE) params.set("show", String(f.show));
  const s = params.toString();
  return s ? `?${s}` : "";
}
