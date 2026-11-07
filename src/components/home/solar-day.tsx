"use client";

import { BatteryMedium, PlugZap, Sun } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
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
    ["#0d1733", "#e9976a", "#86bde8", "#5ea6e8", "#8fc1ea", "#ee8546", "#2c2552", "#0d1733", "#070d1f"],
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

  return (
    <section ref={ref} className="relative h-[340vh] bg-navy text-white lg:h-[400vh]" aria-labelledby="day-heading">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="container-page grid w-full items-center gap-6 py-6 lg:grid-cols-[1fr_1.25fr] lg:gap-14">
          <div className="order-2 lg:order-1">
            <h2 id="day-heading" className="text-3xl font-semibold sm:text-5xl">
              24 hours on solar
            </h2>
            <p className="mt-2 text-sm text-white/60 sm:text-base">Scroll through a day with a 5 kW system and a 10 kWh battery.</p>

            <p className="num mt-5 font-display text-6xl leading-none font-semibold text-sun sm:text-8xl" aria-hidden="true">
              {clock(h)}
            </p>
            <div className="mt-4 min-h-28 sm:min-h-32" aria-hidden="true">
              <p className="text-xl font-semibold sm:text-2xl">{phase.title}</p>
              <p className="mt-2 max-w-md text-white/75 sm:text-lg">{phase.body}</p>
            </div>
            {/* The whole story for screen readers, rather than the moving version. */}
            <ol className="sr-only">
              {PHASES.map((p) => (
                <li key={p.title}>
                  {p.title}: {p.body}
                </li>
              ))}
            </ol>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm" aria-hidden="true">
              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <dt className="flex items-center gap-1.5 text-white/60">
                  <Sun className="size-3.5 text-sun" /> Solar
                </dt>
                <dd className="num mt-1 font-display text-xl font-semibold">{solar.toFixed(1)} kW</dd>
              </div>
              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <dt className="flex items-center gap-1.5 text-white/60">
                  <BatteryMedium className="size-3.5 text-success" /> Battery
                </dt>
                <dd className="num mt-1 font-display text-xl font-semibold">{Math.round(batteryPct(h))}%</dd>
              </div>
              <div className={cn("rounded-xl p-3 ring-1 transition-colors", off ? "bg-sale/20 ring-sale/50" : "bg-white/5 ring-white/10")}>
                <dt className="flex items-center gap-1.5 text-white/60">
                  <PlugZap className={cn("size-3.5", off ? "text-sale" : "text-white/60")} /> Grid
                </dt>
                <dd className="mt-1 font-display text-xl font-semibold">{off ? "Off" : "On"}</dd>
              </div>
            </dl>

            <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <motion.div className="h-full rounded-full bg-sun" style={{ width: progress }} />
            </div>
          </div>

          <div className="order-1 lg:order-2" aria-hidden="true">
            <svg viewBox="0 0 600 420" className="w-full overflow-visible rounded-3xl shadow-2xl shadow-black/40">
              <defs>
                <clipPath id="day-frame">
                  <rect width="600" height="420" rx="28" />
                </clipPath>
                <radialGradient id="day-sun" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#ffd66b" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#ffd66b" stopOpacity="0" />
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
                  <motion.circle r="26" fill="#ffc83d" style={{ cx: sunX, cy: sunY }} />
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
                <g stroke={off ? "#e5484d" : "#9aa6b8"} strokeWidth="3" fill="none" opacity="0.9">
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
                      fill="#1d3557"
                      stroke="#5d7bb0"
                      strokeWidth="1.5"
                    />
                  ))}
                  <motion.rect x="-2" y="-2" width="138" height="84" rx="3" fill="#ffd66b" style={{ opacity: panelGlow }} />
                </g>
                {/* Windows: the lights stay on */}
                {[256, 312, 380].map((x) => (
                  <rect key={x} x={x} y="272" width="34" height="30" rx="3" fill={lightsOn ? "#ffd66b" : "#9bb3c9"} opacity={lightsOn ? 0.95 : 0.7} />
                ))}
                <rect x="340" y="282" width="28" height="48" rx="2" fill="#6b4e3d" />

                {/* Battery beside the house */}
                <rect x="458" y="250" width="54" height="80" rx="8" fill="#f2f2ef" stroke="#c9cbd1" strokeWidth="2" />
                <rect x="468" y="262" width="34" height="58" rx="4" fill="#d9dde3" />
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
                  {solar > 0.4 && <path d="M432 290 H458" stroke="#ffc83d" />}
                  {fromBattery && <path d="M458 300 H432" stroke="#3fbf7f" />}
                </g>
              </g>
            </svg>
            <p className="mt-2 text-center text-xs text-white/50">Illustration. Real output depends on your roof, location and weather.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
