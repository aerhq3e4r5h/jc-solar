// Test helper: builds Product objects from a product name the same way the
// importer does, so tests use realistic data from the real catalogue.

import type { CategorySlug } from "./classify";
import { brandFromName, slugify } from "./normalise";
import { extractSpecs } from "./specs";
import type { Product } from "./types";

let seq = 0;

export function makeProduct(category: CategorySlug, name: string, overrides: Partial<Product> = {}): Product {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    sku: `SKU-${seq}`,
    slug: slugify(name),
    name,
    brand: brandFromName(name),
    category,
    priceInclVat: 1000,
    compareAtPriceInclVat: null,
    stockQty: 10,
    allowBackorder: false,
    shippingClass: "standard",
    isDangerousGoods: false,
    installationEligible: true,
    warrantyMonths: null,
    performanceWarrantyYears: null,
    nrsApproved: null,
    isFeatured: false,
    shortDescription: null,
    description: null,
    datasheetUrl: null,
    images: [],
    specs: extractSpecs(category, name).specs,
    createdAt: "2026-10-22T00:00:00Z",
    ...overrides,
  };
}
