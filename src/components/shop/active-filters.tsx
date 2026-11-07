"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { filtersToQuery, type Filters } from "@/lib/catalogue/filters";
import { formatRand } from "@/lib/pricing/vat";

export const NO_FILTERS: Partial<Filters> = {
  q: "",
  brand: [],
  type: [],
  phase: [],
  min: null,
  max: null,
  smin: null,
  smax: null,
  stock: false,
  nrs: false,
  sale: false,
};

/** The filters in use, as chips above the results. Each one removes itself; "Clear all" resets. */
export function ActiveFilters({ filters, sizeUnit }: { filters: Filters; sizeUnit: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const go = (next: Partial<Filters>) => startTransition(() => router.replace(`${pathname}${filtersToQuery({ ...filters, show: undefined, ...next })}`, { scroll: false }));

  const range = (lo: number | null, hi: number | null, fmt: (n: number) => string) =>
    lo !== null && hi !== null ? `${fmt(lo)} to ${fmt(hi)}` : lo !== null ? `From ${fmt(lo)}` : `Up to ${fmt(hi!)}`;
  const chips: { label: string; remove: Partial<Filters> }[] = [
    ...(filters.q ? [{ label: `“${filters.q}”`, remove: { q: "" } }] : []),
    ...(filters.sale ? [{ label: "On sale", remove: { sale: false } }] : []),
    ...(filters.stock ? [{ label: "In stock", remove: { stock: false } }] : []),
    ...(filters.nrs ? [{ label: "Grid-tie approved", remove: { nrs: false } }] : []),
    ...(filters.smin !== null || filters.smax !== null
      ? [{ label: range(filters.smin, filters.smax, (n) => `${n} ${sizeUnit}`), remove: { smin: null, smax: null } }]
      : []),
    ...(filters.min !== null || filters.max !== null ? [{ label: range(filters.min, filters.max, formatRand), remove: { min: null, max: null } }] : []),
    ...filters.type.map((t) => ({ label: t, remove: { type: filters.type.filter((x) => x !== t) } })),
    ...filters.phase.map((p) => ({ label: p === "three" ? "Three phase" : "Single phase", remove: { phase: filters.phase.filter((x) => x !== p) } })),
    ...filters.brand.map((b) => ({ label: b, remove: { brand: filters.brand.filter((x) => x !== b) } })),
  ];
  if (chips.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" aria-busy={pending}>
      <span className="sr-only">Filters in use:</span>
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => go(c.remove)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink pr-2.5 pl-3.5 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink/85 dark:bg-foreground dark:text-background"
          aria-label={`Remove filter: ${c.label}`}
        >
          {c.label} <X className="size-3.5" aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={() => go(NO_FILTERS)} className="ml-1 text-sm font-semibold underline underline-offset-4">
        Clear all
      </button>
    </div>
  );
}
