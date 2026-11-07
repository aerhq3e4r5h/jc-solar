"use client";

import { History, Loader2, Search, SearchX } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DiscountPill } from "@/components/product/discount-ribbon";
import { CategoryGlyph } from "@/components/product/product-art";
import { shopNav } from "@/config/site";
import type { CategorySlug } from "@/lib/catalogue/classify";
import { CATEGORIES } from "@/lib/catalogue/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

type Result = {
  categorySlug: CategorySlug;
  id: string;
  name: string;
  brand: string | null;
  sku: string;
  category: string;
  url: string;
  image: string | null;
  price: number;
  compareAt: number | null;
  stock: string;
  inStock: boolean;
};

const POPULAR = ["Deye 5kW", "Lithium battery 48V", "Bifacial panel", "Off-grid kit", "Voltage stabiliser", "Aircon"];

// Recent searches, kept in this browser only.
const RECENT_KEY = "jc-recent-searches";
function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  const term = q.trim();
  if (term.length < 2) return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([term, ...readRecent().filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 5)));
  } catch {}
}

/** Header search: a button that opens instant product search (also Ctrl+K / ⌘K or "/"). */
export function ProductSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [closest, setClosest] = useState<{ slug: CategorySlug; name: string } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const request = useRef(0);
  const listId = useId();

  // Load recent searches each time the box opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage when the dialog opens
    if (open) setRecent(readRecent());
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    const id = ++request.current;
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear results when the query is too short
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = (await res.json()) as { results: Result[]; closest: { slug: CategorySlug; name: string } | null };
        if (id !== request.current) return;
        setResults(data.results);
        setClosest(data.closest);
        setActive(0);
      } catch {
        if (id === request.current) setResults([]);
      } finally {
        if (id === request.current) setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const go = (url: string) => {
    saveRecent(q);
    setOpen(false);
    setQ("");
    router.push(url);
  };

  // Results grouped by department, in the order the best match of each appears.
  const groups = useMemo(() => {
    const by = new Map<CategorySlug, Result[]>();
    for (const r of results) by.set(r.categorySlug, [...(by.get(r.categorySlug) ?? []), r]);
    let i = 0;
    return [...by.entries()].map(([slug, items]) => ({ slug, name: CATEGORIES[slug].name, items: items.map((r) => ({ r, i: i++ })) }));
  }, [results]);
  const ordered = useMemo(() => groups.flatMap((g) => g.items.map((x) => x.r)), [groups]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(ordered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && ordered[active]) {
      e.preventDefault();
      go(ordered[active].url);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-shelf md:h-12 md:w-full md:justify-start md:gap-3 md:border-2 md:border-foreground md:bg-background md:pr-1.5 md:pl-5 md:text-left md:hover:bg-background"
        aria-label="Search products"
      >
        <Search className="size-5 md:hidden" aria-hidden="true" />
        <span className="hidden min-w-0 flex-1 truncate text-[0.95rem] text-muted-foreground md:block">Search inverters, batteries, panels, brands or SKUs</span>
        <kbd className="hidden rounded border px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground xl:inline">Ctrl K</kbd>
        <span className="hidden h-9 w-14 shrink-0 place-items-center rounded-full bg-sun text-ink transition-[filter] group-hover:brightness-95 md:grid">
          <Search className="size-[1.1rem]" aria-hidden="true" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Search products</DialogTitle>
          <div className="flex items-center gap-3 border-b px-4">
            {loading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : (
              <Search className="size-5 text-muted-foreground" aria-hidden="true" />
            )}
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search by product, brand or SKU"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-activedescendant={ordered[active] ? `${listId}-${ordered[active].id}` : undefined}
              aria-label="Search products"
            />
            <kbd className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">Esc</kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {q.trim().length < 2 ? (
              <div className="space-y-5 p-3">
                {recent.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">Recent searches</p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <button key={r} type="button" onClick={() => setQ(r)} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm hover:border-foreground">
                          <History className="size-3.5 text-muted-foreground" aria-hidden="true" /> {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-sm font-semibold">Popular searches</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR.map((s) => (
                      <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full border px-3 py-1.5 text-sm hover:border-foreground">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Shop by department</p>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {shopNav.map((n) => (
                      <li key={n.href}>
                        <button
                          type="button"
                          onClick={() => go(n.href)}
                          className="flex w-full flex-col items-center gap-1 rounded-lg bg-shelf p-2 text-center text-xs font-semibold transition-colors hover:bg-sun hover:text-ink"
                        >
                          <CategoryGlyph category={n.href.replace("/shop/", "") as CategorySlug} className="size-12" />
                          {n.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <SearchX className="size-6" aria-hidden="true" />
                <p>No products match &ldquo;{q.trim()}&rdquo;. Check the spelling, or search by brand.</p>
                {closest && (
                  <button type="button" onClick={() => go(`/shop/${closest.slug}`)} className="rounded-full bg-sun px-4 py-2 font-semibold text-ink">
                    Browse all {closest.name.toLowerCase()}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => go(`/advisor?ask=${encodeURIComponent(`I'm looking for: ${q.trim()}`)}`)}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Ask the Solar Advisor instead
                </button>
              </div>
            ) : (
              <div id={listId} role="listbox" aria-label="Products">
                {groups.map((g) => (
                  <div key={g.slug} role="group" aria-labelledby={`${listId}-${g.slug}`} className="mb-2">
                    <p id={`${listId}-${g.slug}`} className="flex items-center justify-between px-2.5 pt-2 pb-1 text-xs font-semibold text-muted-foreground">
                      {g.name}
                      <span className="num">{g.items.length}</span>
                    </p>
                    {g.items.map(({ r, i }) => (
                      <div
                        key={r.id}
                        id={`${listId}-${r.id}`}
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r.url)}
                        className={cn("flex cursor-pointer items-center gap-3 rounded-xl p-2.5", i === active && "bg-muted")}
                      >
                        <span className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-white">
                          {r.image && <Image src={r.image} alt="" fill sizes="56px" className="object-contain" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-medium">{r.name}</span>
                          <span className="block font-mono text-xs text-muted-foreground">{r.sku}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="num flex items-center justify-end gap-1.5 text-sm font-semibold">
                            <DiscountPill price={r.price} compareAt={r.compareAt} />
                            {formatPrice(r.price)}
                          </span>
                          <span className={cn("block text-xs", r.inStock ? "text-success" : "text-muted-foreground")}>{r.stock}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {results.length > 0 && (
              <button type="button" onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)} className="mt-1 w-full rounded-xl p-3 text-center text-sm font-medium hover:bg-muted">
                See all results for &ldquo;{q.trim()}&rdquo;
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
