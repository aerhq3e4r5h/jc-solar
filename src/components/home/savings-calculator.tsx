"use client";

import { useId, useState } from "react";
import { SeasonChart } from "@/components/tools/season-chart";
import { useProvince } from "@/components/tools/use-province";
import { PROVINCES } from "@/lib/checkout/schema";
import { formatPrice } from "@/lib/pricing/vat";
import { isProvince, monthlyOutput, SOLAR_SHARE, solarYear, usefulPerYear } from "@/lib/solar/seasons";
import { cn } from "@/lib/utils";

// Rough, clearly labelled estimates. Shown to the visitor as the assumptions.
// What panels make comes month by month for the visitor's province
// (src/lib/solar/seasons.ts), and the suggested size covers the weakest month.
const DAYS = 30.4;
// How much of a home's electricity solar can replace: only what's used while the sun is up,
// unless a battery stores the rest for the evening.
const SHARE_NO_BATTERY = SOLAR_SHARE.withoutBattery;
const SHARE_WITH_BATTERY = SOLAR_SHARE.withBattery;

export type CalculatorPrices = {
  /** Cheapest in-stock mainstream panel, per watt, incl. VAT. */
  panelPerWatt: number;
  /** In-stock hybrid inverters by size, cheapest per size, incl. VAT. */
  inverters: { kw: number; price: number }[];
  /** Cheapest in-stock 48 V battery of about 5 kWh, incl. VAT (null when none). */
  battery: { kwh: number; price: number } | null;
};

/** Equipment for a system of `kw` of panels: the panels plus the smallest inverter that covers them. */
function equipmentPrice(kw: number, prices: CalculatorPrices) {
  const inverter = prices.inverters.find((i) => i.kw >= kw * 0.8) ?? prices.inverters.at(-1);
  return kw * 1000 * prices.panelPerWatt + (inverter?.price ?? 0);
}

/**
 * Solar savings estimate: your bill and rate in, the monthly cost before and
 * after (two labelled bars), the saving and the equipment payback out.
 */
export function SavingsCalculator({ prices }: { prices: CalculatorPrices }) {
  const id = useId();
  const [bill, setBill] = useState(2500);
  const [rate, setRate] = useState(3.5);
  const [withBattery, setWithBattery] = useState(false);
  const [install, setInstall] = useState("");
  const [province, setProvince] = useProvince();
  const year = solarYear(province);
  const share = withBattery && prices.battery ? SHARE_WITH_BATTERY : SHARE_NO_BATTERY;
  const usedKwh = bill / rate;
  // What solar is asked to supply each day, and the size (to the next half kW) that still does it in the weakest month.
  const need = (usedKwh / DAYS) * share;
  const suggested = Math.min(20, Math.max(1, Math.ceil((need / year.weakest.yield) * 2 - 1e-9) / 2));
  const [kw, setKw] = useState<number | null>(null);
  const size = kw ?? suggested;

  // Solar only replaces what you'd use while it's working (or, with a battery, most of the evening too):
  // month by month, a surplus isn't counted and a shortfall is.
  const saving = (usefulPerYear(province, size, need) / 12) * rate;
  const after = Math.max(0, bill - saving);
  const equipment = equipmentPrice(size, prices) + (withBattery && prices.battery ? prices.battery.price : 0);
  const installation = Number(install.replace(/[^\d.]/g, "")) || 0;
  const payback = saving > 0 ? (equipment + installation) / (saving * 12) : null;
  const [hover, setHover] = useState<"now" | "after" | null>(null);

  const bars = [
    { key: "now" as const, label: "Today", value: bill, fill: "var(--foreground)" },
    { key: "after" as const, label: "With solar", value: after, fill: "var(--sun)" },
  ];
  const max = Math.max(1, bill);

  return (
    <div className="grid gap-8 rounded-xl border bg-card p-5 sm:p-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
      <div className="space-y-6">
        <div>
          <label htmlFor={`${id}-province`} className="font-semibold">
            Where is the roof?
          </label>
          <select
            id={`${id}-province`}
            value={province}
            onChange={(e) => isProvince(e.target.value) && setProvince(e.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
          >
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <Slider
          id={`${id}-bill`}
          label="Your monthly electricity bill"
          value={bill}
          min={300}
          max={12000}
          step={100}
          display={formatPrice(bill)}
          onChange={setBill}
        />
        <Slider
          id={`${id}-rate`}
          label="What you pay per kWh"
          hint="It's on your bill. Most homes pay between R3 and R4."
          value={rate}
          min={1.5}
          max={7}
          step={0.05}
          display={`R${rate.toFixed(2)}`}
          onChange={setRate}
        />
        <Slider
          id={`${id}-kw`}
          label="Solar panels"
          hint={
            kw === null
              ? `Sized for ${year.weakest.name}, the weakest month for sun in ${province}, so it covers you all year. Drag to try another size.`
              : undefined
          }
          value={size}
          min={1}
          max={20}
          step={0.5}
          display={`${size} kW`}
          onChange={(v) => setKw(v)}
        />
        {prices.battery && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={withBattery}
              onChange={(e) => setWithBattery(e.target.checked)}
              className="mt-1 size-4 accent-[var(--ink)]"
            />
            <span>
              <span className="block font-semibold">Add a {prices.battery.kwh} kWh battery</span>
              <span className="block text-sm text-muted-foreground">
                Stores daytime sun for the evening and keeps you going in load shedding. Adds {formatPrice(prices.battery.price)}.
              </span>
            </span>
          </label>
        )}
        <div>
          <label htmlFor={`${id}-install`} className="font-semibold">
            Installation, from your quote <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id={`${id}-install`}
            inputMode="numeric"
            placeholder="e.g. 18000"
            value={install}
            onChange={(e) => setInstall(e.target.value)}
            className="num mt-2 h-10 w-full rounded-md border border-input bg-transparent px-3"
            aria-describedby={`${id}-install-hint`}
          />
          <p id={`${id}-install-hint`} className="mt-1 text-xs text-muted-foreground">
            Add it for the full payback. Without it, the payback covers the equipment only.
          </p>
        </div>
        {kw !== null && kw !== suggested && (
          <button type="button" onClick={() => setKw(null)} className="-mt-3 text-sm font-semibold underline underline-offset-4">
            Size it for {year.weakest.name} ({suggested} kW)
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {/* Headline numbers */}
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-sun p-4 text-ink">
            <dt className="text-sm font-semibold">You could save about</dt>
            <dd className="num type-wide mt-1 text-3xl">
              {formatPrice(Math.round(saving / 10) * 10)}
              <span className="text-base font-semibold"> a month</span>
            </dd>
          </div>
          <div className="rounded-lg bg-shelf p-4">
            <dt className="text-sm font-semibold">{installation ? "The system pays for itself in" : "The equipment pays for itself in"}</dt>
            <dd className="num type-wide mt-1 text-3xl">{payback === null ? "–" : payback > 25 ? "25+ years" : `${payback.toFixed(1)} years`}</dd>
          </div>
        </dl>

        {/* Monthly cost: today vs with solar (one measure, two labelled bars) */}
        <figure>
          <figcaption className="mb-3 text-sm font-semibold">Monthly electricity cost</figcaption>
          <div className="space-y-3" role="img" aria-label={`Today ${formatPrice(bill)} a month, with solar about ${formatPrice(after)} a month.`}>
            {bars.map((b) => {
              const width = (b.value / max) * 100;
              return (
                <div
                  key={b.key}
                  className="group relative grid grid-cols-[6.5rem_1fr] items-center gap-3 py-1"
                  onPointerEnter={() => setHover(b.key)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(b.key)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                >
                  <span className="text-sm text-muted-foreground">{b.label}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn("h-6 rounded-r-[4px] transition-[width] duration-500 ease-out", hover === b.key && "brightness-110")}
                      style={{ width: `max(2px, calc(${width}% - 6rem))`, background: b.fill }}
                    />
                    <span className="num shrink-0 text-sm font-bold">{formatPrice(Math.round(b.value))}</span>
                  </span>
                  {hover === b.key && (
                    <span
                      role="tooltip"
                      className="absolute -top-9 left-28 z-10 rounded-md bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-ink-foreground shadow-md"
                    >
                      <strong className="num">{formatPrice(Math.round(b.value))}</strong> a month, {b.label.toLowerCase()}
                      {b.key === "after" && bill > 0 && <> ({Math.round((saving / bill) * 100)}% less)</>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* The same numbers as a table, for screen readers */}
          <table className="sr-only">
            <caption>Monthly electricity cost</caption>
            <tbody>
              <tr>
                <th scope="row">Today</th>
                <td>{formatPrice(bill)}</td>
              </tr>
              <tr>
                <th scope="row">With solar</th>
                <td>{formatPrice(Math.round(after))}</td>
              </tr>
            </tbody>
          </table>
        </figure>

        {/* The year: what this size makes each month against what solar is asked to supply */}
        <figure>
          <figcaption className="mb-3 text-sm font-semibold">
            What {size} kW of panels make through the year in {province}
          </figcaption>
          <SeasonChart monthly={monthlyOutput(province, size)} need={need} />
        </figure>

        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer font-semibold text-foreground">How we worked this out</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              What panels make is worked out month by month for {year.city}: each kW makes about {year.weakest.yield} kWh a day in {year.weakest.name}
              , the weakest month, and {year.best.yield} in {year.best.name}, on a north-facing roof at about 20° (PVGIS). The suggested size covers
              the weakest month; shade and roof direction change this.
            </li>
            <li>
              Without a battery, solar replaces only the electricity you use while the sun is up: we assume {Math.round(SHARE_NO_BATTERY * 100)}% of
              your use. With a battery we assume {Math.round(SHARE_WITH_BATTERY * 100)}%. Power you don&apos;t use is lost, since most municipalities
              don&apos;t pay for power sent back.
            </li>
            <li>
              Equipment: {size} kW of panels and a suitable hybrid inverter
              {withBattery && prices.battery ? ` and a ${prices.battery.kwh} kWh battery` : ""} from our current stock (
              {formatPrice(Math.round(equipment))}). Mounting, cabling, installation and delivery are extra.
            </li>
            <li>Tariffs rise every year, which makes the real payback shorter; fixed monthly charges on your bill don&apos;t change.</li>
          </ul>
          <p className="mt-2">This is an estimate, not a quote. Our technician confirms the design and the price.</p>
        </details>
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="num type-wide text-xl">{display}</span>
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
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
