// Shop-facing product shape, built from the database rows once and shared by
// listing pages, product pages, compare, cart and the compatibility engine.

import type { CategorySlug } from "./classify";

export type ProductSpec = {
  key: string;
  label: string;
  valueText: string;
  valueNum: number | null;
  unit: string | null;
};

export type ShippingClass = "standard" | "oversized" | "dangerous_goods";

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  brand: string | null;
  category: CategorySlug;
  priceInclVat: number;
  compareAtPriceInclVat: number | null;
  stockQty: number;
  allowBackorder: boolean;
  shippingClass: ShippingClass;
  isDangerousGoods: boolean;
  installationEligible: boolean;
  warrantyMonths: number | null;
  performanceWarrantyYears: number | null;
  nrsApproved: boolean | null;
  isFeatured: boolean;
  shortDescription: string | null;
  description: string | null;
  datasheetUrl: string | null;
  images: { url: string; alt: string }[];
  specs: ProductSpec[];
  createdAt: string;
};

export const CATEGORIES: Record<CategorySlug, { name: string; singular: string; blurb: string }> = {
  "solar-panels": {
    name: "Solar panels",
    singular: "Solar panel",
    blurb: "Mono, bifacial and N-type panels from tier-one makers. Prices are per panel.",
  },
  batteries: {
    name: "Batteries",
    singular: "Battery",
    blurb: "Lithium batteries for load-shedding backup and storing your solar power.",
  },
  inverters: {
    name: "Inverters",
    singular: "Inverter",
    blurb: "Hybrid, off-grid and grid-tie inverters, from 1 kW backup units to three-phase systems.",
  },
  kits: {
    name: "System kits",
    singular: "Kit",
    blurb: "Inverter and battery bundles, ready to install.",
  },
  "voltage-stabilizers": {
    name: "Voltage stabilizers",
    singular: "Voltage stabilizer",
    blurb: "Lemoen relay, servo and static stabilizers that keep your supply steady through dips and surges, from 3 kVA to 100 kVA.",
  },
  "air-conditioners": {
    name: "Aircons",
    singular: "Aircon",
    blurb: "Jetman digital inverter split aircons for cooling and heating, from 12 000 to 24 000 BTU.",
  },
};

export function isCategorySlug(value: string): value is CategorySlug {
  return value in CATEGORIES;
}

export function spec(product: Pick<Product, "specs">, key: string): ProductSpec | undefined {
  return product.specs.find((s) => s.key === key);
}

export function specNum(product: Pick<Product, "specs">, key: string): number | null {
  return spec(product, key)?.valueNum ?? null;
}

export function specText(product: Pick<Product, "specs">, key: string): string | null {
  return spec(product, key)?.valueText ?? null;
}

export function productUrl(product: Pick<Product, "category" | "slug">): string {
  return `/shop/${product.category}/${product.slug}`;
}

/** Stock state shown to customers. Backorder items can still be bought. */
export function availability(product: Pick<Product, "stockQty" | "allowBackorder">, available?: number) {
  const qty = available ?? product.stockQty;
  if (qty > 5) return { state: "in_stock" as const, label: "In stock" };
  if (qty > 0) return { state: "low_stock" as const, label: `Only ${qty} left` };
  if (product.allowBackorder) return { state: "backorder" as const, label: "Available on backorder" };
  return { state: "out_of_stock" as const, label: "Out of stock" };
}

export function canPurchase(product: Pick<Product, "stockQty" | "allowBackorder">, available?: number) {
  return (available ?? product.stockQty) > 0 || product.allowBackorder;
}
