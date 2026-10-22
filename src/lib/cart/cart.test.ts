import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const { cartOps, parseCart, MAX_QTY } = await import("./cart");
const { buildCartSummary } = await import("./summary");
const { makeProduct } = await import("@/lib/catalogue/fixtures");

const inverter = makeProduct("inverters", "Deye: 5Kw Single Phase Hybrid Inverter (NEW) – VOC: 500V Battery: 48V", { priceInclVat: 14835, stockQty: 20 });
const battery = makeProduct("batteries", "Dyness: Battery Lithium Ion DL5.0F 5.12KWH 51.2V 100Ah IP20", { priceInclVat: 14375, stockQty: 2 });
const battery24 = makeProduct("batteries", "Lux Power: LV Battery Lithium Ion Low Voltage 7.5Kwh 25.6V 300Ah", { priceInclVat: 15755, stockQty: 5 });
const soldOut = makeProduct("inverters", "Deye: 8Kw Single Phase Hybrid Inverter – VOC: 500V Battery: 48V", { priceInclVat: 23552, stockQty: 0 });

describe("parseCart", () => {
  it("rejects tampered or malformed cookies", () => {
    expect(parseCart(undefined)).toEqual([]);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart(JSON.stringify([{ id: "x", q: 1 }]))).toEqual([]);
    expect(parseCart(JSON.stringify([{ id: inverter.id, q: -3 }]))).toEqual([]);
    expect(parseCart(JSON.stringify([{ id: inverter.id, q: 2 }]))).toEqual([{ id: inverter.id, q: 2, i: false }]);
  });
});

describe("cartOps", () => {
  it("adds, merges, caps, updates and removes lines", () => {
    let lines = cartOps.add([], inverter.id, 1, false);
    lines = cartOps.add(lines, inverter.id, 2, true);
    expect(lines).toEqual([{ id: inverter.id, q: 3, i: true }]);
    lines = cartOps.add(lines, battery.id, MAX_QTY + 10, false);
    expect(lines[1].q).toBe(MAX_QTY);
    expect(cartOps.setQuantity(lines, inverter.id, 0)).toHaveLength(1);
    expect(cartOps.setInstallation(lines, inverter.id, false)[0].i).toBe(false);
    expect(cartOps.remove(lines, battery.id)).toEqual([{ id: inverter.id, q: 3, i: true }]);
  });
});

describe("buildCartSummary", () => {
  const catalogue = [inverter, battery, battery24, soldOut];

  it("prices lines from the catalogue and shows the VAT included", () => {
    const s = buildCartSummary(
      [
        { id: inverter.id, q: 1, i: true },
        { id: battery.id, q: 2, i: false },
      ],
      catalogue,
    );
    expect(s.subtotalInclVat).toBe(14835 + 2 * 14375);
    expect(s.vatIncluded).toBe(5685); // 43 585 x 15/115
    expect(s.count).toBe(3);
    expect(s.installationRequested).toBe(true);
    expect(s.issues).toEqual([]);
    expect(s.canCheckout).toBe(true);
  });

  it("blocks checkout for over-stock, sold-out and incompatible carts", () => {
    expect(buildCartSummary([{ id: battery.id, q: 3, i: false }], catalogue).items[0].overStock).toBe(true);
    expect(buildCartSummary([{ id: soldOut.id, q: 1, i: false }], catalogue).canCheckout).toBe(false);
    const bad = buildCartSummary(
      [
        { id: inverter.id, q: 1, i: false },
        { id: battery24.id, q: 1, i: false },
      ],
      catalogue,
    );
    expect(bad.issues[0].level).toBe("error");
    expect(bad.canCheckout).toBe(false);
  });

  it("uses live available stock and drops products that no longer exist", () => {
    const s = buildCartSummary(
      [
        { id: battery.id, q: 2, i: false },
        { id: "00000000-0000-4000-8000-999999999999", q: 1, i: false },
      ],
      catalogue,
      new Map([[battery.id, 1]]),
    );
    expect(s.removed).toBe(1);
    expect(s.items[0]).toMatchObject({ available: 1, overStock: true });
  });
});
