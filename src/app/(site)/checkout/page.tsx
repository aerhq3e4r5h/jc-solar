import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
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
    <CheckoutForm
      defaultEmail={user?.email}
      lines={cart.items.map((i) => ({ key: i.product.id, name: i.product.name, quantity: i.quantity, lineTotal: i.lineTotal }))}
      productsTotal={cart.subtotalInclVat}
      installationRequested={cart.installationRequested}
    />
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
