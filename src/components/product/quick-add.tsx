"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addToCart } from "@/lib/cart/actions";
import { cartChanged } from "@/lib/cart/events";
import { cn } from "@/lib/utils";

/** One-tap add to cart on a product card. Sits above the card's full-size link. */
export function QuickAdd({ productId, name }: { productId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const add = () =>
    startTransition(async () => {
      const r = await addToCart({ productId, quantity: 1, installation: false });
      if (!r.ok) return void toast.error(r.error);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      cartChanged();
    });
  return (
    <button
      type="button"
      onClick={add}
      disabled={pending}
      aria-label={`Add ${name} to cart`}
      className={cn(
        "absolute right-2 bottom-2 z-10 flex size-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold shadow-md transition-all md:right-3 md:bottom-3 md:h-10 md:w-auto md:px-4",
        "bg-ink text-ink-foreground hover:bg-sun hover:text-ink focus-visible:opacity-100 dark:bg-foreground dark:text-background",
        "md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100",
        (pending || added) && "translate-y-0 opacity-100",
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : added ? <Check className="size-4" /> : <Plus className="size-4" />}
      <span className="hidden md:inline">{added ? "Added" : "Add to cart"}</span>
    </button>
  );
}
