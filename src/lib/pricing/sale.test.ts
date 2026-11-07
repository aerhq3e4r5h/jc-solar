import { describe, expect, it } from "vitest";
import { applyDiscount, changePrice, discountPercent, endSale } from "./sale";

describe("sale pricing", () => {
  it("works out the percentage off", () => {
    expect(discountPercent(850, 1000)).toBe(15);
    expect(discountPercent(3967.5, 4500)).toBe(12);
    expect(discountPercent(1000, 1000)).toBeNull();
    expect(discountPercent(1000, null)).toBeNull();
    expect(discountPercent(1100, 1000)).toBeNull();
    expect(discountPercent(999.9, 1000)).toBeNull(); // under 1%: no ribbon
  });

  it("keeps the old price as the was-price when a price drops", () => {
    expect(changePrice({ price: 1000, compareAt: null }, 850)).toEqual({ price: 850, compareAt: 1000 });
    // A second cut keeps the original was-price, not the first sale price.
    expect(changePrice({ price: 850, compareAt: 1000 }, 800)).toEqual({ price: 800, compareAt: 1000 });
  });

  it("ends the sale when the price goes back up", () => {
    expect(changePrice({ price: 850, compareAt: 1000 }, 1000)).toEqual({ price: 1000, compareAt: null });
    expect(changePrice({ price: 1000, compareAt: null }, 1200)).toEqual({ price: 1200, compareAt: null });
    expect(changePrice({ price: 850, compareAt: 1000 }, 900)).toEqual({ price: 900, compareAt: 1000 }); // still on sale
  });

  it("applies a percentage off the original price, and ends a sale", () => {
    expect(applyDiscount({ price: 1000, compareAt: null }, 15)).toEqual({ price: 850, compareAt: 1000 });
    expect(applyDiscount({ price: 900, compareAt: 1000 }, 20)).toEqual({ price: 800, compareAt: 1000 });
    expect(applyDiscount({ price: 3967.5, compareAt: null }, 10)).toEqual({ price: 3570.75, compareAt: 3967.5 });
    expect(endSale({ price: 800, compareAt: 1000 })).toEqual({ price: 1000, compareAt: null });
    expect(endSale({ price: 800, compareAt: null })).toEqual({ price: 800, compareAt: null });
  });
});
