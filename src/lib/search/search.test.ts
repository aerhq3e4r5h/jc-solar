import { describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/catalogue/fixtures";
import { searchProducts } from "./search";

const deye = makeProduct("inverters", "Deye: 5Kw Single Phase Hybrid Inverter (SUN-5K-SG04LP1-EU-SM2)", { sku: "SUN-5K-SG04LP1-EU-SM2", priceInclVat: 15000 });
const dyness = makeProduct("batteries", "Dyness: Battery Lithium Ion DL5.0F 5.12KWH (DYN-DL5.0F)", { sku: "DYN-DL5.0F", stockQty: 0 });
const deyeBat = makeProduct("batteries", "Deye: LV Battery Lithium Ion 5.12Kwh (SE-G5.1)", { sku: "SE-G5.1" });
const catalogue = [deye, dyness, deyeBat];

describe("searchProducts", () => {
  it("needs every word to match and ranks SKU and brand hits first", () => {
    expect(searchProducts(catalogue, "deye").map((p) => p.sku)).toEqual(["SE-G5.1", "SUN-5K-SG04LP1-EU-SM2"]); // equal brand hits: cheaper first
    expect(searchProducts(catalogue, "deye battery").map((p) => p.sku)).toEqual(["SE-G5.1"]);
    expect(searchProducts(catalogue, "dyn-dl5.0f")[0].sku).toBe("DYN-DL5.0F");
  });
  it("matches category words and ignores junk", () => {
    expect(searchProducts(catalogue, "batteries").length).toBe(2);
    expect(searchProducts(catalogue, "  ")).toEqual([]);
    expect(searchProducts(catalogue, "(((")).toEqual([]);
    expect(searchProducts(catalogue, "toaster")).toEqual([]);
  });
});
