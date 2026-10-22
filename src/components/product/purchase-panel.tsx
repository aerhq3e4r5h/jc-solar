"use client";

import { Check, GitCompareArrows, Loader2, Minus, Plus, ShoppingCart, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useCompare } from "@/components/compare/compare-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { addToCart } from "@/lib/cart/actions";
import { formatRand } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  slug: string;
  category: string;
  name: string;
  price: number;
  canBuy: boolean;
  maxQty: number;
  installationEligible: boolean;
};

export function PurchasePanel({ productId, slug, category, name, price, canBuy, maxQty, installationEligible }: Props) {
  const [qty, setQty] = useState(1);
  const [installation, setInstallation] = useState(false);
  const [pending, startTransition] = useTransition();
  const compare = useCompare();
  const router = useRouter();
  const inCompare = compare.has(slug);

  const add = () =>
    startTransition(async () => {
      const r = await addToCart({ productId, quantity: qty, installation });
      if (r.ok) {
        toast.success("Added to cart", {
          description: `${qty} x ${name}`,
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
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
      <Button type="button" variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
        <Minus />
      </Button>
      <output className="num w-10 text-center font-medium" aria-live="polite">
        {qty}
      </output>
      <Button type="button" variant="ghost" size="icon" onClick={() => setQty((q) => Math.min(limit, q + 1))} disabled={qty >= limit} aria-label="Increase quantity">
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
              <Wrench className="mt-0.5 size-5 text-amber-ink" aria-hidden="true" />
              <div className="flex-1">
                <Label htmlFor="installation" className="text-base font-semibold">
                  Add professional installation
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Installed by our registered technician, with a Certificate of Compliance. Priced after a quick site
                  assessment; you won&apos;t pay for installation until you accept the quote.
                </p>
              </div>
              <Switch id="installation" checked={installation} onCheckedChange={setInstallation} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
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

      {/* Sticky add-to-cart on phones */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="num font-display text-lg font-semibold">{formatRand(price * qty)}</p>
            <p className="text-xs text-muted-foreground">incl. VAT{qty > 1 ? ` · ${qty} items` : ""}</p>
          </div>
          <Button size="lg" className="h-12" onClick={add} disabled={!canBuy || pending}>
            {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
            {canBuy ? "Add to cart" : "Out of stock"}
          </Button>
        </div>
      </div>
    </>
  );
}
