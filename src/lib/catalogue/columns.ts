// The spreadsheet layout the importer reads and the exporter writes.
// Headers are matched case-insensitively, ignoring extra spaces.

export const PRODUCT_SHEET = "All products";

export const COLUMNS = {
  name: "Product",
  sku: "SKU",
  brand: "Brand",
  topCategory: "Top category",
  categories: "All categories",
  priceExclVat: "Price excl. VAT (R)",
  priceInclVat: "Price incl. 15% VAT (R)",
  inStock: "In stock",
  stockNote: "Stock note",
  images: "Images",
  descriptionLength: "Description length",
  url: "URL",
} as const;

export type ColumnKey = keyof typeof COLUMNS;

/** Columns that must exist for an import to run. */
export const REQUIRED_COLUMNS: ColumnKey[] = ["name", "sku", "priceInclVat", "stockNote"];

/** Column order used when exporting, matching the source file. */
export const EXPORT_ORDER: ColumnKey[] = [
  "name",
  "sku",
  "brand",
  "topCategory",
  "categories",
  "priceExclVat",
  "priceInclVat",
  "inStock",
  "stockNote",
  "images",
  "descriptionLength",
  "url",
];

export function normaliseHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
