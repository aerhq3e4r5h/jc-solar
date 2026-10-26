import { describe, expect, it } from "vitest";
import { classifyRow } from "./classify";
import { extractSpecs } from "./specs";

const stab1 = "Lemoen: 8KVA Single Phase Servo Type Voltage Stabilizer Input: 80-260VAC Output: 220VAC 50/60HZ (LMN-SVB-8KVA-80/260)";
const stab3 = "Lemoen: 100KVA Three Phase Servo Type Voltage Stabilizer Input: 304-456VAC Output: 380VAC 50/60HZ (LMN-SBW-F-100KVA)";
const aircon = "Jetman: Digital Inverter Split Aircon 12 000 BTU (Excludes Cantilever Bracket) (JM-12SA/XA21)";
const specMap = (category: Parameters<typeof extractSpecs>[0], name: string) =>
  Object.fromEntries(extractSpecs(category, name).specs.map((s) => [s.key, s.valueText]));

describe("voltage stabilizers and aircons", () => {
  it("classifies them into their own categories, even with 'bracket' or 'inverter' in the name", () => {
    expect(classifyRow(stab1, ["Lemoen", "Voltage Stabilizers"])).toEqual({ category: "voltage-stabilizers" });
    expect(classifyRow(stab3, [])).toEqual({ category: "voltage-stabilizers" });
    expect(classifyRow(aircon, ["Air Conditioners"])).toEqual({ category: "air-conditioners" });
    expect(classifyRow("Midea: Split Aircon 9000 BTU", ["Air Conditioners"]).category).toBeNull(); // Jetman only
  });

  it("reads stabilizer specs from the name", () => {
    expect(specMap("voltage-stabilizers", stab1)).toEqual({
      capacity_kva: "8 kVA",
      phases: "Single phase",
      stabilizer_type: "Servo",
      input_voltage_range: "80–260 V AC",
      output_voltage_v: "220 V AC",
      frequency: "50/60 Hz",
    });
    expect(specMap("voltage-stabilizers", stab3)).toMatchObject({ capacity_kva: "100 kVA", phases: "Three phase", output_voltage_v: "380 V AC" });
  });

  it("reads aircon specs, including BTU written with a space", () => {
    expect(specMap("air-conditioners", aircon)).toEqual({
      cooling_btu: "12000 BTU/h",
      cooling_kw: "3.5 kW",
      compressor: "Digital inverter",
      unit_type: "Wall-mounted split",
      bracket_included: "No (sold separately)",
    });
  });
});
