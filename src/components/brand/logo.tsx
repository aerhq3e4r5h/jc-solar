import { cn } from "@/lib/utils";

/** Placeholder mark until the real JC Solar logo is supplied. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-navy dark:fill-secondary" />
      <circle cx="16" cy="14" r="5.5" className="fill-sun" />
      <g className="stroke-sun" strokeWidth="1.6" strokeLinecap="round">
        <path d="M16 4.5v2.2M6.5 14h2.2M23.3 14h2.2M9.3 7.3l1.5 1.5M22.7 7.3l-1.5 1.5" />
      </g>
      <path d="M6 24.5h20" className="stroke-navy-foreground" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <path d="M9 27.5h14" className="stroke-navy-foreground" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">
        JC <span className="text-amber-ink">Solar</span>
      </span>
    </span>
  );
}
