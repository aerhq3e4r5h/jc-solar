import { availability, type Product } from "@/lib/catalogue/types";
import { cn } from "@/lib/utils";

const STYLES = {
  in_stock: "text-success",
  low_stock: "text-warning",
  backorder: "text-warning",
  out_of_stock: "text-muted-foreground",
} as const;

export function StockBadge({ product, available, className }: { product: Pick<Product, "stockQty" | "allowBackorder">; available?: number; className?: string }) {
  const a = availability(product, available);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", STYLES[a.state], className)}>
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {a.label}
    </span>
  );
}
