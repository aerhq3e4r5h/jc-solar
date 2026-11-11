"use client";

import { MONTHS } from "@/lib/solar/seasons";
import { cn } from "@/lib/utils";

// Formatted by hand: Node and browsers disagree on en-ZA decimals, which breaks hydration.
const one = (n: number) => String(Math.round(n * 10) / 10);

/**
 * A year of solar at a glance: twelve bars, one per month, of what an array
 * makes in a day. With `need`, a dashed line marks what the home needs and
 * the months that fall short turn red. Bars are buttons when `onSelect` is
 * given (the builder uses that to show a month on the house).
 */
export function SeasonChart({
  monthly,
  need,
  selected,
  onSelect,
  className,
}: {
  /** kWh a day, January first. */
  monthly: number[];
  need?: number;
  selected?: number;
  onSelect?: (month: number) => void;
  className?: string;
}) {
  const top = Math.max(...monthly, need ?? 0) * 1.08 || 1;
  return (
    <div className={className}>
      <div className="relative">
        <div className="grid h-28 grid-cols-12 items-end gap-1 sm:gap-1.5" role="group" aria-label="What the panels make each month">
          {monthly.map((v, i) => {
            const short = need !== undefined && v < need - 1e-6;
            const label = `${MONTHS[i]}: ${one(v)} kWh a day${need === undefined ? "" : short ? `, ${one(need - v)} short of what you need` : ", covers what you need"}`;
            const bar = cn(
              "block w-full rounded-t-[3px] transition-[height,background-color] duration-500 ease-out",
              need === undefined ? "bg-sun" : short ? "bg-sale" : "bg-charge",
              selected !== undefined && selected !== i && "opacity-55",
            );
            const style = { height: `${Math.max(3, (v / top) * 100)}%` };
            return onSelect ? (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={selected === i}
                aria-label={label}
                title={label}
                className="group/bar flex h-full items-end rounded-t-[3px] outline-offset-2"
              >
                <span className={cn(bar, "group-hover/bar:opacity-100")} style={style} />
              </button>
            ) : (
              <span key={i} className="flex h-full items-end" title={label}>
                <span className={bar} style={style} />
              </span>
            );
          })}
        </div>
        {need !== undefined && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-foreground/70 transition-[bottom] duration-500 ease-out"
            style={{ bottom: `${(need / top) * 100}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-12 gap-1 text-center text-[11px] text-muted-foreground sm:gap-1.5" aria-hidden="true">
        {MONTHS.map((m, i) => (
          <span key={m} className={cn(selected === i && "font-bold text-foreground")}>
            {m[0]}
          </span>
        ))}
      </div>
      {need !== undefined && (
        <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-foreground/70" aria-hidden="true" /> what you need from solar: {one(need)} kWh a day
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-charge" aria-hidden="true" /> covers it
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-sale" aria-hidden="true" /> falls short
          </span>
        </p>
      )}
    </div>
  );
}
