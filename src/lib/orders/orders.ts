import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { isServiceRoleConfigured } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

// Guests reach their order through a secret link (emailed to them) or a
// cookie set at checkout. Only the sha256 of the secret is stored.

export function newAccessToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token: string | null | undefined, hash: string | null): boolean {
  if (!token || !hash) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const cookieName = (kind: "o" | "q", id: string) => `jc_${kind}_${id.replace(/-/g, "")}`;

export async function rememberAccess(kind: "o" | "q", id: string, token: string) {
  (await cookies()).set(cookieName(kind, id), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type ItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export type OrderView = {
  id: string;
  orderNumber: string;
  status: OrderRow["status"];
  createdAt: string;
  paidAt: string | null;
  email: string;
  phone: string | null;
  customerName: string;
  paymentMethod: OrderRow["payment_method"];
  deliveryMethod: OrderRow["delivery_method"];
  shippingAddress: Record<string, string> | null;
  installationRequested: boolean;
  deliveryPending: boolean;
  subtotal: number;
  total: number;
  vat: number;
  items: { sku: string; name: string; unitPrice: number; quantity: number; lineTotal: number; lineVat: number }[];
  invoice: { number: number; code: string; issuedAt: string } | null;
  /** Secret for building links when the viewer arrived with one. */
  token: string | null;
};

function toView(o: OrderRow, items: ItemRow[], invoice: { invoice_number: number; invoice_code: string | null; issued_at: string } | null, token: string | null): OrderView {
  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    email: o.email,
    phone: o.phone,
    customerName: o.customer_name ?? "",
    paymentMethod: o.payment_method,
    deliveryMethod: o.delivery_method,
    shippingAddress: (o.shipping_address as Record<string, string> | null) ?? null,
    installationRequested: o.installation_requested,
    deliveryPending: o.delivery_pending,
    subtotal: Number(o.subtotal_incl_vat),
    total: Number(o.total_incl_vat),
    vat: Number(o.vat_amount),
    items: items.map((i) => ({
      sku: i.sku,
      name: i.name,
      unitPrice: Number(i.unit_price_incl_vat),
      quantity: i.quantity,
      lineTotal: Number(i.line_total_incl_vat),
      lineVat: Number(i.line_vat_amount),
    })),
    invoice: invoice ? { number: invoice.invoice_number, code: invoice.invoice_code ?? "", issuedAt: invoice.issued_at } : null,
    token,
  };
}

/**
 * The order if this visitor may see it: they hold its secret (link or
 * cookie) or are the signed-in customer who placed it. Reads cookies.
 */
export async function loadOrderForViewer(orderId: string, tokenFromLink?: string | null): Promise<OrderView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !isServiceRoleConfigured()) return null;
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).is("deleted_at", null).maybeSingle();
  if (!order) return null;

  const cookieToken = (await cookies()).get(cookieName("o", orderId))?.value ?? null;
  const token = [tokenFromLink, cookieToken].find((t) => tokenMatches(t, order.access_token_hash)) ?? null;
  if (!token) {
    const user = await getSessionUser();
    if (!user || user.id !== order.user_id) return null;
  }

  const [{ data: items }, { data: invoice }] = await Promise.all([
    admin.from("order_items").select("*").eq("order_id", orderId).order("name"),
    admin.from("invoices").select("invoice_number, invoice_code, issued_at").eq("order_id", orderId).maybeSingle(),
  ]);
  return toView(order, items ?? [], invoice ?? null, token);
}

/** Server-side only (webhooks): the order without any viewer check. */
export async function loadOrderInternal(orderId: string): Promise<OrderView | null> {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;
  const [{ data: items }, { data: invoice }] = await Promise.all([
    admin.from("order_items").select("*").eq("order_id", orderId).order("name"),
    admin.from("invoices").select("invoice_number, invoice_code, issued_at").eq("order_id", orderId).maybeSingle(),
  ]);
  return toView(order, items ?? [], invoice ?? null, null);
}

export type QuoteView = {
  id: string;
  code: string;
  createdAt: string;
  validUntil: string;
  customerName: string;
  email: string;
  phone: string | null;
  company: string | null;
  items: { productId: string; sku: string; name: string; unitPrice: number; quantity: number; lineTotal: number; lineVat: number; installation: boolean }[];
  subtotal: number;
  vat: number;
  total: number;
  installationRequested: boolean;
};

export async function loadQuoteForViewer(quoteId: string, tokenFromLink?: string | null): Promise<QuoteView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(quoteId) || !isServiceRoleConfigured()) return null;
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!q) return null;
  const cookieToken = (await cookies()).get(cookieName("q", quoteId))?.value ?? null;
  if (![tokenFromLink, cookieToken].some((t) => tokenMatches(t, q.access_token_hash))) {
    const user = await getSessionUser();
    if (!user || user.id !== q.user_id) return null;
  }
  return {
    id: q.id,
    code: q.quote_code ?? "",
    createdAt: q.created_at,
    validUntil: q.valid_until,
    customerName: q.customer_name,
    email: q.email,
    phone: q.phone,
    company: q.company,
    items: (q.items as QuoteView["items"]).map((i) => ({ ...i, unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal), lineVat: Number(i.lineVat) })),
    subtotal: Number(q.subtotal_incl_vat),
    vat: Number(q.vat_amount),
    total: Number(q.total_incl_vat),
    installationRequested: q.installation_requested,
  };
}

/** Absolute links for emails. */
export function orderLink(siteUrl: string, id: string, token: string) {
  return `${siteUrl}/order/${id}?t=${encodeURIComponent(token)}`;
}
