import { cn } from "@/lib/utils";

/**
 * Placeholder mark until the real JC Solar logo is supplied: a sun rising
 * over a panel's horizon, graphite on signal yellow.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="7" className="fill-sun" />
      <path d="M8.5 19a7.5 7.5 0 0 1 15 0Z" className="fill-ink" />
      <g className="stroke-ink" strokeWidth="2" strokeLinecap="round">
        <path d="M16 5.5v2.6M7 10.2l1.8 1.8M25 10.2l-1.8 1.8" />
      </g>
      <path d="M5.5 22.5h21M9 26.5h14" className="stroke-ink" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-9" />
      <span className="type-wide text-[1.3rem] leading-none">JC Solar</span>
    </span>
  );
}
