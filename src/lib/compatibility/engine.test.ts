import { describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/catalogue/fixtures";
import { batteryBus, checkPair, checkSystem, coldVoc, inverterBus, maxPanelsPerString, planStrings } from "./engine";

const deye5k = makeProduct("inverters", "Deye: 5Kw Single Phase Hybrid Inverter (NEW) – VOC: 500V Battery: 48V CT&WIFI Incl (SUN-5K-SG04LP1-EU-SM2)");
const dyness8k = makeProduct("inverters", "Dyness: 8KW Single Phase LV Hybrid Inverter – VOC: 600V Battery: 60V CT&WIFI Incl IP66 (Dyne-D8.0-LS)");
const lux24 = makeProduct("inverters", "Lux Power: Inverter GETA 3.6Kw Off Grid Hybrid Single Phase CT&WIFI Incl (24V) (GETA-LB-EU3.6K/24V)");
const deyeHv = makeProduct("inverters", "Deye: 20Kw Three Phase HV Hybrid Inverter – VOC: 850V Battery: 700V CT&WIFI Incl (SUN-20K-SG01HP3-EU-AM2)");
const luxNoBattSpec = makeProduct("inverters", "Lux Power: Inverter 10Kw Hybrid Single Phase (LUX-LXP-LB10K)");

const deyeLv = makeProduct("batteries", "Deye: LV Battery Lithium Ion Low Voltage 5.12Kwh 51.2V 100Ah (Wall, Stack & Rack Mount) (SE-G5.1)");
const dynessLv = makeProduct("batteries", "Dyness: Battery Lithium Ion DL5.0F 5.12KWH 51.2V 100Ah IP20 (7 Year Warranty) (DYN-DL5.0F)");
const lux24Batt = makeProduct("batteries", "Lux Power: LV Battery Lithium Ion Low Voltage 7.5Kwh 25.6V 300Ah (Rack, Wall & Floor Mount) (LUX-Li-7.5e)");
const deyeHvBatt = makeProduct("batteries", "Deye: HV Battery Lithium Ion High Voltage 7.68Kwh 38.4V 200Ah (BOS-A-PACK7.68)");
const dyness12 = makeProduct("batteries", "Dyness (LTL): Battery Lithium Ion 1.28KWH 12.8V 100AH (DYN-LR1.2)");

const gcl590 = makeProduct("solar-panels", "GCL: 590W Dual Glass TOPCon 1.0 Tech N-Type Bifacial – VOC: 52.20V / ISC: 14.13A (GCL-NT10/72GDF-590W)");
const ja540NoVoc = makeProduct("solar-panels", "JA Solar Panel 540W Half Cell Mono Crystalline (JAM72S30-540/MR)");

describe("battery and inverter voltage", () => {
  it("maps nominal battery voltages to bank voltages", () => {
    expect(batteryBus(deyeLv)).toBe(48);
    expect(batteryBus(lux24Batt)).toBe(24);
    expect(batteryBus(dyness12)).toBe(12);
    expect(batteryBus(deyeHvBatt)).toBe("HV");
  });
  it("reads the inverter's battery voltage, treating 60 V as the top of a 48 V range", () => {
    expect(inverterBus(deye5k)).toBe(48);
    expect(inverterBus(dyness8k)).toBe(48);
    expect(inverterBus(lux24)).toBe(24);
    expect(inverterBus(deyeHv)).toBe("HV");
    expect(inverterBus(luxNoBattSpec)).toBeNull();
  });
});

describe("checkPair", () => {
  it("marks matching 48 V products as likely, noting same brand", () => {
    expect(checkPair(deye5k, deyeLv)).toMatchObject({ status: "likely", reason: expect.stringMatching(/^Same brand/) });
    expect(checkPair(deye5k, dynessLv)).toMatchObject({ status: "likely", reason: expect.stringMatching(/CAN\/RS485/) });
  });
  it("rejects a voltage mismatch with a plain reason", () => {
    expect(checkPair(deye5k, lux24Batt)).toEqual({
      status: "incompatible",
      reason: "This battery is 24 V; the inverter needs a 48 V battery.",
    });
    expect(checkPair(lux24, deyeLv).status).toBe("incompatible");
    expect(checkPair(deyeHv, deyeLv).status).toBe("incompatible");
  });
  it("never pairs a battery with a grid-tie inverter", () => {
    const gridTie = makeProduct("inverters", "Deye: 40Kw Three Phase Grid Tie Inverter – 3MPPT VOC: 1100V (SUN-40K-G04)");
    expect(checkPair(gridTie, deyeLv)).toMatchObject({ status: "incompatible", reason: expect.stringMatching(/no battery connection/) });
  });
  it("asks for a check on high-voltage pairs and missing data", () => {
    expect(checkPair(deyeHv, deyeHvBatt).status).toBe("check");
    expect(checkPair(luxNoBattSpec, deyeLv).status).toBe("unknown");
  });
  it("lets admin decisions override the rules", () => {
    expect(checkPair(deye5k, dynessLv, [{ inverterId: deye5k.id, batteryId: dynessLv.id, status: "confirmed", reason: null }]).status).toBe("confirmed");
    expect(
      checkPair(deye5k, deyeLv, [{ inverterId: deye5k.id, batteryId: deyeLv.id, status: "incompatible", reason: "Firmware clash" }]),
    ).toEqual({ status: "incompatible", reason: "Firmware clash" });
  });
});

describe("panel strings", () => {
  it("raises Voc for cold mornings", () => {
    expect(coldVoc(52.2)).toBeCloseTo(56.9, 1);
    expect(coldVoc(52.2, { minTempC: 25 })).toBeCloseTo(52.2, 5);
  });
  it("limits panels per string to the inverter's PV voltage", () => {
    expect(maxPanelsPerString(gcl590, deye5k)).toBe(8); // 8 x 56.9 V = 455 V <= 500 V
    expect(maxPanelsPerString(gcl590, dyness8k)).toBe(10); // 600 V limit
    expect(maxPanelsPerString(ja540NoVoc, deye5k)).toBeNull();
  });
  it("splits arrays into equal strings", () => {
    expect(planStrings(gcl590, dyness8k, 12)).toEqual({ status: "ok", perString: 6, strings: 2, maxPerString: 10 });
    expect(planStrings(gcl590, deye5k, 8)).toEqual({ status: "ok", perString: 8, strings: 1, maxPerString: 8 });
    expect(planStrings(ja540NoVoc, deye5k, 8).status).toBe("unknown");
  });
  it("flags more strings than the inverter has inputs", () => {
    const twoMppt = makeProduct("inverters", "Deye: 5Kw Single Phase LV Hybrid Inverter Dual MPPT IP65 Integrated WIFI – VOC: 500V Battery: 48V CT Incl");
    expect(planStrings(gcl590, twoMppt, 16)).toMatchObject({ status: "ok", strings: 2, perString: 8 });
    expect(planStrings(gcl590, twoMppt, 17)).toEqual({ status: "too_many", maxPerString: 8 });
  });
});

describe("checkSystem", () => {
  it("reports an incompatible battery as an error", () => {
    const issues = checkSystem([
      { product: deye5k, quantity: 1 },
      { product: lux24Batt, quantity: 1 },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "error" });
  });
  it("is quiet for a matching system", () => {
    expect(
      checkSystem([
        { product: dyness8k, quantity: 1 },
        { product: dynessLv, quantity: 3 },
        { product: gcl590, quantity: 12 },
      ]),
    ).toEqual([]);
  });
  it("warns about mixed battery voltages and mixed models", () => {
    expect(checkSystem([{ product: deyeLv, quantity: 1 }, { product: lux24Batt, quantity: 1 }])[0].message).toMatch(/different voltages/);
    expect(checkSystem([{ product: deyeLv, quantity: 1 }, { product: dynessLv, quantity: 1 }])[0]).toMatchObject({ level: "warning" });
  });
});
