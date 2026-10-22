"use server";

import { getSessionUser } from "@/lib/auth";
import { cartOps, readCart, writeCart } from "@/lib/cart/cart";
import { loadCart } from "@/lib/cart/load";
import { orderReceivedEmail, quoteEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/env";
import { eftDetails, isServiceRoleConfigured } from "@/lib/env.server";
import { loadOrderForViewer, newAccessToken, orderLink, rememberAccess } from "@/lib/orders/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutSchema, fieldErrors, quoteRequestSchema, TERMS_VERSION, type CheckoutInput, type QuoteRequestInput } from "./schema";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; fields?: Record<string, string> };

const NOT_READY = "Online checkout isn't switched on yet. Please download a quotation or contact us to order.";

/** Turns database errors into something a customer can act on. */
function friendly(message: string, names: Map<string, string>): string {
  const stock = message.match(/insufficient_stock:(\S+)/);
  if (stock) return `Sorry, we no longer have enough of ${names.get(stock[1]) ?? stock[1]} in stock. Please lower the quantity.`;
  if (message.includes("product_unavailable")) return "One of the products in your cart is no longer available. Please remove it and try again.";
  if (message.includes("empty_cart")) return "Your cart is empty.";
  if (message.includes("delivery_unavailable"))
    return "We can't deliver this order to your area online yet. Please download a quotation and we'll arrange delivery.";
  if (message.includes("address_required") || message.includes("invalid_postal_code")) return "Please check your delivery address.";
  return "Something went wrong and nothing was charged. Please try again, or contact us.";
}

async function recordConsents(
  subject: { userId: string | null; anonymousId: string },
  consents: { type: "terms" | "marketing_email"; granted: boolean; version?: string }[],
  source: string,
) {
  const admin = createAdminClient();
  await admin.from("consent_records").insert(
    consents.map((c) => ({
      user_id: subject.userId,
      anonymous_id: subject.userId ? null : subject.anonymousId,
      consent_type: c.type,
      granted: c.granted,
      document_version: c.version ?? null,
      source,
    })),
  );
}

export async function placeOrder(input: CheckoutInput): Promise<ActionResult<{ url: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  if (!isServiceRoleConfigured()) return { ok: false, error: NOT_READY };
  const f = parsed.data;

  const cart = await loadCart();
  if (cart.items.length === 0) return { ok: false, error: "Your cart is empty." };
  if (!cart.canCheckout) return { ok: false, error: "Please fix the items marked in your cart before checking out." };

  const user = await getSessionUser();
  const { token, hash } = newAccessToken();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_checkout_order", {
    p: {
      userId: user?.id ?? "",
      email: f.email,
      phone: f.phone,
      customerName: `${f.firstName} ${f.lastName}`,
      deliveryMethod: "courier",
      shippingAddress: f.address,
      notes: f.notes,
      termsVersion: TERMS_VERSION,
      marketingOptIn: f.marketingOptIn,
      paymentMethod: f.paymentMethod,
      accessTokenHash: hash,
      items: cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity, installation: i.installation })),
    },
  });
  if (error || !data) {
    return { ok: false, error: friendly(error?.message ?? "", new Map(cart.items.map((i) => [i.product.sku, i.product.name]))) };
  }
  const { orderId, orderNumber, total, shipping, deliveryPending } = data as {
    orderId: string;
    orderNumber: string;
    total: number;
    shipping: number;
    deliveryPending: boolean;
  };

  await rememberAccess("o", orderId, token);
  await writeCart([]);
  await recordConsents(
    { userId: user?.id ?? null, anonymousId: `order:${orderId}` },
    [
      { type: "terms", granted: true, version: TERMS_VERSION },
      { type: "marketing_email", granted: f.marketingOptIn },
    ],
    "checkout",
  ).catch(() => undefined);

  await sendEmail(
    orderReceivedEmail({
      to: f.email,
      name: f.firstName,
      orderNumber,
      orderUrl: orderLink(siteUrl(), orderId, token),
      lines: cart.items.map((i) => ({ name: i.product.name, quantity: i.quantity, lineTotal: i.lineTotal })),
      total: Number(total),
      paymentMethod: f.paymentMethod,
      bank: eftDetails(),
      installationRequested: cart.installationRequested,
      delivery: {
        amount: Number(shipping),
        label:
          cart.installationRequested && Number(shipping) === 0 && !deliveryPending
            ? "Free with installation"
            : deliveryPending
              ? "To be confirmed"
              : "Free",
        pending: deliveryPending,
      },
    }),
  );

  return { ok: true, url: `/order/${orderId}` };
}

/** Cancels an unpaid order and puts its items back in the cart so it can be changed. */
export async function changeOrder(orderId: string): Promise<ActionResult<{ url: string }>> {
  const order = await loadOrderForViewer(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "pending_payment" && order.status !== "expired") return { ok: false, error: "This order can no longer be changed." };
  const { data, error } = await createAdminClient().rpc("cancel_pending_order", { p_order_id: orderId });
  if (error) return { ok: false, error: "This order can no longer be changed." };
  let lines = await readCart();
  for (const item of (data as { productId: string; quantity: number }[]) ?? []) {
    lines = cartOps.add(lines, item.productId, item.quantity, order.installationRequested);
  }
  await writeCart(lines);
  return { ok: true, url: "/cart" };
}

export async function requestQuote(input: QuoteRequestInput): Promise<ActionResult<{ pdfUrl: string; code: string }>> {
  const parsed = quoteRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  if (!isServiceRoleConfigured()) return { ok: false, error: "Quotations aren't available yet. Please contact us." };
  const f = parsed.data;

  const cart = await loadCart();
  if (cart.items.length === 0) return { ok: false, error: "Add products to your cart first." };

  const user = await getSessionUser();
  const { token, hash } = newAccessToken();
  const { data, error } = await createAdminClient().rpc("create_quote", {
    p: {
      userId: user?.id ?? "",
      customerName: f.name,
      email: f.email,
      phone: f.phone,
      company: f.company,
      province: f.province,
      marketingOptIn: f.marketingOptIn,
      accessTokenHash: hash,
      validDays: 7,
      items: cart.items.map((i) => ({ productId: i.product.id, quantity: i.quantity, installation: i.installation })),
    },
  });
  if (error || !data) return { ok: false, error: friendly(error?.message ?? "", new Map()) };
  const { quoteId, quoteCode, total } = data as { quoteId: string; quoteCode: string; total: number };

  await rememberAccess("q", quoteId, token);
  if (f.marketingOptIn) {
    await recordConsents({ userId: user?.id ?? null, anonymousId: `quote:${quoteId}` }, [{ type: "marketing_email", granted: true }], "quote").catch(
      () => undefined,
    );
  }
  const pdfPath = `/api/quotes/${quoteId}/pdf?t=${encodeURIComponent(token)}`;
  const validUntil = new Date(Date.now() + 7 * 86_400_000).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  await sendEmail(
    quoteEmail({ to: f.email, name: f.name, quoteCode, pdfUrl: `${siteUrl()}${pdfPath}`, total: Number(total), validUntil, bank: eftDetails() }),
  );
  return { ok: true, pdfUrl: `${pdfPath}&download=1`, code: quoteCode };
}
