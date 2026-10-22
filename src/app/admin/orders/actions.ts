"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { sendEmail } from "@/lib/email/send";
import { shipmentBookedEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/env";
import { SHIPPING_CLASS_LABEL } from "@/lib/shipping/format";
import { trackingLink } from "@/lib/shipping/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { ok: true; message: string } | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  order_not_ready_to_ship: "Only paid orders can be shipped.",
  tracking_required: "Enter the tracking number.",
  not_allowed: "You don't have permission to do that.",
  shipments_tracking_unique: "That tracking number is already on another shipment.",
  shipment_not_found: "Shipment not found.",
};
const explain = (message: string) => ERRORS[Object.keys(ERRORS).find((k) => message.includes(k)) ?? ""] ?? `Could not save: ${message}`;

const shipmentSchema = z.object({
  orderId: z.uuid(),
  shippingClass: z.enum(["", "standard", "oversized", "dangerous_goods"]),
  provider: z.string().trim().max(60),
  trackingNumber: z.string().trim().min(1, "Enter the tracking number.").max(80),
  waybillNumber: z.string().trim().max(80),
  costInclVat: z.union([z.literal(""), z.string().regex(/^\d+(\.\d{1,2})?$/, "Cost must be a Rand amount, e.g. 450 or 450.00")]),
  note: z.string().trim().max(300),
  notifyCustomer: z.boolean(),
});

/** Record a booked shipment (e.g. a DSV waybill) and email the customer their tracking number. */
export async function recordShipment(input: z.input<typeof shipmentSchema>): Promise<AdminResult> {
  await requireRole(["admin", "sales"], "/admin/orders");
  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;

  // As the signed-in staff member: the database checks the role and logs who did it.
  const supabase = await createClient();
  const { data: shipmentId, error } = await supabase.rpc("record_shipment", {
    p: {
      orderId: f.orderId,
      shippingClass: f.shippingClass,
      provider: f.provider,
      trackingNumber: f.trackingNumber,
      waybillNumber: f.waybillNumber,
      costInclVat: f.costInclVat,
      note: f.note,
    },
  });
  if (error || !shipmentId) return { ok: false, error: explain(error?.message ?? "") };

  let message = "Shipment saved.";
  if (f.notifyCustomer) {
    const admin = createAdminClient();
    const [{ data: order }, { data: shipment }] = await Promise.all([
      admin.from("orders").select("email, customer_name, order_number, user_id").eq("id", f.orderId).single(),
      admin.from("shipments").select("provider, tracking_number, tracking_url, shipping_class").eq("id", shipmentId).single(),
    ]);
    if (order && shipment) {
      const sent = await sendEmail(
        shipmentBookedEmail({
          to: order.email,
          name: order.customer_name?.split(" ")[0] ?? "there",
          orderNumber: order.order_number,
          // Guests open their order from the secret link in their confirmation email; account holders sign in.
          orderUrl: order.user_id ? `${siteUrl()}/order/${f.orderId}` : null,
          carrier: shipment.provider,
          trackingNumber: shipment.tracking_number ?? f.trackingNumber,
          trackingUrl: trackingLink(shipment),
          what: shipment.shipping_class ? SHIPPING_CLASS_LABEL[shipment.shipping_class] : null,
        }),
      );
      message = sent.sent
        ? `Shipment saved and ${order.email} was emailed the tracking number.`
        : `Shipment saved, but no email was sent (${sent.error === "not configured" ? "email isn't set up yet: add RESEND_API_KEY" : sent.error}).`;
    }
  }
  revalidatePath(`/admin/orders/${f.orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, message };
}

const STATUSES = ["booked", "collected", "in_transit", "out_for_delivery", "delivered", "failed", "cancelled"] as const;

export async function setShipmentStatus(input: {
  orderId: string;
  shipmentId: string;
  status: (typeof STATUSES)[number];
  note: string;
}): Promise<AdminResult> {
  await requireRole(["admin", "sales"], "/admin/orders");
  const parsed = z.object({ orderId: z.uuid(), shipmentId: z.uuid(), status: z.enum(STATUSES), note: z.string().trim().max(300) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the status and note." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_shipment_status", {
    p_shipment_id: parsed.data.shipmentId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { ok: false, error: explain(error.message) };
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: "Status updated." };
}
