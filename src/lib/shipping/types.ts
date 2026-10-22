// Shared delivery types. The shape mirrors what public.quote_delivery()
// returns, so the database stays the single source of delivery prices.

export type ShippingClass = "standard" | "oversized" | "dangerous_goods";
export type DeliveryMethod = "courier" | "own_delivery" | "collection" | "installer_delivery";

export type DeliveryShipment = {
  shippingClass: ShippingClass;
  items: number;
  weightKg: number;
  /** Null when no rate covers this shipment yet: we quote it after the order. */
  price: number | null;
  etaDaysMin: number | null;
  etaDaysMax: number | null;
};

export type DeliveryQuote = {
  method: DeliveryMethod;
  carrier: string | null;
  total: number;
  pending: boolean;
  freeReason: "installation" | "threshold" | "collection" | null;
  shipments: DeliveryShipment[];
};

export type DeliveryAddress = { province: string; postalCode?: string };

/**
 * A courier integration. Each method is optional so a courier can start as
 * manual (staff enter waybill numbers) and gain live rates, booking and
 * tracking as API access becomes available, without touching checkout.
 */
export interface CourierProvider {
  id: string;
  name: string;
  /** Link to the courier's public tracking page for a tracking number. */
  trackingUrl?(trackingNumber: string): string | null;
  /** Live rates. When absent or failing, the rate table prices delivery. */
  getRates?(request: RateRequest): Promise<CourierRate[]>;
  /** Book a collection and return the waybill. When absent, staff book with the courier and enter the waybill. */
  bookShipment?(request: BookingRequest): Promise<{ waybillNumber: string; trackingNumber: string; labelPdf?: Uint8Array }>;
  /** Latest tracking events. When absent, staff update the status by hand. */
  trackShipment?(trackingNumber: string): Promise<{ status: string; events: { at: string; description: string }[] }>;
}

export type Parcel = { shippingClass: ShippingClass; items: number; weightKg: number; lengthMm?: number; widthMm?: number; heightMm?: number };
export type RateRequest = { to: DeliveryAddress; parcels: Parcel[] };
export type CourierRate = {
  serviceCode: string;
  serviceName: string;
  price: number;
  etaDaysMin?: number;
  etaDaysMax?: number;
  dangerousGoods: boolean;
};
export type BookingRequest = {
  orderNumber: string;
  to: { name: string; phone: string | null; email: string; address: Record<string, string> };
  parcels: Parcel[];
};
