import { Landmark, Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PayFast's official badge, once the owner adds it: download it from the PayFast
 * merchant dashboard, save it in public/brand/payments/, and set the path here
 * (for example "/brand/payments/payfast.svg"). Until then the line reads as text.
 */
const PAYFAST_BADGE: string | null = null;

// Brand marks sit on white tiles in both themes, as the card schemes ask.
const tile = "inline-flex h-7 items-center justify-center rounded-[5px] border border-black/10 bg-white px-2 shadow-[0_1px_0_rgb(0_0_0/0.04)]";

function VisaMark() {
  // Visa wordmark (simple-icons, CC0 path data), in Visa blue.
  return (
    <svg viewBox="0 8 24 8" className="h-3 w-auto" role="img" aria-label="Visa">
      <path
        fill="#1A1F71"
        d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"
      />
    </svg>
  );
}

function MastercardMark() {
  // The two interlocking circles, in Mastercard's red, yellow and orange overlap.
  return (
    <svg viewBox="0 0 32 20" className="h-5 w-auto" role="img" aria-label="Mastercard">
      <circle cx="10.9" cy="10" r="8.5" fill="#EB001B" />
      <circle cx="21.1" cy="10" r="8.5" fill="#F79E1B" />
      <path d="M16 3.2A8.5 8.5 0 0 1 16 16.8A8.5 8.5 0 0 1 16 3.2Z" fill="#FF5F00" />
    </svg>
  );
}

/** How customers can pay. Card and instant EFT go through PayFast; bank transfer by EFT with a pro forma invoice. */
export function PaymentMethods({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" />
        {PAYFAST_BADGE ? (
          <>
            Secure checkout by
            {/* eslint-disable-next-line @next/next/no-img-element -- a small static badge */}
            <img src={PAYFAST_BADGE} alt="PayFast" className="h-4 w-auto" />
          </>
        ) : (
          <>
            Secure checkout by <strong className="font-semibold text-foreground">PayFast</strong>
          </>
        )}
      </span>
      <ul className="flex flex-wrap items-center gap-1.5" aria-label="Ways to pay">
        <li className={tile}>
          <VisaMark />
        </li>
        <li className={tile}>
          <MastercardMark />
        </li>
        <li className={cn(tile, "gap-1 text-[11px] font-bold tracking-tight text-ink")}>
          <Zap className="size-3 fill-sun stroke-ink" aria-hidden="true" /> Instant EFT
        </li>
        {!compact && (
          <li className={cn(tile, "gap-1 text-[11px] font-bold tracking-tight text-ink")}>
            <Landmark className="size-3" aria-hidden="true" /> Bank transfer
          </li>
        )}
      </ul>
    </div>
  );
}
