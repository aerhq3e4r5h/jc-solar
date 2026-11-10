"use client";

import { BatteryMedium, PlugZap, Sun } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { currentMotion } from "@/components/motion/use-motion";
import { cn } from "@/lib/utils";

// A day with a typical home solar system, driven by scrolling: the sun
// crosses the sky, the battery fills at midday and carries the house through
// load shedding and the night. Illustrative numbers (5 kW panels, 10 kWh battery).

const PHASES = [
  { from: 5, title: "Morning", body: "The sun comes up and the panels start producing. The house runs on sunshine, not the grid." },
  { from: 10, title: "Daytime", body: "More sun than the house uses. The extra charges the battery, ready for tonight." },
  {
    from: 17.5,
    title: "Load shedding at 18:00",
    body: "The grid drops. The inverter switches to the battery in an instant, and the TV doesn't even flicker.",
  },
  { from: 20.75, title: "Night", body: "The battery carries the essentials until morning. No generator, no noise, no fumes." },
];

const SHEDDING = [18, 20.5] as const;

/** Linear interpolation through [hour, value] points. */
function curve(points: [number, number][], h: number) {
  if (h <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [h1, v1] = points[i];
    const [h0, v0] = points[i - 1];
    if (h <= h1) return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0);
  }
  return points[points.length - 1][1];
}

const solarKw = (h: number) => (h > 6 && h < 18 ? 5.2 * Math.pow(Math.sin((Math.PI * (h - 6)) / 12), 1.3) : 0);
const batteryPct = (h: number) =>
  curve(
    [
      [5, 46],
      [8, 44],
      [12, 78],
      [15, 100],
      [18, 100],
      [20.5, 74],
      [24, 52],
    ],
    h,
  );
const gridOff = (h: number) => h >= SHEDDING[0] && h < SHEDDING[1];

/** What the house is using, kW: low overnight, a morning bump, highest in the evening. */
const houseKw = (h: number) =>
  curve(
    [
      [5, 0.4],
      [6.5, 1.0],
      [9, 0.8],
      [17, 0.9],
      [19, 1.5],
      [22, 1.0],
      [24, 0.5],
    ],
    h,
  );
/** Battery power, kW: positive while charging (from the battery curve's slope; 10 kWh = 0.1 kWh per %). */
const batteryKw = (h: number) => ((batteryPct(Math.min(24, h + 0.1)) - batteryPct(h)) / 0.1) * 0.1;

/** Moments you can jump to: the hour each one shows. */
const JUMPS = [
  { label: "Morning", short: "Morning", hour: 7 },
  { label: "Midday", short: "Midday", hour: 12 },
  { label: "Load shedding at 18:00", short: "Load shedding", hour: 18.25 },
  { label: "Night", short: "Night", hour: 22 },
];

const clock = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor(((h - Math.floor(h)) * 60) / 15) * 15;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export function SolarDay() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const hour = useTransform(scrollYProgress, [0, 1], [5, 24]);
  const [h, setH] = useState(5);
  useMotionValueEvent(hour, "change", (v) => setH(Math.round(v * 8) / 8));

  // Scene, straight from the scroll position (no React re-render needed).
  const sky = useTransform(
    hour,
    [5, 6.5, 9, 12, 16, 18, 19.5, 21, 24],
    ["#1c1b1e", "#ef9f6a", "#f6ead0", "#f8edcb", "#f5dfae", "#ee8546", "#3d2f36", "#1f1d20", "#161517"],
  );
  const sunX = useTransform(hour, (v) => 70 + Math.min(1, Math.max(0, (v - 6) / 12)) * 460);
  const sunY = useTransform(hour, (v) => 300 - Math.sin(Math.PI * Math.min(1, Math.max(0, (v - 6) / 12))) * 230);
  const sunOpacity = useTransform(hour, [5.6, 6.2, 17.9, 18.5], [0, 1, 1, 0]);
  const nightOpacity = useTransform(hour, [18.6, 20, 24], [0, 1, 1]);
  const panelGlow = useTransform(hour, (v) => (solarKw(v) / 5.2) * 0.45);
  const batteryFill = useTransform(hour, (v) => batteryPct(v) / 100);
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const cloudX = useTransform(scrollYProgress, [0, 1], [-40, 160]);
  const cloudOpacity = useTransform(hour, [5, 7, 18, 20], [0.25, 0.9, 0.9, 0.15]);

  const phase = [...PHASES].reverse().find((p) => h >= p.from) ?? PHASES[0];
  const solar = solarKw(h);
  const off = gridOff(h);
  const fromBattery = solar < 0.6 || off;
  const lightsOn = h >= 18 || h < 6.5;
  const house = houseKw(h);
  const battery = batteryKw(h);
  // Whatever solar and the battery don't cover comes from the grid (when it's on).
  const grid = off ? 0 : Math.max(0, house + Math.max(0, battery) - solar - Math.max(0, -battery));

  const jump = (hour: number) => {
    const el = ref.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + ((hour - 5) / 19) * span;
    window.scrollTo({ top, behavior: currentMotion() === "full" ? "smooth" : "auto" });
  };

  return (
    <section ref={ref} className="grain relative h-[340vh] bg-ink text-white lg:h-[400vh]" aria-labelledby="day-heading">
      {/*
        The panel sits just below the sticky header and always fits the screen:
        on phones the scene takes whatever height is left over (flex-1), on
        large screens the text and scene sit side by side.
      */}
      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden lg:top-[4.5rem] lg:h-[calc(100svh-4.5rem)]">
        <div className="container-page flex h-full flex-col gap-3 py-3 sm:gap-4 sm:py-5 lg:grid lg:grid-cols-[1fr_1.25fr] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-14 lg:gap-y-5 lg:py-6">
          <div className="shrink-0 lg:col-start-1 lg:row-start-2">
            <h2 id="day-heading" className="type-wide text-2xl sm:text-4xl xl:text-5xl">
              24 hours on solar
            </h2>
            <p className="mt-2 hidden text-white/60 sm:block">Scroll through a day with a 5 kW system and a 10 kWh battery.</p>
            <div className="mt-2.5 flex gap-1.5 sm:mt-4 sm:flex-wrap sm:gap-2" aria-label="Jump to a time of day">
              {JUMPS.map((j) => (
                <button
                  key={j.label}
                  type="button"
                  onClick={() => jump(j.hour)}
                  aria-label={`Jump to ${j.label.toLowerCase()}`}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors sm:px-3 sm:text-sm",
                    j.hour === 18.25 ? "border-sale text-white hover:bg-sale" : "border-white/25 text-white/80 hover:border-white hover:text-white",
                  )}
                >
                  {j.short}
                </button>
              ))}
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:aspect-[600/420] lg:flex-none lg:self-center" aria-hidden="true">
            {/* "slice" fills the box; on short phone screens it trims the plain ground first. */}
            <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMin slice" className="absolute inset-0 h-full w-full">
              <defs>
                <clipPath id="day-frame">
                  <rect width="600" height="420" />
                </clipPath>
                <radialGradient id="day-sun" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#fff4c7" stopOpacity="1" />
                  <stop offset="1" stopColor="#fff4c7" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g clipPath="url(#day-frame)">
                <motion.rect width="600" height="420" style={{ fill: sky }} />
                {/* Stars and moon at night */}
                <motion.g style={{ opacity: nightOpacity }}>
                  {[
                    [60, 50],
                    [140, 90],
                    [210, 40],
                    [330, 70],
                    [420, 30],
                    [500, 85],
                    [560, 45],
                    [260, 110],
                  ].map(([x, y]) => (
                    <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" fill="white" opacity="0.85" />
                  ))}
                  <circle cx="480" cy="80" r="22" fill="#f4f1e6" />
                  <motion.circle cx="491" cy="73" r="20" style={{ fill: sky }} />
                </motion.g>
                {/* Sun on its arc */}
                <motion.g style={{ opacity: sunOpacity }}>
                  <motion.circle r="70" fill="url(#day-sun)" style={{ cx: sunX, cy: sunY }} />
                  <motion.circle r="26" fill="#ffb81c" style={{ cx: sunX, cy: sunY }} />
                </motion.g>

                {/* Clouds drifting with the day */}
                <motion.g style={{ x: cloudX, opacity: cloudOpacity }} fill="white">
                  <g transform="translate(120 70)">
                    <ellipse cx="0" cy="0" rx="42" ry="16" />
                    <ellipse cx="26" cy="-10" rx="28" ry="18" />
                    <ellipse cx="-24" cy="-6" rx="22" ry="13" />
                  </g>
                  <g transform="translate(330 120) scale(0.7)">
                    <ellipse cx="0" cy="0" rx="42" ry="16" />
                    <ellipse cx="26" cy="-10" rx="28" ry="18" />
                    <ellipse cx="-24" cy="-6" rx="22" ry="13" />
                  </g>
                </motion.g>

                {/* Ground */}
                <rect y="330" width="600" height="90" fill="#26402a" />
                <rect y="330" width="600" height="6" fill="#33573a" />

                {/* Grid pylon and line */}
                <g stroke={off ? "#e5484d" : "#8b8a84"} strokeWidth="3" fill="none" opacity="0.9">
                  <path d="M70 330 L85 230 L100 330 M78 270 H92 M74 300 H96" />
                  <path d="M85 236 Q170 250 232 268" strokeDasharray={off ? "6 6" : undefined} />
                </g>
                {off && (
                  <g>
                    <rect x="38" y="190" width="94" height="26" rx="13" fill="#e5484d" />
                    <text x="85" y="208" textAnchor="middle" fontSize="13" fontWeight="700" fill="white">
                      GRID OFF
                    </text>
                  </g>
                )}

                {/* Tree */}
                <rect x="178" y="292" width="8" height="38" fill="#5b4636" />
                <circle cx="182" cy="282" r="22" fill="#2f6b3c" />
                <circle cx="168" cy="292" r="14" fill="#2f6b3c" />
                <circle cx="196" cy="294" r="13" fill="#2a5f36" />

                {/* House */}
                <rect x="232" y="250" width="200" height="80" fill="#e8e2d4" />
                <path d="M215 255 L332 182 L449 255 Z" fill="#3b2f2a" />
                {/* Panels on the roof, glowing with output */}
                <g transform="translate(262 208) skewX(-32) scale(1 0.55)">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <rect
                      key={i}
                      x={(i % 4) * 34}
                      y={Math.floor(i / 4) * 42}
                      width="30"
                      height="38"
                      rx="2"
                      fill="#252523"
                      stroke="#6a6a64"
                      strokeWidth="1.5"
                    />
                  ))}
                  <motion.rect x="-2" y="-2" width="138" height="84" rx="3" fill="#ffd34d" style={{ opacity: panelGlow }} />
                </g>
                {/* Windows: the lights stay on */}
                {[256, 312, 380].map((x) => (
                  <rect key={x} x={x} y="272" width="34" height="30" rx="3" fill={lightsOn ? "#ffd34d" : "#c9c7bd"} opacity={lightsOn ? 0.95 : 0.8} />
                ))}
                <rect x="340" y="282" width="28" height="48" rx="2" fill="#6b4e3d" />

                {/* Battery beside the house */}
                <rect x="458" y="250" width="54" height="80" rx="8" fill="#f2f2ef" stroke="#c8c7c0" strokeWidth="2" />
                <rect x="468" y="262" width="34" height="58" rx="4" fill="#dcdbd4" />
                <motion.rect
                  x="468"
                  y="262"
                  width="34"
                  height="58"
                  rx="4"
                  fill="#3fbf7f"
                  style={{ scaleY: batteryFill, transformOrigin: "485px 320px", transformBox: "view-box" }}
                />

                {/* Power flowing: sun to panels by day, battery to house when needed */}
                <g fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 10" className="[animation:jc-flow_1s_linear_infinite]">
                  {solar > 0.4 && <path d="M432 290 H458" stroke="#f0a400" />}
                  {fromBattery && <path d="M458 300 H432" stroke="#3fbf7f" />}
                </g>
              </g>
            </svg>
            <p className="absolute right-2 bottom-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/85 sm:text-xs">Illustration. Real output depends on your roof and weather.</p>
          </div>

          <div className="shrink-0 lg:col-start-1 lg:row-start-3">
            <div className="flex items-end gap-4 lg:block">
              <p className="num type-wide text-5xl leading-none text-sun sm:text-7xl xl:text-8xl" aria-hidden="true">
                {clock(h)}
              </p>
              <p className="pb-1 text-lg leading-tight font-semibold sm:text-xl lg:mt-4 lg:pb-0 lg:text-2xl" aria-hidden="true">
                {phase.title}
              </p>
            </div>
            <p className="mt-1.5 line-clamp-3 min-h-[3.75rem] max-w-md text-sm text-white/75 sm:text-base lg:mt-2 lg:min-h-[4.5rem] lg:text-lg" aria-hidden="true">
              {phase.body}
            </p>
            {/* The whole story for screen readers, rather than the moving version. */}
            <ol className="sr-only">
              {PHASES.map((p) => (
                <li key={p.title}>
                  {p.title}: {p.body}
                </li>
              ))}
            </ol>

            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs sm:mt-4 sm:text-sm" aria-hidden="true">
              <div className="rounded-lg bg-white/[0.06] px-2.5 py-2 sm:p-3">
                <dt className="flex items-center gap-1.5 text-white/60">
                  <Sun className="size-3.5 text-sun" /> Solar
                </dt>
                <dd className="num mt-0.5 font-display text-base font-bold sm:mt-1 sm:text-xl">{solar.toFixed(1)} kW</dd>
              </div>
              <div className="rounded-lg bg-white/[0.06] px-2.5 py-2 sm:p-3">
                <dt className="flex items-center gap-1.5 text-white/60">
                  <BatteryMedium className="size-3.5 text-charge" /> Battery
                </dt>
                <dd className="num mt-0.5 font-display text-base font-bold sm:mt-1 sm:text-xl">{Math.round(batteryPct(h))}%</dd>
              </div>
              <div className={cn("rounded-lg px-2.5 py-2 transition-colors sm:p-3", off ? "bg-sale" : "bg-white/[0.06]")}>
                <dt className={cn("flex items-center gap-1.5", off ? "text-white" : "text-white/60")}>
                  <PlugZap className={cn("size-3.5", off ? "text-white" : "text-white/60")} /> Grid
                </dt>
                <dd className="mt-0.5 font-display text-base font-bold sm:mt-1 sm:text-xl">{off ? "Off" : "On"}</dd>
              </div>
            </dl>

            <EnergyFlow solar={solar} house={house} battery={battery} grid={grid} off={off} />

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10 sm:mt-5" aria-hidden="true">
              <motion.div className="h-full rounded-full bg-sun" style={{ width: progress }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Where the power is going right now: panels and grid feed the inverter,
 * which feeds the house and charges (or draws on) the battery. Line
 * thickness follows the kW on each link.
 */
function EnergyFlow({ solar, house, battery, grid, off }: { solar: number; house: number; battery: number; grid: number; off: boolean }) {
  const w = (kw: number) => (kw < 0.05 ? 0 : Math.min(9, 1.5 + kw * 1.6));
  const charging = battery > 0.05;
  const discharging = battery < -0.05;
  const link = (d: string, kw: number, color: string, reverse = false) =>
    kw >= 0.05 ? (
      <g>
        <path d={d} stroke="white" strokeOpacity="0.1" strokeWidth="10" strokeLinecap="round" fill="none" />
        <path
          d={d}
          stroke={color}
          strokeWidth={w(kw)}
          strokeLinecap="round"
          fill="none"
          strokeDasharray="2 9"
          className="[animation:jc-flow_0.9s_linear_infinite]"
          style={reverse ? { animationDirection: "reverse" } : undefined}
        />
      </g>
    ) : (
      <path d={d} stroke="white" strokeOpacity="0.12" strokeWidth="2" strokeDasharray="3 5" fill="none" />
    );
  const node = (x: number, y: number, label: string, value: string, accent?: string) => (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-44" y="-17" width="88" height="34" rx="8" fill="white" fillOpacity="0.07" stroke={accent ?? "white"} strokeOpacity={accent ? 0.9 : 0.15} />
      <text y="-3" textAnchor="middle" fontSize="9" fill="white" fillOpacity="0.6">
        {label}
      </text>
      <text y="11" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
        {value}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 340 150" className="mt-4 hidden w-full max-w-md lg:[@media(min-height:800px)]:block" aria-hidden="true">
      {link("M88 34 C 116 34, 112 75, 134 75", solar, "#ffc414")}
      {link("M88 116 C 116 116, 112 75, 134 75", grid, "#b8b8b0")}
      {link("M222 75 C 244 75, 230 34, 252 34", house, "white")}
      {link("M222 75 C 244 75, 230 116, 252 116", Math.abs(battery), "#3fbf7f", discharging)}
      {node(44, 34, "Panels", `${solar.toFixed(1)} kW`, solar > 0.05 ? "#ffc414" : undefined)}
      {node(44, 116, off ? "Grid: off" : "Grid", off ? "0.0 kW" : `${grid.toFixed(1)} kW`, off ? "#e5484d" : undefined)}
      {node(178, 75, "Inverter", "5 kW")}
      {node(296, 34, "House", `${house.toFixed(1)} kW`)}
      {node(296, 116, charging ? "Battery: charging" : discharging ? "Battery: in use" : "Battery", `${Math.abs(battery).toFixed(1)} kW`, charging || discharging ? "#3fbf7f" : undefined)}
    </svg>
  );
}
