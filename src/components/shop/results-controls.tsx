"use client";

import { LayoutGrid, List, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { filtersToQuery, PAGE_SIZE, type Filters } from "@/lib/catalogue/filters";
import { cn } from "@/lib/utils";

/** A number that rolls to its new value when it changes (filters applied). */
export function AnimatedCount({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return void setShown(value);
    const t0 = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 450);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="num">{shown}</span>;
}

function useResultsNav(filters: Filters) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const go = (next: Partial<Filters>) => startTransition(() => router.replace(`${pathname}${filtersToQuery({ ...filters, ...next })}`, { scroll: false }));
  return { go, pending };
}

/** Grid of tiles or list with spec columns. */
export function ViewToggle({ filters }: { filters: Filters }) {
  const { go } = useResultsNav(filters);
  const opt = (view: "grid" | "list", label: string, Icon: typeof List) => (
    <button
      type="button"
      onClick={() => go({ view })}
      aria-pressed={filters.view === view}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 place-items-center rounded-full transition-colors",
        filters.view === view ? "bg-ink text-ink-foreground dark:bg-foreground dark:text-background" : "text-muted-foreground hover:bg-shelf hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
  return (
    <div className="flex items-center gap-1 rounded-full border p-0.5" role="group" aria-label="Layout">
      {opt("grid", "Show as a grid", LayoutGrid)}
      {opt("list", "Show as a list with specs", List)}
    </div>
  );
}

/** "Load more": shows the next page, with placeholder tiles while it loads. */
export function LoadMore({ filters, total }: { filters: Filters; total: number }) {
  const { go, pending } = useResultsNav(filters);
  const remaining = total - filters.show;
  if (remaining <= 0) return null;
  return (
    <div className="mt-10">
      {pending && (
        <div className={cn("mb-10 grid gap-x-4 gap-y-10 sm:gap-x-6", filters.view === "list" ? "grid-cols-1" : "grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")}>
          {Array.from({ length: Math.min(PAGE_SIZE, remaining, filters.view === "list" ? 4 : 8) }).map((_, i) =>
            filters.view === "list" ? <Skeleton key={i} className="h-28 rounded-lg" /> : <TileSkeleton key={i} />,
          )}
        </div>
      )}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Showing <span className="num font-semibold text-foreground">{filters.show}</span> of <span className="num">{total}</span>
        </p>
        <Button variant="outline" size="lg" onClick={() => go({ show: filters.show + PAGE_SIZE })} disabled={pending} className="h-12 px-8">
          {pending && <Loader2 className="animate-spin" />} Load {Math.min(PAGE_SIZE, remaining)} more
        </Button>
      </div>
    </div>
  );
}

/** Placeholder shaped like a product tile. */
export function TileSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-square rounded-lg" />
      <Skeleton className="mt-3.5 h-3 w-16" />
      <Skeleton className="mt-2 h-4 w-11/12" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />
      <Skeleton className="mt-4 h-5 w-24" />
    </div>
  );
}
