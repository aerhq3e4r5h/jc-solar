"use client";

import { Check, GitCompareArrows, Loader2, Minus, Plus, ShoppingCart, Wrench } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMotion } from "@/components/motion/use-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useCompare } from "@/components/compare/compare-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RollingNumber } from "@/components/motion/rolling-number";
import { addToCart } from "@/lib/cart/actions";
import { cartChanged } from "@/lib/cart/events";
import { flyToCart, visibleProductPhoto } from "@/lib/cart/fly";
import { formatPrice } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

type Props = {
  image?: string | null;
  productId: string;
  slug: string;
  category: string;
  name: string;
  price: number;
  canBuy: boolean;
  maxQty: number;
  installationEligible: boolean;
};

export function PurchasePanel({ image = null, productId, slug, category, name, price, canBuy, maxQty, installationEligible }: Props) {
  const mainButton = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  const reduce = useMotion() !== "full";

  // The phone bar appears only once the main Add to cart button is off screen.
  useEffect(() => {
    const el = mainButton.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [qty, setQty] = useState(1);
  const [installation, setInstallation] = useState(false);
  const [pending, startTransition] = useTransition();
  const compare = useCompare();
  const inCompare = compare.has(slug);

  const add = () =>
    startTransition(async () => {
      const r = await addToCart({ productId, quantity: qty, installation });
      if (r.ok) {
        await flyToCart(visibleProductPhoto(), image);
        cartChanged();
      } else {
        toast.error(r.error);
      }
    });

  const toggleCompare = () => {
    const r = compare.toggle({ slug, category, name });
    if (r === "full") toast.info("You can compare up to 3 products. Remove one first.");
    if (r === "other-category") toast.info("Compare list restarted: you can only compare products of the same type.");
  };

  const limit = Math.max(1, Math.min(maxQty, 500));
  const stepper = (
    <div className="flex items-center rounded-lg border" role="group" aria-label="Quantity">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setQty((q) => Math.max(1, q - 1))}
        disabled={qty <= 1}
        aria-label="Decrease quantity"
      >
        <Minus />
      </Button>
      <output className="w-10 text-center font-semibold" aria-live="polite">
        <RollingNumber value={qty} />
      </output>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setQty((q) => Math.min(limit, q + 1))}
        disabled={qty >= limit}
        aria-label="Increase quantity"
      >
        <Plus />
      </Button>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {installationEligible && (
          <div className={cn("rounded-xl border p-4 transition-colors", installation && "border-sun bg-accent/60")}>
            <div className="flex items-start gap-3">
              <Wrench
                className={cn("mt-0.5 size-5 text-amber-ink transition-transform duration-500 ease-out", installation ? "rotate-0" : "-rotate-45")}
                aria-hidden="true"
              />
              <div className="flex-1">
                <Label htmlFor="installation" className="text-base font-semibold">
                  Add professional installation
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Installed by our registered technician, with a Certificate of Compliance. Priced after a quick site assessment; you won&apos;t pay
                  for installation until you accept the quote.
                </p>
              </div>
              <Switch id="installation" checked={installation} onCheckedChange={setInstallation} />
            </div>
          </div>
        )}

        <div ref={mainButton} className="flex flex-wrap items-center gap-3">
          {stepper}
          <Button size="lg" className="h-12 flex-1 text-base" onClick={add} disabled={!canBuy || pending}>
            {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
            {canBuy ? "Add to cart" : "Out of stock"}
          </Button>
        </div>
        <Button variant="outline" className="w-full" onClick={toggleCompare} aria-pressed={inCompare}>
          {inCompare ? <Check /> : <GitCompareArrows />}
          {inCompare ? "Added to compare" : "Compare"}
        </Button>
        {!canBuy && (
          <p className="text-sm text-muted-foreground">
            Need this soon?{" "}
            <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">
              Ask us about stock
            </Link>
            .
          </p>
        )}
      </div>

      {/* Sticky add-to-cart on phones, once the main button has scrolled away */}
      <AnimatePresence>
        {showBar && (
          <motion.div
            key="bar"
            initial={reduce ? { opacity: 0 } : { y: "110%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "110%" }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-30 mb-0 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.08)] md:hidden"
          >
            <div className="flex items-center gap-3">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-white">
                {image && <Image src={image} alt="" fill sizes="48px" className="object-contain" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-xs text-muted-foreground">{name}</p>
                <p className="num font-display text-lg leading-tight font-extrabold">{formatPrice(price * qty)}</p>
              </div>
              <Button size="lg" className="h-12" onClick={add} disabled={!canBuy || pending}>
                {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
                {canBuy ? "Add to cart" : "Out of stock"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
