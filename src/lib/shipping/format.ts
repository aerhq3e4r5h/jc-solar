import type { DeliveryMethod, DeliveryQuote, DeliveryShipment, ShippingClass } from "./types";

export const SHIPPING_CLASS_LABEL: Record<ShippingClass, string> = {
  standard: "Parcel",
  oversized: "Solar panels (pallet)",
  dangerous_goods: "Lithium batteries (dangerous goods)",
};

/** "2–3 working days", "4 working days", or null. */
export function etaText(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  const lo = min ?? max!;
  const hi = max ?? min!;
  return lo === hi ? `${lo} working day${lo === 1 ? "" : "s"}` : `${lo}–${hi} working days`;
}

/** Overall delivery window: the slowest shipment decides when everything has arrived. */
export function overallEta(shipments: DeliveryShipment[]): string | null {
  const priced = shipments.filter((s) => s.price !== null && s.etaDaysMax !== null);
  if (priced.length === 0) return null;
  return etaText(Math.max(...priced.map((s) => s.etaDaysMin ?? s.etaDaysMax!)), Math.max(...priced.map((s) => s.etaDaysMax!)));
}

/** One line for the order summary, e.g. "Free with installation" or "R1 975.00". */
export function deliverySummary(quote: DeliveryQuote, money: (n: number) => string): string {
  if (quote.freeReason === "installation") return "Free: our installer brings it";
  if (quote.freeReason === "collection") return "Free: collect from us";
  if (quote.freeReason === "threshold") return "Free";
  if (quote.pending && quote.total === 0) return "Quoted after your order";
  return quote.pending ? `${money(quote.total)} + balance quoted after order` : money(quote.total);
}

/** The delivery line in an order summary: an amount, or text while it's unknown ("Enter your address"). */
export type SummaryDelivery = { amount: number | null; label: string; pending?: boolean };

export function quoteToSummary(quote: DeliveryQuote, money: (n: number) => string): SummaryDelivery {
  return { amount: quote.total, label: deliverySummary(quote, money), pending: quote.pending };
}

/** The delivery line for a placed order. */
export function orderDeliverySummary(order: { shipping: number; deliveryMethod: DeliveryMethod; deliveryPending: boolean }): SummaryDelivery {
  if (order.deliveryMethod === "installer_delivery") return { amount: 0, label: "Free: our installer brings it" };
  if (order.deliveryMethod === "collection") return { amount: 0, label: "Free: collect from us" };
  if (order.shipping === 0) return { amount: 0, label: order.deliveryPending ? "Quoted before dispatch" : "Free", pending: order.deliveryPending };
  return { amount: order.shipping, label: "", pending: order.deliveryPending };
}
