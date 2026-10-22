import { describe, expect, it } from "vitest";
import { matchSystem, type PlannerStock } from "./match";

const item = (id: string, price: number, inStock = true) => ({ id, name: id, brand: null, url: `/p/${id}`, image: null, price, inStock });
const stock: PlannerStock = {
  kits: [{ ...item("kit-6-5", 30000), inverterKw: 6, batteryKwh: 5.12 }],
  inverters: [
    { ...item("inv-3-24", 4000), kw: 3.6, bus: "24" },
    { ...item("inv-5-48", 15000), kw: 5, bus: "48" },
    { ...item("inv-30-hv", 9000), kw: 30, bus: "HV" },
    { ...item("inv-8-48-out", 1000, false), kw: 8, bus: "48" },
  ],
  batteries: [
    { ...item("bat-2.5-24", 7800), kwh: 2.56, bus: "24" },
    { ...item("bat-5-48", 14000), kwh: 5.12, bus: "48" },
    { ...item("bat-15-hv", 9000), kwh: 15, bus: "HV" },
  ],
};

describe("matchSystem", () => {
  it("pairs an inverter with enough batteries on the same voltage", () => {
    const m = matchSystem(stock, 3, 4)!;
    expect(m.kind).toBe("pair");
    expect(m.lines.map((l) => [l.item.id, l.quantity])).toEqual([
      ["inv-3-24", 1],
      ["bat-2.5-24", 2],
    ]);
    expect(m.total).toBe(4000 + 2 * 7800);
    expect(m.batteryKwh).toBe(5.12);
    expect(m.bus).toBe("24");
  });

  it("prefers a kit when it is cheaper, and skips stock we don't have", () => {
    const m = matchSystem(stock, 5.5, 5)!;
    expect(m.kind).toBe("kit");
    expect(m.lines[0].item.id).toBe("kit-6-5");
  });

  it("never mixes voltages or oversizes wildly", () => {
    const m = matchSystem(stock, 4, 10)!;
    expect(m.lines[0].item.id).toBe("inv-5-48");
    expect(m.lines[1]).toMatchObject({ quantity: 2 });
    expect(matchSystem({ ...stock, kits: [] }, 10, 5)).toBeNull();
  });

  it("caps the number of batteries", () => {
    expect(matchSystem({ ...stock, kits: [] }, 3, 30)).toBeNull();
  });
});
