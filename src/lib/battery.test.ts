import { describe, expect, it } from "vitest";
import { BATTERY, batteriesFor, ratedKwhFor, usableKwh } from "./battery";

describe("the 30% rule", () => {
  it("uses 70% of a lithium battery and leaves 30% in it", () => {
    expect(BATTERY.floor).toBe(0.3);
    expect(BATTERY.usable).toBeCloseTo(1 - BATTERY.floor, 10);
    expect(usableKwh(5.12)).toBeCloseTo(3.58, 2);
    expect(ratedKwhFor(7)).toBeCloseTo(10, 10);
  });

  it("counts the batteries it takes to supply a need without going below 30%", () => {
    expect(batteriesFor(3.5, 5.12)).toBe(1); // 5 kWh rated needed
    expect(batteriesFor(3.6, 5.12)).toBe(2); // 5.14 kWh rated: one is just short
    expect(batteriesFor(9.5, 5.12)).toBe(3); // 13.6 kWh rated
    expect(batteriesFor(7, 10)).toBe(1); // exactly 10 kWh rated
    expect(batteriesFor(0, 5.12)).toBe(1);
    expect(batteriesFor(5, 0)).toBe(1);
  });
});
