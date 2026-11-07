"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AnimatedCount } from "@/components/shop/results-controls";
import { Button } from "@/components/ui/button";
import { addManyToCart } from "@/lib/cart/actions";
import { cartChanged } from "@/lib/cart/events";
import { flyToCart } from "@/lib/cart/fly";
import type { BuilderData } from "@/lib/planner/builder-data";
import { formatPrice } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

const COLS = 6;
const ROWS = 5;

/**
 * "Build your system": drag the panel count and watch them tile onto the
 * roof; the inverter and battery lists only offer what works with them.
 */
export function SystemBuilder({ data }: { data: BuilderData }) {
  const reduce = useReducedMotion();
  const [panelId, setPanelId] = useState(data.panels[0]?.id ?? "");
  const panel = data.panels.find((p) => p.id === panelId) ?? data.panels[0];
  // The most panels any inverter in stock can take with this panel.
  const maxCount = useMemo(() => Math.max(1, ...data.inverters.flatMap((i) => i.counts[panel?.id ?? ""] ?? [])), [data.inverters, panel]);
  const [count, setCount] = useState(Math.min(10, maxCount));
  const n = Math.min(count, maxCount);

  const fitting = data.inverters.filter((i) => i.counts[panel?.id ?? ""]?.includes(n));
  const [inverterId, setInverterId] = useState<string | null>(null);
  const inverter = fitting.find((i) => i.id === inverterId) ?? fitting[0] ?? null;
  const batteries = data.batteries.filter((b) => inverter?.batteryIds.includes(b.id));
  const [batteryId, setBatteryId] = useState<string | "none" | null>(null);
  const battery = batteryId === "none" ? null : (batteries.find((b) => b.id === batteryId) ?? batteries[0] ?? null);

  const kwp = panel ? (panel.watts * n) / 1000 : 0;
  const total = (panel?.price ?? 0) * n + (inverter?.price ?? 0) + (battery?.price ?? 0);
  const [pending, startTransition] = useTransition();

  const addAll = (e: React.MouseEvent) => {
    if (!panel || !inverter) return;
    const from = (e.currentTarget.closest("[data-builder]") as HTMLElement | null)?.querySelector("[data-roof]");
    startTransition(async () => {
      const r = await addManyToCart(
        [
          { productId: panel.id, quantity: n },
          { productId: inverter.id, quantity: 1 },
          ...(battery ? [{ productId: battery.id, quantity: 1 }] : []),
        ],
        false,
      );
      if (!r.ok) return void toast.error(r.error);
      await flyToCart(from, inverter.image ?? panel.image);
      cartChanged();
    });
  };

  if (!panel || data.inverters.length === 0) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">The builder needs panels and inverters in stock. Check back soon.</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12" data-builder>
      {/* The roof */}
      <div className="rounded-xl bg-ink p-4 sm:p-8">
        <svg viewBox="0 0 600 400" className="w-full" data-roof role="img" aria-label={`${n} solar panels on a roof, ${kwp.toFixed(2)} kW in total`}>
          <rect y="330" width="600" height="70" fill="#2a2a27" />
          <rect x="70" y="250" width="460" height="80" fill="#e8e6de" />
          {[110, 230, 410].map((x) => (
            <rect key={x} x={x} y="268" width="56" height="44" rx="4" fill="#c9c7bd" />
          ))}
          <rect x="300" y="276" width="44" height="54" rx="3" fill="#6b4e3d" />
          <path d="M40 255 L130 40 L470 40 L560 255 Z" fill="#3b3a36" />
          {/* Panel slots, filled up to the chosen count */}
          {Array.from({ length: COLS * ROWS }).map((_, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            // Bottom row first; each row stays inside the roof's sloping edges (40,255)-(130,40).
            const y = 216 - row * 38;
            const inset = ((255 - y) * 90) / 215 + 14;
            const left = 40 + inset;
            const rowWidth = 520 - inset * 2;
            const w = rowWidth / COLS - 6;
            const x = left + col * (rowWidth / COLS);
            const on = i < n;
            return (
              <motion.rect
                key={i}
                x={x}
                y={y}
                width={w}
                height={30}
                rx={2}
                initial={false}
                animate={{ opacity: on ? 1 : 0.14, scale: on ? 1 : 0.92 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 26, delay: on ? (i % COLS) * 0.015 : 0 }}
                style={{ transformOrigin: `${x + w / 2}px ${y + 15}px`, transformBox: "view-box" }}
                fill={on ? "#1b1b19" : "#77756e"}
                stroke={on ? "#ffc414" : "#8d8b83"}
                strokeWidth={on ? 1.5 : 1}
              />
            );
          })}
        </svg>
        <p className="mt-3 text-center text-sm text-white/70">
          <span className="num font-bold text-white">{n}</span> x {panel.watts} W = <span className="num font-bold text-sun">{kwp.toFixed(2)} kW</span> of panels
        </p>
      </div>

      {/* The choices */}
      <div className="space-y-6">
        <div>
          <label htmlFor="builder-count" className="flex items-baseline justify-between">
            <span className="font-semibold">How many panels</span>
            <span className="num type-wide text-2xl">{n}</span>
          </label>
          <input
            id="builder-count"
            type="range"
            min={1}
            max={maxCount}
            value={n}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--ink)] dark:accent-[var(--sun)]"
          />
          <p className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>{maxCount}, the most our inverters take</span>
          </p>
        </div>

        <Choice
          legend="Panel"
          options={data.panels.map((p) => ({ id: p.id, name: p.name, image: p.image, detail: `${formatPrice(p.price)} each` }))}
          value={panel.id}
          onChange={(id) => setPanelId(id)}
        />
        <Choice
          legend="Inverter"
          hint={fitting.length ? "Only inverters that take this many panels on their strings." : `No inverter in stock takes ${n} of these panels. Try fewer.`}
          options={fitting.slice(0, 5).map((i) => ({ id: i.id, name: i.name, image: i.image, detail: `${i.kw} kW, ${formatPrice(i.price)}` }))}
          value={inverter?.id ?? ""}
          onChange={(id) => setInverterId(id)}
        />
        <Choice
          legend="Battery"
          hint={inverter && !batteries.length ? "No battery in stock suits this inverter yet." : "Only batteries that work with the inverter above."}
          options={[
            ...batteries.slice(0, 5).map((b) => ({ id: b.id, name: b.name, image: b.image, detail: `${b.kwh} kWh, ${formatPrice(b.price)}` })),
            { id: "none", name: "No battery for now", image: null, detail: "Add one later" },
          ]}
          value={battery?.id ?? "none"}
          onChange={(id) => setBatteryId(id)}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-sun p-5 text-ink">
          <p>
            <span className="text-sm font-semibold">Equipment total, incl. VAT</span>
            <span className="type-wide block text-3xl">
              R<AnimatedCount value={Math.round(total)} />
            </span>
            <span className="text-xs">Installation and delivery are quoted separately.</span>
          </p>
          <Button variant="secondary" size="lg" className="h-12" onClick={addAll} disabled={pending || !inverter}>
            {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />} Add system to cart
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Checked against our compatibility rules for string voltage, solar input and battery voltage. Our technician confirms the design before it&apos;s
          installed.{" "}
          {inverter && (
            <Link href={inverter.url} className="underline underline-offset-4">
              See the inverter
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}

function Choice({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: { id: string; name: string; image: string | null; detail: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-semibold">{legend}</legend>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      <div className="space-y-2">
        {options.map((o) => {
          const on = o.id === value;
          return (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors",
                on ? "border-ink ring-1 ring-ink dark:border-foreground dark:ring-foreground" : "hover:border-foreground/40",
              )}
            >
              <input type="radio" name={legend} value={o.id} checked={on} onChange={() => onChange(o.id)} className="sr-only" />
              <span className="relative size-11 shrink-0 overflow-hidden rounded-md border bg-white">
                {o.image && <Image src={o.image} alt="" fill sizes="44px" className="object-contain" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-semibold">{o.name}</span>
                <span className="num block text-xs text-muted-foreground">{o.detail}</span>
              </span>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", on ? "border-ink dark:border-foreground" : "border-foreground/25")}>
                {on && <span className="size-2.5 rounded-full bg-ink dark:bg-foreground" />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
