"use client";

import { Check, Loader2, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addManyToCart } from "@/lib/cart/actions";
import { cartChanged } from "@/lib/cart/events";
import { flyToCart, visibleProductPhoto } from "@/lib/cart/fly";
import { formatPrice } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

export type SystemLine = { id: string; name: string; url: string; image: string | null; price: number; quantity: number; why: string };

/**
 * "Complete the system": this product plus the parts that make it a working
 * system, each one tickable, with a running total and one button to add them.
 */
export function CompleteSystem({ base, lines }: { base: Omit<SystemLine, "why" | "url">; lines: SystemLine[] }) {
  const [on, setOn] = useState<Set<string>>(new Set(lines.map((l) => l.id)));
  const [pending, startTransition] = useTransition();
  const chosen = lines.filter((l) => on.has(l.id));
  const total = base.price + chosen.reduce((n, l) => n + l.price * l.quantity, 0);
  const count = 1 + chosen.length;

  const toggle = (id: string) =>
    setOn((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const addAll = () =>
    startTransition(async () => {
      const r = await addManyToCart(
        [{ productId: base.id, quantity: 1 }, ...chosen.map((l) => ({ productId: l.id, quantity: l.quantity }))],
        false,
      );
      if (!r.ok) return void toast.error(r.error);
      await flyToCart(visibleProductPhoto(), base.image);
      cartChanged();
    });

  return (
    <div className="rounded-xl border">
      <ul className="divide-y">
        <li className="flex items-center gap-4 p-4">
          <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-ink text-ink-foreground" aria-hidden="true">
            <Check className="size-4" />
          </span>
          <Thumb image={base.image} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold">{base.name}</p>
            <p className="text-xs text-muted-foreground">This product</p>
          </div>
          <p className="num shrink-0 font-bold">{formatPrice(base.price)}</p>
        </li>
        {lines.map((l) => {
          const checked = on.has(l.id);
          return (
            <li key={l.id} className={cn("flex items-center gap-4 p-4 transition-opacity", !checked && "opacity-55")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(l.id)}
                aria-label={`Include ${l.name}`}
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-sm border-2 transition-colors",
                  checked ? "border-ink bg-ink text-ink-foreground dark:border-foreground dark:bg-foreground dark:text-background" : "border-foreground/30",
                )}
              >
                {checked && <Check className="size-4" />}
              </button>
              <Thumb image={l.image} />
              <div className="min-w-0 flex-1">
                <Link href={l.url} className="line-clamp-2 text-sm font-semibold hover:underline">
                  {l.quantity > 1 && <span className="num">{l.quantity} x </span>}
                  {l.name}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{l.why}</p>
              </div>
              <p className="num shrink-0 font-bold">{formatPrice(l.price * l.quantity)}</p>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-shelf p-4">
        <p>
          <span className="text-sm text-muted-foreground">Total for {count} item{count === 1 ? "" : "s"}, incl. VAT</span>
          <span className="num type-wide block text-2xl">{formatPrice(total)}</span>
        </p>
        <Button size="lg" onClick={addAll} disabled={pending} className="h-12">
          {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />} Add all {count} to cart
        </Button>
      </div>
    </div>
  );
}

function Thumb({ image }: { image: string | null }) {
  return (
    <span className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-white">
      {image && <Image src={image} alt="" fill sizes="56px" className="object-contain" />}
    </span>
  );
}
