import { describe, expect, it } from "vitest";
import { displayName } from "./display-name";

describe("displayName", () => {
  it.each([
    [
      "Deye: 5Kw Single Phase Hybrid Inverter (NEW) – VOC: 500V Battery: 48V CT&WIFI Incl (SUN-5K-SG04LP1-EU-SM2)",
      "SUN-5K-SG04LP1-EU-SM2",
      "5 kW Single Phase Hybrid Inverter",
    ],
    [
      "Lux Power: Inverter GETA 3.6Kw Off Grid Hybrid Single Phase CT&WIFI Incl (24V) (GETA-LB-EU3.6K/24V)",
      "GETA-LB-EU3.6K/24V",
      "Inverter GETA 3.6 kW Off Grid Hybrid Single Phase (24 V)",
    ],
    [
      "Dyness: Battery Lithium Ion DL5.0F 5.12KWH 51.2V 100Ah IP20 (7 Year Warranty) (DYN-DL5.0F)",
      "DYN-DL5.0F",
      "Battery Lithium Ion DL5.0F 5.12 kWh 51.2 V 100 Ah IP20 (7 Year Warranty)",
    ],
    [
      "TCL Solar: 620W G12R N-Type TOPCon Bifacial – VOC: 48.94V / ISC: 16.05A (HSM-ND66-GR620)",
      "HSM-ND66-GR620",
      "620 W G12R N-Type TOPCon Bifacial",
    ],
    [
      "Lemoen: 8KVA Single Phase Servo Type Voltage Stabilizer Input: 80-260VAC Output: 220VAC 50/60HZ (LMN-SVB-8KVA-80/260)",
      "LMN-SVB-8KVA-80/260",
      "8 kVA Single Phase Servo Type Voltage Stabilizer",
    ],
    [
      "Jetman: Digital Inverter Split Aircon 12 000 BTU (Excludes Cantilever Bracket) (JM-12SA/XA21)",
      "JM-12SA/XA21",
      "Digital Inverter Split Aircon 12 000 BTU (Excludes Cantilever Bracket)",
    ],
    [
      "Web Special: Deye 6kW Single Phase Off-Grid Hybrid Inverter & Electric Gotion E-Home 5.12KWH Battery (Web-Deye-Gotion)",
      "Web-Deye-Gotion",
      "Deye 6 kW Single Phase Off-Grid Hybrid Inverter & Electric Gotion E-Home 5.12 kWh Battery",
    ],
    ["Dyness (LTL): Battery Lithium Ion 1.28KWH 12.8V 100AH (DYN-LR1.2)", "DYN-LR1.2", "Battery Lithium Ion 1.28 kWh 12.8 V 100 Ah"],
  ])("%s", (name, sku, expected) => {
    expect(displayName(name, sku)).toBe(expected);
  });

  it("leaves a plain name alone", () => {
    expect(displayName("Solar panel cleaning kit")).toBe("Solar panel cleaning kit");
  });
});
