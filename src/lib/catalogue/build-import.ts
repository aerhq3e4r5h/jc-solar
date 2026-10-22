// Turns raw spreadsheet rows into validated products plus a report of
// everything skipped, rejected or changed along the way.

import { addVat, toCents } from "@/lib/pricing/vat";
import { classifyRow, type CategorySlug } from "./classify";
import type { ColumnKey } from "./columns";
import { cleanText, normaliseBrand, parseNumber, parseStock, slugify } from "./normalise";
import { importProductSchema, type ImportProduct } from "./schema";
import { extractSpecs, missingSpecs } from "./specs";

export type RawRow = { rowNumber: number; values: Partial<Record<ColumnKey, unknown>> };

export type RowIssue = { row: number; sku: string; name: string; reason: string };

export type ImportBuild = {
  products: ImportProduct[];
  skipped: RowIssue[];
  invalid: RowIssue[];
  warnings: RowIssue[];
  totals: { rows: number; byCategory: Record<CategorySlug, number> };
};

/** Fields the spreadsheet never provides; always flagged until filled in admin. */
const ALWAYS_MISSING = [
  "description",
  "images",
  "weight_kg",
  "dimensions",
  "warranty_months",
  "datasheet",
] as const;

function shippingFor(category: CategorySlug, name: string) {
  const n = name.toLowerCase();
  const lithium = /lithium|lifepo4|\blfp\b/.test(n);
  if (category === "batteries" || (category === "kits" && (lithium || /battery|kwh/.test(n)))) {
    // Lithium batteries ship as UN3480 Class 9 dangerous goods.
    return { shippingClass: "dangerous_goods" as const, isDangerousGoods: true };
  }
  if (category === "solar-panels") return { shippingClass: "oversized" as const, isDangerousGoods: false };
  return { shippingClass: "standard" as const, isDangerousGoods: false };
}

export function buildImport(rows: RawRow[]): ImportBuild {
  const products: ImportProduct[] = [];
  const skipped: RowIssue[] = [];
  const invalid: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const byCategory: Record<CategorySlug, number> = { "solar-panels": 0, batteries: 0, inverters: 0, kits: 0 };
  const seenSkus = new Map<string, number>();
  const seenSlugs = new Set<string>();

  for (const { rowNumber, values } of rows) {
    const name = cleanText(values.name);
    const sku = cleanText(values.sku);
    const issue = (reason: string): RowIssue => ({ row: rowNumber, sku, name, reason });

    if (!name && !sku) continue; // blank line

    const labels = cleanText(values.categories).split(";").map((s) => s.trim()).filter(Boolean);
    const classification = classifyRow(name, labels);
    if (classification.category === null) {
      skipped.push(issue(classification.reason));
      continue;
    }
    const category = classification.category;

    if (!sku) {
      invalid.push(issue("Missing SKU (generation needs your approval before saving)"));
      continue;
    }
    const skuKey = sku.toLowerCase();
    if (seenSkus.has(skuKey)) {
      invalid.push(issue(`Duplicate SKU (also on row ${seenSkus.get(skuKey)})`));
      continue;
    }
    seenSkus.set(skuKey, rowNumber);

    // Price: the VAT-inclusive column is the selling price. The excl. column
    // is only used to cross-check, or as a fallback when the incl. cell is empty.
    const incl = parseNumber(values.priceInclVat);
    const excl = parseNumber(values.priceExclVat);
    let price = incl;
    if (price === null && excl !== null) {
      price = addVat(excl);
      warnings.push(issue(`Incl. VAT price blank; calculated R${price.toFixed(2)} from excl. VAT price`));
    } else if (price !== null && excl !== null && Math.abs(toCents(addVat(excl)) - toCents(price)) > 1) {
      warnings.push(issue(`Incl. VAT price R${price} does not equal excl. price R${excl} + 15%`));
    }
    if (price !== null) price = Math.round(price * 100) / 100;

    const stock = parseStock(values.stockNote, values.inStock);
    if (!stock.ok) warnings.push(issue(`${stock.reason}; stock set to 0`));

    const brand = normaliseBrand(values.brand, name);
    if (brand.note) warnings.push(issue(brand.note));

    const { specs, warnings: specWarnings } = extractSpecs(category, name);
    specWarnings.forEach((w) => warnings.push(issue(w)));

    let slug = slugify(name) || slugify(sku);
    if (seenSlugs.has(slug)) slug = `${slug}-${slugify(sku)}`.slice(0, 120);
    seenSlugs.add(slug);

    const candidate = {
      sku,
      name,
      slug,
      brand: brand.brand,
      category,
      priceInclVat: price ?? Number.NaN,
      stockQty: stock.ok ? stock.quantity : 0,
      allowBackorder: stock.ok ? stock.backorder : false,
      ...shippingFor(category, name),
      specs,
      incompleteFields: [
        ...ALWAYS_MISSING,
        ...(brand.brand ? [] : ["brand"]),
        ...missingSpecs(category, specs).map((k) => `spec:${k}`),
        ...(category === "inverters" ? ["nrs_097_2_1_approved"] : []),
      ],
      sourceRow: rowNumber,
    };

    const parsed = importProductSchema.safeParse(candidate);
    if (!parsed.success) {
      const reason =
        price === null
          ? "No price"
          : parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ");
      invalid.push(issue(reason));
      seenSkus.delete(skuKey);
      continue;
    }
    products.push(parsed.data);
    byCategory[category] += 1;
  }

  return { products, skipped, invalid, warnings, totals: { rows: rows.length, byCategory } };
}
