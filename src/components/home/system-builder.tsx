"use client";

import { BatteryCharging, Check, Home, Loader2, Minus, Plus, ShoppingCart, Sun, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AnimatedCount } from "@/components/shop/results-controls";
import { useMotion } from "@/components/motion/use-motion";
import { Button } from "@/components/ui/button";
import { addManyToCart } from "@/lib/cart/actions";
import { cartChanged } from "@/lib/cart/events";
import { flyToCart } from "@/lib/cart/fly";
import { MAX_BATTERIES, type BuilderData, type BuilderInverter } from "@/lib/planner/builder-data";
import { formatPrice } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

const COLS = 6;
const ROWS = 5;
// Rough, labelled estimates for the summary.
const SUN_HOURS = 4.8; // kWh a day per kW of panels, a South African average
const ESSENTIALS_KW = 0.5; // lights, Wi-Fi, TV, fridge and a laptop
const USABLE = 0.9; // share of a lithium battery's capacity you can use

const PRESETS = [
  { id: "backup", label: "Load-shedding backup", panels: 6, batteries: 1 },
  { id: "family", label: "Family home", panels: 12, batteries: 2 },
  { id: "large", label: "Big home, work from home", panels: 20, batteries: 3 },
] as const;

/**
 * "Build your system": pick panels and how many, an inverter that takes them,
 * and one or more batteries that suit the inverter. The house shows what
 * you've chosen; the summary adds it up and puts it all in the cart.
 */
export function SystemBuilder({ data }: { data: BuilderData }) {
  const [panelId, setPanelId] = useState(data.panels[0]?.id ?? "");
  const panel = data.panels.find((p) => p.id === panelId) ?? data.panels[0];
  // The most panels any inverter in stock can take with this panel (and that we have).
  const inverterMax = useMemo(() => Math.max(1, ...data.inverters.flatMap((i) => i.counts[panel?.id ?? ""] ?? [])), [data.inverters, panel]);
  const maxCount = Math.max(1, Math.min(panel?.stock ?? 1, inverterMax));
  const [count, setCount] = useState(Math.min(10, maxCount));
  const n = Math.max(1, Math.min(count, maxCount));

  const fitting = data.inverters.filter((i) => i.counts[panel?.id ?? ""]?.includes(n));
  const [inverterId, setInverterId] = useState<string | null>(null);
  const inverter = fitting.find((i) => i.id === inverterId) ?? fitting[0] ?? null;

  const batteries = data.batteries.filter((b) => inverter?.batteryIds.includes(b.id));
  const [batteryId, setBatteryId] = useState<string | "none" | null>(null);
  const battery = batteryId === "none" ? null : (batteries.find((b) => b.id === batteryId) ?? batteries[0] ?? null);
  const maxBatteries = battery ? Math.max(1, Math.min(MAX_BATTERIES, battery.stock)) : 1;
  const [batteryCount, setBatteryCount] = useState(1);
  const [allBatteries, setAllBatteries] = useState(false);
  const qty = battery ? Math.min(batteryCount, maxBatteries) : 0;

  const kwp = panel ? (panel.watts * n) / 1000 : 0;
  const dailyKwh = kwp * SUN_HOURS;
  const storage = battery ? battery.kwh * qty : 0;
  const backupHours = (storage * USABLE) / ESSENTIALS_KW;
  const lines = [
    panel && { key: "panel", qty: n, name: panel.name, each: panel.price },
    inverter && { key: "inverter", qty: 1, name: inverter.name, each: inverter.price },
    battery && qty > 0 && { key: "battery", qty, name: battery.name, each: battery.price },
  ].filter(Boolean) as { key: string; qty: number; name: string; each: number }[];
  const total = lines.reduce((s, l) => s + l.each * l.qty, 0);

  const [pending, startTransition] = useTransition();
  const [preset, setPreset] = useState<string | null>(null);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setPreset(p.id);
    setCount(Math.min(p.panels, maxCount));
    setInverterId(null);
    setBatteryId(null);
    setBatteryCount(p.batteries);
  };

  const addAll = (e: React.MouseEvent) => {
    if (!panel || !inverter) return;
    const from = (e.currentTarget.closest("[data-builder]") as HTMLElement | null)?.querySelector("[data-roof]");
    startTransition(async () => {
      const r = await addManyToCart(
        [
          { productId: panel.id, quantity: n },
          { productId: inverter.id, quantity: 1 },
          ...(battery && qty > 0 ? [{ productId: battery.id, quantity: qty }] : []),
        ],
        false,
      );
      if (!r.ok) return void toast.error(r.error);
      await flyToCart(from, inverter.image ?? panel.image);
      cartChanged();
      toast.success("Your system is in the cart", { action: { label: "View cart", onClick: () => (window.location.href = "/cart") } });
    });
  };

  if (!panel || data.inverters.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        The builder needs panels and inverters in stock. Check back soon.
      </p>
    );
  }

  return (
    <div data-builder className="pb-24 lg:pb-0">
      {/* Quick starts */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-muted-foreground">Start from</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            aria-pressed={preset === p.id}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              preset === p.id ? "border-sun bg-sun text-ink" : "hover:border-foreground/40 hover:bg-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* The house and what it adds up to */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="dark grain relative isolate overflow-hidden rounded-2xl bg-ink text-ink-foreground ring-1 ring-white/10">
            <Scene n={n} batteries={qty} kwp={kwp} />
            <dl className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
              <Stat icon={<Sun className="size-4 text-sun" />} label="Panels" value={`${kwp.toFixed(2)} kW`} />
              <Stat
                icon={<Zap className="size-4 text-sun" />}
                label="Makes about"
                value={
                  <>
                    <AnimatedCount value={Math.round(dailyKwh)} /> kWh a day
                  </>
                }
              />
              <Stat
                icon={<BatteryCharging className="size-4 text-[oklch(0.75_0.17_150)]" />}
                label="Storage"
                value={storage ? `${storage.toFixed(storage % 1 ? 2 : 0)} kWh` : "None"}
              />
              <Stat
                icon={<Home className="size-4 text-[oklch(0.75_0.17_150)]" />}
                label="Backup for essentials"
                value={
                  storage ? (
                    <>
                      about <AnimatedCount value={Math.round(backupHours)} /> hours
                    </>
                  ) : (
                    "Add a battery"
                  )
                }
              />
            </dl>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Estimates: {SUN_HOURS} kWh a day per kW of panels (a South African average), and essentials (lights, Wi-Fi, TV, fridge, a laptop) drawing
            about {ESSENTIALS_KW * 1000} W from {Math.round(USABLE * 100)}% of the battery.
          </p>
        </div>

        {/* The choices */}
        <ol className="space-y-8">
          <Step n={1} title="Solar panels" done summary={`${n} x ${panel.watts} W`}>
            <Counter
              id="builder-count"
              label="How many panels"
              value={n}
              min={1}
              max={maxCount}
              onChange={(v) => {
                setCount(v);
                setPreset(null);
              }}
              hint={
                maxCount < inverterMax
                  ? `Up to ${maxCount}: that's how many of this panel we have in stock.`
                  : `Up to ${maxCount}, the most our inverters in stock take with this panel.`
              }
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {data.panels.map((p) => (
                <OptionCard
                  key={p.id}
                  group="panel"
                  checked={p.id === panel.id}
                  onSelect={() => setPanelId(p.id)}
                  image={p.image}
                  name={p.name}
                  detail={`${p.watts} W, ${formatPrice(p.price)} each`}
                  badge={p.id === data.panels[0].id ? "Best value per watt" : undefined}
                />
              ))}
            </div>
          </Step>

          <Step n={2} title="Inverter" done={!!inverter} summary={inverter ? `${inverter.kw} kW` : "None fits"}>
            {fitting.length ? (
              <InverterList inverters={fitting} value={inverter?.id ?? ""} onChange={(id) => setInverterId(id)} />
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No inverter in stock takes {n} of these panels. Try fewer panels.
              </p>
            )}
          </Step>

          <Step n={3} title="Batteries" done={!!battery} summary={battery ? `${qty} x ${battery.kwh} kWh` : "None"}>
            {inverter && !batteries.length ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No battery in stock suits this inverter yet. You can add one later.
              </p>
            ) : (
              <>
                <div className="grid gap-2">
                  {(allBatteries ? batteries : batteries.slice(0, 4)).map((b) => (
                    <OptionCard
                      key={b.id}
                      group="battery"
                      checked={battery?.id === b.id}
                      onSelect={() => setBatteryId(b.id)}
                      image={b.image}
                      name={b.name}
                      detail={`${b.kwh} kWh${b.voltage ? `, ${b.voltage} V` : ""}, ${formatPrice(b.price)} each`}
                    />
                  ))}
                  {batteries.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setAllBatteries(!allBatteries)}
                      className="justify-self-start text-sm font-semibold underline underline-offset-4"
                    >
                      {allBatteries ? "Show fewer" : `Show ${batteries.length - 4} more that suit this inverter`}
                    </button>
                  )}
                  <OptionCard
                    group="battery"
                    checked={!battery}
                    onSelect={() => setBatteryId("none")}
                    image={null}
                    name="No battery for now"
                    detail="Panels and inverter only. Add batteries any time."
                  />
                </div>
                <AnimatePresence initial={false}>
                  {battery && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 rounded-xl border bg-shelf p-4">
                        <Counter
                          id="builder-batteries"
                          label="How many batteries"
                          value={qty}
                          min={1}
                          max={maxBatteries}
                          onChange={(v) => {
                            setBatteryCount(v);
                            setPreset(null);
                          }}
                          hint={`${qty} x ${battery.kwh} kWh = ${storage.toFixed(storage % 1 ? 2 : 0)} kWh of storage. More batteries run longer through load shedding and the night.${
                            battery.stock < MAX_BATTERIES ? ` We have ${battery.stock} of this battery in stock.` : ""
                          }`}
                        />
                        <BatteryDots count={qty} max={maxBatteries} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </Step>

          <Step n={4} title="Your system" done={!!inverter} last>
            <div className="overflow-hidden rounded-xl border">
              <ul className="divide-y">
                {lines.map((l) => (
                  <li key={l.key} className="flex items-start justify-between gap-4 p-3 text-sm">
                    <span className="min-w-0">
                      <span className="num font-bold">{l.qty} x</span> <span className="line-clamp-1 inline">{l.name}</span>
                    </span>
                    <span className="num shrink-0 font-semibold">{formatPrice(l.each * l.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-4 bg-sun p-4 text-ink">
                <p>
                  <span className="text-sm font-semibold">Equipment total, incl. VAT</span>
                  <span className="type-wide block text-3xl">
                    <AnimatedCount value={Math.round(total)} format={formatPrice} />
                  </span>
                </p>
                <Button variant="secondary" size="lg" className="h-12" onClick={addAll} disabled={pending || !inverter}>
                  {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />} Add system to cart
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Checked against our rules for string voltage, solar input and battery voltage. Mounting, cabling, installation and delivery are quoted
              separately. Our technician confirms the design, including how many batteries your inverter takes, before it&apos;s installed.{" "}
              {inverter && (
                <Link href={inverter.url} className="underline underline-offset-4">
                  See the inverter
                </Link>
              )}
            </p>
          </Step>
        </ol>
      </div>

      {/* Phones: the total stays in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgb(0_0_0/0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <p className="min-w-0">
            <span className="block text-xs text-muted-foreground">
              {kwp.toFixed(1)} kW{storage ? `, ${storage.toFixed(storage % 1 ? 1 : 0)} kWh` : ""}, incl. VAT
            </span>
            <span className="type-wide block text-xl leading-tight">
              <AnimatedCount value={Math.round(total)} format={formatPrice} />
            </span>
          </p>
          <Button size="lg" className="h-11 shrink-0" onClick={addAll} disabled={pending || !inverter}>
            {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />} Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  summary,
  done,
  last,
  children,
}: {
  n: number;
  title: string;
  summary?: string;
  done?: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[2rem_1fr] gap-x-4">
      {!last && <span aria-hidden="true" className="absolute top-9 bottom-[-2rem] left-[calc(1rem-1px)] w-0.5 bg-border" />}
      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 grid size-8 place-items-center rounded-full text-sm font-bold",
          done ? "bg-sun text-ink" : "border-2 bg-background text-muted-foreground",
        )}
      >
        {done && !last ? <Check className="size-4" strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0">
        <h2 className="flex min-h-8 flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-lg font-bold">{title}</span>
          {summary && <span className="num text-sm font-semibold text-muted-foreground">{summary}</span>}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}

function Counter({
  id,
  label,
  value,
  min,
  max,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  hint?: string;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => set(value - 1)}
            disabled={value <= min}
            aria-label={`One fewer (${label.toLowerCase()})`}
            className="grid size-9 place-items-center rounded-md border transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <output htmlFor={id} className="num type-wide w-12 text-center text-2xl" aria-live="polite">
            {value}
          </output>
          <button
            type="button"
            onClick={() => set(value + 1)}
            disabled={value >= max}
            aria-label={`One more (${label.toLowerCase()})`}
            className="grid size-9 place-items-center rounded-md border transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      {max > min && (
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--ink)] dark:accent-[var(--sun)]"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function OptionCard({
  group,
  checked,
  onSelect,
  image,
  name,
  detail,
  badge,
}: {
  group: string;
  checked: boolean;
  onSelect: () => void;
  image: string | null;
  name: string;
  detail: string;
  badge?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-[border-color,box-shadow,background-color] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        checked ? "border-ink bg-card shadow-sm ring-1 ring-ink dark:border-sun dark:ring-sun" : "hover:border-foreground/40",
      )}
    >
      <input type="radio" name={`builder-${group}`} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white">
        {image ? (
          <Image src={image} alt="" fill sizes="56px" className="object-contain p-0.5" />
        ) : (
          <Minus className="size-5 text-neutral-400" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        {badge && (
          <span className="mb-0.5 inline-block rounded-sm bg-sun px-1.5 py-px text-[10px] font-bold tracking-wide text-ink uppercase">{badge}</span>
        )}
        <span className="line-clamp-2 text-sm leading-snug font-semibold">{name}</span>
        <span className="num block text-xs text-muted-foreground">{detail}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
          checked ? "border-ink bg-ink dark:border-sun dark:bg-sun" : "border-foreground/25",
        )}
      >
        {checked && <Check className="size-3 text-white dark:text-ink" strokeWidth={3.5} />}
      </span>
    </label>
  );
}

function InverterList({ inverters, value, onChange }: { inverters: BuilderInverter[]; value: string; onChange: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? inverters : inverters.slice(0, 4);
  const cheapest = inverters[0]?.id;
  return (
    <div className="grid gap-2">
      {shown.map((i) => (
        <OptionCard
          key={i.id}
          group="inverter"
          checked={i.id === value}
          onSelect={() => onChange(i.id)}
          image={i.image}
          name={i.name}
          detail={`${i.kw} kW, ${formatPrice(i.price)}`}
          badge={i.id === cheapest ? "Best value" : undefined}
        />
      ))}
      {inverters.length > 4 && (
        <button type="button" onClick={() => setAll(!all)} className="justify-self-start text-sm font-semibold underline underline-offset-4">
          {all ? "Show fewer" : `Show ${inverters.length - 4} more that fit`}
        </button>
      )}
    </div>
  );
}

function BatteryDots({ count, max }: { count: number; max: number }) {
  return (
    <div className="mt-3 flex gap-1.5" aria-hidden="true">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={cn("h-2 flex-1 rounded-full transition-colors duration-300", i < count ? "bg-charge" : "bg-border")} />
      ))}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-ink p-3 sm:p-4">
      <dt className="flex items-center gap-1.5 text-xs text-white/60">
        {icon}
        {label}
      </dt>
      <dd className="num mt-1 text-base font-bold text-white sm:text-lg">{value}</dd>
    </div>
  );
}

/** The house: panels tile onto the roof, batteries stack up beside the inverter. */
function Scene({ n, batteries, kwp }: { n: number; batteries: number; kwp: number }) {
  const reduce = useMotion() !== "full";
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 26 };
  return (
    <svg
      viewBox="0 0 640 420"
      className="block w-full"
      data-roof
      role="img"
      aria-label={`${n} solar panels on a roof, ${kwp.toFixed(2)} kW, and ${batteries} batteries`}
    >
      <defs>
        <radialGradient id="sb-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffc414" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc414" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sb-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3c3f" />
          <stop offset="0.45" stopColor="#1d1e20" />
          <stop offset="1" stopColor="#141516" />
        </linearGradient>
        <linearGradient id="sb-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#45433e" />
          <stop offset="1" stopColor="#36352f" />
        </linearGradient>
      </defs>

      {/* Sun */}
      <circle cx="575" cy="62" r="95" fill="url(#sb-sun)" />
      <circle cx="575" cy="62" r="26" fill="#ffc414" />

      {/* Ground */}
      <rect y="372" width="640" height="48" fill="#2a2a27" />
      <rect y="372" width="640" height="3" fill="#3a3934" />

      {/* House */}
      <rect x="62" y="248" width="356" height="124" fill="#e8e6de" />
      {[96, 196, 326].map((x) => (
        <rect key={x} x={x} y="272" width="52" height="42" rx="3" fill="#c9c7bd" />
      ))}
      <rect x="258" y="290" width="40" height="82" rx="3" fill="#6b4e3d" />
      <path d="M30 254 L120 44 L360 44 L450 254 Z" fill="url(#sb-roof)" />
      <path d="M30 254 L450 254" stroke="#2b2a26" strokeWidth="6" />

      {/* Panel slots, filled up to the chosen count */}
      {Array.from({ length: COLS * ROWS }).map((_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        // Bottom row first; each row stays inside the roof's sloping edges (30,254)-(120,44).
        const y = 214 - row * 38;
        const inset = ((254 - y) * 90) / 210 + 14;
        const left = 30 + inset;
        const rowWidth = 420 - inset * 2;
        const w = rowWidth / COLS - 5;
        const x = left + col * (rowWidth / COLS);
        const on = i < n;
        return (
          <motion.g
            key={i}
            initial={false}
            animate={{ opacity: on ? 1 : 0.18, scale: on ? 1 : 0.9 }}
            transition={reduce ? { duration: 0 } : { ...spring, delay: on ? col * 0.015 : 0 }}
            style={{ transformOrigin: `${x + w / 2}px ${y + 15}px`, transformBox: "view-box" }}
          >
            <rect
              x={x}
              y={y}
              width={w}
              height={31}
              rx={2}
              fill={on ? "url(#sb-panel)" : "none"}
              stroke={on ? "#9a988f" : "#77756e"}
              strokeWidth={on ? 1.2 : 1}
              strokeDasharray={on ? undefined : "3 3"}
            />
            {on && (
              <path
                d={`M${x + w / 3} ${y + 1}V${y + 30}M${x + (2 * w) / 3} ${y + 1}V${y + 30}M${x + 1} ${y + 15.5}H${x + w - 1}`}
                stroke="#4a4c50"
                strokeWidth="0.8"
              />
            )}
          </motion.g>
        );
      })}

      {/* Garage wall with the inverter and the battery stack */}
      <rect x="418" y="268" width="196" height="104" fill="#d9d6cc" />
      <rect x="412" y="262" width="208" height="8" rx="2" fill="#3b3a36" />
      {/* inverter */}
      <rect x="432" y="282" width="46" height="62" rx="5" fill="#f6f5f1" stroke="#b9b6ab" />
      <rect x="440" y="292" width="30" height="13" rx="2" fill="#1d1e20" />
      <motion.rect
        x="443"
        y="295"
        width="10"
        height="7"
        rx="1"
        fill="#ffc414"
        animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      {/* batteries: two columns of four, filled bottom-up */}
      {Array.from({ length: MAX_BATTERIES }).map((_, i) => {
        const col = Math.floor(i / 4);
        const row = i % 4;
        const x = 494 + col * 56;
        const y = 348 - row * 24;
        return (
          <AnimatePresence key={i}>
            {i < batteries && (
              <motion.g
                initial={reduce ? false : { opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={spring}
              >
                <rect x={x} y={y} width="50" height="21" rx="3" fill="#f6f5f1" stroke="#b9b6ab" />
                <rect x={x + 6} y={y + 7} width="18" height="7" rx="1.5" fill="#3b3a36" />
                <rect x={x + 7} y={y + 8} width="13" height="5" rx="1" fill="oklch(0.7 0.17 150)" />
              </motion.g>
            )}
          </AnimatePresence>
        );
      })}
      {batteries === 0 && (
        <text x="550" y="330" textAnchor="middle" fontSize="11" fill="#77756e" fontFamily="inherit">
          No battery yet
        </text>
      )}

      {/* Power flow: roof to inverter (and on to the batteries) */}
      <path
        d="M380 150 C470 150 470 230 455 282"
        fill="none"
        stroke="#ffc414"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="builder-flow"
        opacity="0.9"
      />
      {batteries > 0 && (
        <path d="M478 318 H494" fill="none" stroke="oklch(0.75 0.17 150)" strokeWidth="2.5" strokeLinecap="round" className="builder-flow" />
      )}
    </svg>
  );
}
