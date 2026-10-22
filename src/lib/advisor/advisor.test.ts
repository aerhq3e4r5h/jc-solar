import { describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/catalogue/fixtures";
import { AdvisorError, runAdvisor } from "./gemini";
import { estimateSystem } from "./sizing";
import { extractRecommendations, runTool } from "./tools";

const deye5k = makeProduct("inverters", "Deye: 5Kw Single Phase Hybrid Inverter (NEW) – VOC: 500V Battery: 48V CT&WIFI Incl (SUN-5K-SG04LP1-EU-SM2)", {
  sku: "SUN-5K-SG04LP1-EU-SM2",
  priceInclVat: 21000,
});
const lux24 = makeProduct("inverters", "Lux Power: Inverter GETA 3.6Kw Off Grid Hybrid Single Phase CT&WIFI Incl (24V) (GETA-LB-EU3.6K/24V)", {
  sku: "GETA-LB-EU3.6K/24V",
  priceInclVat: 6000,
  stockQty: 0,
});
const deyeLv = makeProduct("batteries", "Deye: LV Battery Lithium Ion Low Voltage 5.12Kwh 51.2V 100Ah (Wall, Stack & Rack Mount) (SE-G5.1)", {
  sku: "SE-G5.1",
  priceInclVat: 18000,
});
const lux24Batt = makeProduct("batteries", "Lux Power: LV Battery Lithium Ion Low Voltage 7.5Kwh 25.6V 300Ah (Rack, Wall & Floor Mount) (LUX-Li-7.5e)", {
  sku: "LUX-Li-7.5e",
});
const ctx = { catalogue: [deye5k, lux24, deyeLv, lux24Batt], overrides: [] };

describe("estimateSystem", () => {
  it("sizes inverter, battery and solar from loads and the bill", () => {
    const r = estimateSystem({ simultaneousLoadW: 2000, surgeLoadW: 3000, averageBackupLoadW: 800, backupHours: 4, monthlyBillRand: 2100 });
    expect(r.inverterKw).toBe(3); // 2.5 kW with headroom → next standard size
    expect(r.batteryUsableKwh).toBe(3.2);
    expect(r.batteryNominalKwh).toBe(3.6);
    expect(r.dailyUsageKwh).toBe(20); // R2100 / R3.50 / 30
    expect(r.panelCount).toBe(6); // 14 kWh / (5.5 × 0.8) = 3.18 kWp → 6 × 550 W
    expect(r.solarKwp).toBe(3.3);
    expect(r.estimatedMonthlySavingsRand).toBeGreaterThan(1000);
    expect(r.assumptions.length).toBe(4);
  });
  it("lets a big surge decide the inverter and skips solar without usage", () => {
    const r = estimateSystem({ simultaneousLoadW: 1000, surgeLoadW: 9000, backupHours: 2 });
    expect(r.inverterKw).toBe(5);
    expect(r.batteryUsableKwh).toBe(1); // defaults to half the simultaneous load
    expect(r.solarKwp).toBeNull();
    expect(r.estimatedMonthlySavingsRand).toBeNull();
  });
});

describe("advisor tools", () => {
  it("searches by category, size, bus and stock", () => {
    const all = runTool("search_products", { category: "inverters" }, ctx) as { products: { sku: string; stock: string }[] };
    expect(all.products.map((p) => p.sku)).toEqual(["SUN-5K-SG04LP1-EU-SM2", "GETA-LB-EU3.6K/24V"]); // in stock first
    const inStock = runTool("search_products", { category: "inverters", in_stock_only: true }, ctx) as { products: unknown[] };
    expect(inStock.products).toHaveLength(1);
    const bus24 = runTool("search_products", { category: "batteries", battery_bus: "24" }, ctx) as { products: { sku: string }[] };
    expect(bus24.products.map((p) => p.sku)).toEqual(["LUX-Li-7.5e"]);
    const big = runTool("search_products", { category: "batteries", min_size: 6 }, ctx) as { products: { sku: string }[] };
    expect(big.products.map((p) => p.sku)).toEqual(["LUX-Li-7.5e"]);
    const deye = runTool("search_products", { category: "batteries", query: "deye" }, ctx) as { products: { sku: string; price_incl_vat: number }[] };
    expect(deye.products[0]).toMatchObject({ sku: "SE-G5.1", price_incl_vat: 18000 });
  });
  it("checks compatibility with the shared engine", () => {
    expect(runTool("check_compatibility", { inverter_sku: "sun-5k-sg04lp1-eu-sm2", battery_sku: "SE-G5.1" }, ctx)).toMatchObject({ status: "likely" });
    expect(runTool("check_compatibility", { inverter_sku: "SUN-5K-SG04LP1-EU-SM2", battery_sku: "LUX-Li-7.5e" }, ctx)).toMatchObject({
      status: "incompatible",
    });
    expect(runTool("check_compatibility", { inverter_sku: "SE-G5.1", battery_sku: "SE-G5.1" }, ctx)).toHaveProperty("error");
  });
  it("rejects bad arguments and unknown tools instead of throwing", () => {
    expect(runTool("search_products", { category: "toasters" }, ctx)).toHaveProperty("error");
    expect(runTool("delete_everything", {}, ctx)).toHaveProperty("error");
    expect(runTool("estimate_system", { simultaneous_load_w: "1500", backup_hours: 3 }, ctx)).toHaveProperty("inverterKw", 2);
  });
  it("turns [[SKU]] markers into known products only, once each", () => {
    const text = "Pair the inverter [[SUN-5K-SG04LP1-EU-SM2]] with [[SE-G5.1]] (or two [[SE-G5.1]]). Not [[MADE-UP-1]].";
    expect(extractRecommendations(text, ctx.catalogue).map((p) => p.sku)).toEqual(["SUN-5K-SG04LP1-EU-SM2", "SE-G5.1"]);
  });
});

function fakeGemini(responses: unknown[]) {
  const requests: { contents: { role: string; parts: Record<string, unknown>[] }[]; toolConfig: unknown }[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(init.body as string));
    const next = responses.shift();
    if (typeof next === "number") return new Response("error", { status: next });
    return Response.json(next);
  }) as typeof fetch;
  return { fetchImpl, requests };
}

describe("runAdvisor", () => {
  const base = { apiKey: "k", model: "gemini-2.5-flash", system: "sys", ctx };

  it("runs tool calls and returns the final answer", async () => {
    const { fetchImpl, requests } = fakeGemini([
      {
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ functionCall: { name: "search_products", args: { category: "batteries", query: "deye" } }, thoughtSignature: "sig" }],
            },
          },
        ],
      },
      { candidates: [{ content: { role: "model", parts: [{ text: "Try the Deye battery [[SE-G5.1]]." }] }, finishReason: "STOP" }] },
    ]);
    const r = await runAdvisor({ ...base, history: [{ role: "user", text: "Which battery?" }], fetchImpl });
    expect(r).toEqual({ text: "Try the Deye battery [[SE-G5.1]].", toolsUsed: ["search_products"] });
    // The second request echoes the model turn (with its signature) and the tool result.
    const second = requests[1].contents;
    expect(second[1]).toMatchObject({ role: "model", parts: [{ thoughtSignature: "sig" }] });
    expect(second[2].parts[0]).toMatchObject({ functionResponse: { name: "search_products", response: { total_matches: 1 } } });
  });

  it("maps upstream errors to friendly kinds", async () => {
    await expect(runAdvisor({ ...base, history: [{ role: "user", text: "hi" }], fetchImpl: fakeGemini([429]).fetchImpl })).rejects.toMatchObject({
      kind: "limit",
    });
    await expect(runAdvisor({ ...base, history: [{ role: "user", text: "hi" }], fetchImpl: fakeGemini([404]).fetchImpl })).rejects.toBeInstanceOf(
      AdvisorError,
    );
    await expect(
      runAdvisor({ ...base, history: [{ role: "user", text: "hi" }], fetchImpl: fakeGemini([{ promptFeedback: { blockReason: "SAFETY" } }]).fetchImpl }),
    ).rejects.toMatchObject({ kind: "blocked" });
  });

  it("forces a written answer after too many tool rounds", async () => {
    const call = { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "search_products", args: { category: "kits" } } }] } }] };
    const { fetchImpl, requests } = fakeGemini([call, call, call, call, call, call, { candidates: [{ content: { parts: [{ text: "Done." }] } }] }]);
    const r = await runAdvisor({ ...base, history: [{ role: "user", text: "kits?" }], fetchImpl });
    expect(r.text).toBe("Done.");
    expect(requests.at(-1)?.toolConfig).toEqual({ functionCallingConfig: { mode: "NONE" } });
  });
});
