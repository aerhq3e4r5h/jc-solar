import { describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/catalogue/fixtures";
import { completeTheSystem } from "./bundle";

const deye5k = makeProduct("inverters", "Deye: 5Kw Single Phase Hybrid Inverter (NEW) – VOC: 500V Battery: 48V CT&WIFI Incl (SUN-5K-SG04LP1-EU-SM2)");
const lux24 = makeProduct("inverters", "Lux Power: Inverter GETA 3.6Kw Off Grid Hybrid Single Phase CT&WIFI Incl (24V) (GETA-LB-EU3.6K/24V)");
const deyeLv = makeProduct("batteries", "Deye: LV Battery Lithium Ion Low Voltage 5.12Kwh 51.2V 100Ah (Wall, Stack & Rack Mount) (SE-G5.1)", { priceInclVat: 15000 });
const dynessLv = makeProduct("batteries", "Dyness: Battery Lithium Ion DL5.0F 5.12KWH 51.2V 100Ah IP20 (7 Year Warranty) (DYN-DL5.0F)", { priceInclVat: 12000 });
const lux24Batt = makeProduct("batteries", "Lux Power: LV Battery Lithium Ion Low Voltage 7.5Kwh 25.6V 300Ah (Rack, Wall & Floor Mount) (LUX-Li-7.5e)");
const gcl590 = makeProduct("solar-panels", "GCL: 590W Dual Glass TOPCon 1.0 Tech N-Type Bifacial – VOC: 52.20V / ISC: 14.13A (GCL-NT10/72GDF-590W)", {
  priceInclVat: 1800,
  stockQty: 30,
});
const soldOutBattery = makeProduct("batteries", "Deye: LV Battery Lithium Ion Low Voltage 10.2Kwh 51.2V 200Ah (SE-G10.2)", { stockQty: 0, priceInclVat: 100 });

const catalogue = [deye5k, lux24, deyeLv, dynessLv, lux24Batt, gcl590, soldOutBattery];

describe("completeTheSystem", () => {
  it("adds a same-brand battery and panels that fit an inverter", () => {
    const lines = completeTheSystem(deye5k, catalogue)!;
    expect(lines.map((l) => l.product.id)).toEqual([deyeLv.id, gcl590.id]);
    const panels = lines[1];
    expect(panels.quantity).toBeGreaterThanOrEqual(4);
    // 5 kW of input at 590 W a panel is at most 8 panels
    expect(panels.quantity).toBeLessThanOrEqual(8);
    expect(panels.why).toMatch(/590 W/);
  });

  it("never suggests a battery with the wrong voltage or one that's out of stock", () => {
    const ids = completeTheSystem(lux24, catalogue)!.map((l) => l.product.id);
    expect(ids).toContain(lux24Batt.id);
    expect(ids).not.toContain(deyeLv.id);
    expect(ids).not.toContain(soldOutBattery.id);
  });

  it("suggests an inverter (and its panels) for a battery", () => {
    const lines = completeTheSystem(dynessLv, catalogue)!;
    expect(lines[0].product.category).toBe("inverters");
    expect(lines[0].product.id).toBe(deye5k.id);
  });

  it("returns null for products that don't make a system", () => {
    expect(completeTheSystem(gcl590, catalogue)).toBeNull();
  });
});
