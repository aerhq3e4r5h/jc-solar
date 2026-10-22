import { AlertTriangle, Info, ShoppingCart, Wrench, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartLineControls } from "@/components/cart/cart-line-controls";
import { artLabel } from "@/components/product/key-specs";
import { ProductArt } from "@/components/product/product-art";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { productUrl } from "@/lib/catalogue/types";
import { loadCart } from "@/lib/cart/load";
import { formatRand } from "@/lib/pricing/vat";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

const ISSUE_STYLE = {
  error: { icon: XCircle, className: "border-destructive/40 bg-destructive/5 text-destructive" },
  warning: { icon: AlertTriangle, className: "border-warning/40 bg-warning/5" },
  info: { icon: Info, className: "border-border bg-muted" },
} as const;

async function CartContents() {
  const cart = await loadCart();

  if (cart.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <ShoppingCart className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <p className="mt-4 text-lg font-medium">Your cart is empty</p>
        <p className="mt-1 text-muted-foreground">
          {cart.removed > 0 ? "Some items were removed because they are no longer sold. " : ""}
          Browse the shop, or let the Solar Advisor size a system for you.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/shop">Browse the shop</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/advisor">Size my system</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {cart.issues.length > 0 && (
          <ul className="space-y-2" aria-label="Compatibility checks">
            {cart.issues.map((issue) => {
              const { icon: Icon, className } = ISSUE_STYLE[issue.level];
              return (
                <li key={issue.message} role={issue.level === "error" ? "alert" : undefined} className={`flex gap-3 rounded-xl border p-4 text-sm ${className}`}>
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{issue.message}</span>
                </li>
              );
            })}
          </ul>
        )}

        <ul className="divide-y rounded-2xl border bg-card">
          {cart.items.map((item) => (
            <li key={item.product.id} className="flex gap-4 p-4 sm:p-5">
              <Link href={productUrl(item.product)} className="w-20 shrink-0 sm:w-28" tabIndex={-1} aria-hidden="true">
                <ProductArt category={item.product.category} label={artLabel(item.product)} className="rounded-lg" />
              </Link>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <Link href={productUrl(item.product)} className="line-clamp-2 font-medium hover:underline">
                      {item.product.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatRand(item.product.priceInclVat)} each · SKU {item.product.sku}
                    </p>
                  </div>
                  <p className="num font-display text-lg font-semibold">{formatRand(item.lineTotal)}</p>
                </div>
                {item.unavailable && <p className="text-sm font-medium text-destructive">Out of stock. Remove it to continue.</p>}
                {!item.unavailable && item.overStock && (
                  <p className="text-sm font-medium text-destructive">Only {item.available} available. Lower the quantity to continue.</p>
                )}
                <CartLineControls
                  productId={item.product.id}
                  name={item.product.name}
                  quantity={item.quantity}
                  maxQty={item.product.allowBackorder ? 500 : Math.max(item.available, 1)}
                  installation={item.installation}
                  installationEligible={item.product.installationEligible}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="font-sans text-lg font-semibold">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Items ({cart.count})</dt>
              <dd className="num">{formatRand(cart.subtotalInclVat)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Delivery</dt>
              <dd>Calculated at checkout</dd>
            </div>
            {cart.installationRequested && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Installation</dt>
                <dd>Quoted after site assessment</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <dt>Total so far</dt>
              <dd className="num">{formatRand(cart.subtotalInclVat)}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>Includes VAT of</dt>
              <dd className="num">{formatRand(cart.vatIncluded)}</dd>
            </div>
          </dl>
          {cart.installationRequested && (
            <p className="flex gap-2 rounded-lg bg-accent p-3 text-sm">
              <Wrench className="mt-0.5 size-4 shrink-0 text-amber-ink" aria-hidden="true" />
              Our technician will contact you to assess your site and quote the installation. You only pay for it once you accept.
            </p>
          )}
          <Button size="lg" className="h-12 w-full text-base" disabled>
            Checkout opens soon
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {cart.canCheckout ? "Online payment is being set up." : "Fix the items marked above before checking out."}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-4xl font-semibold">Your cart</h1>
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
        <CartContents />
      </Suspense>
    </div>
  );
}
