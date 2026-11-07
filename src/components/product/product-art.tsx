import type { CategorySlug } from "@/lib/catalogue/classify";
import { cn } from "@/lib/utils";

/**
 * Drawn stand-in shown until a product has real photos. Clearly an
 * illustration, so it never passes for a photo of the actual product.
 */
export function ProductArt({ category, label, className }: { category: CategorySlug; label?: string | null; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-shelf",
        className,
      )}
    >
      <CategoryGlyph category={category} className="h-3/5 w-3/5 drop-shadow-sm" />
      {label && (
        <span className="absolute bottom-3 left-3 rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

/** The drawing for a category, on its own (used on product stand-ins and category tiles). */
export function CategoryGlyph({ category, className }: { category: CategorySlug; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={className}>
      {category === "solar-panels" && <PanelGlyph />}
      {category === "batteries" && <BatteryGlyph />}
      {category === "inverters" && <InverterGlyph />}
      {category === "kits" && <KitGlyph />}
      {category === "voltage-stabilizers" && <StabilizerGlyph />}
      {category === "air-conditioners" && <AirconGlyph />}
    </svg>
  );
}

function PanelGlyph() {
  return (
    <g>
      <rect x="40" y="20" width="120" height="160" rx="6" fill="var(--ink)" />
      {Array.from({ length: 6 }).flatMap((_, r) =>
        Array.from({ length: 3 }).map((__, c) => (
          <rect key={`${r}${c}`} x={48 + c * 36} y={28 + r * 25} width="32" height="21" rx="2" fill="oklch(0.34 0.004 95)" />
        )),
      )}
      <path d="M48 28 L120 28 L60 178 L48 178 Z" fill="white" opacity="0.07" />
    </g>
  );
}

function BatteryGlyph() {
  return (
    <g>
      <rect x="50" y="22" width="100" height="160" rx="14" fill="white" stroke="oklch(0.8 0.006 95)" strokeWidth="2" />
      <rect x="64" y="40" width="72" height="8" rx="4" fill="oklch(0.85 0.006 95)" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="72" y={128 - i * 22} width="56" height="16" rx="3" fill={i < 3 ? "var(--sun)" : "oklch(0.88 0.006 95)"} />
      ))}
      <circle cx="100" cy="164" r="4" fill="var(--charge)" />
    </g>
  );
}

function InverterGlyph() {
  return (
    <g>
      <rect x="38" y="30" width="124" height="140" rx="12" fill="white" stroke="oklch(0.8 0.006 95)" strokeWidth="2" />
      <rect x="62" y="52" width="76" height="40" rx="6" fill="var(--ink)" />
      <path d="M72 76 q8 -14 16 0 t16 0 t16 0" fill="none" stroke="var(--sun)" strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={80 + i * 20} cy="112" r="5" fill={i === 0 ? "var(--charge)" : "oklch(0.85 0.006 95)"} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={64 + i * 20} y="150" width="12" height="20" rx="3" fill="oklch(0.75 0.006 95)" />
      ))}
    </g>
  );
}

function KitGlyph() {
  return (
    <g>
      <g transform="translate(-14 4) scale(0.8)">
        <InverterGlyph />
      </g>
      <g transform="translate(70 38) scale(0.62)">
        <BatteryGlyph />
      </g>
    </g>
  );
}

function StabilizerGlyph() {
  return (
    <g>
      <rect x="44" y="34" width="112" height="132" rx="10" fill="white" stroke="oklch(0.8 0.006 95)" strokeWidth="2" />
      {/* Voltmeter dial */}
      <circle cx="100" cy="86" r="32" fill="var(--ink)" />
      <path d="M76 92 a26 26 0 0 1 48 0" fill="none" stroke="oklch(0.45 0.004 95)" strokeWidth="5" strokeLinecap="round" />
      <path d="M92 74 a26 26 0 0 1 16 0" fill="none" stroke="var(--sun)" strokeWidth="5" strokeLinecap="round" />
      <path d="M100 92 L108 70" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="92" r="4" fill="white" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={66 + i * 26} y="136" width="16" height="10" rx="2" fill={i === 1 ? "var(--charge)" : "oklch(0.85 0.006 95)"} />
      ))}
    </g>
  );
}

function AirconGlyph() {
  return (
    <g>
      <rect x="26" y="54" width="148" height="58" rx="14" fill="white" stroke="oklch(0.8 0.006 95)" strokeWidth="2" />
      <rect x="38" y="94" width="124" height="6" rx="3" fill="oklch(0.85 0.006 95)" />
      <circle cx="150" cy="70" r="3.5" fill="var(--charge)" />
      {/* Cool air */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${62 + i * 38} 118 q-8 14 0 28 t0 28`}
          fill="none"
          stroke="oklch(0.62 0.004 95)"
          strokeWidth="4"
          strokeLinecap="round"
          opacity={0.75 - i * 0.15}
        />
      ))}
    </g>
  );
}
