// Shop filters, sorting and facet counts. Pure functions over the cached
// catalogue so they are fast and unit-testable. Filters live in the URL
// (?brand=Deye&brand=Dyness&min=5000&stock=1&sort=price_asc).

import { z } from "zod";
import type { CategorySlug } from "./classify";
import { availability, specNum, specText, type Product } from "./types";

/** The headline size spec used for the size filter and sort in each category. */
export const SIZE_SPEC: Record<CategorySlug, { key: string; label: string; unit: string; step: number }> = {
  "solar-panels": { key: "wattage_w", label: "Wattage", unit: "W", step: 5 },
  batteries: { key: "capacity_kwh", label: "Capacity", unit: "kWh", step: 0.5 },
  inverters: { key: "rated_power_kw", label: "Power", unit: "kW", step: 0.5 },
  kits: { key: "inverter_power_kw", label: "Inverter size", unit: "kW", step: 0.5 },
};

/** The spec shown as "Type" for each category. */
export const TYPE_SPEC: Partial<Record<CategorySlug, string>> = {
  "solar-panels": "cell_type",
  inverters: "inverter_type",
  kits: "config",
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
  sort: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      const s = Array.isArray(v) ? v[0] : v;
      return (s && s in SORTS ? s : "featured") as SortKey;
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
  size: { min: number; max: number } | null;
  hasNrs: boolean;
};

function counts(values: (string | null)[]) {
  const m = new Map<string, number>();
  values.forEach((v) => v && m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
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
    size: sizes.length ? { min: Math.min(...sizes), max: Math.max(...sizes) } : null,
    hasNrs: products.some((p) => p.nrsApproved === true),
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
  if (f.sort && f.sort !== "featured") params.set("sort", f.sort);
  const s = params.toString();
  return s ? `?${s}` : "";
}
