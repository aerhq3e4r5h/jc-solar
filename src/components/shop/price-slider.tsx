"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

/**
 * Two-handle price slider with the price spread drawn behind it, so you can
 * see where most products sit. Applies when a handle is released.
 */
export function PriceSlider({
  bounds,
  bands,
  scale = "linear",
  min,
  max,
  onApply,
}: {
  scale?: "linear" | "log";
  bounds: { min: number; max: number } | null;
  bands: number[];
  min: number | null;
  max: number | null;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const [lo, setLo] = useState(min ?? bounds?.min ?? 0);
  const [hi, setHi] = useState(max ?? bounds?.max ?? 0);
  if (!bounds || bounds.min === bounds.max) return null;

  // The handles move along 0..1000; on a log scale each step is the same ratio, not the same rand amount.
  const log = scale === "log";
  const toPos = (v: number) =>
    log ? ((Math.log(v) - Math.log(bounds.min)) / (Math.log(bounds.max) - Math.log(bounds.min))) * 1000 : ((v - bounds.min) / (bounds.max - bounds.min)) * 1000;
  const fromPos = (p: number) => {
    const raw = log ? Math.exp(Math.log(bounds.min) + (p / 1000) * (Math.log(bounds.max) - Math.log(bounds.min))) : bounds.min + (p / 1000) * (bounds.max - bounds.min);
    // Round to tidy amounts: R50 under R5k, R100 under R20k, then R500 and R1,000.
    const step = raw < 5_000 ? 50 : raw < 20_000 ? 100 : raw < 100_000 ? 500 : 1_000;
    return Math.min(bounds.max, Math.max(bounds.min, Math.round(raw / step) * step));
  };
  const pct = (v: number) => toPos(v) / 10;
  const peak = Math.max(1, ...bands);
  const commit = () => onApply(lo <= bounds.min ? null : lo, hi >= bounds.max ? null : hi);

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">
        Price <span className="font-normal text-muted-foreground">(incl. VAT)</span>
      </legend>
      <div className="flex h-12 items-end gap-px" aria-hidden="true">
        {bands.map((n, i) => {
          const from = fromPos((1000 * i) / bands.length);
          const to = fromPos((1000 * (i + 1)) / bands.length);
          const inside = to >= lo && from <= hi;
          return (
            <span
              key={i}
              className={cn("flex-1 rounded-t-[2px] transition-colors", inside ? "bg-ink/70 dark:bg-foreground/70" : "bg-border")}
              style={{ height: `${n ? Math.max(8, (n / peak) * 100) : 0}%` }}
            />
          );
        })}
      </div>
      <div className="relative h-6">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-border" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink dark:bg-foreground" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input
          type="range"
          aria-label="Lowest price"
          min={0}
          max={1000}
          value={toPos(lo)}
          aria-valuetext={formatPrice(lo)}
          onChange={(e) => setLo(Math.min(fromPos(Number(e.target.value)), hi))}
          onPointerUp={commit}
          onKeyUp={commit}
          className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          aria-label="Highest price"
          min={0}
          max={1000}
          value={toPos(hi)}
          aria-valuetext={formatPrice(hi)}
          onChange={(e) => setHi(Math.max(fromPos(Number(e.target.value)), lo))}
          onPointerUp={commit}
          onKeyUp={commit}
          className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
        />
      </div>
      <p className="num mt-1 flex justify-between text-sm font-semibold" aria-live="polite">
        <span>{formatPrice(lo)}</span>
        <span>{formatPrice(hi)}</span>
      </p>
    </fieldset>
  );
}
