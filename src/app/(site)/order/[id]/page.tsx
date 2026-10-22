import { Building2, CheckCircle2, Clock, FileText, Lock, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderSummary } from "@/components/checkout/order-summary";
import { AwaitPayment, ChangeOrderButton } from "@/components/order/order-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { siteUrl } from "@/lib/env";
import { eftDetails, payfastConfig } from "@/lib/env.server";
import { loadOrderForViewer, type OrderView } from "@/lib/orders/orders";
import { buildPaymentFields } from "@/lib/payfast/payfast";
import { formatRand } from "@/lib/pricing/vat";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function PayFastForm({ order }: { order: OrderView }) {
  const base = `${siteUrl()}/order/${order.id}`;
  const t = order.token ? `t=${encodeURIComponent(order.token)}` : "";
  const [firstName, ...rest] = order.customerName.split(" ");
  const { action, fields } = buildPaymentFields(
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      firstName: firstName || "Customer",
      lastName: rest.join(" ") || "-",
      email: order.email,
      phone: order.phone,
      returnUrl: `${base}?${t ? `${t}&` : ""}paid=1`,
      cancelUrl: t ? `${base}?${t}` : base,
      notifyUrl: `${siteUrl()}/api/payfast/itn`,
    },
    payfastConfig(),
  );
  return (
    <form action={action} method="post">
      {fields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" size="lg" className="h-12 w-full text-base">
        <Lock /> Pay {formatRand(order.total)} with PayFast
      </Button>
    </form>
  );
}

function BankDetails({ order }: { order: OrderView }) {
  const bank = eftDetails();
  if (!bank) {
    return (
      <p className="text-sm">
        Contact us for our banking details and use <strong className="font-mono">{order.orderNumber}</strong> as your reference.
      </p>
    );
  }
  const rows: [string, string][] = [
    ["Bank", bank.bank],
    ["Account name", bank.accountName],
    ["Account number", bank.accountNumber],
    ["Branch code", bank.branchCode],
    ["Account type", bank.accountType],
    ["Reference", order.orderNumber],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

async function OrderContents({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : null;
  const order = await loadOrderForViewer(id, token);
  if (!order) notFound();

  const pdfUrl = `/api/orders/${order.id}/pdf${order.token ? `?t=${encodeURIComponent(order.token)}` : ""}`;
  const pending = order.status === "pending_payment";
  const paid = order.invoice !== null;
  const returnedFromPayfast = sp.paid === "1";
  const address = order.shippingAddress;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-sm text-muted-foreground">Order {order.orderNumber}</p>
        {paid && (
          <h1 className="flex items-center gap-3 text-3xl font-semibold sm:text-4xl">
            <CheckCircle2 className="size-8 text-success" aria-hidden="true" /> Thank you, payment received
          </h1>
        )}
        {pending && <h1 className="text-3xl font-semibold sm:text-4xl">{order.paymentMethod === "eft" ? "Order placed: awaiting EFT payment" : "Review and pay"}</h1>}
        {(order.status === "cancelled" || order.status === "expired") && (
          <h1 className="flex items-center gap-3 text-3xl font-semibold sm:text-4xl">
            <XCircle className="size-8 text-muted-foreground" aria-hidden="true" /> This order was {order.status === "expired" ? "not paid in time" : "cancelled"}
          </h1>
        )}
        <p className="text-muted-foreground">We&apos;ve emailed the details to {order.email}.</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {pending && returnedFromPayfast && (
            <div className="rounded-2xl border bg-accent/50 p-5">
              <AwaitPayment />
            </div>
          )}

          {pending && (
            <section className="space-y-5 rounded-2xl border bg-card p-6" aria-labelledby="pay-heading">
              <h2 id="pay-heading" className="font-sans text-lg font-semibold">
                Payment
              </h2>
              {order.paymentMethod === "eft" ? (
                <>
                  <p className="flex gap-2 text-sm">
                    <Clock className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden="true" />
                    Please pay {formatRand(order.total)} by EFT within 48 hours. We&apos;re holding your stock until then.
                  </p>
                  <div className="rounded-xl bg-accent/60 p-4">
                    <p className="mb-3 flex items-center gap-2 font-medium">
                      <Building2 className="size-4" aria-hidden="true" /> Our banking details
                    </p>
                    <BankDetails order={order} />
                  </div>
                  <p className="text-sm text-muted-foreground">Prefer to pay now by card or Instant EFT?</p>
                  <PayFastForm order={order} />
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll be taken to PayFast to pay securely by card, Instant EFT and other methods. We never see your card details.
                  </p>
                  <PayFastForm order={order} />
                </>
              )}
              <ChangeOrderButton orderId={order.id} />
            </section>
          )}

          <section className="grid gap-4 rounded-2xl border bg-card p-6 text-sm sm:grid-cols-2" aria-label="Order details">
            <div>
              <h2 className="mb-2 font-sans font-semibold">Contact</h2>
              <p>{order.customerName}</p>
              <p className="text-muted-foreground">{order.email}</p>
              {order.phone && <p className="text-muted-foreground">{order.phone}</p>}
            </div>
            {address && (
              <div>
                <h2 className="mb-2 font-sans font-semibold">Delivery address</h2>
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>{[address.suburb, address.city].filter(Boolean).join(", ")}</p>
                <p>
                  {address.province} {address.postalCode}
                </p>
              </div>
            )}
          </section>

          <Button asChild variant="outline">
            <a href={pdfUrl} target="_blank" rel="noopener">
              <FileText /> {paid ? "Download invoice (PDF)" : "Download pro forma invoice (PDF)"}
            </a>
          </Button>

          {(order.status === "cancelled" || order.status === "expired") && (
            <Button asChild>
              <Link href="/cart">Go to your cart</Link>
            </Button>
          )}
        </div>

        <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary
            title="Your order"
            lines={order.items.map((i) => ({ key: i.sku, name: i.name, quantity: i.quantity, lineTotal: i.lineTotal }))}
            total={order.total}
            vat={order.vat}
            installationRequested={order.installationRequested}
          />
        </aside>
      </div>
    </div>
  );
}

export default function OrderPage(props: Props) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<Skeleton className="h-[500px] w-full rounded-2xl" />}>
        <OrderContents {...props} />
      </Suspense>
    </div>
  );
}
