import { cn } from "@/lib/utils";

// The mark: the "power on" symbol drawn as a sun. The ring is the sun, the
// power stroke rises out of it as the noon ray, and the rays leave the
// bottom open, as if it sits on the horizon. Same geometry as public/brand/.
// (A half turn lands the rays back in the same places, so the header hover spins them 180 degrees.)
export const MARK = {
  ring: "M60.89 38.23A20 20 0 1 1 39.11 38.23",
  stroke: "M50 53V20",
  rays: "M19 55H13.5M28.08 33.08L24.19 29.19M71.92 33.08L75.81 29.19M81 55H86.5M71.92 76.92L75.81 80.81M28.08 76.92L24.19 80.81",
};

/** The mark on its yellow tile. `rays={false}` for tiny sizes; `tile={false}` for a one-colour mark in the text colour. */
export function LogoMark({ className, rays = true, tile = true }: { className?: string; rays?: boolean; tile?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("size-8", className)}>
      {tile && <rect width="100" height="100" rx="22" className="fill-sun" />}
      <g className={tile ? "stroke-ink" : "stroke-current"} fill="none" strokeLinecap="round">
        <path d={MARK.ring} strokeWidth="10" />
        <path d={MARK.stroke} strokeWidth="10" />
        {rays && <path d={MARK.rays} strokeWidth="5.5" className="origin-[50px_55px] transition-transform duration-700 ease-out group-hover:rotate-180" />}
      </g>
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
