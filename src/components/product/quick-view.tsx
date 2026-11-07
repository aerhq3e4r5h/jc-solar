"use client";

import { Eye, Loader2, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { addToCart } from "@/lib/cart/actions";
import { cartChanged } from "@/lib/cart/events";
import { flyToCart } from "@/lib/cart/fly";
import { cn } from "@/lib/utils";

export type QuickViewData = {
  id: string;
  url: string;
  brand: string | null;
  title: string;
  images: string[];
  specs: { label: string; value: string }[];
  priceText: string;
  wasText: string | null;
  stockLabel: string;
  inStock: boolean;
  canBuy: boolean;
};

/** "Quick view" on a product tile: photos, key specs, price and Add to cart, without leaving the grid. */
export function QuickView({ data }: { data: QuickViewData }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();

  const add = (e: React.MouseEvent) => {
    const photo = (e.currentTarget.closest("[data-quick-view]") as HTMLElement | null)?.querySelector("[data-qv-photo]");
    startTransition(async () => {
      const r = await addToCart({ productId: data.id, quantity: 1, installation: false });
      if (!r.ok) return void toast.error(r.error);
      await flyToCart(photo, data.images[0]);
      setOpen(false);
      cartChanged();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Quick view: ${data.title}`}
        className="absolute top-2 right-2 z-10 hidden size-9 place-items-center rounded-full border bg-background shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:grid md:opacity-0"
      >
        <Eye className="size-4" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl" data-quick-view>
          <div className="grid sm:grid-cols-2">
            <div className="border-b bg-white p-4 sm:border-r sm:border-b-0">
              <div className="relative aspect-square" data-qv-photo>
                {data.images[active] && <Image src={data.images[active]} alt="" fill sizes="(min-width: 640px) 380px, 90vw" className="object-contain" />}
              </div>
              {data.images.length > 1 && (
                <div className="mt-3 flex gap-2">
                  {data.images.slice(0, 5).map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-label={`Show photo ${i + 1}`}
                      aria-current={i === active}
                      className={cn("relative size-14 overflow-hidden rounded-md border bg-white", i === active ? "ring-2 ring-foreground" : "opacity-60")}
                    >
                      <Image src={src} alt="" fill sizes="56px" className="object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                {data.brand && <p className="text-sm font-semibold text-muted-foreground">{data.brand}</p>}
                <DialogTitle className="mt-1 text-xl leading-snug font-bold [font-stretch:100%]">{data.title}</DialogTitle>
                <DialogDescription className="sr-only">Key specs, price and Add to cart</DialogDescription>
              </div>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className={cn("num type-wide text-3xl", data.wasText && "text-sale")}>{data.priceText}</span>
                {data.wasText && (
                  <span className="num text-sm text-muted-foreground line-through">
                    <span className="sr-only">Was </span>
                    {data.wasText}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">incl. VAT</span>
              </p>
              <p className={cn("text-sm font-semibold", data.inStock ? "text-success" : "text-muted-foreground")}>{data.stockLabel}</p>
              {data.specs.length > 0 && (
                <dl className="divide-y rounded-lg border text-sm">
                  {data.specs.map((s) => (
                    <div key={s.label} className="flex justify-between gap-4 px-3 py-2">
                      <dt className="text-muted-foreground">{s.label}</dt>
                      <dd className="text-right font-semibold">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="mt-auto space-y-2">
                <Button size="lg" className="h-12 w-full text-base" onClick={add} disabled={!data.canBuy || pending}>
                  {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />} {data.canBuy ? "Add to cart" : "Out of stock"}
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={data.url} onClick={() => setOpen(false)}>
                    See full details
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
