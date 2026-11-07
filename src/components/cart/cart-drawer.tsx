"use client";

import { Loader2, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DiscountPill } from "@/components/product/discount-ribbon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { removeFromCart, setCartQuantity } from "@/lib/cart/actions";
import { CART_CHANGED } from "@/lib/cart/events";
import { getMiniCart, type MiniCart } from "@/lib/cart/mini";
import { formatRand } from "@/lib/pricing/vat";

/** Slide-out cart that opens whenever something is added. Mounted once in the shop layout. */
export function CartDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<MiniCart | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => setCart(await getMiniCart()), []);

  useEffect(() => {
    const onChange = (e: Event) => {
      router.refresh(); // header badge
      void load();
      if ((e as CustomEvent<{ open?: boolean }>).detail?.open !== false) setOpen(true);
    };
    window.addEventListener(CART_CHANGED, onChange);
    return () => window.removeEventListener(CART_CHANGED, onChange);
  }, [load, router]);

  const change = (id: string, quantity: number) =>
    startTransition(async () => {
      const r = quantity <= 0 ? await removeFromCart(id) : await setCartQuantity(id, quantity);
      if (!r.ok) toast.error(r.error);
      await load();
      router.refresh();
    });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="size-5 text-amber-ink" aria-hidden="true" /> Your cart
            {cart && cart.count > 0 && <span className="num text-sm font-normal text-muted-foreground">({cart.count})</span>}
          </SheetTitle>
          <SheetDescription className="sr-only">Items in your cart</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4" aria-busy={pending}>
          {!cart ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading your cart…
            </p>
          ) : cart.items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium">Your cart is empty.</p>
              <Button asChild variant="outline" className="mt-4" onClick={() => setOpen(false)}>
                <Link href="/shop">Browse the shop</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {cart.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-4 first:pt-0">
                  <Link href={i.url} onClick={() => setOpen(false)} className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-white">
                    {i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-contain p-1" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    {i.brand && <p className="text-xs text-muted-foreground">{i.brand}</p>}
                    <Link href={i.url} onClick={() => setOpen(false)} className="line-clamp-2 text-sm leading-snug font-medium hover:underline">
                      {i.title}
                    </Link>
                    {i.installation && <p className="mt-0.5 text-xs text-amber-ink">With installation (quoted separately)</p>}
                    {i.problem && <p className="mt-0.5 text-xs text-destructive">{i.problem}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border" role="group" aria-label={`Quantity of ${i.title}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={pending}
                          onClick={() => change(i.id, i.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          {i.quantity === 1 ? <Trash2 /> : <Minus />}
                        </Button>
                        <span className="num w-8 text-center text-sm">{i.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={pending}
                          onClick={() => change(i.id, i.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus />
                        </Button>
                      </div>
                      <span className="text-right">
                        <span className="num block text-sm font-semibold">{formatRand(i.lineTotal)}</span>
                        <DiscountPill price={i.unitPrice} compareAt={i.compareAt} />
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="space-y-3 border-t bg-muted/30 px-5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">Subtotal</span>
              <span className="num font-display text-xl font-semibold">{formatRand(cart.subtotal)}</span>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="size-3.5" aria-hidden="true" /> Includes VAT. Delivery is worked out at checkout.
            </p>
            {cart.issues > 0 && <p className="text-xs text-destructive">Some items need attention. Open the cart to see why.</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/cart">View cart</Link>
              </Button>
              <Button asChild disabled={!cart.canCheckout} onClick={() => setOpen(false)}>
                <Link href={cart.canCheckout ? "/checkout" : "/cart"}>Checkout</Link>
              </Button>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden="true" /> Secure payment with PayFast or EFT
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
