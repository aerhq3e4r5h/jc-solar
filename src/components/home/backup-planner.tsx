"use client";

import { Check, Loader2, ShoppingCart, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { estimateSystem } from "@/lib/advisor/sizing";
import { addManyToCart } from "@/lib/cart/actions";
import { cartChanged } from "@/lib/cart/events";
import { APPLIANCES, ESSENTIALS, type ApplianceId } from "@/lib/planner/appliances";
import { matchSystem, type PlannerStock } from "@/lib/planner/match";
import { formatPrice } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

const DEFAULT = ESSENTIALS;

// Formatted by hand: Node and browsers disagree on en-ZA decimals, which breaks hydration.
const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);
const kw = (w: number) => `${oneDecimal(w / 1000)} kW`;
const kwh = (n: number) => `${oneDecimal(n)} kWh`;

export function BackupPlanner({ stock }: { stock: PlannerStock }) {
  const [selected, setSelected] = useState<Set<ApplianceId>>(new Set(DEFAULT));
  const [hours, setHours] = useState(4);
  const [pending, startTransition] = useTransition();

  const plan = useMemo(() => {
    const chosen = APPLIANCES.filter((a) => selected.has(a.id));
    const load = chosen.reduce((n, a) => n + a.watts, 0);
    const surge = Math.max(0, ...chosen.map((a) => ("surge" in a ? a.surge : 0)));
    const average = chosen.reduce((n, a) => n + a.watts * a.share, 0);
    const size = estimateSystem({ simultaneousLoadW: load, surgeLoadW: surge, averageBackupLoadW: average, backupHours: hours });
    const match = load > 0 ? matchSystem(stock, size.inverterKw, size.batteryNominalKwh) : null;
    return { chosen, load, size, match };
  }, [selected, hours, stock]);

  const toggle = (id: ApplianceId) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addAll = () => {
    const m = plan.match;
    if (!m) return;
    startTransition(async () => {
      const r = await addManyToCart(
        m.lines.map((l) => ({ productId: l.item.id, quantity: l.quantity })),
        false,
      );
      if (r.ok) cartChanged();
      else toast.error(r.error);
    });
  };

  const ask = `I want to keep ${plan.chosen.map((a) => a.label.toLowerCase()).join(", ")} running for ${hours} hours during load shedding. What do you recommend?`;

  return (
    <section
      aria-labelledby="planner-heading"
      className="grid gap-x-10 gap-y-6 rounded-xl border bg-card p-5 text-card-foreground sm:p-8 lg:grid-cols-[1.3fr_1fr]"
    >
      <div>
        <h2 id="planner-heading" className="type-wide text-2xl sm:text-3xl">
          Plan your backup
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Tap what must keep running when the power goes off.</p>

        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" aria-label="Appliances">
          {APPLIANCES.map((a) => {
            const on = selected.has(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(a.id)}
                  title={a.detail ? `${a.detail}, about ${a.watts} W` : `About ${a.watts} W`}
                  className={cn(
                    "relative flex h-full w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    on
                      ? "border-ink bg-ink text-ink-foreground dark:border-foreground dark:bg-foreground dark:text-background"
                      : "bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                >
                  <a.icon className={cn("size-4 shrink-0", on ? "text-sun dark:text-amber-ink" : "")} aria-hidden="true" />
                  <span className={cn("min-w-0 leading-tight", on && "font-semibold")}>{a.label}</span>
                  {on && <Check className="ml-auto size-3.5 shrink-0 text-sun dark:text-amber-ink" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          <label htmlFor="planner-hours" className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Keep it running for</span>
            <span className="num font-display text-lg font-bold">
              {hours} hour{hours === 1 ? "" : "s"}
            </span>
          </label>
          <input
            id="planner-hours"
            type="range"
            min={1}
            max={12}
            step={1}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--ink)] dark:accent-[var(--sun)]"
            aria-describedby="planner-hours-hint"
          />
          <p id="planner-hours-hint" className="flex justify-between text-xs text-muted-foreground">
            <span>1 hour</span>
            <span>12 hours, overnight</span>
          </p>
        </div>
      </div>

      <div className="lg:border-l lg:pl-10">
        {plan.load === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Choose at least one appliance to see the system you need.
          </p>
        ) : (
          <div className="space-y-4" aria-live="polite">
            <dl className="grid grid-cols-3 divide-x divide-ink/15 rounded-lg bg-sun text-center text-ink">
              <div className="px-2 py-3">
                <dt className="text-xs font-medium">Inverter</dt>
                <dd className="num font-display text-xl font-extrabold">{plan.size.inverterKw} kW</dd>
              </div>
              <div className="px-2 py-3">
                <dt className="text-xs font-medium">Battery</dt>
                <dd className="num font-display text-xl font-extrabold">{kwh(plan.size.batteryNominalKwh)}</dd>
              </div>
              <div className="px-2 py-3">
                <dt className="text-xs font-medium">Running at once</dt>
                <dd className="num font-display text-xl font-extrabold">{kw(plan.load)}</dd>
              </div>
            </dl>

            {plan.match ? (
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">{plan.match.kind === "kit" ? "A ready-made kit that covers it" : "Matched from our stock"}</p>
                <ul className="mt-3 space-y-2.5">
                  {plan.match.lines.map((l) => (
                    <li key={l.item.id} className="flex items-center gap-3">
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-white">
                        {l.item.image && <Image src={l.item.image} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <Link href={l.item.url} className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug hover:underline">
                        <span className="num font-semibold">{l.quantity} x</span> {l.item.name}
                      </Link>
                      <span className="num shrink-0 text-sm">{formatPrice(l.item.price * l.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p>
                    <span className="num font-display text-2xl font-extrabold">{formatPrice(plan.match.total)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {plan.match.bus ? `Both ${plan.match.bus === "HV" ? "high-voltage" : `${plan.match.bus} V`}, so they work together. ` : ""}Incl.
                      VAT, before delivery.
                    </span>
                  </p>
                  <Button onClick={addAll} disabled={pending} className="h-11">
                    {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />} Add system to cart
                  </Button>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border p-4 text-sm">
                That&apos;s more than our ready-made systems cover. The Solar Advisor can put together a larger or three-phase system for you.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <Link
                href={`/advisor?ask=${encodeURIComponent(ask)}`}
                className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4"
              >
                <Sparkles className="size-4 text-amber-ink" aria-hidden="true" /> Refine this with the Solar Advisor
              </Link>
              <span className="text-xs text-muted-foreground">Estimate: our technician confirms the design.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
