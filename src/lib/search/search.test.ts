import { describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/catalogue/fixtures";
import { closestCategory, searchProducts } from "./search";

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

describe("forgiving search", () => {
  const panel = makeProduct("solar-panels", "JA Solar Panel 540W Half Cell Mono Crystalline (JAM72S30-540/MR)", { sku: "JAM72S30-540/MR" });
  const stab = makeProduct("voltage-stabilizers", "Lemoen: 8KVA Single Phase Relay Type Voltage Stabilizer (LMN-DVB-8KVA-80/260)", { sku: "LMN-DVB-8KVA-80/260" });
  const aircon = makeProduct("air-conditioners", "Jetman: Digital Inverter Split Aircon 12 000 BTU (JM-12SA/XA21)", { sku: "JM-12SA/XA21" });
  const all = [deye, dyness, deyeBat, panel, stab, aircon];

  it("understands local spellings and synonyms", () => {
    expect(searchProducts(all, "deye inverta").map((p) => p.sku)).toContain(deye.sku);
    expect(searchProducts(all, "voltage stabiliser").map((p) => p.sku)).toEqual([stab.sku]);
    expect(searchProducts(all, "air conditioner").map((p) => p.sku)).toEqual([aircon.sku]);
    expect(searchProducts(all, "solar panels").map((p) => p.sku)).toEqual([panel.sku]);
  });
  it("forgives one wrong letter in a longer word, but not in numbers", () => {
    expect(searchProducts(all, "invertr").map((p) => p.sku)).toContain(deye.sku);
    expect(searchProducts(all, "dynes battery").map((p) => p.sku)).toEqual([dyness.sku]);
    expect(searchProducts(all, "6kw")).toEqual([]);
  });
  it("ranks the model people mean over bigger systems that merely contain the number", () => {
    const kit = makeProduct("kits", "Deye: All In One HESS: 125Kw Hybrid Inverter + 128Kwh Battery Cabinet (DeyeAIO125/128)", { sku: "DeyeAIO125/128" });
    expect(searchProducts([kit, deye], "deye 5kw")[0].sku).toBe(deye.sku);
  });
  it("puts an exact SKU match first", () => {
    expect(searchProducts(all, "SE-G5.1")[0].sku).toBe("SE-G5.1");
  });
  it("finds the category a failed search was about", () => {
    expect(closestCategory("inverta")).toBe("inverters");
    expect(closestCategory("stabiliser")).toBe("voltage-stabilizers");
    expect(closestCategory("toaster")).toBeNull();
  });
});
