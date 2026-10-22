// The Solar Advisor's tools. The model never invents products, prices or
// stock: it looks them up here, in the same cached catalogue the shop uses,
// and checks pairs with the same compatibility engine as the cart.

import { z } from "zod";
import type { CategorySlug } from "@/lib/catalogue/classify";
import { SIZE_SPEC } from "@/lib/catalogue/filters";
import { availability, CATEGORIES, productUrl, specNum, type Product } from "@/lib/catalogue/types";
import { batteryBus, checkPair, inverterBus, type Override } from "@/lib/compatibility/engine";
import { estimateSystem } from "./sizing";

const CATEGORY_SLUGS = Object.keys(CATEGORIES) as [CategorySlug, ...CategorySlug[]];

/** Function declarations in Gemini's OpenAPI-subset schema format. */
export const TOOL_DECLARATIONS = [
  {
    name: "search_products",
    description:
      "Search JC Solar's catalogue. Returns real products with SKU, price (incl. VAT), stock and key specs. Size is in W for solar-panels, kWh for batteries, kW for inverters and kits (inverter size).",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", enum: CATEGORY_SLUGS },
        query: { type: "string", description: "Words to match in the brand or name, e.g. 'Deye' or 'bifacial'." },
        min_size: { type: "number" },
        max_size: { type: "number" },
        max_price: { type: "number", description: "Rand, incl. VAT." },
        battery_bus: { type: "string", enum: ["12", "24", "48", "HV"], description: "Battery bank voltage for batteries and inverters." },
        in_stock_only: { type: "boolean" },
        sort: { type: "string", enum: ["price_asc", "price_desc", "size_asc", "size_desc"] },
        limit: { type: "integer", description: "1 to 12, default 8." },
      },
      required: ["category"],
    },
  },
  {
    name: "get_product",
    description: "Full details and every spec for one product by SKU.",
    parameters: { type: "object", properties: { sku: { type: "string" } }, required: ["sku"] },
  },
  {
    name: "check_compatibility",
    description: "Check whether a battery works with an inverter (battery voltage, inverter type, confirmed pairs).",
    parameters: {
      type: "object",
      properties: { inverter_sku: { type: "string" }, battery_sku: { type: "string" } },
      required: ["inverter_sku", "battery_sku"],
    },
  },
  {
    name: "estimate_system",
    description:
      "Size an inverter, battery and solar array from the customer's loads, backup hours and usage or bill. Always use this for sizing numbers instead of calculating yourself.",
    parameters: {
      type: "object",
      properties: {
        simultaneous_load_w: { type: "number", description: "Watts of everything that must run at the same time during an outage." },
        surge_load_w: { type: "number", description: "Largest start-up surge in watts (pumps, fridges), if any." },
        average_backup_load_w: { type: "number", description: "Average watts during an outage, if known." },
        backup_hours: { type: "number" },
        daily_usage_kwh: { type: "number" },
        monthly_bill_rand: { type: "number" },
        tariff_rand_per_kwh: { type: "number" },
        solar_offset: { type: "number", description: "Share of daily use to cover with solar, 0 to 1." },
      },
      required: ["simultaneous_load_w", "backup_hours"],
    },
  },
] as const;

export type ToolContext = { catalogue: Product[]; overrides: Override[] };

const num = z.coerce.number().finite();
const schemas = {
  search_products: z.object({
    category: z.enum(CATEGORY_SLUGS),
    query: z.string().max(100).optional(),
    min_size: num.optional(),
    max_size: num.optional(),
    max_price: num.optional(),
    battery_bus: z.enum(["12", "24", "48", "HV"]).optional(),
    in_stock_only: z.boolean().optional(),
    sort: z.enum(["price_asc", "price_desc", "size_asc", "size_desc"]).optional(),
    limit: num.int().min(1).max(12).optional(),
  }),
  get_product: z.object({ sku: z.string().max(80) }),
  check_compatibility: z.object({ inverter_sku: z.string().max(80), battery_sku: z.string().max(80) }),
  estimate_system: z.object({
    simultaneous_load_w: num.min(0).max(200_000),
    surge_load_w: num.min(0).max(400_000).optional(),
    average_backup_load_w: num.min(0).max(200_000).optional(),
    backup_hours: num.min(0).max(72),
    daily_usage_kwh: num.min(0).max(5000).optional(),
    monthly_bill_rand: num.min(0).max(1_000_000).optional(),
    tariff_rand_per_kwh: num.min(0.5).max(15).optional(),
    solar_offset: num.min(0).max(1).optional(),
  }),
};

export type ToolName = keyof typeof schemas;

function size(p: Product): number | null {
  return specNum(p, SIZE_SPEC[p.category].key);
}

function bus(p: Product) {
  const b = p.category === "batteries" ? batteryBus(p) : p.category === "inverters" ? inverterBus(p) : null;
  return b === null ? null : String(b);
}

function summary(p: Product) {
  return {
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price_incl_vat: p.priceInclVat,
    stock: availability(p).label,
    size: size(p) === null ? null : `${size(p)} ${SIZE_SPEC[p.category].unit}`,
    battery_bus: bus(p),
    specs: Object.fromEntries(p.specs.slice(0, 8).map((s) => [s.label, s.valueText])),
  };
}

export function findBySku(catalogue: Product[], sku: string): Product | undefined {
  const want = sku.trim().toLowerCase();
  return catalogue.find((p) => p.sku.toLowerCase() === want);
}

export function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Record<string, unknown> {
  if (!(name in schemas)) return { error: `Unknown tool ${name}` };
  const parsed = schemas[name as ToolName].safeParse(rawArgs ?? {});
  if (!parsed.success) return { error: `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}` };
  const args = parsed.data;

  switch (name as ToolName) {
    case "search_products": {
      const a = args as z.infer<(typeof schemas)["search_products"]>;
      const words = (a.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      let results = ctx.catalogue.filter((p) => {
        if (p.category !== a.category) return false;
        const s = size(p);
        if (a.min_size !== undefined && (s === null || s < a.min_size)) return false;
        if (a.max_size !== undefined && (s === null || s > a.max_size)) return false;
        if (a.max_price !== undefined && p.priceInclVat > a.max_price) return false;
        if (a.battery_bus && bus(p) !== a.battery_bus) return false;
        if (a.in_stock_only && availability(p).state === "out_of_stock") return false;
        const hay = `${p.brand ?? ""} ${p.name} ${p.sku}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      });
      const by = {
        price_asc: (x: Product, y: Product) => x.priceInclVat - y.priceInclVat,
        price_desc: (x: Product, y: Product) => y.priceInclVat - x.priceInclVat,
        size_asc: (x: Product, y: Product) => (size(x) ?? 0) - (size(y) ?? 0),
        size_desc: (x: Product, y: Product) => (size(y) ?? 0) - (size(x) ?? 0),
      };
      // In-stock first by default, then cheapest.
      results = [...results].sort(
        a.sort
          ? by[a.sort]
          : (x, y) =>
              Number(availability(x).state === "out_of_stock") - Number(availability(y).state === "out_of_stock") || x.priceInclVat - y.priceInclVat,
      );
      return { total_matches: results.length, products: results.slice(0, a.limit ?? 8).map(summary) };
    }
    case "get_product": {
      const p = findBySku(ctx.catalogue, (args as { sku: string }).sku);
      if (!p) return { error: "No product with that SKU. Use search_products to find one." };
      return {
        ...summary(p),
        specs: Object.fromEntries(p.specs.map((s) => [s.label, s.valueText])),
        warranty_months: p.warrantyMonths,
        installation_available: p.installationEligible,
        description: p.shortDescription,
      };
    }
    case "check_compatibility": {
      const a = args as z.infer<(typeof schemas)["check_compatibility"]>;
      const inverter = findBySku(ctx.catalogue, a.inverter_sku);
      const battery = findBySku(ctx.catalogue, a.battery_sku);
      if (!inverter || inverter.category !== "inverters") return { error: "inverter_sku is not an inverter in our catalogue." };
      if (!battery || battery.category !== "batteries") return { error: "battery_sku is not a battery in our catalogue." };
      return { ...checkPair(inverter, battery, ctx.overrides) };
    }
    case "estimate_system": {
      const a = args as z.infer<(typeof schemas)["estimate_system"]>;
      return {
        ...estimateSystem({
          simultaneousLoadW: a.simultaneous_load_w,
          surgeLoadW: a.surge_load_w,
          averageBackupLoadW: a.average_backup_load_w,
          backupHours: a.backup_hours,
          dailyUsageKwh: a.daily_usage_kwh,
          monthlyBillRand: a.monthly_bill_rand,
          tariffRandPerKwh: a.tariff_rand_per_kwh,
          solarOffset: a.solar_offset,
        }),
      };
    }
  }
}

/** Products the advisor recommended with [[SKU]] markers, in order, deduplicated. */
export function extractRecommendations(text: string, catalogue: Product[]) {
  const seen = new Set<string>();
  const products: Product[] = [];
  for (const m of text.matchAll(/\[\[([^\]\n]{1,80})\]\]/g)) {
    const p = findBySku(catalogue, m[1]);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      products.push(p);
    }
  }
  return products;
}

/** Card data for the chat. Only public fields. */
export function recommendationCard(p: Product) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    url: productUrl(p),
    image: p.images[0]?.url ?? null,
    price: p.priceInclVat,
    stock: availability(p),
    installationEligible: p.installationEligible,
  };
}
export type RecommendationCard = ReturnType<typeof recommendationCard>;
