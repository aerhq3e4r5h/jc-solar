"use client";

import { BatteryMedium, Check, CloudSun, PlugZap, Sun, TriangleAlert } from "lucide-react";
import { animate, AnimatePresence, motion, transform, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { currentMotion } from "@/components/motion/use-motion";
import { useProvince } from "@/components/tools/use-province";
import { PROVINCES } from "@/lib/checkout/schema";
import { clock, dayStory, gridOff, STORY, type DaySim, type DayStory, type StoryMonth, type Which } from "@/lib/solar/day";
import { isProvince } from "@/lib/solar/seasons";
import { cn } from "@/lib/utils";

// A day with a home solar system, driven by scrolling: the sun crosses the
// sky, the battery fills and carries the house through load shedding and
// the evening. It can be told for the best and the weakest month of the
// visitor's province, and for two sizes of array (enough for the best
// month, or sized for the weakest), which is the whole reason we size for
// the weakest month. The sums are in lib/solar/day.ts.

const pct = (v: number) => `${Math.round(v * 100)}%`;
// Formatted by hand: Node and browsers disagree on en-ZA decimals, which breaks hydration.
const one = (n: number) => String(Math.round(n * 10) / 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The four parts of the day, told from how this particular day goes. */
function phases(day: DaySim) {
  const full = day.peak.charge >= 0.985;
  const night =
    day.reserveAt === null
      ? "The battery carries the house until morning. No generator, no noise, no fumes."
      : day.reserveAt < day.set
        ? "The battery carries the house past midnight. No generator, no noise, no fumes."
        : day.reserveAt <= 20.75
          ? "The battery is down to the reserve it keeps for power cuts, so the grid runs the house tonight."
          : `By ${clock(day.reserveAt)} the battery is down to the reserve it keeps for power cuts, and the grid takes over for the night.`;
  return [
    { from: 5, title: "Morning", body: "The sun comes up and the panels start producing. The house runs on sunshine, not the grid." },
    {
      from: 10,
      title: "Daytime",
      body: full
        ? `More sun than the house uses. The extra charges the battery: it is full by ${clock(day.peak.hour)}, ready for tonight.`
        : `The panels run the house, but there is little to spare. The battery only gets to ${pct(day.peak.charge)} today.`,
    },
    {
      from: 17.5,
      title: "Load shedding at 18:00",
      body:
        day.darkAt !== null
          ? `The grid drops, and the battery was never filled. By ${clock(day.darkAt)} it is down to the ${pct(STORY.floor)} it never goes below, and the house goes dark until the power is back.`
          : "The grid drops. The inverter switches to the battery in an instant, and the TV doesn't even flicker.",
    },
    { from: 20.75, title: "Night", body: night },
  ];
}

/** One line on what this pairing of month and array shows, and a second with the detail. */
function verdict(story: DayStory, month: Which, sized: Which): { ok: boolean; lead: string; more: string } {
  const { best, weakest } = story.months;
  const day = story.days[month][sized];
  const small = story.days.weakest.best;
  const fills = (d: DaySim) => (d.peak.charge >= 0.985 ? `is full by ${clock(d.peak.hour)}` : `gets to ${pct(d.peak.charge)}`);
  if (month === "weakest" && sized === "weakest")
    return {
      ok: true,
      lead: `${weakest.panels} panels are sized for ${weakest.name}, ${story.province}'s weakest month for sun, so the battery still fills.`,
      more:
        small.darkAt !== null
          ? `The ${best.panels} that are enough in ${best.name} would leave the battery too low to last the evening power cut.`
          : `The ${best.panels} that are enough in ${best.name} would stop at ${pct(small.peak.charge)} in ${weakest.name}.`,
    };
  if (month === "weakest")
    return {
      ok: false,
      lead:
        day.darkAt !== null
          ? `${best.panels} panels fall short in ${weakest.name}: the battery is down to its last ${pct(STORY.floor)} at ${clock(day.darkAt)} and switches off, in the middle of the power cut.`
          : `${best.panels} panels fall short in ${weakest.name}: the battery only reaches ${pct(day.peak.charge)}.`,
      more: `The grid has to supply ${pct(1 - day.ownShare)} of the day. This is why we size for ${weakest.name}, not for ${best.name}.`,
    };
  if (sized === "best")
    return {
      ok: true,
      lead: `In ${best.name}, ${story.province}'s best month for sun, ${best.panels} panels are enough.`,
      more: `The battery ${fills(day)}. Now look at the same panels in ${weakest.name}.`,
    };
  return {
    ok: true,
    lead: `In ${best.name} the ${weakest.panels} panels make more than the house can use.`,
    more: `About ${one(day.totals.spare)} kWh a day to spare, for the geyser or the pool pump. In ${weakest.name} it is all needed.`,
  };
}

/** Moments you can jump to: the hour each one shows. */
const JUMPS = [
  { label: "Morning", short: "Morning", hour: 7.5 },
  { label: "Midday", short: "Midday", hour: 12 },
  { label: "Load shedding at 18:00", short: "Load shedding", hour: 18.25 },
  { label: "Night", short: "Night", hour: 22 },
];

// The picture's light is keyed to a standard day (sun up at 6, down at 18); a month's own sunrise and sunset are stretched onto it.
const standardHour = (h: number, rise: number, set: number) => (h < rise ? 6 - (rise - h) : h > set ? 18 + (h - set) : 6 + (12 * (h - rise)) / (set - rise));
const SKY = transform(
  [5, 6.5, 9, 12, 16, 18, 19.5, 21, 24],
  ["#1c1b1e", "#ef9f6a", "#f6ead0", "#f8edcb", "#f5dfae", "#ee8546", "#3d2f36", "#1f1d20", "#161517"],
);
const ramp = (points: number[], values: number[]) => transform(points, values);
const SUN_OPACITY = ramp([5.6, 6.2, 17.9, 18.5], [0, 1, 1, 0]);
const NIGHT_OPACITY = ramp([18.6, 20, 24], [0, 1, 1]);
const CLOUD_OPACITY = ramp([5, 7, 18, 20], [0.25, 0.9, 0.9, 0.15]);
/** How high the midday sun is drawn, from its real height in degrees. A taller picture has more sky to climb. */
const sunPeak = (m: StoryMonth, sky: number) => (230 + sky * 0.8) * Math.sin((m.sunHeight * Math.PI) / 180);

// Panels on the drawn roof: two rows of up to six, each row centred.
const PANEL = { w: 22, h: 24, gap: 3, perRow: 6, rows: [224, 196] } as const;
function panelSlots(count: number) {
  const slots: { key: string; x: number; y: number }[] = [];
  PANEL.rows.forEach((y, row) => {
    const inRow = Math.max(0, Math.min(PANEL.perRow, count - row * PANEL.perRow));
    const width = inRow * PANEL.w + (inRow - 1) * PANEL.gap;
    for (let i = 0; i < inRow; i++) slots.push({ key: `${row}-${i}`, x: 332 - width / 2 + i * (PANEL.w + PANEL.gap), y });
  });
  return slots;
}

export function SolarDay() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const hour = useTransform(scrollYProgress, [0, 1], [5, 24]);
  const [h, setH] = useState(5);
  useMotionValueEvent(hour, "change", (v) => setH(Math.round(v * 8) / 8));

  // Which day is being told.
  const [province, setProvince] = useProvince();
  const story = useMemo(() => dayStory(province), [province]);
  const [month, setMonth] = useState<Which>("weakest");
  const [sizedChoice, setSized] = useState<Which>("weakest");
  const { best, weakest } = story.months;
  const oneSize = best.panels === weakest.panels;
  const sized: Which = oneSize ? "weakest" : sizedChoice;
  const day = story.days[month][sized];
  const panels = story.months[sized].panels;
  const now = day.at(h);
  const said = verdict(story, month, sized);

  // The picture is drawn 600 wide by 420. A box taller than that (a phone held upright) gets more sky rather than losing its sides.
  const box = useRef<HTMLDivElement>(null);
  const [moreSky, setMoreSky] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setMoreSky(Math.max(0, Math.round((height / width) * 600 - 420)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The light follows the month: 0 is the best month, 1 the weakest. It glides when the month is changed.
  const blend = useMotionValue(1);
  useEffect(() => {
    const controls = animate(blend, month === "weakest" ? 1 : 0, { duration: currentMotion() === "full" ? 0.9 : 0, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [blend, month]);
  const standard = () => {
    const b = blend.get();
    return standardHour(hour.get(), lerp(best.rise, weakest.rise, b), lerp(best.set, weakest.set, b));
  };
  const arc = () => Math.min(1, Math.max(0, (standard() - 6) / 12));

  // Scene, straight from the scroll position (no React re-render needed).
  const sky = useTransform(() => SKY(standard()));
  const sunX = useTransform(() => 70 + arc() * 460);
  const sunY = useTransform(() => 300 - Math.sin(Math.PI * arc()) * lerp(sunPeak(best, moreSky), sunPeak(weakest, moreSky), blend.get()));
  const sunOpacity = useTransform(() => SUN_OPACITY(standard()) * (1 - 0.45 * lerp(best.cloud, weakest.cloud, blend.get())));
  const nightOpacity = useTransform(() => NIGHT_OPACITY(standard()));
  const cloudOpacity = useTransform(() => CLOUD_OPACITY(standard()));
  // Extra cloud, for a month that is weaker than the sun's path alone explains.
  const moreCloud = useTransform(() => CLOUD_OPACITY(standard()) * Math.min(1, lerp(best.cloud, weakest.cloud, blend.get()) * 4.5));
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const cloudX = useTransform(scrollYProgress, [0, 1], [-40, 160]);
  const cloudX2 = useTransform(scrollYProgress, [0, 1], [60, -90]);

  const parts = phases(day);
  const phase = [...parts].reverse().find((p) => h >= p.from) ?? parts[0];
  const off = gridOff(h);
  const dark = now.short > 0.01;
  const flat = now.charge <= STORY.floor + 0.005;
  const light = standardHour(h, story.months[month].rise, story.months[month].set);
  const lightsOn = (light >= 17.6 || light < 6.4) && !dark;
  const charging = now.battery > 0.05;
  const discharging = now.battery < -0.05;
  const buying = now.grid > 0.05;
  const glow = Math.min(1, now.solar / (day.kwp * 0.72)) * 0.45;
  const slots = panelSlots(panels);

  const jump = (hour: number) => {
    const el = ref.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + ((hour - 5) / 19) * span;
    window.scrollTo({ top, behavior: currentMotion() === "full" ? "smooth" : "auto" });
  };

  const monthChoices = (short: boolean) => [
    {
      value: "best" as const,
      label: (
        <>
          <Sun className="size-3.5" aria-hidden="true" /> {short ? best.name.slice(0, 3) : best.name}
        </>
      ),
      hint: `${best.name}: the best month for sun`,
    },
    {
      value: "weakest" as const,
      label: (
        <>
          <CloudSun className="size-3.5" aria-hidden="true" /> {short ? weakest.name.slice(0, 3) : weakest.name}
        </>
      ),
      hint: `${weakest.name}: the weakest month for sun`,
    },
  ];
  const sizeChoices = (short: boolean) => [
    { value: "best" as const, label: short ? `${best.panels}` : `${best.panels} panels`, hint: `${best.panels} panels: enough in ${best.name}` },
    { value: "weakest" as const, label: `${weakest.panels} panels`, hint: `${weakest.panels} panels: sized for ${weakest.name}` },
  ];
  const provinceSelect = (className: string) => (
    <select
      value={province}
      onChange={(e) => isProvince(e.target.value) && setProvince(e.target.value)}
      aria-label="Province"
      className={cn("rounded-full border border-white/20 bg-black/45 font-semibold text-white backdrop-blur", className)}
    >
      {PROVINCES.map((p) => (
        <option key={p} className="text-black">
          {p}
        </option>
      ))}
    </select>
  );

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
            <p className="mt-2 hidden text-white/60 sm:block">
              Scroll through a day in {story.months[month].name}: {panels} panels and {STORY.batteryKwh} kWh of batteries, never run below{" "}
              {pct(STORY.floor)}.
            </p>
            {/* Phones: what this day shows, in a line. The choices sit on the picture. */}
            <p className="mt-1.5 flex min-h-8 items-start gap-1.5 text-xs leading-4 text-white/85 sm:hidden" aria-live="polite">
              <Verdict ok={said.ok} />
              <span>{said.lead}</span>
            </p>
            <div className="mt-4 hidden gap-2 sm:flex sm:flex-wrap" aria-label="Jump to a time of day">
              {JUMPS.map((j) => (
                <button
                  key={j.label}
                  type="button"
                  onClick={() => jump(j.hour)}
                  aria-label={`Jump to ${j.label.toLowerCase()}`}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors",
                    j.hour === 18.25 ? "border-sale text-white hover:bg-sale" : "border-white/25 text-white/80 hover:border-white hover:text-white",
                  )}
                >
                  {j.short}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:max-h-full lg:flex-none lg:self-center">
            {/* The month and the size of the array: larger screens */}
            <div className="hidden shrink-0 flex-wrap items-center gap-x-3 gap-y-2 sm:flex">
              <Choice label="Month" value={month} onChange={setMonth} options={monthChoices(false)} />
              {!oneSize && <Choice label="Number of panels" value={sized} onChange={setSized} options={sizeChoices(false)} />}
              {provinceSelect("ml-auto h-9 px-3 text-sm")}
            </div>

            <div className="relative min-h-0 flex-1 lg:aspect-[600/420] lg:flex-initial">
              <div ref={box} className="absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
                {/* "slice" fills the box; on short phone screens it trims the plain ground first. */}
                <svg viewBox={`0 ${-moreSky} 600 ${420 + moreSky}`} preserveAspectRatio="xMidYMin slice" className="absolute inset-0 h-full w-full" data-day-scene>
                  <defs>
                    <clipPath id="day-frame">
                      <rect y={-moreSky} width="600" height={420 + moreSky} />
                    </clipPath>
                    <radialGradient id="day-sun" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0" stopColor="#fff4c7" stopOpacity="1" />
                      <stop offset="1" stopColor="#fff4c7" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <g clipPath="url(#day-frame)">
                    <motion.rect y={-moreSky} width="600" height={420 + moreSky} style={{ fill: sky }} />
                    {/* Stars and moon at night */}
                    <motion.g style={{ opacity: nightOpacity, y: -moreSky * 0.55 }}>
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
                    {/* Sun on its arc: lower and shorter in the darker months */}
                    <motion.g style={{ opacity: sunOpacity }}>
                      <motion.circle r="70" fill="url(#day-sun)" style={{ cx: sunX, cy: sunY }} />
                      <motion.circle r="26" fill="#ffb81c" style={{ cx: sunX, cy: sunY }} />
                    </motion.g>

                    {/* Clouds drifting with the day */}
                    <motion.g style={{ x: cloudX, y: -moreSky * 0.45, opacity: cloudOpacity }} fill="white">
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
                    {/* More of them when the month is cloudier */}
                    <motion.g style={{ x: cloudX2, y: -moreSky * 0.3, opacity: moreCloud }} fill="#f1efe9">
                      <g transform="translate(250 92) scale(1.25)">
                        <ellipse cx="0" cy="0" rx="46" ry="17" />
                        <ellipse cx="28" cy="-11" rx="30" ry="19" />
                        <ellipse cx="-26" cy="-7" rx="24" ry="14" />
                      </g>
                      <g transform="translate(455 58)">
                        <ellipse cx="0" cy="0" rx="42" ry="16" />
                        <ellipse cx="26" cy="-10" rx="28" ry="18" />
                        <ellipse cx="-24" cy="-6" rx="22" ry="13" />
                      </g>
                      <g transform="translate(60 132) scale(0.85)">
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
                    {/* Power bought from the grid */}
                    {buying && (
                      <path
                        d="M85 236 Q170 250 232 268"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="4 10"
                        className="[animation:jc-flow_1s_linear_infinite]"
                      />
                    )}
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
                    <path d="M215 255 L250 184 L414 184 L449 255 Z" fill="#3b2f2a" />
                    {/* Panels on the roof: as many as this array has, glowing with output */}
                    <AnimatePresence initial={false}>
                      {slots.map((s) => (
                        <motion.g
                          key={s.key}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ type: "spring", stiffness: 380, damping: 26 }}
                        >
                          <motion.rect
                            initial={false}
                            animate={{ x: s.x }}
                            y={s.y}
                            width={PANEL.w}
                            height={PANEL.h}
                            rx="2"
                            fill="#252523"
                            stroke="#6a6a64"
                            strokeWidth="1.2"
                          />
                          <motion.rect
                            initial={false}
                            animate={{ x: s.x }}
                            y={s.y}
                            width={PANEL.w}
                            height={PANEL.h}
                            rx="2"
                            fill="#ffd34d"
                            className="transition-opacity duration-300"
                            opacity={glow}
                          />
                        </motion.g>
                      ))}
                    </AnimatePresence>
                    {now.spare > 0.15 && (
                      <g>
                        <rect x="278" y="150" width="108" height="24" rx="12" fill="#ffc414" />
                        <text x="332" y="166.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e1e1c">
                          {one(now.spare)} kW to spare
                        </text>
                      </g>
                    )}
                    {/* Windows: the lights stay on, unless the battery has run flat in a power cut */}
                    {[256, 300, 384].map((x) => (
                      <rect
                        key={x}
                        x={x}
                        y="272"
                        width="30"
                        height="30"
                        rx="3"
                        fill={lightsOn ? "#ffd34d" : dark ? "#3a3936" : "#c9c7bd"}
                        opacity={lightsOn ? 0.95 : 0.8}
                      />
                    ))}
                    <rect x="344" y="282" width="28" height="48" rx="2" fill="#6b4e3d" />
                    {dark && (
                      <g>
                        <rect x="288" y="255" width="88" height="17" rx="8.5" fill="#e5484d" />
                        <text x="332" y="267.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="white">
                          LIGHTS OUT
                        </text>
                      </g>
                    )}

                    {/* Battery beside the house */}
                    <rect x="458" y="250" width="54" height="80" rx="8" fill="#f2f2ef" stroke="#c8c7c0" strokeWidth="2" />
                    <rect x="468" y="262" width="34" height="58" rx="4" fill="#dcdbd4" />
                    <rect
                      x="468"
                      y="262"
                      width="34"
                      height="58"
                      rx="4"
                      fill={flat ? "#e5484d" : "#3fbf7f"}
                      style={{ transform: `scaleY(${now.charge})`, transformOrigin: "485px 320px", transformBox: "view-box" }}
                    />
                    {/* The line it never goes below: the last 30% stays in the battery, which is what makes it last */}
                    <g data-battery-floor>
                      <line x1="464" x2="506" y1={320 - 58 * STORY.floor} y2={320 - 58 * STORY.floor} stroke="#1c1b1e" strokeWidth="1.6" strokeDasharray="3 2.5" />
                      <text x="485" y="343" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#ffffff" fillOpacity="0.72">
                        stops at {pct(STORY.floor)}
                      </text>
                    </g>

                    {/* Power flowing: into the battery while there is sun to spare, out of it when the house needs it */}
                    <g fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 10" className="[animation:jc-flow_1s_linear_infinite]">
                      {charging && <path d="M432 290 H458" stroke="#f0a400" />}
                      {discharging && <path d="M458 300 H432" stroke="#3fbf7f" />}
                    </g>
                  </g>
                </svg>
                <p className="absolute right-2 bottom-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/85 sm:text-xs">
                  Illustration<span className="hidden sm:inline">. Real output depends on your roof and weather</span>.
                </p>
              </div>

              {/* Phones: the same choices, on the picture */}
              <div className="sm:hidden">
                <Choice label="Month" value={month} onChange={setMonth} options={monthChoices(true)} className="absolute top-2 left-2" />
                {!oneSize && (
                  <Choice label="Number of panels" value={sized} onChange={setSized} options={sizeChoices(true)} className="absolute top-2 right-2" />
                )}
                {provinceSelect("absolute bottom-2 left-2 h-8 max-w-[55%] px-2 text-[11px]")}
              </div>
            </div>

            <p className="hidden shrink-0 items-start gap-2 text-sm text-white/85 sm:flex" aria-live="polite">
              <Verdict ok={said.ok} />
              <span>
                <strong className="font-semibold text-white">{said.lead}</strong> {said.more}
              </span>
            </p>
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
              {parts.map((p) => (
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
                <dd className="num mt-0.5 font-display text-base font-bold sm:mt-1 sm:text-xl">{now.solar.toFixed(1)} kW</dd>
              </div>
              <div className={cn("rounded-lg px-2.5 py-2 transition-colors sm:p-3", flat ? "bg-sale" : "bg-white/[0.06]")}>
                <dt className={cn("flex items-center gap-1.5", flat ? "text-white" : "text-white/60")}>
                  <BatteryMedium className={cn("size-3.5", flat ? "text-white" : "text-charge")} /> Battery
                </dt>
                <dd className="num mt-0.5 font-display text-base font-bold sm:mt-1 sm:text-xl">{flat ? `Off at ${pct(STORY.floor)}` : pct(now.charge)}</dd>
              </div>
              <div className={cn("rounded-lg px-2.5 py-2 transition-colors sm:p-3", off ? "bg-sale" : "bg-white/[0.06]")}>
                <dt className={cn("flex items-center gap-1.5", off ? "text-white" : "text-white/60")}>
                  <PlugZap className={cn("size-3.5", off ? "text-white" : "text-white/60")} /> Grid
                </dt>
                <dd className="num mt-0.5 font-display text-base font-bold sm:mt-1 sm:text-xl">{off ? "Off" : `${now.grid.toFixed(1)} kW`}</dd>
              </div>
            </dl>

            <EnergyFlow solar={now.solar} house={now.house - now.short} battery={now.battery} grid={now.grid} off={off} />

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10 sm:mt-5" aria-hidden="true">
              <motion.div className="h-full rounded-full bg-sun" style={{ width: progress }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Verdict({ ok }: { ok: boolean }) {
  return (
    <span className={cn("mt-px grid size-4 shrink-0 place-items-center rounded-full sm:mt-0.5 sm:size-5", ok ? "bg-charge text-white" : "bg-sale text-white")}>
      {ok ? (
        <Check className="size-2.5 sm:size-3" strokeWidth={3.5} aria-hidden="true" />
      ) : (
        <TriangleAlert className="size-2.5 sm:size-3" strokeWidth={2.5} aria-hidden="true" />
      )}
    </span>
  );
}

/** Two or three choices in a row; the one in use is filled in. */
function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; hint: string }[];
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-full border border-white/20 bg-black/45 p-0.5 backdrop-blur", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          aria-label={o.hint}
          title={o.hint}
          className={cn(
            "inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[11px] leading-none font-semibold whitespace-nowrap transition-colors sm:px-3 sm:text-sm",
            value === o.value ? "bg-sun text-ink" : "text-white/80 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
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
