import { discountPercent } from "@/lib/pricing/sale";
import { cn } from "@/lib/utils";

/**
 * Corner sash on a product photo when it's on sale ("15% OFF"). The parent
 * must be `relative overflow-hidden`. Renders nothing when not discounted.
 */
export function DiscountRibbon({ price, compareAt, size = "md" }: { price: number; compareAt: number | null; size?: "md" | "lg" }) {
  const pct = discountPercent(price, compareAt);
  if (!pct) return null;
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute top-0 left-0 z-10 overflow-hidden", size === "lg" ? "size-36" : "size-28")}>
      <span
        className={cn(
          "absolute flex -rotate-45 items-center justify-center bg-sale font-display font-extrabold text-white uppercase shadow-md",
          size === "lg" ? "top-8 -left-12 w-52 py-2 text-base" : "top-6 -left-11 w-44 py-1.5 text-sm",
        )}
      >
        {pct}% off
      </span>
    </span>
  );
}

/** Small "-15%" pill for compact lists (search, cart, advisor cards). */
export function DiscountPill({ price, compareAt, className }: { price: number; compareAt: number | null; className?: string }) {
  const pct = discountPercent(price, compareAt);
  if (!pct) return null;
  return <span className={cn("rounded-sm bg-sale px-1.5 py-0.5 text-[11px] font-bold text-white", className)}>-{pct}%</span>;
}
