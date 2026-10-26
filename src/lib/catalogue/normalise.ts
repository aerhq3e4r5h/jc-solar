// Cleaning helpers used by the importer. Each function is pure so it can be
// unit-tested against the awkward values found in the source spreadsheet.

/** Collapse runs of whitespace (including non-breaking spaces) and trim. */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[   ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a number that may be stored as text, e.g. "R 1 234,50", "1,234.50",
 * "13903.5". Returns null when the cell holds no usable number.
 */
export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = cleanText(value).replace(/^R\s*/i, "").replace(/\s/g, "");
  if (!text) return null;
  let normalised = text;
  // "1.234,50" or "1234,50" -> decimal comma
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(text) || /^\d+,\d{1,2}$/.test(text)) {
    normalised = text.replace(/\./g, "").replace(",", ".");
  } else {
    normalised = text.replace(/,/g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalised)) return null;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

export type StockParse =
  | { ok: true; quantity: number; backorder: boolean }
  | { ok: false; reason: string };

/** "5 in stock" -> 5, "Out Of Stock" -> 0, "Available on backorder" -> 0 + backorder. */
export function parseStock(note: unknown, inStockFlag?: unknown): StockParse {
  const text = cleanText(note).toLowerCase();
  const qty = text.match(/^(\d+)\s+in stock$/);
  if (qty) return { ok: true, quantity: Number(qty[1]), backorder: false };
  if (text === "out of stock") return { ok: true, quantity: 0, backorder: false };
  if (text.includes("backorder")) return { ok: true, quantity: 0, backorder: true };
  if (text === "in stock") return { ok: false, reason: 'Stock note says "In stock" without a quantity' };
  if (!text) {
    const flag = cleanText(inStockFlag).toLowerCase();
    if (flag === "no") return { ok: true, quantity: 0, backorder: false };
    return { ok: false, reason: "Stock note is blank" };
  }
  return { ok: false, reason: `Unrecognised stock note "${cleanText(note)}"` };
}

// Canonical brand names. Keys are lower-case spellings seen in the data.
const BRAND_ALIASES: Record<string, string> = {
  inge: "Inge",
  etek: "Etek",
  deye: "Deye",
  "deye all in one hess": "Deye",
  dyness: "Dyness",
  "dyness (ltl)": "Dyness",
  "hina ess": "Hina ESS",
  jetman: "Jetman",
  hinaess: "Hina ESS",
  hina: "Hina ESS",
  lemoen: "Lemoen",
  "lux power": "Lux Power",
  luxpower: "Lux Power",
  solis: "Solis",
  srne: "SRNE",
  victor: "Victor",
  megarevo: "Megarevo",
  aohai: "Aohai",
  epever: "EPEver",
  "electric gotion": "Electric Gotion",
  gotion: "Electric Gotion",
  ja: "JA Solar",
  "ja solar": "JA Solar",
  jinko: "Jinko",
  longi: "Longi",
  astronergy: "Astronergy",
  "nt solar": "NT Solar",
  seraphim: "Seraphim",
  cnbm: "CNBM",
  gcl: "GCL",
  "tcl solar": "TCL Solar",
  trina: "Trina",
  risen: "Risen",
  shoto: "Shoto",
};

// Spreadsheet values that are not real brands.
const NOT_A_BRAND = new Set(["web special", "", "brands"]);

/** Brands recognised at the start of a product name, longest first. */
const NAME_PREFIXES = Object.keys(BRAND_ALIASES).sort((a, b) => b.length - a.length);

export function brandFromName(name: string): string | null {
  const lower = cleanText(name).toLowerCase();
  // "Web Special: Deye 6Kw ..." -> look after the colon
  const afterColon = lower.includes(":") ? lower.slice(lower.indexOf(":") + 1).trim() : lower;
  for (const candidate of [lower, afterColon]) {
    for (const prefix of NAME_PREFIXES) {
      if (candidate === prefix || candidate.startsWith(prefix + " ") || candidate.startsWith(prefix + ":")) {
        return BRAND_ALIASES[prefix];
      }
    }
  }
  return null;
}

export type BrandResult = { brand: string | null; note?: string };

export function normaliseBrand(rawBrand: unknown, productName: string): BrandResult {
  const raw = cleanText(rawBrand);
  const key = raw.toLowerCase();
  if (NOT_A_BRAND.has(key)) {
    const derived = brandFromName(productName);
    if (derived) {
      return {
        brand: derived,
        note: raw ? `Brand "${raw}" replaced with "${derived}" from the name` : `Blank brand set to "${derived}" from the name`,
      };
    }
    return { brand: null, note: "No brand in the spreadsheet or the name" };
  }
  const canonical = BRAND_ALIASES[key];
  if (canonical) {
    return canonical === raw ? { brand: canonical } : { brand: canonical, note: `Brand "${raw}" standardised to "${canonical}"` };
  }
  return { brand: raw, note: `Unknown brand "${raw}" kept as is` };
}

export function slugify(value: string): string {
  return cleanText(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}
