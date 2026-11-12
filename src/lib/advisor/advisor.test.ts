import { beforeEach, describe, expect, it } from "vitest";
import { makeProduct } from "@/lib/catalogue/fixtures";
import { AdvisorError, DEFAULT_MODEL, FALLBACK_MODELS, forgetModelHealth, quotaDetail, runAdvisor, thinkingFor } from "./gemini";
import { estimateSystem } from "./sizing";
import { extractRecommendations, runTool } from "./tools";

const deye5k = makeProduct(
  "inverters",
  "Deye: 5Kw Single Phase Hybrid Inverter (NEW) – VOC: 500V Battery: 48V CT&WIFI Incl (SUN-5K-SG04LP1-EU-SM2)",
  {
    sku: "SUN-5K-SG04LP1-EU-SM2",
    priceInclVat: 21000,
  },
);
const lux24 = makeProduct("inverters", "Lux Power: Inverter GETA 3.6Kw Off Grid Hybrid Single Phase CT&WIFI Incl (24V) (GETA-LB-EU3.6K/24V)", {
  sku: "GETA-LB-EU3.6K/24V",
  priceInclVat: 6000,
  stockQty: 0,
});
const deyeLv = makeProduct("batteries", "Deye: LV Battery Lithium Ion Low Voltage 5.12Kwh 51.2V 100Ah (Wall, Stack & Rack Mount) (SE-G5.1)", {
  sku: "SE-G5.1",
  priceInclVat: 18000,
});
const lux24Batt = makeProduct(
  "batteries",
  "Lux Power: LV Battery Lithium Ion Low Voltage 7.5Kwh 25.6V 300Ah (Rack, Wall & Floor Mount) (LUX-Li-7.5e)",
  {
    sku: "LUX-Li-7.5e",
  },
);
const ctx = { catalogue: [deye5k, lux24, deyeLv, lux24Batt], overrides: [] };

describe("estimateSystem", () => {
  it("sizes inverter, battery and solar from loads and the bill", () => {
    const r = estimateSystem({ simultaneousLoadW: 2000, surgeLoadW: 3000, averageBackupLoadW: 800, backupHours: 4, monthlyBillRand: 2100 });
    expect(r.inverterKw).toBe(3); // 2.5 kW with headroom → next standard size
    expect(r.batteryUsableKwh).toBe(3.2);
    expect(r.batteryNominalKwh).toBe(4.6); // only run down to 30%: 3.2 kWh of use takes 3.2 / 0.7 of battery
    expect(r.dailyUsageKwh).toBe(20); // R2100 / R3.50 / 30
    expect(r.panelCount).toBe(7); // no province: 14 kWh / 4.17 (a typical weakest month) = 3.36 kWp → 7 × 550 W
    expect(r.solarKwp).toBe(3.85);
    expect(r.estimatedMonthlySavingsRand).toBe(1470); // capped at the 14 kWh a day the home can use: 14 × 30 × R3.50
    expect(r.assumptions.length).toBe(4);
  });
  it("sizes solar for the weakest month in the customer's province", () => {
    const base = { simultaneousLoadW: 2000, backupHours: 4, monthlyBillRand: 2100 };
    const cape = estimateSystem({ ...base, province: "Western Cape" });
    const gauteng = estimateSystem({ ...base, province: "Gauteng" });
    expect(cape.panelCount).toBe(10); // 14 kWh / 2.65 (June in Cape Town) = 5.28 kWp
    expect(gauteng.panelCount).toBe(6); // 14 kWh / 4.25 (April in Johannesburg) = 3.29 kWp
    expect(cape.assumptions.join(" ")).toContain("June");
    expect(gauteng.assumptions.join(" ")).toContain("April");
    // an unknown province falls back to the typical figure rather than failing
    expect(estimateSystem({ ...base, province: "Atlantis" }).panelCount).toBe(7);
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
    expect(runTool("check_compatibility", { inverter_sku: "sun-5k-sg04lp1-eu-sm2", battery_sku: "SE-G5.1" }, ctx)).toMatchObject({
      status: "likely",
    });
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
  it("returns the matching products from stock with the estimate, in one call", () => {
    const panel = makeProduct("solar-panels", "JA Solar: 550W Mono PERC Half-Cell – VOC: 49.90V / ISC: 14.00A (JAM72S30-550/MR)", { sku: "JAM-550", priceInclVat: 1500, stockQty: 40 });
    const stock = { catalogue: [...ctx.catalogue, panel], overrides: [] };
    const r = runTool("estimate_system", { simultaneous_load_w: 2000, average_backup_load_w: 800, backup_hours: 4, monthly_bill_rand: 2100, province: "Gauteng" }, stock) as {
      batteryNominalKwh: number;
      panelCount: number;
      suggested_products: {
        inverter: { sku: string };
        battery: { sku: string; quantity: number; total_rated_kwh: number; compatibility: string };
        panels: { sku: string; quantity: number; strings: string };
        total_incl_vat: number;
      };
    };
    const s = r.suggested_products;
    // the 24 V Lux is out of stock, and its battery doesn't fit the 48 V Deye
    expect(s.inverter.sku).toBe("SUN-5K-SG04LP1-EU-SM2");
    expect(s.battery).toMatchObject({ sku: "SE-G5.1", compatibility: "likely" });
    expect(s.battery.total_rated_kwh).toBeGreaterThanOrEqual(r.batteryNominalKwh);
    expect(s.panels).toMatchObject({ sku: "JAM-550", quantity: r.panelCount });
    expect(s.total_incl_vat).toBe(21000 + 18000 * s.battery.quantity + 1500 * s.panels.quantity);
  });
  it("says so when stock can't cover the estimate", () => {
    const r = runTool("estimate_system", { simultaneous_load_w: 30000, backup_hours: 4 }, ctx) as { suggested_products: Record<string, unknown> };
    expect(r.suggested_products).not.toHaveProperty("inverter");
    expect(r.suggested_products.note).toMatch(/Nothing in stock/);
  });
  it("finds everything that works with a product from a SKU or a description", () => {
    const byWords = runTool("find_compatible", { product: "Deye 5 kW hybrid inverter" }, ctx) as {
      product: { sku: string };
      compatible: { sku: string; compatibility: string }[];
    };
    expect(byWords.product.sku).toBe("SUN-5K-SG04LP1-EU-SM2");
    expect(byWords.compatible.map((c) => c.sku)).toEqual(["SE-G5.1"]); // the 24 V Lux battery is left out
    const bySku = runTool("find_compatible", { product: "se-g5.1" }, ctx) as { product: { category: string }; compatible: { sku: string }[] };
    expect(bySku.product.category).toBe("batteries");
    expect(bySku.compatible.map((c) => c.sku)).toEqual(["SUN-5K-SG04LP1-EU-SM2"]); // the Lux inverter is out of stock, and 24 V
    expect(runTool("find_compatible", { product: "Deye 8kW" }, ctx)).toHaveProperty("error"); // no 8 kW in this catalogue
    expect(runTool("find_compatible", { product: "toaster" }, ctx)).toHaveProperty("error");
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
  beforeEach(() => forgetModelHealth());

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
    expect(r).toMatchObject({ text: "Try the Deye battery [[SE-G5.1]].", toolsUsed: ["search_products"], model: "gemini-2.5-flash" });
    expect(r.tried).toBeUndefined();
    expect(r.trace).toHaveLength(2); // one call that asked for the tool, one that answered
    // The second request echoes the model turn (with its signature) and the tool result.
    const second = requests[1].contents;
    expect(second[1]).toMatchObject({ role: "model", parts: [{ thoughtSignature: "sig" }] });
    expect(second[2].parts[0]).toMatchObject({ functionResponse: { name: "search_products", response: { total_matches: 1 } } });
  });

  it("maps upstream errors to friendly kinds", async () => {
    await expect(
      runAdvisor({ ...base, history: [{ role: "user", text: "hi" }], fetchImpl: fakeGemini([429, 429, 429, 429]).fetchImpl }),
    ).rejects.toMatchObject({
      kind: "limit",
    });
    const bothMissing = runAdvisor({ ...base, history: [{ role: "user", text: "hi" }], fetchImpl: fakeGemini([404, 404, 404, 404]).fetchImpl });
    await expect(bothMissing).rejects.toBeInstanceOf(AdvisorError);
    await expect(bothMissing).rejects.toMatchObject({ code: "model_not_found" });
    await expect(
      runAdvisor({
        ...base,
        history: [{ role: "user", text: "hi" }],
        fetchImpl: fakeGemini([{ promptFeedback: { blockReason: "SAFETY" } }]).fetchImpl,
      }),
    ).rejects.toMatchObject({ kind: "blocked" });
  });

  it("falls back to the current Flash model when the configured one is unavailable", async () => {
    const { fetchImpl, requests } = fakeGemini([404, { candidates: [{ content: { parts: [{ text: "Hello!" }] } }] }]);
    const urls: string[] = [];
    const spy = ((url: string, init: RequestInit) => (urls.push(url), fetchImpl(url, init))) as typeof fetch;
    const r = await runAdvisor({ ...base, history: [{ role: "user", text: "hi" }], fetchImpl: spy });
    expect(r).toMatchObject({ text: "Hello!", model: FALLBACK_MODELS[0], tried: ["gemini-2.5-flash: model_not_found"] });
    expect(urls[1]).toContain(`/${FALLBACK_MODELS[0]}:generateContent`);
    expect(requests).toHaveLength(2);
  });

  it("moves to the next model when one is overloaded", async () => {
    const urls: string[] = [];
    const { fetchImpl } = fakeGemini([503, { candidates: [{ content: { parts: [{ text: "Hi there." }] } }] }]);
    const spy = ((url: string, init: RequestInit) => (urls.push(url), fetchImpl(url, init))) as typeof fetch;
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl: spy });
    expect(r).toMatchObject({ text: "Hi there.", model: FALLBACK_MODELS[0] });
    expect(urls.map((u) => u.split("/models/")[1])).toEqual([`${DEFAULT_MODEL}:generateContent`, `${FALLBACK_MODELS[0]}:generateContent`]);
  });

  it("starts with stable models and leaves Google's moving \"latest\" names for last", () => {
    expect(DEFAULT_MODEL).not.toMatch(/latest|preview/);
    expect(FALLBACK_MODELS[0]).not.toMatch(/latest|preview/);
    expect(FALLBACK_MODELS).not.toContain(DEFAULT_MODEL);
    // retired on 1 December 2026
    expect([DEFAULT_MODEL, ...FALLBACK_MODELS]).not.toContain("gemini-2.5-flash");
  });

  it("asks each generation of model for as little thinking as it allows", () => {
    expect(thinkingFor("gemini-3.6-flash")).toEqual({ thinkingLevel: "minimal" });
    expect(thinkingFor("gemini-3.5-flash-lite")).toEqual({ thinkingLevel: "minimal" });
    expect(thinkingFor("gemini-flash-lite-latest")).toEqual({ thinkingLevel: "minimal" });
    // the newest Flash and the aliases that follow it do not take "minimal"
    expect(thinkingFor("gemini-3.8-flash")).toEqual({ thinkingLevel: "low" });
    expect(thinkingFor("gemini-flash-latest")).toEqual({ thinkingLevel: "low" });
    expect(thinkingFor("gemini-2.5-flash")).toEqual({ thinkingBudget: 0 });
    expect(thinkingFor("gemini-2.5-flash-lite")).toBeNull();
  });

  it("starts the next model alongside a slow one, and takes the first answer", async () => {
    const urls: string[] = [];
    let stopped = false;
    const fetchImpl = ((url: string, init: RequestInit) => {
      urls.push(url.split("/models/")[1]);
      if (urls.length === 1)
        return new Promise((_, reject) => init.signal?.addEventListener("abort", () => ((stopped = true), reject(init.signal?.reason))));
      return Promise.resolve(Response.json({ candidates: [{ content: { parts: [{ text: "Quick answer." }] } }] }));
    }) as typeof fetch;
    const started = Date.now();
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl, budgetMs: 23_000, stallMs: 300 });
    expect(r).toMatchObject({ text: "Quick answer.", model: FALLBACK_MODELS[0], tried: [`${DEFAULT_MODEL}: slow`] });
    // not kept waiting for the slow one, which is stopped once there is an answer
    expect(Date.now() - started).toBeLessThan(3_000);
    expect(stopped).toBe(true);
  });

  it("takes the slow model's answer if it comes first after all", async () => {
    const fetchImpl = ((url: string, init: RequestInit) => {
      const slowOne = url.includes(`/${DEFAULT_MODEL}:`);
      return new Promise((resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        // the first model answers after 500 ms; the one started alongside it never does
        if (slowOne) setTimeout(() => resolve(Response.json({ candidates: [{ content: { parts: [{ text: "Worth the wait." }] } }] })), 500);
      });
    }) as typeof fetch;
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl, stallMs: 200 });
    expect(r).toMatchObject({ text: "Worth the wait.", model: DEFAULT_MODEL });
  });

  it("keeps a model that was slow but answered at the front of the queue", async () => {
    // First question: the main model is slow, the one started beside it never answers, the main model answers after all.
    const slowThenAnswers = ((url: string, init: RequestInit) =>
      new Promise((resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        if (url.includes(`/${DEFAULT_MODEL}:`)) setTimeout(() => resolve(Response.json({ candidates: [{ content: { parts: [{ text: "One." }] } }] })), 400);
      })) as typeof fetch;
    const first = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl: slowThenAnswers, stallMs: 150 });
    expect(first.model).toBe(DEFAULT_MODEL);
    // Second question: it is asked first again.
    const urls: string[] = [];
    const next = fakeGemini([{ candidates: [{ content: { parts: [{ text: "Two." }] } }] }]);
    const spy = ((url: string, init: RequestInit) => (urls.push(url.split("/models/")[1].split(":")[0]), next.fetchImpl(url, init))) as typeof fetch;
    await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "again" }], fetchImpl: spy });
    expect(urls).toEqual([DEFAULT_MODEL]);
  });

  it("asks a third model when two are slow at once", async () => {
    const urls: string[] = [];
    const fetchImpl = ((url: string, init: RequestInit) => {
      urls.push(url.split("/models/")[1].split(":")[0]);
      return new Promise((resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        if (urls.length === 3) resolve(Response.json({ candidates: [{ content: { parts: [{ text: "Third time lucky." }] } }] }));
      });
    }) as typeof fetch;
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl, stallMs: 120 });
    expect(urls).toEqual([DEFAULT_MODEL, FALLBACK_MODELS[0], FALLBACK_MODELS[1]]);
    expect(r).toMatchObject({ text: "Third time lucky.", model: FALLBACK_MODELS[1] });
  });

  it("gives an overloaded model a second go once the others have had theirs", async () => {
    const urls: string[] = [];
    const { fetchImpl } = fakeGemini([503, 503, 503, 503, { candidates: [{ content: { parts: [{ text: "Back again." }] } }] }]);
    const spy = ((url: string, init: RequestInit) => (urls.push(url.split("/models/")[1].split(":")[0]), fetchImpl(url, init))) as typeof fetch;
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl: spy, pauseMs: 0 });
    expect(urls).toEqual([DEFAULT_MODEL, ...FALLBACK_MODELS, DEFAULT_MODEL]);
    expect(r).toMatchObject({ text: "Back again.", model: DEFAULT_MODEL });
    expect(r.tried).toHaveLength(4);
  });

  it("doesn't ask again a model that is missing or over its limit", async () => {
    const urls: string[] = [];
    const { fetchImpl } = fakeGemini([404, 429, 404, 429]);
    const spy = ((url: string, init: RequestInit) => (urls.push(url), fetchImpl(url, init))) as typeof fetch;
    await expect(runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl: spy, pauseMs: 0 })).rejects.toMatchObject({
      code: "rate_limited",
    });
    expect(urls).toHaveLength(4);
  });

  it("tries a model that just failed last, for a few minutes", async () => {
    const overloaded = fakeGemini([503, { candidates: [{ content: { parts: [{ text: "One." }] } }] }]);
    await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl: overloaded.fetchImpl });
    const urls: string[] = [];
    const next = fakeGemini([{ candidates: [{ content: { parts: [{ text: "Two." }] } }] }]);
    const spy = ((url: string, init: RequestInit) => (urls.push(url.split("/models/")[1]), next.fetchImpl(url, init))) as typeof fetch;
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi again" }], fetchImpl: spy });
    expect(r.model).toBe(FALLBACK_MODELS[0]);
    expect(urls).toEqual([`${FALLBACK_MODELS[0]}:generateContent`]);
  });

  it("retries without the thinking setting when a model rejects it", async () => {
    const requests: { generationConfig: Record<string, unknown> }[] = [];
    const replies = [
      new Response(JSON.stringify({ error: { message: "Request contains an invalid argument." } }), { status: 400 }),
      Response.json({ candidates: [{ content: { parts: [{ text: "Sure." }] } }] }),
    ];
    const fetchImpl = (async (_u: string, init: RequestInit) => (requests.push(JSON.parse(init.body as string)), replies.shift()!)) as typeof fetch;
    const r = await runAdvisor({ ...base, model: "gemini-flash-test", history: [{ role: "user", text: "hi" }], fetchImpl });
    expect(r.text).toBe("Sure.");
    expect(requests[0].generationConfig).toHaveProperty("thinkingConfig");
    expect(requests[1].generationConfig).not.toHaveProperty("thinkingConfig");
  });

  it("gives up with a timeout code when time runs out", async () => {
    const slow = ((_u: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)))) as typeof fetch;
    await expect(runAdvisor({ ...base, history: [{ role: "user", text: "hi" }], fetchImpl: slow, budgetMs: 1_200 })).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("forces a written answer after too many tool rounds", async () => {
    const call = (limit: number) => ({
      candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "search_products", args: { category: "kits", limit } } }] } }],
    });
    const { fetchImpl, requests } = fakeGemini([call(1), call(2), call(3), call(4), { candidates: [{ content: { parts: [{ text: "Done." }] } }] }]);
    const r = await runAdvisor({ ...base, history: [{ role: "user", text: "kits?" }], fetchImpl });
    expect(r.text).toBe("Done.");
    expect(requests).toHaveLength(5);
    expect(requests.at(-1)?.toolConfig).toEqual({ functionCallingConfig: { mode: "NONE" } });
    // the last tool result itself says that it is time to answer
    const lastResult = requests.at(-1)!.contents.at(-1)!.parts[0].functionResponse as { response: Record<string, unknown> };
    expect(lastResult.response.next_step).toMatch(/Reply to the customer now/);
  });

  it("drops a leaked thinking marker and reports each call it made", async () => {
    const { fetchImpl } = fakeGemini([503, { candidates: [{ content: { parts: [{ text: "_thought\nHere are your options." }] } }] }]);
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl });
    expect(r.text).toBe("Here are your options.");
    expect(r.trace).toHaveLength(2);
    expect(r.trace[0]).toMatch(new RegExp(`^${DEFAULT_MODEL} #1 \\d+\\.\\ds 503$`));
    expect(r.trace[1]).toMatch(/ #1 \d+\.\ds 200$/);
  });

  it("doesn't run the same tool call twice in one answer", async () => {
    const call = { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "search_products", args: { category: "inverters" } } }] } }] };
    const { fetchImpl, requests } = fakeGemini([call, call, { candidates: [{ content: { parts: [{ text: "Here you go." }] } }] }]);
    const r = await runAdvisor({ ...base, history: [{ role: "user", text: "inverters?" }], fetchImpl });
    expect(r.text).toBe("Here you go.");
    const results = requests.at(-1)!.contents.filter((c) => c.parts[0].functionResponse).map((c) => (c.parts[0].functionResponse as { response: Record<string, unknown> }).response);
    expect(results[0]).toHaveProperty("products");
    expect(results[1]).not.toHaveProperty("products");
    expect(results[1].note).toMatch(/already have this result/);
  });

  it("moves to another model when one keeps calling tools instead of answering", async () => {
    const call = (limit: number) => ({
      candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "search_products", args: { category: "kits", limit } } }] } }],
    });
    const { fetchImpl } = fakeGemini([call(1), call(2), call(3), call(4), call(5), { candidates: [{ content: { parts: [{ text: "Straight answer." }] } }] }]);
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "kits?" }], fetchImpl });
    expect(r).toMatchObject({ text: "Straight answer.", model: FALLBACK_MODELS[0] });
    expect(r.tried?.[0]).toMatch(new RegExp(`^${DEFAULT_MODEL}: too_many_steps \\(search_products`));
  });

  it("reads which of Google's limits was reached, and rests the model for as long as Google says", async () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        message: "You exceeded your current quota, please check your plan and billing details.",
        status: "RESOURCE_EXHAUSTED",
        details: [
          { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier", quotaValue: "5" }] },
          { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "31s" },
        ],
      },
    });
    expect(quotaDetail(body)).toEqual({ detail: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier, limit 5, retry in 31s", restMs: 33_000 });
    // a daily limit: left alone until Google says, but looked at again within two hours
    expect(quotaDetail(body.replace("PerMinute", "PerDay")).restMs).toBe(33_000);
    expect(quotaDetail(body.replace("PerMinute", "PerDay").replace("31s", "64727s")).restMs).toBe(2 * 60 * 60_000);
    expect(quotaDetail("not json")).toEqual({});

    const replies = [new Response(body, { status: 429 }), Response.json({ candidates: [{ content: { parts: [{ text: "Hi." }] } }] })];
    const fetchImpl = (async () => replies.shift()!) as unknown as typeof fetch;
    const r = await runAdvisor({ ...base, model: DEFAULT_MODEL, history: [{ role: "user", text: "hi" }], fetchImpl });
    expect(r.model).toBe(FALLBACK_MODELS[0]);
    expect(r.tried).toEqual([`${DEFAULT_MODEL}: rate_limited (GenerateRequestsPerMinutePerProjectPerModel-FreeTier, limit 5, retry in 31s)`]);
  });
});
