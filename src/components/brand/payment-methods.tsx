import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const METHODS = ["Visa", "Mastercard", "Instant EFT", "Bank transfer"];

/** How customers can pay. Card and instant EFT go through PayFast; bank transfer by EFT with a pro forma invoice. */
export function PaymentMethods({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" /> Secure payment with PayFast
      </span>
      <ul className="flex flex-wrap gap-1.5" aria-label="Payment methods">
        {METHODS.map((m) => (
          <li key={m} className="rounded-md border bg-background px-2 py-1 text-xs font-medium">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
