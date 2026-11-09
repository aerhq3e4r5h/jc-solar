import { cn } from "@/lib/utils";

// The mark: an anchor that is also the "power on" symbol. The anchor's arms
// are the power symbol's open ring and its shank is the power stroke, topped
// with the crossbar and ring. Same geometry as public/brand/.
export const MARK = {
  arms: "M72.05 39.22A26 26 0 1 1 27.95 39.22",
  shank: "M50 79V21",
  stock: "M39 30H61",
  ring: { cx: 50, cy: 14.5, r: 5.5 },
};

/** The mark on its yellow tile; `tile={false}` for a one-colour mark in the text colour. */
export function LogoMark({ className, tile = true }: { className?: string; tile?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("size-8", className)}>
      {tile && <rect width="100" height="100" rx="22" className="fill-sun" />}
      {/* Swings gently from its ring when the logo is hovered (see .anchor-swing). */}
      <g className={cn("anchor-swing", tile ? "stroke-ink" : "stroke-current")} fill="none" strokeLinecap="round">
        <path d={MARK.arms} strokeWidth="9.5" />
        <path d={MARK.shank} strokeWidth="9.5" />
        <path d={MARK.stock} strokeWidth="7.1" />
        <circle cx={MARK.ring.cx} cy={MARK.ring.cy} r={MARK.ring.r} strokeWidth="5.9" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-9" />
      <span className="type-wide text-[1.3rem] leading-none">GridAnchor</span>
    </span>
  );
}
