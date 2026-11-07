"use client";

import { ExternalLink, Loader2, Percent, RotateCcw, Save, Search, Undo2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { changePrice, discountPercent } from "@/lib/pricing/sale";
import { formatRand } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";
import { bulkSale, saveProducts } from "./actions";

export type AdminProductRow = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string;
  url: string;
  thumb: string | null;
  price: number;
  compareAt: number | null;
  stockQty: number;
  isActive: boolean;
};

/** What the admin has typed for a row (strings, so half-typed numbers aren't lost). */
type Draft = { price: string; compareAt: string; stockQty: string; isActive: boolean; wasTouched: boolean };

const STATUS = { all: "All", sale: "On sale", out: "Out of stock", hidden: "Hidden from shop" } as const;
type Status = keyof typeof STATUS;

const toDraft = (r: AdminProductRow): Draft => ({
  price: String(r.price),
  compareAt: r.compareAt === null ? "" : String(r.compareAt),
  stockQty: String(r.stockQty),
  isActive: r.isActive,
  wasTouched: false,
});
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[\s,R]/g, "")));

export function ProductsEditor({ initial, categories }: { initial: AdminProductRow[]; categories: { slug: string; name: string }[] }) {
  const [rows, setRows] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<Status>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [percent, setPercent] = useState("10");
  const [pending, startTransition] = useTransition();

  const draftOf = (r: AdminProductRow) => drafts[r.id] ?? toDraft(r);
  const isDirty = (r: AdminProductRow) => {
    const d = drafts[r.id];
    if (!d) return false;
    return num(d.price) !== r.price || num(d.compareAt) !== r.compareAt || num(d.stockQty) !== r.stockQty || d.isActive !== r.isActive;
  };

  const visible = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (status === "sale" && !discountPercent(r.price, r.compareAt)) return false;
      if (status === "out" && r.stockQty > 0) return false;
      if (status === "hidden" && r.isActive) return false;
      const hay = `${r.name} ${r.sku} ${r.brand ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [rows, q, category, status]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      sale: rows.filter((r) => discountPercent(r.price, r.compareAt)).length,
      out: rows.filter((r) => r.stockQty <= 0).length,
      hidden: rows.filter((r) => !r.isActive).length,
    }),
    [rows],
  );
  const dirtyRows = rows.filter(isDirty);

  const edit = (r: AdminProductRow, patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [r.id]: { ...draftOf(r), ...patch } }));

  // Lowering the price keeps the old price as the "was" price, unless the admin set the was-price by hand.
  const editPrice = (r: AdminProductRow, value: string) => {
    const d = draftOf(r);
    const n = num(value);
    if (d.wasTouched || n === null || !Number.isFinite(n)) return edit(r, { price: value });
    const next = changePrice({ price: r.price, compareAt: r.compareAt }, n);
    edit(r, { price: value, compareAt: next.compareAt === null ? "" : String(next.compareAt) });
  };

  const validate = (r: AdminProductRow) => {
    const d = draftOf(r);
    const price = num(d.price);
    const compareAt = num(d.compareAt);
    const stock = num(d.stockQty);
    if (price === null || !Number.isFinite(price) || price < 0) return `${r.sku}: enter a valid price`;
    if (compareAt !== null && (!Number.isFinite(compareAt) || compareAt < 0)) return `${r.sku}: enter a valid was-price, or leave it empty`;
    if (stock === null || !Number.isInteger(stock) || stock < 0) return `${r.sku}: stock must be a whole number`;
    return { id: r.id, price, compareAt, stockQty: stock, isActive: d.isActive };
  };

  const save = () => {
    const edits = dirtyRows.map(validate);
    const problem = edits.find((e) => typeof e === "string");
    if (problem) return void toast.error(problem as string);
    const valid = edits as Exclude<(typeof edits)[number], string>[];
    startTransition(async () => {
      const r = await saveProducts(valid);
      if (!r.ok) return void toast.error(r.error);
      const byId = new Map(valid.map((v) => [v.id, v]));
      setRows((all) =>
        all.map((row) => {
          const v = byId.get(row.id);
          if (!v) return row;
          return {
            ...row,
            price: v.price,
            compareAt: v.compareAt !== null && v.compareAt > v.price ? v.compareAt : null,
            stockQty: v.stockQty,
            isActive: v.isActive,
          };
        }),
      );
      setDrafts({});
      toast.success(`Saved ${r.saved} product${r.saved === 1 ? "" : "s"}. The shop is updated.`);
    });
  };

  const bulk = (end: boolean) => {
    const ids = [...selected];
    const p = Number(percent);
    if (!end && !(Number.isInteger(p) && p >= 1 && p <= 90)) return void toast.error("Enter a whole percentage from 1 to 90.");
    startTransition(async () => {
      const r = await bulkSale({ ids, percent: end ? undefined : p, end });
      if (!r.ok) return void toast.error(r.error);
      toast.success(end ? `Ended the sale on ${r.saved} products.` : `${r.saved} products are now ${p}% off.`);
      setSelected(new Set());
      window.location.reload();
    });
  };

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, SKU or brand"
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
        {(Object.keys(STATUS) as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm",
              status === s ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {STATUS[s]} <span className="num opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cell/40 bg-cell/5 p-3 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-muted-foreground">Put on sale at</span>
          <div className="relative">
            <Input
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              inputMode="numeric"
              className="h-8 w-20 pr-7"
              aria-label="Percentage off"
            />
            <Percent className="absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          </div>
          <span className="text-muted-foreground">off</span>
          <Button size="sm" onClick={() => bulk(false)} disabled={pending}>
            Apply discount
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk(true)} disabled={pending}>
            <RotateCcw /> End sale
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-10 p-3">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(c) => setSelected(c === true ? new Set([...selected, ...visible.map((r) => r.id)]) : new Set())}
                  aria-label="Select all shown"
                />
              </th>
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">Price (R)</th>
              <th className="p-3 font-medium">Was (R)</th>
              <th className="p-3 font-medium">Discount</th>
              <th className="p-3 font-medium">Stock</th>
              <th className="p-3 font-medium">In shop</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.slice(0, 300).map((r) => {
              const d = draftOf(r);
              const pct = discountPercent(num(d.price) ?? r.price, num(d.compareAt));
              const dirty = isDirty(r);
              return (
                <tr key={r.id} className={cn(dirty && "bg-sun/10", !d.isActive && "opacity-60")}>
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={(c) =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (c === true) n.add(r.id);
                          else n.delete(r.id);
                          return n;
                        })
                      }
                      aria-label={`Select ${r.sku}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border bg-white">
                        {r.thumb && <Image src={r.thumb} alt="" fill sizes="44px" className="object-contain p-0.5" />}
                      </span>
                      <span className="min-w-0">
                        <a href={r.url} target="_blank" rel="noopener" className="line-clamp-1 max-w-md font-medium hover:underline">
                          {r.name} <ExternalLink className="inline size-3 text-muted-foreground" aria-hidden="true" />
                        </a>
                        <span className="block font-mono text-xs text-muted-foreground">{r.sku}</span>
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      value={d.price}
                      onChange={(e) => editPrice(r, e.target.value)}
                      inputMode="decimal"
                      className="h-9 w-28 text-right"
                      aria-label={`Price, ${r.sku}`}
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      value={d.compareAt}
                      onChange={(e) => edit(r, { compareAt: e.target.value, wasTouched: true })}
                      inputMode="decimal"
                      placeholder="None"
                      className="h-9 w-28 text-right"
                      aria-label={`Was price, ${r.sku}`}
                    />
                  </td>
                  <td className="p-3">
                    {pct ? (
                      <span className="rounded-md bg-destructive px-2 py-1 text-xs font-semibold text-white">-{pct}%</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Input
                      value={d.stockQty}
                      onChange={(e) => edit(r, { stockQty: e.target.value })}
                      inputMode="numeric"
                      className="h-9 w-20 text-right"
                      aria-label={`Stock, ${r.sku}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={d.isActive} onCheckedChange={(c) => edit(r, { isActive: c })} aria-label={`Show ${r.sku} in the shop`} />
                      {dirty && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() =>
                            setDrafts((all) => {
                              const next = { ...all };
                              delete next[r.id];
                              return next;
                            })
                          }
                          aria-label={`Undo changes to ${r.sku}`}
                        >
                          <Undo2 />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">No products match. Clear the search or choose another filter.</p>
        )}
      </div>

      {dirtyRows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-sm">
              <span className="font-semibold">{dirtyRows.length}</span> unsaved change{dirtyRows.length === 1 ? "" : "s"}
              {dirtyRows.length <= 3 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({dirtyRows.map((r) => `${r.sku}: ${formatRand(num(draftOf(r).price) ?? r.price)}`).join(", ")})
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDrafts({})} disabled={pending}>
                Discard
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />} Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
