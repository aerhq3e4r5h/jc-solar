// Decides which shop category a spreadsheet row belongs to. JC Solar sells
// solar panels, batteries, inverters and system kits only; every other row
// is skipped with a reason so the import report explains it.

export type CategorySlug = "solar-panels" | "batteries" | "inverters" | "kits";

export type Classification =
  | { category: CategorySlug }
  | { category: null; reason: string };

// Parts and accessories that mention "inverter" or "battery" in their name
// but are not one.
const ACCESSORY =
  /battery box|\bfits \d|accessor|cable|meter\b|logger|module for|\bpcs\b|sts module|mppt module|bracket|dongle|pump|\bvsd\b|variable speed|charge controller|rack|cabinet door|control box|\bbmu\b|distribution unit|expansion|crane|wheel|\bpdu\b|clip|tester|optimi[sz]er|clean|stand\b|cover\b|export manager|\bfan\b|base\b|isolator|breaker|fuse|surge|changeover|current transformer|wall mount (battery|switchgear) box|wall mount cabinet/;

const NOT_SOLAR = /geely|electric suv|plug-in hybrid suv|generator/;

// Mounting options and "what's included" notes describe a product rather
// than make it an accessory: "(Wall, Stack & Rack Mount)", "(Incl. ...
// Accessories)", "CT, WIFI & Breaker Incl". Removed before the accessory test.
function withoutMountingAndInclusions(n: string): string {
  return n
    .replace(/\([^()]*\bmount[^()]*\)/g, " ")
    .replace(/\([^()]*\bincl[^()]*\)/g, " ")
    .replace(/\b(ct|wifi|bt|breaker)\b[\w\s,&]*\bincl\b/g, " ");
}

const KIT =
  /web special|(&|\+)[^&+]*\d+(\.\d+)?\s?kwh|all-in-one stack|all in one hess|all-in-1\)/;

export function classifyRow(name: string, categoryLabels: string[]): Classification {
  const n = name.toLowerCase();
  const labels = new Set(categoryLabels.map((c) => c.trim().toLowerCase()));

  if (NOT_SOLAR.test(n)) return { category: null, reason: "Not a solar product (vehicle or generator)" };
  if (/\bled\b|\blamp\b|solar light|flood ?light/.test(n)) return { category: null, reason: "Solar light, not a panel" };
  if (KIT.test(n)) return { category: "kits" };
  if (ACCESSORY.test(withoutMountingAndInclusions(n))) return { category: null, reason: "Accessory or spare part" };

  if (/\binverter\b/.test(n) && /\d+(\.\d+)?\s?k(w|va)\b/.test(n)) return { category: "inverters" };
  if (/\bbattery\b/.test(n) && /\d+(\.\d+)?\s?kwh/.test(n)) return { category: "batteries" };
  // "Battery Lithium Ion 5.1Kw" is a kWh typo in the source data.
  if (/\bbattery lithium\b/.test(n) && /\d+(\.\d+)?\s?kw\b/.test(n)) return { category: "batteries" };
  if (
    (labels.has("solar panels") || /solar panel/.test(n)) &&
    /\b\d{2,3}\s?w\b/.test(n) &&
    /mono|bifacial|n-type|poly|topcon|half|module|panel|glass|crystal/.test(n)
  ) {
    return { category: "solar-panels" };
  }
  return { category: null, reason: "Outside the shop's categories (panels, batteries, inverters, kits)" };
}
