"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// The three kinds of inverter as one switchable diagram. The point it makes:
// flip the grid off and see which homes keep their lights on.

type Kind = "hybrid" | "offgrid" | "gridtie";

const KINDS: { id: Kind; label: string; oneLine: string }[] = [
  { id: "hybrid", label: "Hybrid", oneLine: "Solar, battery and grid working together" },
  { id: "offgrid", label: "Off-grid", oneLine: "Solar and battery, nothing fed back" },
  { id: "gridtie", label: "Grid-tied", oneLine: "Solar straight into the house, no battery" },
];

const CAPTION: Record<Kind, { on: string; off: string }> = {
  hybrid: {
    on: "Solar runs the house and charges the battery. The grid fills any gap, and where your municipality allows it, spare power can be fed back.",
    off: "The inverter switches to the battery in a blink, and solar keeps topping it up. The backed-up circuits never notice.",
  },
  offgrid: {
    on: "The house runs from solar and the battery. Despite the name, most can use the grid or a generator as a top-up; they just never feed power back.",
    off: "Nothing changes. It never depended on the grid in the first place.",
  },
  gridtie: {
    on: "Solar feeds the house first and cuts your bill. There is no battery, so it is the cheapest way to save, and it only works while the grid is on.",
    off: "It shuts down, by law, so it can't make power lines live while people repair them. Panels on the roof, but no lights.",
  },
};

export function InverterTypes() {
  const [kind, setKind] = useState<Kind>("hybrid");
  const [gridOn, setGridOn] = useState(true);
  const hasBattery = kind !== "gridtie";
  const running = kind !== "gridtie" || gridOn;
  // Which wires carry power, and which way.
  const solar = running;
  const gridIn = gridOn && kind !== "gridtie";
  const gridOut = gridOn && kind === "gridtie";
  const charging = hasBattery && gridOn;
  const discharging = hasBattery && !gridOn;

  const node = (on: boolean) =>
    cn("transition-[fill,stroke,opacity] duration-500", on ? "fill-[#f6f5f1] stroke-[#b9b6ab]" : "fill-[#2c2c29] stroke-[#55534d]");
  const text = (on: boolean) => cn("text-[13px] font-semibold transition-[fill] duration-500", on ? "fill-[#1e1e1c]" : "fill-[#8d8b83]");
  const wire = "fill-none stroke-[#55534d]";

  return (
    <div className="dark grain relative isolate overflow-hidden rounded-2xl bg-ink text-ink-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
        <div role="tablist" aria-label="Kind of inverter" className="inline-flex rounded-full border border-white/15 p-1">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={kind === k.id}
              onClick={() => setKind(k.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors sm:px-4",
                kind === k.id ? "bg-sun text-ink" : "text-white/70 hover:text-white",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!gridOn}
          onClick={() => setGridOn(!gridOn)}
          className={cn(
            "inline-flex items-center gap-3 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
            gridOn ? "border-white/25 text-white hover:border-white" : "border-sale bg-sale text-white",
          )}
        >
          <span className={cn("relative h-5 w-9 rounded-full transition-colors", gridOn ? "bg-white/25" : "bg-white/40")}>
            <span
              className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-[left] duration-300", gridOn ? "left-0.5" : "left-[1.125rem]")}
            />
          </span>
          {gridOn ? "Switch the grid off" : "Load shedding: grid is off"}
        </button>
      </div>

      <svg
        viewBox="0 0 640 310"
        className="block w-full"
        role="img"
        aria-label={`${KINDS.find((k) => k.id === kind)!.label} inverter, grid ${gridOn ? "on" : "off"}: the home's lights are ${running ? "on" : "off"}`}
      >
        {/* wires (always drawn, dim) */}
        <path className={wire} strokeWidth="2" d="M160 70 C 240 70 240 132 262 140" />
        <path className={wire} strokeWidth="2" strokeDasharray={kind === "offgrid" ? "5 5" : undefined} d="M160 236 C 240 236 240 170 262 160" />
        <path className={wire} strokeWidth="2" d="M378 150 H482" />
        {hasBattery && <path className={wire} strokeWidth="2" d="M320 184 V238" />}

        {/* power on the move */}
        {solar && <path className="builder-flow fill-none stroke-sun" strokeWidth="3.5" strokeLinecap="round" d="M160 70 C 240 70 240 132 262 140" />}
        {gridIn && (
          <path
            className="builder-flow fill-none stroke-white/60"
            strokeWidth="3"
            strokeLinecap="round"
            d="M160 236 C 240 236 240 170 262 160"
            opacity={kind === "offgrid" ? 0.5 : 1}
          />
        )}
        {gridOut && (
          <path
            className="builder-flow fill-none stroke-sun"
            strokeWidth="3"
            strokeLinecap="round"
            d="M262 160 C 240 170 240 236 160 236"
            opacity="0.7"
          />
        )}
        {charging && (
          <path className="builder-flow fill-none stroke-[oklch(0.75_0.17_150)]" strokeWidth="3.5" strokeLinecap="round" d="M320 184 V238" />
        )}
        {discharging && (
          <path className="builder-flow fill-none stroke-[oklch(0.75_0.17_150)]" strokeWidth="3.5" strokeLinecap="round" d="M320 238 V184" />
        )}
        {running && <path className="builder-flow fill-none stroke-sun" strokeWidth="3.5" strokeLinecap="round" d="M378 150 H482" />}

        {/* panels */}
        <rect x="40" y="40" width="120" height="60" rx="10" strokeWidth="1.5" className={node(true)} />
        <text x="100" y="75" textAnchor="middle" className={text(true)}>
          Solar panels
        </text>
        {/* grid */}
        <rect x="40" y="206" width="120" height="60" rx="10" strokeWidth="1.5" className={node(gridOn)} />
        <text x="100" y={kind === "offgrid" ? 233 : 241} textAnchor="middle" className={text(gridOn)}>
          {gridOn ? "Grid" : "Grid: off"}
        </text>
        {kind === "offgrid" && (
          <text
            x="100"
            y="250"
            textAnchor="middle"
            className={cn("text-[10.5px] transition-[fill] duration-500", gridOn ? "fill-[#55534d]" : "fill-[#77756e]")}
          >
            optional top-up
          </text>
        )}
        {/* inverter */}
        <rect x="262" y="116" width="116" height="68" rx="12" strokeWidth="1.5" className={node(running)} />
        <text x="320" y="147" textAnchor="middle" className={text(running)}>
          Inverter
        </text>
        <text
          x="320"
          y="165"
          textAnchor="middle"
          className={cn("text-[10.5px] transition-[fill] duration-500", running ? "fill-[#55534d]" : "fill-[#8d8b83]")}
        >
          {running ? KINDS.find((k) => k.id === kind)!.label.toLowerCase() : "shut down"}
        </text>
        {/* battery */}
        <rect
          x="262"
          y="238"
          width="116"
          height="52"
          rx="10"
          strokeWidth="1.5"
          strokeDasharray={hasBattery ? undefined : "5 5"}
          className={node(hasBattery)}
        />
        <text x="320" y="269" textAnchor="middle" className={text(hasBattery)}>
          {hasBattery ? (discharging ? "Battery: in use" : "Battery: charging") : "No battery"}
        </text>
        {/* home */}
        <path d="M472 122 L541 78 L610 122 Z" className={cn("transition-[fill] duration-500", running ? "fill-[#77756e]" : "fill-[#3b3a36]")} />
        <rect x="482" y="120" width="118" height="70" strokeWidth="1.5" className={node(running)} />
        {[498, 552].map((x) => (
          <rect
            key={x}
            x={x}
            y="134"
            width="32"
            height="26"
            rx="3"
            className={cn("transition-[fill] duration-500", running ? "fill-sun" : "fill-[#1a1a18]")}
          />
        ))}
        <text x="541" y="181" textAnchor="middle" className={text(running)}>
          {running ? "Lights on" : "Lights off"}
        </text>
      </svg>

      <div className="flex items-start gap-3 border-t border-white/10 p-4 sm:p-5" aria-live="polite">
        <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", running ? "bg-charge text-white" : "bg-sale text-white")}>
          {running ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : <X className="size-4" strokeWidth={3} aria-hidden="true" />}
        </span>
        <p className="text-sm leading-relaxed text-white/85">
          <strong className="text-white">{KINDS.find((k) => k.id === kind)!.oneLine}.</strong> {gridOn ? CAPTION[kind].on : CAPTION[kind].off}
        </p>
      </div>
    </div>
  );
}
