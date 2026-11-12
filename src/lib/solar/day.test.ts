import { describe, expect, it } from "vitest";
import { PROVINCES } from "@/lib/checkout/schema";
import { BATTERY, batteriesFor } from "@/lib/battery";
import { SOLAR_SHARE } from "./seasons";
import { clock, dayStory, gridOff, HOUSE_KWH, houseKw, simulateDay, STORY } from "./day";

describe("the example home", () => {
  it("uses about 20 kWh a day, most of it in the evening", () => {
    expect(HOUSE_KWH).toBeCloseTo(20, 1);
    expect(houseKw(19)).toBeGreaterThan(houseKw(3));
    expect(houseKw(24)).toBeCloseTo(houseKw(0), 5);
  });

  it("has the batteries the 30% rule asks for, and never runs them below 30%", () => {
    // what the home takes from storage after sunset, in 5 kWh batteries that stop at 30%
    const fromStorage = HOUSE_KWH * (SOLAR_SHARE.withBattery - SOLAR_SHARE.withoutBattery);
    expect(STORY.batteryKwh).toBe(batteriesFor(fromStorage, 5) * 5);
    expect(STORY.floor).toBe(BATTERY.floor);
    // something is kept above that line for a power cut
    expect(STORY.reserve).toBeGreaterThan(STORY.floor);
    for (const p of PROVINCES) {
      const { days } = dayStory(p);
      for (const month of ["best", "weakest"] as const)
        for (const size of ["best", "weakest"] as const)
          for (let h = 0; h <= 24; h += 0.25) expect(days[month][size].at(h).charge).toBeGreaterThanOrEqual(0.3 - 1e-6);
    }
  });

  it("has load shedding from 18:00 to 20:30", () => {
    expect(gridOff(17.9)).toBe(false);
    expect(gridOff(18)).toBe(true);
    expect(gridOff(20.4)).toBe(true);
    expect(gridOff(20.5)).toBe(false);
  });

  it("writes the time as the story's clock does", () => {
    expect(clock(5)).toBe("05:00");
    expect(clock(13.5)).toBe("13:30");
    expect(clock(18.99)).toBe("18:45");
    expect(clock(24.5)).toBe("00:30");
  });
});

describe("a simulated day", () => {
  const day = simulateDay({ kwp: 4.4, yieldPerKw: 4.25, rise: 6.4, set: 17.8 });

  it("makes exactly the month's average from the panels", () => {
    expect(day.totals.solar).toBeCloseTo(4.4 * 4.25, 2);
  });

  it("accounts for every unit: what comes in is used, stored or spare", () => {
    for (const p of PROVINCES) {
      const story = dayStory(p);
      for (const month of ["best", "weakest"] as const)
        for (const size of ["best", "weakest"] as const) {
          const t = story.days[month][size].totals;
          // steady state: the battery ends the day as it began, so nothing is left in it
          expect(t.solar + t.grid).toBeCloseTo(t.house - t.short + t.spare, 1);
        }
    }
  });

  it("keeps the battery between its floor and full, and never buys power in a cut", () => {
    for (let h = 0; h <= 24; h += 0.05) {
      const m = day.at(h);
      expect(m.charge).toBeGreaterThanOrEqual(STORY.floor - 1e-6);
      expect(m.charge).toBeLessThanOrEqual(1 + 1e-6);
      if (gridOff(h + 0.03) && gridOff(h - 0.03)) expect(m.grid).toBe(0);
    }
  });

  it("makes nothing before sunrise or after sunset", () => {
    expect(day.at(5).solar).toBe(0);
    expect(day.at(19).solar).toBe(0);
    expect(day.at(12).solar).toBeGreaterThan(2);
  });
});

describe("why the array is sized for the weakest month", () => {
  it("needs more panels for the weakest month than for the best, everywhere", () => {
    for (const p of PROVINCES) {
      const { months } = dayStory(p);
      expect(months.weakest.panels).toBeGreaterThan(months.best.panels);
    }
    expect(dayStory("Gauteng").months).toMatchObject({ best: { name: "September", panels: 6 }, weakest: { name: "April", panels: 8 } });
    expect(dayStory("Western Cape").months).toMatchObject({ best: { name: "December", panels: 6 }, weakest: { name: "June", panels: 12 } });
  });

  it("fills the battery in the weakest month when sized for it, and not when sized for the best month", () => {
    for (const p of PROVINCES) {
      const { days } = dayStory(p);
      const sizedForIt = days.weakest.weakest;
      const tooSmall = days.weakest.best;
      expect(sizedForIt.peak.charge).toBeGreaterThan(0.985);
      expect(sizedForIt.darkAt).toBeNull();
      expect(tooSmall.peak.charge).toBeLessThan(0.9);
      expect(tooSmall.totals.grid + tooSmall.totals.short).toBeGreaterThan(sizedForIt.totals.grid + 1);
      // and the array sized for the best month all but fills it in that month
      expect(days.best.best.peak.charge).toBeGreaterThan(0.9);
      expect(days.best.best.darkAt).toBeNull();
      // the bigger array has power to spare in the best month
      expect(days.best.weakest.totals.spare).toBeGreaterThan(days.weakest.weakest.totals.spare);
    }
  });

  it("goes dark in the evening power cut in a Cape winter with a summer-sized array, but not on the Highveld", () => {
    const cape = dayStory("Western Cape").days.weakest.best;
    expect(cape.darkAt).not.toBeNull();
    expect(cape.darkAt!).toBeGreaterThanOrEqual(STORY.shedding[0]);
    expect(cape.darkAt!).toBeLessThan(STORY.shedding[1]);
    expect(dayStory("Gauteng").days.weakest.best.darkAt).toBeNull();
  });

  it("draws more cloud only for a month that is weaker than the sun's path explains", () => {
    for (const p of PROVINCES) {
      const { months } = dayStory(p);
      expect(months.best.cloud).toBe(0);
      expect(months.weakest.cloud).toBeGreaterThanOrEqual(0);
      expect(months.weakest.cloud).toBeLessThan(0.5);
    }
    // a wet Cape winter and the Highveld's late-summer rain, against the dry, clear winters of the interior and Durban
    expect(dayStory("Western Cape").months.weakest.cloud).toBeGreaterThan(0.1);
    expect(dayStory("Gauteng").months.weakest.cloud).toBeGreaterThan(0.1);
    expect(dayStory("Free State").months.weakest.cloud).toBe(0);
    expect(dayStory("KwaZulu-Natal").months.weakest.cloud).toBe(0);
  });
});
