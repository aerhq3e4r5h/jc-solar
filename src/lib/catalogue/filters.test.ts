import { describe, expect, it } from "vitest";
import { activeFilterCount, applyFilters, buildFacets, filtersToQuery, parseFilters, sortProducts } from "./filters";
import { makeProduct } from "./fixtures";

const inverters = [
  makeProduct("inverters", "Deye: 5Kw Single Phase Hybrid Inverter (NEW) – VOC: 500V Battery: 48V", { priceInclVat: 14835, stockQty: 20 }),
  makeProduct("inverters", "Deye: 12Kw Three Phase Hybrid Inverter (SUN-12K-SG05LP3-EU-SM2)", { priceInclVat: 30935, stockQty: 0 }),
  makeProduct("inverters", "Victor: 6.2Kw ECO Off Grid Inverter – VOC: 500VDC Battery: 48VDC", { priceInclVat: 5750, stockQty: 220, isFeatured: true }),
  makeProduct("inverters", "Solis: 8Kw Single Phase LV Hybrid Inverter – VOC: 500V Battery: 60V", { priceInclVat: 25541, stockQty: 1, nrsApproved: true }),
];

describe("parseFilters", () => {
  it("reads repeated and single values and ignores junk", () => {
    const f = parseFilters({ brand: ["Deye", "Solis"], min: "5000", max: "abc", stock: "1", sort: "drop table", q: "  hybrid " });
    expect(f).toMatchObject({ brand: ["Deye", "Solis"], min: 5000, max: null, stock: true, sort: "featured", q: "hybrid" });
    expect(activeFilterCount(f)).toBe(5); // 2 brands, price, stock, search
  });
  it("round-trips through the query string", () => {
    const f = parseFilters({ brand: ["Deye"], smin: "5", nrs: "1", sort: "price_asc" });
    expect(filtersToQuery(f)).toBe("?brand=Deye&smin=5&nrs=1&sort=price_asc");
    expect(filtersToQuery(parseFilters({}))).toBe("");
  });
});

describe("applyFilters", () => {
  const run = (params: Record<string, string | string[]>) =>
    applyFilters(inverters, parseFilters(params), "inverters").map((p) => p.brand + " " + p.priceInclVat);

  it("filters by brand, price, size, type, phase, stock and NRS approval", () => {
    expect(run({ brand: "Deye" })).toEqual(["Deye 14835", "Deye 30935"]);
    expect(run({ min: "10000", max: "26000" })).toEqual(["Deye 14835", "Solis 25541"]);
    expect(run({ smin: "6", smax: "10" })).toEqual(["Victor 5750", "Solis 25541"]);
    expect(run({ type: "Off-grid" })).toEqual(["Victor 5750"]);
    expect(run({ phase: "three" })).toEqual(["Deye 30935"]);
    expect(run({ stock: "1" })).toHaveLength(3);
    expect(run({ nrs: "1" })).toEqual(["Solis 25541"]);
    expect(run({ q: "deye hybrid 12kw" })).toEqual(["Deye 30935"]);
  });
});

describe("sortProducts", () => {
  it("puts featured and in-stock products first by default", () => {
    const sorted = sortProducts(inverters, "featured", "inverters").map((p) => p.brand);
    expect(sorted[0]).toBe("Victor");
    expect(sorted[sorted.length - 1]).toBe("Deye"); // out of stock last
  });
  it("sorts by price and size", () => {
    expect(sortProducts(inverters, "price_asc").map((p) => p.priceInclVat)).toEqual([5750, 14835, 25541, 30935]);
    expect(sortProducts(inverters, "size_desc", "inverters").map((p) => p.priceInclVat)).toEqual([30935, 25541, 5750, 14835]);
  });
});

describe("buildFacets", () => {
  it("counts brands, types and phases and finds ranges", () => {
    const f = buildFacets(inverters, "inverters");
    expect(f.brands).toEqual([
      { value: "Deye", count: 2 },
      { value: "Solis", count: 1 },
      { value: "Victor", count: 1 },
    ]);
    expect(f.types.map((t) => t.value)).toEqual(["Hybrid", "Off-grid"]);
    expect(f.phases.map((p) => p.value).sort()).toEqual(["single", "three"]);
    expect(f.price).toEqual({ min: 5750, max: 30935 });
    expect(f.size).toEqual({ min: 5, max: 12 });
    expect(f.hasNrs).toBe(true);
  });
});
