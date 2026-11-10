"use client";

import { BatteryCharging, Gauge, Minus, Plus, Sun } from "lucide-react";
import { useState } from "react";
import { AnimatedCount } from "@/components/shop/results-controls";
import { APPLIANCES, ESSENTIALS, loadOf, type ApplianceId } from "@/lib/planner/appliances";
import { formatPrice } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

// Small calculators that turn a spec into an outcome. On a product page they
// are fixed to that product's numbers; in the guides the size is a slider.
// Every figure is an estimate and says so.

/** Share of a battery's capacity you can use, and what the inverter loses converting it. */
const USABLE = { lithium: 0.9, leadAcid: 0.5 };
const INVERTER_EFFICIENCY = 0.93;
/** kWh a day per kW of panels: a South African average after system losses. */
export const SUN = [
  { id: "low", label: "Less sunny", detail: "coast, shade, winter", hours: 4.2 },
  { id: "avg", label: "Average", detail: "most of the country", hours: 4.8 },
  { id: "high", label: "Very sunny", detail: "Northern Cape, Free State", hours: 5.6 },
] as const;

// Formatted by hand: Node and browsers disagree on en-ZA decimals, which breaks hydration.
const one = (n: number) => String(Math.round(n * 10) / 10);
const power = (w: number) => (w < 1000 ? `${Math.round(w)} W` : `${one(w / 1000)} kW`);

function Tool({
  icon,
  title,
  hint,
  children,
  result,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
  result: React.ReactNode;
}) {
  return (
    // Two columns only where the tool itself is wide (a container query): on a product page it sits in a narrow column.
    <div className="@container rounded-2xl border bg-card p-5 sm:p-7">
      <div className="grid gap-6 @3xl:grid-cols-[1.25fr_1fr] @3xl:gap-10">
        <div className="min-w-0">
          <h3 className="flex items-center gap-3 text-xl font-bold">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun text-ink [&_svg]:size-5">{icon}</span>
            {title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
          <div className="mt-4">{children}</div>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-shelf p-5 sm:p-6" aria-live="polite">
          {result}
        </div>
      </div>
    </div>
  );
}

function Chips({ value, onChange }: { value: Set<ApplianceId>; onChange: (next: Set<ApplianceId>) => void }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Appliances">
      {APPLIANCES.map((a) => {
        const on = value.has(a.id);
        const Icon = a.icon;
        return (
          <li key={a.id}>
            <button
              type="button"
              aria-pressed={on}
              title={a.detail ? `${a.detail}, about ${a.watts} W` : `About ${a.watts} W`}
              onClick={() => {
                const next = new Set(value);
                if (on) next.delete(a.id);
                else next.add(a.id);
                onChange(next);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
                on ? "border-ink bg-ink text-ink-foreground dark:border-sun dark:bg-sun dark:text-ink" : "hover:border-foreground/40",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {a.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-semibold">{label}</span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Fewer: ${label}`}
          className="grid size-9 place-items-center rounded-md border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <output className="num type-wide w-10 text-center text-xl">{value}</output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`More: ${label}`}
          className="grid size-9 place-items-center rounded-md border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </span>
    </div>
  );
}

function Range({
  id,
  label,
  display,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="num type-wide text-lg">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--ink)] dark:accent-[var(--sun)]"
      />
    </div>
  );
}

/** A bar that fills to `pct` of its track, with a mark at 100% when the scale runs past it. */
function Meter({ pct, tone, scale = 100 }: { pct: number; tone: "ok" | "tight" | "over"; scale?: number }) {
  return (
    <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-border" aria-hidden="true">
      <div
        className={cn(
          "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
          tone === "ok" ? "bg-charge" : tone === "tight" ? "bg-sun" : "bg-sale",
        )}
        style={{ width: `${Math.min(100, (pct / scale) * 100)}%` }}
      />
      {scale > 100 && <div className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `${(100 / scale) * 100}%` }} />}
    </div>
  );
}

/**
 * Inverters: what can run at the same time. `kw` fixes the size (a product
 * page); without it the size is a slider (the sizing guide).
 */
export function LoadCheck({ kw: fixedKw }: { kw?: number }) {
  const [sel, setSel] = useState<Set<ApplianceId>>(new Set(ESSENTIALS));
  const [size, setSize] = useState(5);
  const kw = fixedKw ?? size;
  const { peak, surge, chosen } = loadOf(sel);
  const pct = (peak / (kw * 1000)) * 100;
  const tone = pct > 100 ? "over" : pct > 80 ? "tight" : "ok";
  const biggest = [...chosen].sort((a, b) => b.watts - a.watts)[0];
  const starter = [...chosen].filter((a) => "surge" in a).sort((a, b) => ("surge" in b ? b.surge : 0) - ("surge" in a ? a.surge : 0))[0];
  const suggested = Math.max(1, Math.ceil((peak * 1.25) / 1000));

  return (
    <Tool
      icon={<Gauge aria-hidden="true" />}
      title="What can it run at once?"
      hint="Tap everything you'd have on at the same moment. An inverter's size is the most it can supply at once."
      result={
        <>
          <p className="text-sm font-semibold text-muted-foreground">Running together</p>
          <p className="num type-wide mt-1 text-4xl">
            {power(peak)} <span className="text-lg font-semibold text-muted-foreground">of {one(kw)} kW</span>
          </p>
          <Meter pct={pct} tone={tone} scale={125} />
          <p className="mt-4 text-sm leading-relaxed">
            {chosen.length === 0 && "Pick a few appliances to see how they add up."}
            {chosen.length > 0 && tone === "ok" && (
              <>
                <strong className="text-charge">Yes, with room to spare.</strong> That leaves {Math.round(100 - pct)}% in reserve, which keeps the
                inverter cool and gives you space to add more later.
              </>
            )}
            {chosen.length > 0 && tone === "tight" && (
              <>
                <strong>Yes, but it&apos;s close to the limit.</strong> Leave something off while the {biggest.label.toLowerCase()} runs, or go a size
                up for comfort.
              </>
            )}
            {chosen.length > 0 && tone === "over" && (
              <>
                <strong className="text-sale">Not all at once.</strong> That&apos;s more than {one(kw)} kW. Run the {biggest.label.toLowerCase()} on
                its own, or look at a {suggested} kW inverter or bigger.
              </>
            )}
          </p>
          {starter && "surge" in starter && starter.surge > kw * 1000 && (
            <p className="mt-2 text-xs text-muted-foreground">
              The {starter.label.toLowerCase()} needs about {power(starter.surge)} for a second or two as it starts. That relies on the
              inverter&apos;s surge rating: check its datasheet.
            </p>
          )}
        </>
      }
    >
      <Chips value={sel} onChange={setSel} />
      {fixedKw === undefined && (
        <div className="mt-5">
          <Range
            id="tool-inverter-size"
            label="Inverter size"
            display={`${one(size)} kW`}
            value={size}
            min={1}
            max={16}
            step={0.5}
            onChange={setSize}
          />
          <p className="mt-1 text-xs text-muted-foreground">For what you&apos;ve picked, with 25% headroom: at least {suggested} kW.</p>
        </div>
      )}
    </Tool>
  );
}

/**
 * Batteries: how long the chosen appliances run. `kwh` fixes the capacity
 * of one battery (a product page, with a count stepper); without it the
 * capacity is a slider (the runtime guide).
 */
export function Runtime({ kwh: fixedKwh, lithium = true }: { kwh?: number; lithium?: boolean }) {
  const [sel, setSel] = useState<Set<ApplianceId>>(new Set(ESSENTIALS));
  const [count, setCount] = useState(1);
  const [capacity, setCapacity] = useState(5);
  const total = fixedKwh !== undefined ? fixedKwh * count : capacity;
  const share = lithium ? USABLE.lithium : USABLE.leadAcid;
  const usable = total * share * INVERTER_EFFICIENCY;
  const { average, chosen } = loadOf(sel);
  const hours = average > 0 ? (usable * 1000) / average : 0;
  const tone = hours >= 4 ? "ok" : hours >= 2 ? "tight" : "over";

  return (
    <Tool
      icon={<BatteryCharging aria-hidden="true" />}
      title="How long will it last?"
      hint="Tap what must stay on when the power goes off. Fridges and pumps cycle on and off, so we count their average draw."
      result={
        <>
          <p className="text-sm font-semibold text-muted-foreground">On a full charge</p>
          <p className="num type-wide mt-1 text-4xl">
            {chosen.length === 0 ? (
              "–"
            ) : hours >= 48 ? (
              "2 days or more"
            ) : (
              <>
                about{" "}
                <AnimatedCount
                  value={hours >= 10 ? Math.round(hours) : Math.round(hours * 10)}
                  format={(n) => (hours >= 10 ? String(n) : one(n / 10))}
                />{" "}
                <span className="text-lg font-semibold text-muted-foreground">hours</span>
              </>
            )}
          </p>
          <Meter pct={Math.min(100, (hours / 24) * 100)} tone={tone} />
          <p className="mt-1.5 flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
            <span>0</span>
            <span>6 h</span>
            <span>12 h</span>
            <span>18 h</span>
            <span>24 h</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            {chosen.length === 0
              ? "Pick a few appliances to see how long they run."
              : hours >= 4
                ? "Enough for a long load-shedding slot, with some left over."
                : hours >= 2
                  ? "Enough for a short load-shedding slot. Add a battery, or switch something off, for longer ones."
                  : "That drains it quickly. Heavy appliances like kettles, pumps and aircons are better left for when the power is back."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {one(total)} kWh, of which about {one(usable)} kWh is usable ({Math.round(share * 100)}% depth of discharge, less inverter losses), at an
            average of {power(average)}.
          </p>
        </>
      }
    >
      <Chips value={sel} onChange={setSel} />
      <div className="mt-5">
        {fixedKwh !== undefined ? (
          <Stepper label="How many of this battery" value={count} min={1} max={8} onChange={setCount} />
        ) : (
          <Range
            id="tool-battery-size"
            label="Battery capacity"
            display={`${one(capacity)} kWh`}
            value={capacity}
            min={1}
            max={30}
            step={0.5}
            onChange={setCapacity}
          />
        )}
      </div>
    </Tool>
  );
}

/**
 * Panels: what they make in a day and what that's worth. `watts` fixes the
 * panel (a product page); without it the panel size is a slider.
 */
export function PanelYield({ watts: fixedWatts }: { watts?: number }) {
  const [count, setCount] = useState(8);
  const [size, setSize] = useState(550);
  const [sun, setSun] = useState<(typeof SUN)[number]["id"]>("avg");
  const [rate, setRate] = useState(3.5);
  const watts = fixedWatts ?? size;
  const kwp = (count * watts) / 1000;
  const hours = SUN.find((s) => s.id === sun)!.hours;
  const day = kwp * hours;
  const month = day * 30.4;

  return (
    <Tool
      icon={<Sun aria-hidden="true" />}
      title="What will it make?"
      hint="A panel's watts are what it makes in full sun. Over a day that depends on how much sun your roof gets."
      result={
        <>
          <p className="text-sm font-semibold text-muted-foreground">
            {count} x {watts} W = {one(kwp)} kW of panels
          </p>
          <p className="num type-wide mt-1 text-4xl">
            about <AnimatedCount value={Math.round(day * 10)} format={(n) => one(n / 10)} />{" "}
            <span className="text-lg font-semibold text-muted-foreground">kWh a day</span>
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-background p-3">
              <dt className="text-muted-foreground">In a month</dt>
              <dd className="num mt-0.5 text-lg font-bold">
                <AnimatedCount value={Math.round(month)} /> kWh
              </dd>
            </div>
            <div className="rounded-lg bg-sun p-3 text-ink">
              <dt>Worth up to</dt>
              <dd className="num mt-0.5 text-lg font-bold">
                <AnimatedCount value={Math.round((month * rate) / 10) * 10} format={formatPrice} /> a month
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            That&apos;s its value if you use every unit. Without a battery, power you don&apos;t use as it&apos;s made is lost, so real savings are
            lower.
          </p>
        </>
      }
    >
      <div className="space-y-5">
        <Stepper label="How many panels" value={count} min={1} max={40} onChange={setCount} />
        {fixedWatts === undefined && (
          <Range id="tool-panel-size" label="Panel size" display={`${size} W`} value={size} min={100} max={700} step={5} onChange={setSize} />
        )}
        <fieldset>
          <legend className="font-semibold">Sun where you live</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SUN.map((s) => (
              <label
                key={s.id}
                className={cn(
                  "cursor-pointer rounded-lg border p-2.5 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  sun === s.id ? "border-ink bg-ink text-ink-foreground dark:border-sun dark:bg-sun dark:text-ink" : "hover:border-foreground/40",
                )}
              >
                <input type="radio" name="tool-sun" className="sr-only" checked={sun === s.id} onChange={() => setSun(s.id)} />
                <span className="block font-semibold">{s.label}</span>
                <span className="block text-[11px] opacity-75">{s.detail}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Range
          id="tool-rate"
          label="What you pay per kWh"
          display={`R${rate.toFixed(2)}`}
          value={rate}
          min={1.5}
          max={7}
          step={0.05}
          onChange={setRate}
        />
      </div>
    </Tool>
  );
}

/** The guide's question the other way round: from a bill to a number of panels. */
export function PanelsNeeded() {
  const [bill, setBill] = useState(2500);
  const [rate, setRate] = useState(3.5);
  const [size, setSize] = useState(550);
  const [battery, setBattery] = useState(false);
  // Solar replaces what you use while the sun is up; a battery stretches that into the evening.
  const share = battery ? 0.85 : 0.45;
  const used = bill / rate;
  const kw = (used * share) / (4.8 * 30.4);
  const panels = Math.max(1, Math.ceil((kw * 1000) / size));
  const area = panels * (size >= 500 ? 2.6 : size >= 400 ? 2.0 : 1.7);

  return (
    <Tool
      icon={<Sun aria-hidden="true" />}
      title="How many panels for my bill?"
      hint="From your monthly bill to a number of panels, at the South African average of 4.8 kWh a day per kW of panels."
      result={
        <>
          <p className="text-sm font-semibold text-muted-foreground">To cover {Math.round(share * 100)}% of your use</p>
          <p className="num type-wide mt-1 text-4xl">
            about <AnimatedCount value={panels} /> <span className="text-lg font-semibold text-muted-foreground">panels</span>
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-background p-3">
              <dt className="text-muted-foreground">Panel power</dt>
              <dd className="num mt-0.5 text-lg font-bold">{one((panels * size) / 1000)} kW</dd>
            </div>
            <div className="rounded-lg bg-background p-3">
              <dt className="text-muted-foreground">Roof space</dt>
              <dd className="num mt-0.5 text-lg font-bold">about {Math.round(area)} m²</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            You use about {Math.round(used)} kWh a month.{" "}
            {battery ? "With a battery, solar can cover most of it." : "Without a battery, solar covers what you use while the sun is up."} Shade,
            roof direction and your inverter&apos;s limits change the answer: our technician confirms the design.
          </p>
        </>
      }
    >
      <div className="space-y-5">
        <Range
          id="tool-bill"
          label="Your monthly electricity bill"
          display={formatPrice(bill)}
          value={bill}
          min={300}
          max={12000}
          step={100}
          onChange={setBill}
        />
        <Range
          id="tool-bill-rate"
          label="What you pay per kWh"
          display={`R${rate.toFixed(2)}`}
          value={rate}
          min={1.5}
          max={7}
          step={0.05}
          onChange={setRate}
        />
        <Range id="tool-bill-panel" label="Panel size" display={`${size} W`} value={size} min={300} max={700} step={5} onChange={setSize} />
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            checked={battery}
            onChange={(e) => setBattery(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--ink)] dark:accent-[var(--sun)]"
          />
          <span>
            <span className="block font-semibold">I&apos;ll add a battery</span>
            <span className="block text-muted-foreground">Stores daytime sun for the evening, so solar covers more of your use.</span>
          </span>
        </label>
      </div>
    </Tool>
  );
}
