import { describe, expect, it } from "vitest";
import { buildImport, type RawRow } from "./build-import";
import { classifyRow } from "./classify";
import { brandFromName, cleanText, normaliseBrand, parseNumber, parseStock, slugify } from "./normalise";
import { planImport } from "./plan";
import { extractSpecs, missingSpecs } from "./specs";
import { readCatalogueFile, writeCatalogueWorkbook } from "./workbook";

const spec = (category: Parameters<typeof extractSpecs>[0], name: string) =>
  Object.fromEntries(extractSpecs(category, name).specs.map((s) => [s.key, s.valueNum ?? s.valueText]));

describe("cleanText / parseNumber", () => {
  it("collapses whitespace and non-breaking spaces", () => {
    expect(cleanText("  NT Solar: 220W  M10  ")).toBe("NT Solar: 220W M10");
  });
  it.each([
    [13903.5, 13903.5],
    ["13903.50", 13903.5],
    ["R 1,234.50", 1234.5],
    ["1 234,50", 1234.5],
    ["1.234,50", 1234.5],
    ["", null],
    ["n/a", null],
    [null, null],
  ])("parses %j as %j", (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });
});

describe("parseStock", () => {
  it("reads quantities and states from the stock note", () => {
    expect(parseStock("12 in stock")).toEqual({ ok: true, quantity: 12, backorder: false });
    expect(parseStock("Out Of Stock")).toEqual({ ok: true, quantity: 0, backorder: false });
    expect(parseStock("Available on backorder")).toEqual({ ok: true, quantity: 0, backorder: true });
  });
  it("falls back to the In stock column only when it says No", () => {
    expect(parseStock("", "No")).toEqual({ ok: true, quantity: 0, backorder: false });
    expect(parseStock("", "Yes").ok).toBe(false);
  });
});

describe("brands", () => {
  it.each([
    ["INGE", "Inge: Something", "Inge"],
    ["Dyness (LTL)", "Dyness (LTL): Battery", "Dyness"],
    ["Deye All In One HESS", "Deye All In One HESS: 125Kw", "Deye"],
    ["Web Special", "Web Special: Victor 6.2Kw ECO Off Grid Inverter & Lemoen LIFE5", "Victor"],
    ["", "Lux Power Inverter 5KW Off Grid (LUX-SNA5000WPV)", "Lux Power"],
    ["", "JA Solar Panel 540W Half Cell Mono Crystalline", "JA Solar"],
    ["", "Risen 550W Titan Mono Perc Bifacial", "Risen"],
    ["JA", "JA: 545W", "JA Solar"],
  ])("normalises %j", (raw, name, expected) => {
    expect(normaliseBrand(raw, name).brand).toBe(expected);
  });
  it("reports when it cannot find a brand", () => {
    expect(normaliseBrand("", "Mystery panel 400W").brand).toBeNull();
    expect(brandFromName("Unknown thing")).toBeNull();
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Deye: 8Kw Single Phase Hybrid Inverter – VOC: 500V & WIFI")).toBe(
      "deye-8kw-single-phase-hybrid-inverter-voc-500v-and-wifi",
    );
  });
});

describe("classifyRow", () => {
  it.each([
    ["Deye: 8Kw Single Phase Hybrid Inverter (NEW) – VOC: 500V Battery: 48V CT&WIFI Incl (SUN-8K-SG05LP1-EU-SM2)", [], "inverters"],
    ["Dyness: Battery Lithium Ion PowerBrick 14.33Kwh 51.2V 280Ah (Wall & Floor Mount) (DYN-PowerBrick)", [], "batteries"],
    ["JA Solar Panel 540W Half Cell Mono Crystalline (JAM72S30-540/MR)", ["Solar Panels"], "solar-panels"],
    ["Web Special: Deye 6Kw Single Phase Off-Grid Hybrid Inverter & Deye LV 5.12KWH Battery (Web-Deye-Deye)", [], "kits"],
    ["Lux Power: ECO Beast All-In-One Stack – 6Kw Inverter & 5.12Kwh 51.2V 100Ah Battery", [], "kits"],
    ["SRNE: Vertical Energy Storage System 48V (All-In-1) (Inverter: 5KW / Battery: 5.12KW) (SR-EOV05S-220)", [], "kits"],
    // Mounting options and included parts do not make a product an accessory.
    ["Deye: LV Battery Lithium Ion Low Voltage 5.12Kwh 51.2V 100Ah (Wall, Stack & Rack Mount) (SE-G5.1)", [], "batteries"],
    ["Lux Power: LV Battery Lithium Ion Low Voltage 15Kwh 51.2V 300Ah (Rack, Wall & Floor Mount) (LUX-Li-15e)", [], "batteries"],
    ["Deye: Bos-B Pro 241.2Kwh High Voltage Battery Pack (Incl. 16.08Kwh Batteries, BDU and Accessories) (Bos-B-PRO-241.2Kwh)", [], "batteries"],
    ["Lux Power: Inverter 12Kw Off Grid ECO Hybrid Single Phase CT, WIFI & Breaker Incl (LUX-SNA-EU-12K)", [], "inverters"],
    ["Shoto: Battery Lithium Ion 5.1Kw 16Cell (Rack Mount) (SDC10-Box5)", [], "batteries"],
    ["CNBM: 335W Solar Panel High Voltage Mono Crystalline – VOC: 100.14V / ISC: 4.04A (CNBM10M-335)", ["CNBM"], "solar-panels"],
    // A Deye inverter whose name contains "&" and "Battery:" is not a kit.
    ["Deye: 6Kw Single Phase Off-Grid Hybrid Inverter Dual MPPT (18A+18A) & Integrated WIFI – VOC: 500V Battery: 48V", [], "inverters"],
  ])("puts %s in %s", (name, labels, expected) => {
    expect(classifyRow(name, labels).category).toBe(expected);
  });

  it.each([
    "Deye: Split-Core Current Transformer 100A/50mA for Deye Single Phase Inverters up to 12kW (CTK160402-100A)",
    "Inge: Deye 12KW All-in-1 Wall Mount Cabinet (Inge-Deye-12KW-AI1)",
    "Deye: BMU High Voltage Battery Cluster Control Box for BOS-A (BOS-A-PDU2)",
    "Geely: E5 Apex Fully Electric SUV (FWD 160KW 320NM WLTP Range: 410KM 60.22KWH Battery) (GE5Apex)",
    "Gentech: 7KW Electric Start Petrol Inverter-Generator with 2 Wire Auto Start",
    "Inge: Solar Panel Water Drainage Clip (30mm Plastic) (SOLPAN-WDC-30P)",
    "INVT: Solar Pump Inverter 2.2KW (GD100-2R2G-SS2-PV)",
    "Etek: AC LED Voltage Meter 22mm Square 500VAC GREEN (EKLV22-SAV-500G)",
    "Deye: High Voltage Battery Rack (13 x HV 7.68Kwh Batteries & 1 x HV Cluster Control Box) (BOS-A-RACK14)",
    "Shoto Battery Box Fits 2 x 5.12Kw Shoto Batteries (Colour White) (S2B5.1-W)",
    "Dyness: Battery Vertical Stacking Bracket Set for B3 Batteries 3.6KWH (DS006)",
    "Inge: Deye 8KW/12KW Inverter Wall Mount Battery Box Base Plate (Inge-Deye-8KW/12KW-BBBP)",
    "INVT: DC Solar Pump Inverter Three Phase 380V 4KW (SP100-004-D4-6-S)",
    "Inge: LED Solar Light 100W 1097lm Cool White Motion Sensor 15Ah Battery 18W Solar Panel (IS-FL100)",
    "Inge: LED Post Lamp 800W 2029lm RGB Motion Sensor 32Ah Battery 32W Solar Panel (IS-PL800)",
  ])("skips %s", (name) => {
    expect(classifyRow(name, ["Solar Panels"]).category).toBeNull();
  });
});

describe("extractSpecs", () => {
  it("reads panel specs", () => {
    expect(spec("solar-panels", "GCL: 590W Dual Glass TOPCon 1.0 Tech N-Type Bifacial – VOC: 52.20V / ISC: 14.13A (GCL-NT10/72GDF-590W)")).toMatchObject({
      wattage_w: 590,
      voc_v: 52.2,
      isc_a: 14.13,
      cell_type: "N-type TOPCon",
      bifacial: 1,
      dual_glass: 1,
    });
  });
  it("reads battery specs", () => {
    expect(spec("batteries", "Deye: LV Battery Lithium Ion Low Voltage 5.12Kwh 51.2V 100Ah (Wall, Floor & Stack Mount) (SE-F5)")).toMatchObject({
      capacity_kwh: 5.12,
      nominal_voltage_v: 51.2,
      capacity_ah: 100,
      chemistry: "Lithium-ion",
      voltage_class: "Low voltage (LV)",
      stackable: "Yes",
    });
    expect(spec("batteries", "SRNE: RV Battery LFP 12.8V 314Ah 4.01Kwh (SR-EOM04B)")).toMatchObject({
      chemistry: "LiFePO4 (LFP)",
      capacity_kwh: 4.01,
    });
  });
  it("reads a battery capacity written as Kw and warns", () => {
    const result = extractSpecs("batteries", "Shoto: Battery Lithium Ion 5.1Kw 16Cell (Rack Mount) (SDC10-Box5)");
    expect(result.specs.find((s) => s.key === "capacity_kwh")?.valueNum).toBe(5.1);
    expect(result.warnings).toContain('Capacity written as "5.1Kw"; read as 5.1 kWh');
  });
  it("reads inverter specs", () => {
    expect(spec("inverters", "Deye: 10Kw Single Phase LV Hybrid Inverter Tri-MPPT IP65 Integrated WIFI – VOC: 500V Battery: 48V CT Incl")).toMatchObject({
      rated_power_kw: 10,
      inverter_type: "Hybrid",
      phases: "Single phase",
      mppt_count: 3,
      max_pv_voltage_v: 500,
      battery_voltage_v: 48,
    });
    expect(spec("inverters", "Deye: 40Kw Three Phase Grid Tie Inverter – 3MPPT VOC: 1100V (SUN-40K-G04)")).toMatchObject({
      rated_power_kw: 40,
      inverter_type: "Grid-tie",
      phases: "Three phase",
      mppt_count: 3,
      max_pv_voltage_v: 1100,
    });
    expect(spec("inverters", "SRNE: Inverter 3KW Off Grid – VOC: 100VDC Battery: 24VDC PV: 1400W (SR-HF2430S60-100)")).toMatchObject({
      rated_power_kw: 3,
      inverter_type: "Off-grid",
      max_pv_voltage_v: 100,
      battery_voltage_v: 24,
      max_pv_power_w: 1400,
    });
  });
  it("reads kit specs and flags the KW-for-kWh typo", () => {
    const result = extractSpecs("kits", "SRNE: Vertical Energy Storage System 48V (All-In-1) (Inverter: 5KW / Battery: 5.12KW) (SR-EOV05S-220)");
    expect(Object.fromEntries(result.specs.map((s) => [s.key, s.valueNum]))).toMatchObject({
      inverter_power_kw: 5,
      battery_capacity_kwh: 5.12,
    });
    expect(result.warnings[0]).toMatch(/read as 5.12 kWh/);
  });
  it("lists required specs that could not be read", () => {
    const { specs } = extractSpecs("solar-panels", "JA Solar Panel 540W Half Cell Mono Crystalline");
    expect(missingSpecs("solar-panels", specs)).toEqual(["efficiency_pct", "voc_v", "isc_a", "vmp_v", "imp_a"]);
  });
});

const row = (rowNumber: number, values: RawRow["values"]): RawRow => ({ rowNumber, values });

describe("buildImport", () => {
  const base = {
    brand: "Deye",
    categories: "Batteries; Lithium Ion Batteries",
    priceExclVat: 12090,
    priceInclVat: 13903.5,
    inStock: "Yes",
    stockNote: "7 in stock",
  };

  it("builds a clean product with shipping class and incomplete flags", () => {
    const result = buildImport([
      row(2, { ...base, name: "Deye: LV Battery Lithium Ion Low Voltage 5.12Kwh 51.2V 100Ah (SE-G5.1)", sku: "SE-G5.1" }),
    ]);
    expect(result.invalid).toEqual([]);
    const [p] = result.products;
    expect(p).toMatchObject({
      sku: "SE-G5.1",
      category: "batteries",
      priceInclVat: 13903.5,
      stockQty: 7,
      shippingClass: "dangerous_goods",
      isDangerousGoods: true,
    });
    expect(p.incompleteFields).toEqual(expect.arrayContaining(["description", "images", "weight_kg", "spec:cycle_life"]));
  });

  it("keeps SKUs exactly as supplied and rejects duplicates", () => {
    const result = buildImport([
      row(2, { ...base, name: "Solis: 5Kw Single Phase LV Hybrid Inverter – VOC: 500V Battery: 60V", sku: "S6-EH1P(5)K-L-Plus" }),
      row(3, { ...base, name: "Solis: 6Kw Single Phase LV Hybrid Inverter – VOC: 500V Battery: 60V", sku: "s6-eh1p(5)k-l-plus" }),
    ]);
    expect(result.products.map((p) => p.sku)).toEqual(["S6-EH1P(5)K-L-Plus"]);
    expect(result.invalid[0]).toMatchObject({ row: 3, reason: "Duplicate SKU (also on row 2)" });
  });

  it("rejects zero prices and missing SKUs, skips out-of-scope rows", () => {
    const result = buildImport([
      row(2, { ...base, name: "Deye: 5Kw Single Phase Hybrid Inverter", sku: "ZERO", priceInclVat: 0, priceExclVat: 0 }),
      row(3, { ...base, name: "Deye: 6Kw Single Phase Hybrid Inverter", sku: "" }),
      row(4, { ...base, name: "Etek: AC Contactor 25A", sku: "ETK-1" }),
    ]);
    expect(result.products).toEqual([]);
    expect(result.invalid.map((i) => i.reason)).toEqual([
      "priceInclVat: Price must be more than R0.00",
      "Missing SKU (generation needs your approval before saving)",
    ]);
    expect(result.skipped).toHaveLength(1);
  });

  it("warns when the two price columns disagree and fills a blank incl. price", () => {
    const result = buildImport([
      row(2, { ...base, name: "Deye: 5Kw Single Phase Hybrid Inverter", sku: "A", priceInclVat: 100, priceExclVat: 100 }),
      row(3, { ...base, name: "Deye: 6Kw Single Phase Hybrid Inverter", sku: "B", priceInclVat: "", priceExclVat: 1000 }),
    ]);
    expect(result.products.find((p) => p.sku === "B")?.priceInclVat).toBe(1150);
    expect(result.warnings.map((w) => w.reason)).toEqual(
      expect.arrayContaining([expect.stringMatching(/does not equal/), expect.stringMatching(/calculated R1150.00/)]),
    );
  });

  it("gives clashing names distinct slugs", () => {
    const result = buildImport([
      row(2, { ...base, name: "Deye: 5Kw Single Phase Hybrid Inverter", sku: "A1" }),
      row(3, { ...base, name: "Deye: 5Kw Single Phase Hybrid Inverter", sku: "A2" }),
    ]);
    const slugs = result.products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(2);
  });
});

describe("planImport", () => {
  it("separates inserts, updates and unchanged rows by SKU", () => {
    const { products } = buildImport([
      row(2, { brand: "Deye", name: "Deye: 5Kw Single Phase Hybrid Inverter", sku: "A", priceInclVat: 100, stockNote: "1 in stock" }),
      row(3, { brand: "Deye", name: "Deye: 6Kw Single Phase Hybrid Inverter", sku: "B", priceInclVat: 200, stockNote: "1 in stock" }),
      row(4, { brand: "Deye", name: "Deye: 8Kw Single Phase Hybrid Inverter", sku: "C", priceInclVat: 300, stockNote: "1 in stock" }),
    ]);
    const plan = planImport(products, [
      { sku: "a", name: "Deye: 5Kw Single Phase Hybrid Inverter", brand: "Deye", category: "inverters", priceInclVat: 100, stockQty: 1, allowBackorder: false },
      { sku: "B", name: "Deye: 6Kw Single Phase Hybrid Inverter", brand: "Deye", category: "inverters", priceInclVat: 250, stockQty: 1, allowBackorder: false },
      { sku: "OLD", name: "Old", brand: null, category: "inverters", priceInclVat: 1, stockQty: 0, allowBackorder: false },
    ]);
    expect(plan.counts).toEqual({ insert: 1, update: 1, unchanged: 1 });
    const update = plan.rows.find((r) => r.action === "update");
    expect(update && update.action === "update" && update.changes).toEqual([{ field: "priceInclVat", from: 250, to: 200 }]);
    expect(plan.notInFile).toEqual(["OLD"]);
  });
});

describe("workbook round trip", () => {
  it("exports in the import layout and reads back the same products", async () => {
    const buffer = await writeCatalogueWorkbook([
      { name: "Deye: 5Kw Single Phase Hybrid Inverter", sku: "SUN-5K", brand: "Deye", category: "inverters", priceInclVat: 14835, stockQty: 3, allowBackorder: false, imageCount: 0, descriptionLength: 0, url: "https://example.com/p" },
      { name: "Dyness: Battery Lithium Ion 5.12KWH 51.2V 100Ah", sku: "DL5", brand: "Dyness", category: "batteries", priceInclVat: 13052.5, stockQty: 0, allowBackorder: true, imageCount: 1, descriptionLength: 10, url: "https://example.com/q" },
    ]);
    const read = await readCatalogueFile(buffer, "export.xlsx");
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const built = buildImport(read.rows);
    expect(built.products.map((p) => [p.sku, p.priceInclVat, p.stockQty, p.allowBackorder])).toEqual([
      ["SUN-5K", 14835, 3, false],
      ["DL5", 13052.5, 0, true],
    ]);
    expect(built.warnings.filter((w) => /does not equal/.test(w.reason))).toEqual([]);
  });

  it("rejects files without the required columns", async () => {
    const read = await readCatalogueFile(Buffer.from("a,b\n1,2\n"), "bad.csv");
    expect(read.ok).toBe(false);
  });
});
