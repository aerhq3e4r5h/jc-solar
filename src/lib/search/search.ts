import { CATEGORIES, type Product } from "@/lib/catalogue/types";

/** Ranks products for a free-text query: every word must match brand, name, SKU or category. */
export function searchProducts(catalogue: Product[], query: string, limit = 8): Product[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9.\-/]/g, ""))
    .filter(Boolean)
    .slice(0, 6);
  if (words.length === 0) return [];
  const scored: { p: Product; score: number }[] = [];
  for (const p of catalogue) {
    const brand = (p.brand ?? "").toLowerCase();
    const name = p.name.toLowerCase();
    const sku = p.sku.toLowerCase();
    const category = `${CATEGORIES[p.category].name} ${CATEGORIES[p.category].singular}`.toLowerCase();
    let score = 0;
    let all = true;
    for (const w of words) {
      if (sku === w) score += 50;
      else if (sku.startsWith(w)) score += 20;
      if (brand === w) score += 15;
      else if (brand.startsWith(w)) score += 8;
      if (new RegExp(`\\b${w.replace(/[.\-/]/g, "\\$&")}`).test(name)) score += 5;
      else if (name.includes(w)) score += 2;
      if (category.includes(w)) score += 3;
      if (!sku.includes(w) && !brand.includes(w) && !name.includes(w) && !category.includes(w)) {
        all = false;
        break;
      }
    }
    if (all) scored.push({ p, score: score + (p.stockQty > 0 ? 4 : 0) + (p.images.length ? 1 : 0) });
  }
  return scored.sort((a, b) => b.score - a.score || a.p.priceInclVat - b.p.priceInclVat).slice(0, limit).map((s) => s.p);
}
