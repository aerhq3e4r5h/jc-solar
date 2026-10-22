// Compares an import against the current catalogue so admins can preview
// exactly what a re-import will insert and change before anything is saved.

import type { ImportProduct } from "./schema";

/** The fields of an existing product that the importer owns and may change. */
export type ExistingProduct = {
  sku: string;
  name: string;
  brand: string | null;
  category: string;
  priceInclVat: number;
  stockQty: number;
  allowBackorder: boolean;
};

export type FieldChange = { field: string; from: string | number | boolean | null; to: string | number | boolean | null };

export type PlannedRow =
  | { action: "insert"; product: ImportProduct }
  | { action: "update"; product: ImportProduct; changes: FieldChange[] }
  | { action: "unchanged"; product: ImportProduct };

export type ImportPlan = {
  rows: PlannedRow[];
  counts: { insert: number; update: number; unchanged: number };
  /** Products in the shop that the file no longer contains (left untouched). */
  notInFile: string[];
};

export function planImport(products: ImportProduct[], existing: ExistingProduct[]): ImportPlan {
  const bySku = new Map(existing.map((e) => [e.sku.toLowerCase(), e]));
  const rows: PlannedRow[] = [];
  const seen = new Set<string>();

  for (const product of products) {
    const key = product.sku.toLowerCase();
    seen.add(key);
    const current = bySku.get(key);
    if (!current) {
      rows.push({ action: "insert", product });
      continue;
    }
    const pairs: [string, FieldChange["from"], FieldChange["to"]][] = [
      ["name", current.name, product.name],
      ["brand", current.brand, product.brand],
      ["category", current.category, product.category],
      ["priceInclVat", current.priceInclVat, product.priceInclVat],
      ["stockQty", current.stockQty, product.stockQty],
      ["allowBackorder", current.allowBackorder, product.allowBackorder],
    ];
    const changes = pairs
      .filter(([, from, to]) => (typeof from === "number" && typeof to === "number" ? Math.abs(from - to) >= 0.005 : from !== to))
      .map(([field, from, to]) => ({ field, from, to }));
    rows.push(changes.length ? { action: "update", product, changes } : { action: "unchanged", product });
  }

  const counts = { insert: 0, update: 0, unchanged: 0 };
  rows.forEach((r) => (counts[r.action] += 1));
  const notInFile = existing.filter((e) => !seen.has(e.sku.toLowerCase())).map((e) => e.sku);
  return { rows, counts, notInFile };
}
