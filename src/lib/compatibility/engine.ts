// Compatibility rules for batteries, inverters and panel strings.
//
// Deterministic and data-driven: it only uses specs stored on the products
// (read from the spreadsheet or added in the admin) plus pairs an admin has
// confirmed or ruled out. When the data is missing it says so rather than
// guessing. Used by product pages, the cart, kit checks and, later, the AI
// advisor's check_compatibility tool.

import { specNum, specText, type Product } from "@/lib/catalogue/types";

export type Bus = 12 | 24 | 48 | "HV";

type SpecSource = Pick<Product, "id" | "name" | "brand" | "category" | "specs">;

export type PairStatus = "confirmed" | "likely" | "check" | "incompatible" | "unknown";

export type PairResult = { status: PairStatus; reason: string };

export type Override = { inverterId: string; batteryId: string; status: "confirmed" | "incompatible"; reason: string | null };

const BUS_LABEL = (bus: Bus) => (bus === "HV" ? "high-voltage" : `${bus} V`);

/** The battery bank voltage a battery belongs to (51.2 V LFP is a "48 V" battery). */
export function batteryBus(battery: Pick<Product, "specs">): Bus | null {
  if (specText(battery, "voltage_class")?.startsWith("High")) return "HV";
  const v = specNum(battery, "nominal_voltage_v");
  if (v === null) return null;
  if (v >= 11 && v <= 14) return 12;
  if (v >= 22 && v <= 29) return 24;
  if (v >= 44 && v <= 58) return 48;
  if (v >= 150) return "HV";
  return null;
}

/** The battery voltage an inverter is built for ("Battery: 60V" is the top of a 48 V range). */
export function inverterBus(inverter: Pick<Product, "specs">): Bus | null {
  if (specText(inverter, "voltage_class")?.startsWith("High")) return "HV";
  const v = specNum(inverter, "battery_voltage_v");
  if (v === null) return null;
  if (v === 12) return 12;
  if (v === 24) return 24;
  if (v >= 40 && v <= 64) return 48;
  if (v >= 150) return "HV";
  return null;
}

export function checkPair(inverter: SpecSource, battery: SpecSource, overrides: Override[] = []): PairResult {
  const override = overrides.find((o) => o.inverterId === inverter.id && o.batteryId === battery.id);
  if (override?.status === "confirmed") {
    return { status: "confirmed", reason: override.reason ?? "Confirmed to work together by our technician." };
  }
  if (override?.status === "incompatible") {
    return { status: "incompatible", reason: override.reason ?? "These do not work together." };
  }

  if (specText(inverter, "inverter_type") === "Grid-tie") {
    return { status: "incompatible", reason: "Grid-tie inverters have no battery connection. Choose a hybrid inverter for backup." };
  }

  const inv = inverterBus(inverter);
  const bat = batteryBus(battery);
  if (inv === null || bat === null) {
    return {
      status: "unknown",
      reason: "We don't have this product's battery voltage on file yet. Ask us and we'll check before you order.",
    };
  }
  if (inv !== bat) {
    return {
      status: "incompatible",
      reason: `This battery is ${BUS_LABEL(bat)}; the inverter needs a ${BUS_LABEL(inv)} battery.`,
    };
  }
  if (inv === "HV") {
    return {
      status: "check",
      reason: "High-voltage systems need a matched battery management unit. We confirm the exact combination before dispatch.",
    };
  }
  const sameBrand = !!inverter.brand && inverter.brand === battery.brand;
  return {
    status: "likely",
    reason: sameBrand
      ? `Same brand and both ${BUS_LABEL(inv)}. We confirm battery communication before dispatch.`
      : `Both ${BUS_LABEL(inv)}. Battery communication (CAN/RS485) is confirmed by our team before dispatch.`,
  };
}

// --- Panel strings ------------------------------------------------------

export type StringOptions = {
  /** Coldest expected cell temperature (°C). South African highveld winters reach about -5 °C. */
  minTempC?: number;
  /** Voc temperature coefficient in %/°C (typical mono/N-type: -0.25 to -0.30). */
  vocTempCoeffPct?: number;
};

/** Open-circuit voltage on the coldest morning, when it is highest. */
export function coldVoc(voc: number, { minTempC = -5, vocTempCoeffPct = -0.3 }: StringOptions = {}): number {
  return voc * (1 + (-vocTempCoeffPct / 100) * (25 - minTempC));
}

/** The most panels that can go in one series string without exceeding the inverter's PV voltage limit. */
export function maxPanelsPerString(panel: Pick<Product, "specs">, inverter: Pick<Product, "specs">, opts?: StringOptions): number | null {
  const voc = specNum(panel, "voc_v");
  const maxPv = specNum(inverter, "max_pv_voltage_v");
  if (voc === null || maxPv === null || voc <= 0) return null;
  return Math.floor(maxPv / coldVoc(voc, opts));
}

export type StringResult =
  | { status: "ok"; perString: number; strings: number; maxPerString: number }
  | { status: "too_many"; maxPerString: number }
  | { status: "unknown"; reason: string };

/** Splits a panel count into equal series strings that stay under the voltage limit. */
export function planStrings(
  panel: Pick<Product, "specs">,
  inverter: Pick<Product, "specs">,
  count: number,
  opts?: StringOptions,
): StringResult {
  const maxPer = maxPanelsPerString(panel, inverter, opts);
  if (maxPer === null) return { status: "unknown", reason: "Panel Voc or inverter PV voltage limit not on file." };
  if (maxPer < 1) return { status: "too_many", maxPerString: 0 };
  const mppt = specNum(inverter, "mppt_count");
  const strings = Math.ceil(count / maxPer);
  if (mppt !== null && strings > mppt) return { status: "too_many", maxPerString: maxPer };
  // Prefer equal strings (e.g. 12 panels on a 8-max inverter -> 2 x 6).
  for (let s = strings; s <= Math.max(strings, mppt ?? strings); s++) {
    if (count % s === 0 && count / s <= maxPer) return { status: "ok", perString: count / s, strings: s, maxPerString: maxPer };
  }
  return { status: "ok", perString: Math.ceil(count / strings), strings, maxPerString: maxPer };
}

// --- Cart / kit checks --------------------------------------------------

export type CartLine = { product: SpecSource; quantity: number };

export type CartIssue = { level: "error" | "warning" | "info"; message: string; productIds: string[] };

export function checkSystem(lines: CartLine[], overrides: Override[] = []): CartIssue[] {
  const issues: CartIssue[] = [];
  const inverters = lines.filter((l) => l.product.category === "inverters").map((l) => l.product);
  const batteries = lines.filter((l) => l.product.category === "batteries").map((l) => l.product);

  for (const inv of inverters) {
    for (const bat of batteries) {
      const r = checkPair(inv, bat, overrides);
      if (r.status === "incompatible") {
        issues.push({ level: "error", message: `${bat.name} will not work with ${inv.name}. ${r.reason}`, productIds: [inv.id, bat.id] });
      } else if (r.status === "unknown" || r.status === "check") {
        issues.push({ level: "warning", message: `${bat.name} with ${inv.name}: ${r.reason}`, productIds: [inv.id, bat.id] });
      }
    }
  }

  for (const inv of inverters) {
    for (const line of lines.filter((l) => l.product.category === "solar-panels")) {
      const plan = planStrings(line.product, inv, line.quantity);
      if (plan.status === "too_many") {
        issues.push({
          level: "warning",
          message: `${line.quantity} x ${line.product.name} is more than ${inv.name} can take (at most ${plan.maxPerString} per string on each of its inputs). Our technician will confirm the layout.`,
          productIds: [inv.id, line.product.id],
        });
      }
    }
  }

  const buses = new Set(batteries.map(batteryBus).filter((b) => b !== null));
  if (buses.size > 1) {
    issues.push({
      level: "error",
      message: "Your cart has batteries of different voltages. They cannot be connected in the same battery bank.",
      productIds: batteries.map((b) => b.id),
    });
  } else if (new Set(batteries.map((b) => b.id)).size > 1) {
    issues.push({
      level: "warning",
      message: "Mixing different battery models in one bank is not recommended. Choose one model if you can.",
      productIds: batteries.map((b) => b.id),
    });
  }
  return issues;
}
