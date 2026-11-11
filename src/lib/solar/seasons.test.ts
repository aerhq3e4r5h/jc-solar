import { describe, expect, it } from "vitest";
import { PROVINCES } from "@/lib/checkout/schema";
import { MONTHS, monthlyOutput, panelsFor, sizeForHome, SOLAR_YIELD, solarYear } from "./seasons";

// The yearly figure PVGIS reports for each city (kWh a day per kW). If a
// monthly value were mistyped, the day-weighted mean would drift from it.
const PUBLISHED_AVERAGE: Record<string, number> = {
  "Eastern Cape": 4.36,
  "Free State": 4.91,
  Gauteng: 4.75,
  "KwaZulu-Natal": 4.01,
  Limpopo: 4.67,
  Mpumalanga: 4.14,
  "North West": 4.68,
  "Northern Cape": 4.9,
  "Western Cape": 4.56,
};

describe("solar yield by province", () => {
  it("has twelve plausible months for every province", () => {
    expect(Object.keys(SOLAR_YIELD).sort()).toEqual([...PROVINCES].sort());
    for (const p of PROVINCES) {
      expect(SOLAR_YIELD[p].monthly).toHaveLength(12);
      for (const v of SOLAR_YIELD[p].monthly) (expect(v).toBeGreaterThan(2), expect(v).toBeLessThan(7));
    }
  });

  it("matches the yearly average PVGIS publishes for each city", () => {
    for (const p of PROVINCES) expect(solarYear(p).average).toBeCloseTo(PUBLISHED_AVERAGE[p], 1);
  });

  it("finds each province's own weakest month: June in the Cape, not winter everywhere", () => {
    expect(solarYear("Western Cape").weakest.name).toBe("June");
    expect(solarYear("Western Cape").best.name).toBe("December");
    expect(solarYear("Eastern Cape").weakest.name).toBe("June");
    expect(solarYear("Gauteng").weakest.name).toBe("April");
    expect(solarYear("Mpumalanga").weakest.name).toBe("November");
    expect(MONTHS[solarYear("KwaZulu-Natal").weakest.month]).toBe("June");
  });
});

describe("sizing for the weakest month", () => {
  it("rounds panels up, and never returns fewer than one", () => {
    // 20 kWh a day from 550 W panels: 3.33 kWh each in Cape Town's December, 1.46 in June
    expect(panelsFor(20, 550, 6.06)).toBe(7);
    expect(panelsFor(20, 550, 2.65)).toBe(14);
    expect(panelsFor(0, 550, 4)).toBe(1);
    expect(panelsFor(5, 0, 4)).toBe(1);
  });

  it("needs about twice the panels in the Western Cape's June as in its December", () => {
    const s = sizeForHome({ province: "Western Cape", billRand: 2500, tariff: 3.5, panelWatts: 550, battery: true });
    expect(s.dailyUse).toBeCloseTo(23.5, 1);
    expect(s.need).toBeCloseTo(19.97, 1);
    expect(s.panels).toEqual({ weakest: 14, best: 6, average: 8 });
    expect(s.panels.weakest).toBeGreaterThanOrEqual(s.panels.average);
  });

  it("barely changes through the year in Gauteng", () => {
    const s = sizeForHome({ province: "Gauteng", billRand: 2500, tariff: 3.5, panelWatts: 550, battery: true });
    expect(s.panels).toEqual({ weakest: 9, best: 7, average: 8 });
  });

  it("asks solar for less of the home's use when there is no battery", () => {
    const withBattery = sizeForHome({ province: "Gauteng", billRand: 3000, tariff: 3, panelWatts: 550, battery: true });
    const without = sizeForHome({ province: "Gauteng", billRand: 3000, tariff: 3, panelWatts: 550, battery: false });
    expect(without.need).toBeLessThan(withBattery.need);
    expect(without.panels.weakest).toBeLessThan(withBattery.panels.weakest);
  });

  it("an array sized for the weakest month covers the need in every month", () => {
    for (const p of PROVINCES) {
      const s = sizeForHome({ province: p, billRand: 4000, tariff: 3.5, panelWatts: 600, battery: true });
      const made = monthlyOutput(p, (s.panels.weakest * 600) / 1000);
      expect(Math.min(...made)).toBeGreaterThanOrEqual(s.need - 1e-6);
      // and the yearly-average size comes up short in the weakest month wherever the year isn't flat
      const average = monthlyOutput(p, (s.panels.average * 600) / 1000);
      if (s.panels.average < s.panels.weakest) expect(Math.min(...average)).toBeLessThan(s.need);
    }
  });
});
