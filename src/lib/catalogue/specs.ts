// Extracts technical specs from product names. The source spreadsheet has
// no spec columns, so names such as
//   "Deye: 8Kw Single Phase Hybrid Inverter – VOC: 500V Battery: 48V ..."
// are the only source. Anything that cannot be read with confidence is left
// out and reported as missing; nothing is guessed.

import type { CategorySlug } from "./classify";

export type Spec = {
  key: string;
  label: string;
  valueText: string;
  valueNum: number | null;
  unit: string | null;
};

export type SpecResult = { specs: Spec[]; warnings: string[] };

/** Specs each category needs before the product page is complete. */
export const REQUIRED_SPECS: Record<CategorySlug, { key: string; label: string }[]> = {
  "solar-panels": [
    { key: "wattage_w", label: "Wattage" },
    { key: "efficiency_pct", label: "Efficiency" },
    { key: "cell_type", label: "Cell type" },
    { key: "voc_v", label: "Open-circuit voltage (Voc)" },
    { key: "isc_a", label: "Short-circuit current (Isc)" },
    { key: "vmp_v", label: "Max power voltage (Vmp)" },
    { key: "imp_a", label: "Max power current (Imp)" },
  ],
  batteries: [
    { key: "capacity_kwh", label: "Capacity" },
    { key: "usable_kwh", label: "Usable capacity" },
    { key: "depth_of_discharge_pct", label: "Depth of discharge" },
    { key: "chemistry", label: "Chemistry" },
    { key: "nominal_voltage_v", label: "Nominal voltage" },
    { key: "cycle_life", label: "Cycle life" },
    { key: "max_charge_current_a", label: "Max charge current" },
    { key: "max_discharge_current_a", label: "Max discharge current" },
    { key: "comms_protocols", label: "Communication (CAN/RS485)" },
    { key: "stackable", label: "Stackable" },
  ],
  inverters: [
    { key: "rated_power_kw", label: "Rated power" },
    { key: "peak_power_kw", label: "Peak / surge power" },
    { key: "inverter_type", label: "Type" },
    { key: "phases", label: "Phases" },
    { key: "mppt_count", label: "MPPT trackers" },
    { key: "max_pv_voltage_v", label: "Max PV input voltage" },
    { key: "max_pv_power_w", label: "Max PV input power" },
    { key: "battery_voltage_v", label: "Battery voltage" },
    { key: "compatible_battery_brands", label: "Compatible battery brands" },
  ],
  kits: [
    { key: "inverter_power_kw", label: "Inverter size" },
    { key: "battery_capacity_kwh", label: "Battery capacity" },
  ],
};

const LABELS: Record<string, string> = Object.fromEntries(
  Object.values(REQUIRED_SPECS)
    .flat()
    .map((s) => [s.key, s.label]),
);
Object.assign(LABELS, {
  bifacial: "Bifacial",
  dual_glass: "Dual glass",
  half_cell: "Half-cut cells",
  capacity_ah: "Capacity (Ah)",
  voltage_class: "Voltage class",
  max_pv_power_kw: "Max PV input power",
  config: "Configuration",
});

const NUM = String.raw`(\d+(?:\.\d+)?)`;

function num(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  return m ? Number(m[1]) : null;
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

class SpecList {
  specs: Spec[] = [];
  addNumber(key: string, value: number | null, unit: string) {
    if (value === null || !Number.isFinite(value)) return;
    this.specs.push({ key, label: LABELS[key] ?? key, valueText: `${formatNumber(value)} ${unit}`.trim(), valueNum: value, unit });
  }
  addText(key: string, value: string | null) {
    if (!value) return;
    this.specs.push({ key, label: LABELS[key] ?? key, valueText: value, valueNum: null, unit: null });
  }
  addFlag(key: string, value: boolean) {
    if (!value) return;
    this.specs.push({ key, label: LABELS[key] ?? key, valueText: "Yes", valueNum: 1, unit: null });
  }
}

function voltageClass(n: string): string | null {
  if (/high voltage|\bhv\b/.test(n)) return "High voltage (HV)";
  if (/low voltage|\blv\b/.test(n)) return "Low voltage (LV)";
  return null;
}

function panelSpecs(name: string): SpecResult {
  const n = name.toLowerCase();
  const list = new SpecList();
  list.addNumber("wattage_w", num(n, new RegExp(String.raw`\b(\d{2,3})\s?w\b`)), "W");
  list.addNumber("voc_v", num(n, new RegExp(String.raw`voc:?\s*${NUM}\s?v`)), "V");
  list.addNumber("isc_a", num(n, new RegExp(String.raw`isc:?\s*${NUM}\s?a`)), "A");
  let cell: string | null = null;
  if (/topcon/.test(n)) cell = "N-type TOPCon";
  else if (/n-type/.test(n)) cell = "N-type";
  else if (/perc/.test(n)) cell = "Mono PERC";
  else if (/mono/.test(n)) cell = "Monocrystalline";
  else if (/poly/.test(n)) cell = "Polycrystalline";
  list.addText("cell_type", cell);
  list.addFlag("bifacial", /bifacial/.test(n));
  list.addFlag("dual_glass", /dual glass|double glass/.test(n));
  list.addFlag("half_cell", /half cell|half-cell/.test(n));
  return { specs: list.specs, warnings: [] };
}

function batterySpecs(name: string): SpecResult {
  const n = name.toLowerCase();
  const list = new SpecList();
  const warnings: string[] = [];
  let kwh = num(n, new RegExp(String.raw`${NUM}\s?kwh`));
  if (kwh === null) {
    // "Battery Lithium Ion 5.1Kw" is a typo for kWh in the source data.
    const typo = num(n, new RegExp(String.raw`${NUM}\s?kw\b`));
    if (typo !== null) {
      kwh = typo;
      warnings.push(`Capacity written as "${typo}Kw"; read as ${typo} kWh`);
    }
  }
  list.addNumber("capacity_kwh", kwh, "kWh");
  list.addNumber("nominal_voltage_v", num(n, new RegExp(String.raw`${NUM}\s?v\b`)), "V");
  list.addNumber("capacity_ah", num(n, new RegExp(String.raw`${NUM}\s?ah\b`)), "Ah");
  let chemistry: string | null = null;
  if (/\blfp\b|lifepo4/.test(n)) chemistry = "LiFePO4 (LFP)";
  else if (/lithium/.test(n)) chemistry = "Lithium-ion";
  list.addText("chemistry", chemistry);
  list.addText("voltage_class", voltageClass(n));
  if (/stack/.test(n)) list.addText("stackable", "Yes");
  if (chemistry === "Lithium-ion") warnings.push("Chemistry given only as lithium-ion; confirm if LFP");
  return { specs: list.specs, warnings };
}

function inverterSpecs(name: string): SpecResult {
  const n = name.toLowerCase();
  const list = new SpecList();
  list.addNumber("rated_power_kw", num(n, new RegExp(String.raw`${NUM}\s?k(?:w|va)\b`)), "kW");

  let type: string | null = null;
  if (/grid[- ]tie/.test(n)) type = "Grid-tie";
  else if (/off[- ]grid/.test(n)) type = "Off-grid";
  else if (/hybrid/.test(n)) type = "Hybrid";
  list.addText("inverter_type", type);

  let phases: string | null = null;
  if (/three phase|3 phase|3-phase/.test(n)) phases = "Three phase";
  else if (/single phase/.test(n)) phases = "Single phase";
  list.addText("phases", phases);

  let mppt: number | null = null;
  if (/dual mppt/.test(n)) mppt = 2;
  else if (/tri-?mppt/.test(n)) mppt = 3;
  else if (/single mppt/.test(n)) mppt = 1;
  else mppt = num(n, /(\d+)\s?mppt/);
  list.addNumber("mppt_count", mppt, "");

  list.addNumber("max_pv_voltage_v", num(n, new RegExp(String.raw`voc:?\s*${NUM}\s?v`)), "V");
  const pvW = num(n, new RegExp(String.raw`pv:?\s*${NUM}\s?w\b`));
  const pvKw = num(n, new RegExp(String.raw`pv:?\s*${NUM}\s?kw\b`));
  if (pvW !== null) list.addNumber("max_pv_power_w", pvW, "W");
  else if (pvKw !== null) list.addNumber("max_pv_power_w", pvKw * 1000, "W");

  const battery =
    num(n, new RegExp(String.raw`battery:?\s*${NUM}\s?v`)) ?? num(n, /\b(12|24|48)v\b/);
  list.addNumber("battery_voltage_v", battery, "V");
  list.addText("voltage_class", voltageClass(n));
  return { specs: list.specs, warnings: [] };
}

function kitSpecs(name: string): SpecResult {
  const n = name.toLowerCase();
  const list = new SpecList();
  const warnings: string[] = [];
  list.addNumber("inverter_power_kw", num(n, new RegExp(String.raw`${NUM}\s?k(?:w|va)\b`)), "kW");
  let kwh = num(n, new RegExp(String.raw`${NUM}\s?kwh`));
  if (kwh === null) {
    // "Battery: 5.12KW" is a typo for kWh in the source data.
    const typo = num(n, new RegExp(String.raw`battery:?\s*${NUM}\s?kw\b`));
    if (typo !== null) {
      kwh = typo;
      warnings.push(`Battery written as "${typo}KW"; read as ${typo} kWh`);
    }
  }
  list.addNumber("battery_capacity_kwh", kwh, "kWh");
  let config: string | null = null;
  if (/off[- ]grid/.test(n)) config = "Off-grid";
  else if (/hybrid|all-in-one|all in one|all-in-1/.test(n)) config = "Hybrid";
  list.addText("config", config);
  return { specs: list.specs, warnings };
}

export function extractSpecs(category: CategorySlug, name: string): SpecResult {
  switch (category) {
    case "solar-panels":
      return panelSpecs(name);
    case "batteries":
      return batterySpecs(name);
    case "inverters":
      return inverterSpecs(name);
    case "kits":
      return kitSpecs(name);
  }
}

export function missingSpecs(category: CategorySlug, specs: Spec[]): string[] {
  const have = new Set(specs.map((s) => s.key));
  return REQUIRED_SPECS[category].filter((r) => !have.has(r.key)).map((r) => r.key);
}
