import type { CategorySlug } from "@/lib/catalogue/classify";
import { CATEGORIES, type Product } from "@/lib/catalogue/types";

// Product search. Every word must match the brand, name, SKU or category.
// It forgives the usual misspellings (one wrong letter in a longer word),
// knows a few local synonyms (inverta, stabiliser, aircon, kilowatt), and
// puts an exact SKU match first.

/** Whole phrases people type that the catalogue words differently. */
const PHRASES: [RegExp, string][] = [
  [/\bair[\s-]?con(ditioner|ditioning|ditioners)?s?\b/g, "aircon"],
  [/\bsolar\s+panels?\b/g, "panel"],
  [/\bkilo\s?watts?\b/g, "kw"],
  [/\bkilowatt[\s-]?hours?\b/g, "kwh"],
  [/\bvoltage\s+regulators?\b/g, "stabilizer"],
];

/** Single words: alternatives that count as a match. */
const SYNONYMS: Record<string, string[]> = {
  inverta: ["inverter"],
  invertor: ["inverter"],
  invertors: ["inverter"],
  inverters: ["inverter"],
  stabiliser: ["stabilizer"],
  stabilisers: ["stabilizer"],
  stabilizers: ["stabilizer"],
  avr: ["stabilizer"],
  batteries: ["battery"],
  batt: ["battery"],
  panels: ["panel"],
  pv: ["panel", "solar"],
  lithium: ["lithium", "lifepo4", "lfp"],
  lifepo4: ["lithium", "lifepo4", "lfp"],
  lfp: ["lithium", "lifepo4", "lfp"],
  kits: ["kit", "web special"],
  kit: ["kit", "web special"],
  geyser: ["geyser"],
  hv: ["hv", "high voltage"],
  lv: ["lv", "low voltage"],
  "3phase": ["three phase"],
  "1phase": ["single phase"],
};

function normalise(query: string): string[] {
  let q = query.toLowerCase();
  for (const [re, to] of PHRASES) q = q.replace(re, to);
  return q
    .replace(/\bthree[\s-]phase\b/g, "3phase")
    .replace(/\bsingle[\s-]phase\b/g, "1phase")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9.\-/]/g, ""))
    .filter(Boolean)
    .slice(0, 6);
}

/** True when a and b differ by at most `max` edits (insert, delete, change, or swap two letters). */
export function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return false;
  }
  return d[a.length][b.length] <= max;
}

/** Edits allowed for a typo: none for short words or numbers, 1 from 5 letters, 2 from 9. */
const typoBudget = (w: string) => (/\d/.test(w) || w.length < 5 ? 0 : w.length < 9 ? 1 : 2);

type Indexed = { p: Product; brand: string; name: string; sku: string; category: string; tokens: string[] };

function index(p: Product): Indexed {
  const brand = (p.brand ?? "").toLowerCase();
  const name = p.name.toLowerCase();
  const sku = p.sku.toLowerCase();
  const category = `${CATEGORIES[p.category].name} ${CATEGORIES[p.category].singular}`.toLowerCase();
  const tokens = [...new Set(`${brand} ${name} ${category}`.split(/[^a-z0-9]+/).filter((t) => t.length >= 4))];
  return { p, brand, name, sku, category, tokens };
}

/** Score one query word against a product, or null when it doesn't match at all. */
function scoreWord(x: Indexed, w: string): number | null {
  const alts = SYNONYMS[w] ? [w, ...SYNONYMS[w]] : [w];
  let best: number | null = null;
  for (const a of alts) {
    let s = 0;
    let hit = false;
    if (x.sku === a) (s += 50), (hit = true);
    // A SKU prefix only counts as a strong hit for model-like words ("sun-5k", "dyn-dl"), not a brand name some SKUs start with.
    else if (x.sku.startsWith(a) && /\d|-/.test(a)) (s += 20), (hit = true);
    else if (x.sku.includes(a)) hit = true;
    if (x.brand === a) (s += 15), (hit = true);
    else if (x.brand.startsWith(a)) (s += 8), (hit = true);
    if (new RegExp(`\\b${a.replace(/[.\-/]/g, "\\$&")}`).test(x.name)) (s += 5), (hit = true);
    else if (x.name.includes(a)) (s += 2), (hit = true);
    if (x.category.includes(a)) (s += 3), (hit = true);
    if (hit) best = Math.max(best ?? 0, s);
  }
  if (best !== null) return best;
  // A near miss ("invertr", "dyness" typed "dynes") still counts, for a little less.
  const budget = typoBudget(w);
  if (budget && x.tokens.some((t) => within(w, t, budget))) return 1;
  return null;
}

/** Ranks products for a free-text query. */
export function searchProducts(catalogue: Product[], query: string, limit = 8): Product[] {
  const words = normalise(query);
  if (words.length === 0) return [];
  const exactSku = query.trim().toLowerCase();
  const scored: { p: Product; score: number }[] = [];
  for (const p of catalogue) {
    const x = index(p);
    let score = x.sku === exactSku ? 1000 : 0;
    let all = true;
    for (const w of words) {
      const s = scoreWord(x, w);
      if (s === null) {
        all = false;
        break;
      }
      score += s;
    }
    if (all) scored.push({ p, score: score + (p.stockQty > 0 ? 4 : 0) + (p.images.length ? 1 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.p.priceInclVat - b.p.priceInclVat).slice(0, limit).map((s) => s.p);
}

/** The category a query is most likely about, for "No results" suggestions ("inverta" -> inverters). */
export function closestCategory(query: string): CategorySlug | null {
  const words = normalise(query);
  for (const [slug, c] of Object.entries(CATEGORIES) as [CategorySlug, (typeof CATEGORIES)[CategorySlug]][]) {
    const names = `${c.name} ${c.singular} ${slug}`.toLowerCase().split(/[^a-z]+/).filter((t) => t.length >= 4);
    for (const w of words) {
      const alts = SYNONYMS[w] ? [w, ...SYNONYMS[w]] : [w];
      if (alts.some((a) => names.some((n) => n.startsWith(a) || a.startsWith(n) || within(a, n, typoBudget(a))))) return slug;
    }
  }
  return null;
}
