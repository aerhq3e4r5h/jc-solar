import { describe, expect, it } from "vitest";
import { deliverySummary, etaText, overallEta } from "./format";
import { findProvider, trackingLink } from "./providers";
import type { DeliveryQuote } from "./types";

const money = (n: number) => `R${n}`;
const quote = (over: Partial<DeliveryQuote>): DeliveryQuote => ({
  method: "courier",
  carrier: "DSV",
  total: 1975,
  pending: false,
  freeReason: null,
  shipments: [],
  ...over,
});

describe("delivery formatting", () => {
  it("writes delivery windows", () => {
    expect(etaText(2, 3)).toBe("2–3 working days");
    expect(etaText(4, 4)).toBe("4 working days");
    expect(etaText(1, null)).toBe("1 working day");
    expect(etaText(null, null)).toBeNull();
  });

  it("uses the slowest priced shipment for the overall window", () => {
    expect(
      overallEta([
        { shippingClass: "standard", items: 1, weightKg: 0, price: 250, etaDaysMin: 2, etaDaysMax: 3 },
        { shippingClass: "oversized", items: 8, weightKg: 0, price: 1125, etaDaysMin: 3, etaDaysMax: 5 },
        { shippingClass: "dangerous_goods", items: 1, weightKg: 0, price: null, etaDaysMin: null, etaDaysMax: null },
      ]),
    ).toBe("3–5 working days");
    expect(overallEta([])).toBeNull();
  });

  it("summarises the delivery line", () => {
    expect(deliverySummary(quote({}), money)).toBe("R1975");
    expect(deliverySummary(quote({ total: 0, freeReason: "installation" }), money)).toBe("Free: our installer brings it");
    expect(deliverySummary(quote({ total: 0, freeReason: "threshold" }), money)).toBe("Free");
    expect(deliverySummary(quote({ total: 0, pending: true }), money)).toBe("Quoted after your order");
    expect(deliverySummary(quote({ total: 250, pending: true }), money)).toBe("R250 + balance quoted after order");
  });
});

describe("couriers", () => {
  it("finds DSV by id or name", () => {
    expect(findProvider("DSV")?.id).toBe("dsv");
    expect(findProvider("dsv")?.name).toBe("DSV");
    expect(findProvider("other")).toBeUndefined();
  });

  it("builds tracking links from the shipment, else the settings template", () => {
    expect(trackingLink({ provider: "DSV", tracking_number: "A1", tracking_url: "https://x.example/A1" })).toBe("https://x.example/A1");
    expect(trackingLink({ provider: "DSV", tracking_number: "A 1", tracking_url: null }, "https://t.example/?ref={tracking}")).toBe(
      "https://t.example/?ref=A%201",
    );
    expect(trackingLink({ provider: "DSV", tracking_number: "A1", tracking_url: null })).toBeNull();
    expect(trackingLink({ provider: "DSV", tracking_number: null, tracking_url: null }, "https://t.example/{tracking}")).toBeNull();
  });
});
