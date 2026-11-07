import type { CategorySlug } from "@/lib/catalogue/classify";
import { spec, type Product } from "@/lib/catalogue/types";

/** The few specs worth showing on a product card, per category. */
const CARD_SPECS: Record<CategorySlug, string[]> = {
  "solar-panels": ["wattage_w", "cell_type", "bifacial"],
  batteries: ["capacity_kwh", "nominal_voltage_v", "voltage_class"],
  inverters: ["rated_power_kw", "inverter_type", "phases"],
  kits: ["inverter_power_kw", "battery_capacity_kwh", "config"],
  "voltage-stabilizers": ["capacity_kva", "phases", "stabilizer_type"],
  "air-conditioners": ["cooling_btu", "compressor"],
};

export function cardSpecs(product: Product): string[] {
  return CARD_SPECS[product.category]
    .map((key) => {
      const s = spec(product, key);
      if (!s) return null;
      if (key === "bifacial") return "Bifacial";
      if (key === "voltage_class") return s.valueText.includes("High") ? "HV" : "LV";
      return s.valueText;
    })
    .filter((v): v is string => v !== null);
}

/** Short label for the drawn product image, e.g. "590 W" or "5.12 kWh". */
export function artLabel(product: Product): string | null {
  const key = {
    "solar-panels": "wattage_w",
    batteries: "capacity_kwh",
    inverters: "rated_power_kw",
    kits: "inverter_power_kw",
    "voltage-stabilizers": "capacity_kva",
    "air-conditioners": "cooling_btu",
  }[product.category];
  return spec(product, key)?.valueText ?? null;
}

/** Headline specs with their labels, for the tiles under a product's title. */
export function highlightSpecs(product: Product): { label: string; value: string }[] {
  return CARD_SPECS[product.category]
    .map((key) => spec(product, key))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
    .map((s) => ({ label: s.label.replace(/ \(.*\)$/, ""), value: s.key === "voltage_class" ? (s.valueText.includes("High") ? "High voltage" : "Low voltage") : s.valueText }));
}

/** Keys of the specs that matter most for a category (highlighted in the spec table). */
export function keySpecKeys(category: CategorySlug): string[] {
  return CARD_SPECS[category];
}

const SECTION_OF: Record<string, string> = {
  wattage_w: "Power and ratings",
  efficiency_pct: "Power and ratings",
  cell_type: "Power and ratings",
  bifacial: "Power and ratings",
  dual_glass: "Power and ratings",
  half_cell: "Power and ratings",
  rated_power_kw: "Power and ratings",
  peak_power_kw: "Power and ratings",
  inverter_type: "Power and ratings",
  phases: "Power and ratings",
  capacity_kva: "Power and ratings",
  stabilizer_type: "Power and ratings",
  inverter_power_kw: "Power and ratings",
  config: "Power and ratings",
  cooling_btu: "Power and ratings",
  cooling_kw: "Power and ratings",
  compressor: "Power and ratings",
  refrigerant: "Power and ratings",
  energy_rating: "Power and ratings",
  unit_type: "Power and ratings",
  mppt_count: "Solar input",
  max_pv_voltage_v: "Solar input",
  max_pv_power_w: "Solar input",
  voc_v: "Electrical",
  isc_a: "Electrical",
  vmp_v: "Electrical",
  imp_a: "Electrical",
  input_voltage_range: "Electrical",
  output_voltage_v: "Electrical",
  frequency: "Electrical",
  nominal_voltage_v: "Electrical",
  max_charge_current_a: "Electrical",
  max_discharge_current_a: "Electrical",
  capacity_kwh: "Battery",
  capacity_ah: "Battery",
  usable_kwh: "Battery",
  depth_of_discharge_pct: "Battery",
  chemistry: "Battery",
  cycle_life: "Battery",
  comms_protocols: "Battery",
  stackable: "Battery",
  voltage_class: "Battery",
  battery_voltage_v: "Battery",
  compatible_battery_brands: "Battery",
  battery_capacity_kwh: "Battery",
};
const SECTION_ORDER = ["Product", "Power and ratings", "Solar input", "Electrical", "Battery", "Other details", "Warranty and approvals"];

export type SpecSection = { title: string; rows: { label: string; value: string; key: boolean }[] };

/** The spec table, grouped into sections, with the category's key specs flagged. */
export function specSections(product: Product): SpecSection[] {
  const keys = new Set(CARD_SPECS[product.category]);
  const sections = new Map<string, SpecSection["rows"]>();
  const add = (title: string, label: string, value: string | null | undefined, key = false) => {
    if (!value) return;
    if (!sections.has(title)) sections.set(title, []);
    sections.get(title)!.push({ label, value, key });
  };
  add("Product", "Brand", product.brand);
  add("Product", "SKU", product.sku);
  for (const s of product.specs) add(SECTION_OF[s.key] ?? "Other details", s.label, s.valueText, keys.has(s.key));
  add("Warranty and approvals", "Warranty", product.warrantyMonths ? `${product.warrantyMonths / 12} years (manufacturer)` : null);
  add("Warranty and approvals", "Performance warranty", product.performanceWarrantyYears ? `${product.performanceWarrantyYears} years` : null);
  add(
    "Warranty and approvals",
    "Grid-tie approval (NRS 097-2-1)",
    product.nrsApproved === true ? "Approved" : product.nrsApproved === false ? "Not approved" : null,
  );
  return SECTION_ORDER.filter((t) => sections.has(t)).map((title) => ({
    title,
    // Key specs first within their section.
    rows: [...sections.get(title)!].sort((a, b) => Number(b.key) - Number(a.key)),
  }));
}
