// Courier registry. Checkout prices delivery from the rate table (in the
// database); couriers here handle tracking now, and booking and live rates
// once their APIs are connected.

import type { CourierProvider } from "./types";

/**
 * DSV. Staff book collections with DSV and enter the waybill in the admin.
 * Their developer portal offers booking and tracking APIs once DSV issues
 * subscription keys; those plug in here as bookShipment/trackShipment.
 */
export const dsv: CourierProvider = {
  id: "dsv",
  name: "DSV",
};

const PROVIDERS: CourierProvider[] = [dsv];

export function findProvider(nameOrId: string | null | undefined): CourierProvider | undefined {
  const key = (nameOrId ?? "").trim().toLowerCase();
  return PROVIDERS.find((p) => p.id === key || p.name.toLowerCase() === key);
}

/** Tracking link: the shipment's own link, else the courier's, else a template from the delivery settings. */
export function trackingLink(
  shipment: { provider: string; tracking_number: string | null; tracking_url: string | null },
  template?: string | null,
): string | null {
  if (shipment.tracking_url) return shipment.tracking_url;
  if (!shipment.tracking_number) return null;
  const fromProvider = findProvider(shipment.provider)?.trackingUrl?.(shipment.tracking_number);
  if (fromProvider) return fromProvider;
  return template?.includes("{tracking}") ? template.replace("{tracking}", encodeURIComponent(shipment.tracking_number)) : null;
}
