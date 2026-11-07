import { formatRand } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

export function Price({
  amount,
  compareAt,
  className,
  size = "md",
}: {
  amount: number;
  compareAt?: number | null;
  className?: string;
  size?: "md" | "lg";
}) {
  const onSale = compareAt !== null && compareAt !== undefined && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("num font-display font-extrabold tracking-tight", size === "lg" ? "text-4xl" : "text-lg", onSale && "text-sale")}>{formatRand(amount)}</span>
      {onSale && (
        <span className="num text-sm text-muted-foreground line-through">
          <span className="sr-only">Was </span>
          {formatRand(compareAt)}
        </span>
      )}
      {onSale && size === "lg" && (
        <span className="num rounded-sm bg-sale px-2 py-0.5 text-sm font-bold text-white">Save {formatRand(compareAt - amount)}</span>
      )}
    </span>
  );
}
