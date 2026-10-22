"use client";

import { Loader2, Search, SearchX } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatRand } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  name: string;
  brand: string | null;
  sku: string;
  category: string;
  url: string;
  image: string | null;
  price: number;
  stock: string;
  inStock: boolean;
};

const SUGGESTIONS = ["Deye 5kW", "Lithium battery 48V", "Bifacial panel", "Off-grid kit"];

/** Header search: a button that opens instant product search (also Ctrl+K / ⌘K or "/"). */
export function ProductSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const request = useRef(0);
  const listId = useId();

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
        const data = (await res.json()) as { results: Result[] };
        if (id !== request.current) return;
        setResults(data.results);
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
    setOpen(false);
    setQ("");
    router.push(url);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].url);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-full border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground lg:w-64 lg:px-4"
        aria-label="Search products"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden lg:inline">Search products</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-sans text-[11px] lg:inline">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Search products</DialogTitle>
          <div className="flex items-center gap-3 border-b px-4">
            {loading ? <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" /> : <Search className="size-5 text-muted-foreground" aria-hidden="true" />}
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
              aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
              aria-label="Search products"
            />
            <kbd className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">Esc</kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {q.trim().length < 2 ? (
              <div className="p-3">
                <p className="mb-2 text-sm text-muted-foreground">Try</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full border px-3 py-1.5 text-sm hover:border-cell hover:text-cell">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <SearchX className="size-6" aria-hidden="true" />
                <p>No products match &ldquo;{q.trim()}&rdquo;. Check the spelling, or search by brand.</p>
                <button type="button" onClick={() => go(`/advisor?ask=${encodeURIComponent(`I'm looking for: ${q.trim()}`)}`)} className="font-medium text-foreground underline underline-offset-4">
                  Ask the Solar Advisor instead
                </button>
              </div>
            ) : (
              <ul id={listId} role="listbox" aria-label="Products">
                {results.map((r, i) => (
                  <li
                    key={r.id}
                    id={`${listId}-${r.id}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.url)}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-xl p-2.5", i === active && "bg-muted")}
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg border bg-white">
                      {r.image && <Image src={r.image} alt="" fill sizes="56px" className="object-contain p-1" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-medium">{r.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {r.category}, {r.sku}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block text-sm font-semibold">{formatRand(r.price)}</span>
                      <span className={cn("block text-xs", r.inStock ? "text-success" : "text-muted-foreground")}>{r.stock}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
