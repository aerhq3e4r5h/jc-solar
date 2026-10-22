"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addToCart } from "@/lib/cart/actions";
import { cn } from "@/lib/utils";

/** One-tap add to cart on a product card. Sits above the card's full-size link. */
export function QuickAdd({ productId, name }: { productId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const add = () =>
    startTransition(async () => {
      const r = await addToCart({ productId, quantity: 1, installation: false });
      if (!r.ok) return void toast.error(r.error);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      toast.success("Added to cart", { description: name, action: { label: "View cart", onClick: () => router.push("/cart") } });
    });
  return (
    <button
      type="button"
      onClick={add}
      disabled={pending}
      aria-label={`Add ${name} to cart`}
      className={cn(
        "absolute right-3 bottom-3 z-10 flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium shadow-md transition-all",
        "bg-primary text-primary-foreground hover:brightness-95 focus-visible:opacity-100",
        "md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100",
        (pending || added) && "translate-y-0 opacity-100",
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : added ? <Check className="size-4" /> : <Plus className="size-4" />}
      <span>{added ? "Added" : "Add"}</span>
    </button>
  );
}
