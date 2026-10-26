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
