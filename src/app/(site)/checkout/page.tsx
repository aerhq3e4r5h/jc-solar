import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { loadCart } from "@/lib/cart/load";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

async function Checkout() {
  const [cart, user] = await Promise.all([loadCart(), getSessionUser()]);
  if (cart.items.length === 0 || !cart.canCheckout) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <p className="font-medium">{cart.items.length === 0 ? "Your cart is empty." : "Some items in your cart need attention before checkout."}</p>
        <Button asChild className="mt-6">
          <Link href={cart.items.length === 0 ? "/shop" : "/cart"}>{cart.items.length === 0 ? "Browse the shop" : "Back to cart"}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <CheckoutForm defaultEmail={user?.email} />
      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary
          lines={cart.items.map((i) => ({ key: i.product.id, name: i.product.name, quantity: i.quantity, lineTotal: i.lineTotal }))}
          total={cart.subtotalInclVat}
          vat={cart.vatIncluded}
          installationRequested={cart.installationRequested}
        />
        <p className="mt-3 text-center text-sm">
          <Link href="/cart" className="underline underline-offset-4">
            Edit cart
          </Link>
        </p>
      </aside>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-4xl font-semibold">Checkout</h1>
      <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-2xl" />}>
        <Checkout />
      </Suspense>
    </div>
  );
}
