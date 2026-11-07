"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { filtersToQuery, type Facets, type Filters } from "@/lib/catalogue/filters";
import { NO_FILTERS } from "./active-filters";
import { PriceSlider } from "./price-slider";

type Props = {
  facets: Facets;
  filters: Filters;
  sizeLabel: string;
  sizeUnit: string;
  typeLabel?: string;
};

function useFilterNavigation(filters: Filters) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const go = (next: Partial<Filters>) =>
    startTransition(() => router.replace(`${pathname}${filtersToQuery({ ...filters, show: undefined, ...next })}`, { scroll: false }));
  return { go, pending };
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: { value: string; label?: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-3 text-sm font-semibold">{legend}</legend>
      {options.map((o) => {
        const id = `${legend}-${o.value}`.replace(/\W+/g, "-");
        return (
          <div key={o.value} className="flex items-center gap-2.5">
            <Checkbox id={id} checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} />
            <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
              {o.label ?? o.value}
            </Label>
            <span className="num text-xs text-muted-foreground">{o.count}</span>
          </div>
        );
      })}
    </fieldset>
  );
}

function RangeInputs({
  legend,
  unit,
  min,
  max,
  bounds,
  onApply,
}: {
  legend: string;
  unit: string;
  min: number | null;
  max: number | null;
  bounds: { min: number; max: number } | null;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const [lo, setLo] = useState(min?.toString() ?? "");
  const [hi, setHi] = useState(max?.toString() ?? "");
  if (!bounds || bounds.min === bounds.max) return null;
  const apply = () => onApply(lo === "" ? null : Number(lo), hi === "" ? null : Number(hi));
  const id = legend.replace(/\W+/g, "-").toLowerCase();
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">
        {legend} <span className="font-normal text-muted-foreground">({unit})</span>
      </legend>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <Label htmlFor={`${id}-min`} className="sr-only">
          Minimum {legend}
        </Label>
        <Input id={`${id}-min`} inputMode="decimal" placeholder={String(bounds.min)} value={lo} onChange={(e) => setLo(e.target.value)} onBlur={apply} />
        <span className="text-muted-foreground" aria-hidden="true">
          –
        </span>
        <Label htmlFor={`${id}-max`} className="sr-only">
          Maximum {legend}
        </Label>
        <Input id={`${id}-max`} inputMode="decimal" placeholder={String(bounds.max)} value={hi} onChange={(e) => setHi(e.target.value)} onBlur={apply} />
      </form>
    </fieldset>
  );
}

function FilterControls({ facets, filters, sizeLabel, sizeUnit, typeLabel }: Props) {
  const { go, pending } = useFilterNavigation(filters);
  const [q, setQ] = useState(filters.q);
  return (
    <div className="space-y-8" aria-busy={pending}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q });
        }}
        className="relative"
      >
        <Label htmlFor="shop-search" className="sr-only">
          Search products
        </Label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input id="shop-search" type="search" placeholder="Search name, brand or SKU" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="in-stock">In stock only</Label>
          <Switch id="in-stock" checked={filters.stock} onCheckedChange={(v) => go({ stock: v })} />
        </div>
        {(facets.hasSale || filters.sale) && (
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="on-sale">On sale</Label>
            <Switch id="on-sale" checked={filters.sale} onCheckedChange={(v) => go({ sale: v })} />
          </div>
        )}
        {facets.hasNrs && (
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="nrs">Grid-tie approved (NRS 097)</Label>
            <Switch id="nrs" checked={filters.nrs} onCheckedChange={(v) => go({ nrs: v })} />
          </div>
        )}
      </div>

      <RangeInputs legend={sizeLabel} unit={sizeUnit} min={filters.smin} max={filters.smax} bounds={facets.size} onApply={(smin, smax) => go({ smin, smax })} />
      <PriceSlider bounds={facets.price} bands={facets.priceBands} scale={facets.priceScale} min={filters.min} max={filters.max} onApply={(min, max) => go({ min, max })} />
      {typeLabel && (
        <CheckGroup legend={typeLabel} options={facets.types} selected={filters.type} onToggle={(v) => go({ type: toggle(filters.type, v) })} />
      )}
      <CheckGroup legend="Phase" options={facets.phases} selected={filters.phase} onToggle={(v) => go({ phase: toggle(filters.phase, v) })} />
      <CheckGroup legend="Brand" options={facets.brands} selected={filters.brand} onToggle={(v) => go({ brand: toggle(filters.brand, v) })} />
    </div>
  );
}

export function FiltersPanel(props: Props & { activeCount: number; resultCount: number }) {
  const { go, pending } = useFilterNavigation(props.filters);
  const [open, setOpen] = useState(false);
  const clear = () => go(NO_FILTERS);
  // Remount controls when filters change from outside (e.g. "Clear all").
  const key = filtersToQuery(props.filters);
  return (
    <>
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-semibold">Filters</h2>
            {props.activeCount > 0 && (
              <Button variant="link" size="sm" className="h-auto p-0" onClick={clear}>
                Clear all
              </Button>
            )}
          </div>
          <FilterControls key={key} {...props} />
        </div>
      </aside>
      {/* Phones and tablets: a bottom sheet; results update behind it as you choose. */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden">
            <SlidersHorizontal /> Filters{props.activeCount > 0 && ` (${props.activeCount})`}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="flex max-h-[88dvh] flex-col gap-0 rounded-t-2xl p-0">
          <SheetHeader className="flex-row items-center justify-between border-b px-5 py-4">
            <SheetTitle>Filters</SheetTitle>
            {props.activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clear}>
                <X /> Clear all
              </Button>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <FilterControls key={key} {...props} />
          </div>
          <div className="border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button size="lg" className="h-12 w-full text-base" onClick={() => setOpen(false)} disabled={pending}>
              {pending ? "Updating…" : `Show ${props.resultCount} product${props.resultCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
