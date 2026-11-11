"use client";

import { Moon, Pause, Play, Sun } from "lucide-react";
import { motion, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useMotion } from "@/components/motion/use-motion";
import { MONTHS, noonSunHeight, type Province } from "@/lib/solar/seasons";
import { cn } from "@/lib/utils";

// The house on the "Build your system" page: a photograph-like picture
// with the chosen number of panels laid on its roof in true perspective.
// The light follows the month, a dial shows how high the midday sun
// stands, the year can be played through, and a switch turns the grid off
// at night to show what the batteries keep running.
//
// The pictures were generated for us with Higgsfield (the house itself,
// and the loop of clouds in its sky); the night views are graded from the
// same picture so that every layer lines up. Files: public/build/scene/.

/** The picture's own size; everything drawn on it uses these units. */
const VIEW = { w: 2048, h: 1536 };

// The roof face is a flat sheet seen in perspective. ROOF takes a point
// on that sheet (u across, in ridge-lengths from the ridge's left end; v
// up the slope, 0 at the eave and 1 at the ridge) to its place in the
// picture. It was measured from the picture: the eave and ridge lines,
// and the point where the roof's seams, which are parallel on the real
// roof, meet in the distance.
const ROOF = { a: 666.2292, b: 259.2698, c: 679.0454, e: -138.4564, f: 853, h: 0.2714299 };
const onRoof = (u: number, v: number): [number, number] => {
  const d = ROOF.h * v + 1;
  return [(ROOF.a * u + ROOF.b * v + ROOF.c) / d, (ROOF.e * v + ROOF.f) / d];
};

// Panels lie on their sides in rows that step in with the hips of the roof.
const PANEL = { w: 0.262, h: 0.128, gapU: 0.012, gapV: 0.014, centre: 0.5385, eave: 0.035 };
const ROWS = [8, 8, 6, 6, 4];

type Slot = { points: string; shadow: string; cells: string; centre: [number, number] };
const pt = ([x, y]: [number, number]) => `${x.toFixed(1)},${y.toFixed(1)}`;

/** Every place a panel can go, in the order they fill: a block two rows deep growing out from the middle, then the rows above. */
const SLOTS: Slot[] = (() => {
  const fromMiddle = (n: number) =>
    Array.from({ length: n }, (_, i) => i).sort((p, q) => Math.abs(p - (n - 1) / 2) - Math.abs(q - (n - 1) / 2) || p - q);
  const order: { row: number; col: number }[] = [];
  for (let row = 0; row < ROWS.length; row += 2) {
    const lower = fromMiddle(ROWS[row]);
    const upper = row + 1 < ROWS.length ? fromMiddle(ROWS[row + 1]) : [];
    for (let i = 0; i < Math.max(lower.length, upper.length); i++) {
      if (i < lower.length) order.push({ row, col: lower[i] });
      if (i < upper.length) order.push({ row: row + 1, col: upper[i] });
    }
  }
  return order.map(({ row, col }) => {
    const v0 = PANEL.eave + row * (PANEL.h + PANEL.gapV);
    const v1 = v0 + PANEL.h;
    const u0 = PANEL.centre - (ROWS[row] * (PANEL.w + PANEL.gapU) - PANEL.gapU) / 2 + col * (PANEL.w + PANEL.gapU);
    const u1 = u0 + PANEL.w;
    const corners = [onRoof(u0, v0), onRoof(u1, v0), onRoof(u1, v1), onRoof(u0, v1)];
    // the cells: one line along the middle, five across
    const vm = (v0 + v1) / 2;
    let cells = `M${pt(onRoof(u0, vm))}L${pt(onRoof(u1, vm))}`;
    for (let k = 1; k < 6; k++) {
      const u = u0 + (PANEL.w * k) / 6;
      cells += `M${pt(onRoof(u, v0))}L${pt(onRoof(u, v1))}`;
    }
    return {
      points: corners.map(pt).join(" "),
      shadow: corners.map(([x, y]) => pt([x + 2, y + 6])).join(" "),
      cells,
      centre: [(corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2] as [number, number],
    };
  });
})();

/** The most panels the roof in the picture can show. */
export const SCENE_PANELS = SLOTS.length;

const hhmm = (h: number) => {
  const whole = ((Math.round(h * 2) / 2) % 24 + 24) % 24;
  return `${String(Math.floor(whole)).padStart(2, "0")}:${whole % 1 ? "30" : "00"}`;
};

export function BuilderScene({
  n,
  kwp,
  batteries,
  backupHours,
  province,
  month,
  weakest,
  best,
  strength,
  onMonth,
}: {
  /** Panels chosen. */
  n: number;
  kwp: number;
  batteries: number;
  /** Hours the batteries run the essentials. */
  backupHours: number;
  province: Province;
  /** The month the picture shows, and the province's weakest and best months. */
  month: number;
  weakest: number;
  best: number;
  /** What panels make this month against the best month, 0 to 1. */
  strength: number;
  onMonth: (month: number | null) => void;
}) {
  const id = useId();
  const moving = useMotion() === "full";
  const [night, setNight] = useState(false);
  // The night pictures are only fetched once someone reaches for the switch.
  const [nightReady, setNightReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Play the year: January to December, then back to the weakest month.
  useEffect(() => {
    if (!playing) return;
    let m = 0;
    onMonth(0);
    const timer = setInterval(() => {
      m += 1;
      if (m > 11) {
        clearInterval(timer);
        onMonth(null);
        setPlaying(false);
      } else onMonth(m);
    }, 750);
    return () => clearInterval(timer);
  }, [playing, onMonth]);

  // The clouds drift while the picture is on screen (and it is day).
  const clouds = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [cloudsOn, setCloudsOn] = useState(false);
  useEffect(() => {
    const video = clouds.current;
    const el = frame.current;
    if (!video || !el || !moving) return;
    const saving = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saving) return;
    let visible = false;
    const sync = () => {
      if (visible && !night) video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(el);
    sync();
    return () => observer.disconnect();
  }, [moving, night]);

  const sun = noonSunHeight(province, month);
  // The dial's sun swings to its new height rather than jumping.
  const swing = useSpring(sun, { stiffness: 70, damping: 16 });
  useEffect(() => {
    if (moving) swing.set(sun);
    else swing.jump(sun);
  }, [swing, sun, moving]);
  const onDial = (radius: number, axis: "x" | "y") => (degrees: number) =>
    axis === "x" ? 60 + radius * Math.cos((degrees * Math.PI) / 180) : 62 - radius * Math.sin((degrees * Math.PI) / 180);
  const sunX = useTransform(swing, onDial(46, "x"));
  const sunY = useTransform(swing, onDial(46, "y"));
  const rayX1 = useTransform(swing, onDial(13, "x"));
  const rayY1 = useTransform(swing, onDial(13, "y"));
  const rayX2 = useTransform(swing, onDial(37, "x"));
  const rayY2 = useTransform(swing, onDial(37, "y"));
  const shown = Math.min(n, SCENE_PANELS);
  const lit = night && batteries > 0;
  const hours = Math.max(0, backupHours);
  const tag = month === weakest ? "weakest month" : month === best ? "best month" : null;
  const spring = moving ? { type: "spring" as const, stiffness: 380, damping: 26 } : { duration: 0 };

  return (
    <div>
      <div
        ref={frame}
        data-roof
        role="img"
        aria-label={`A house with ${n} solar panels on its roof, ${kwp.toFixed(2)} kW, ${
          night
            ? batteries > 0
              ? `at night with the grid off: the lights are on, running from ${batteries} ${batteries === 1 ? "battery" : "batteries"}`
              : "at night with the grid off: the house is dark, because there is no battery"
            : `in ${MONTHS[month]}, when the midday sun stands ${Math.round(sun)} degrees high`
        }`}
        className="relative aspect-[4/3] overflow-hidden bg-[#2a3d57]"
      >
        {/* Day: the picture, with living clouds in its sky. The light dims a little in the weaker months. */}
        <div
          className="absolute inset-0 transition-[filter] duration-700"
          style={{ filter: `brightness(${(0.8 + 0.2 * strength).toFixed(3)}) saturate(${(0.84 + 0.16 * strength).toFixed(3)}) sepia(${((1 - strength) * 0.12).toFixed(3)})` }}
        >
          <Image src="/build/scene/day.webp" alt="" fill priority sizes="(min-width: 1024px) 52vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 [mask-image:url(/build/scene/sky-mask.png)] [mask-size:100%_100%] [-webkit-mask-image:url(/build/scene/sky-mask.png)] [-webkit-mask-size:100%_100%]">
            <video
              ref={clouds}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
              onPlaying={() => setCloudsOn(true)}
              className={cn("absolute inset-x-0 top-0 h-[57.22%] w-full object-fill transition-opacity duration-1000", cloudsOn ? "opacity-100" : "opacity-0")}
            >
              <source src="/build/scene/clouds.webm" type="video/webm" />
              <source src="/build/scene/clouds.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        {/* Night with the grid off: dark, and then the lights the batteries keep on */}
        {nightReady && (
          <>
            <Image
              src="/build/scene/night-off.webp"
              alt=""
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              className={cn("object-cover transition-opacity duration-1000 ease-out", night ? "opacity-100" : "opacity-0")}
            />
            <Image
              src="/build/scene/night-on.webp"
              alt=""
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              className={cn("object-cover transition-opacity ease-out", lit ? "opacity-100 delay-500 duration-700" : "opacity-0 duration-500")}
            />
          </>
        )}

        {/* The panels, on the roof */}
        <svg
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          className="absolute inset-0 h-full w-full transition-[filter] duration-1000"
          style={{ filter: night ? "brightness(0.34) saturate(0.7)" : undefined }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${id}-glass`} x1="0" y1="560" x2="0" y2="856" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#2b3a52" />
              <stop offset="0.5" stopColor="#141b29" />
              <stop offset="1" stopColor="#0c111b" />
            </linearGradient>
            <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.5" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${id}-array`}>
              {SLOTS.slice(0, shown).map((s) => (
                <polygon key={s.points} points={s.points} />
              ))}
            </clipPath>
          </defs>
          {SLOTS.map((s, i) => {
            const on = i < shown;
            return (
              <motion.g
                key={s.points}
                initial={false}
                animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.86, y: on ? 0 : -26 }}
                transition={{ ...spring, delay: on && moving ? (i % 8) * 0.012 : 0 }}
                style={{ transformOrigin: `${s.centre[0]}px ${s.centre[1]}px`, transformBox: "view-box" }}
              >
                <polygon points={s.shadow} fill="black" opacity="0.28" />
                <polygon points={s.points} fill={`url(#${id}-glass)`} stroke="#c9ced6" strokeWidth="2.6" strokeLinejoin="round" />
                <path d={s.cells} stroke="#3b4a63" strokeWidth="1.4" fill="none" opacity="0.9" />
              </motion.g>
            );
          })}
          {/* the sun catching the glass now and then */}
          {!night && (
            <g clipPath={`url(#${id}-array)`}>
              <rect className="builder-glint" x="-200" y="520" width="230" height="380" fill={`url(#${id}-glint)`} />
            </g>
          )}
        </svg>

        {/* What the picture is showing */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/50 py-1 pr-3 pl-2 text-xs font-semibold text-white backdrop-blur sm:top-3 sm:left-3 sm:text-sm" aria-hidden="true">
          {night ? <Moon className="size-3.5 text-white/80" /> : <Sun className="size-3.5 text-sun" />}
          {night ? "Night, grid off" : MONTHS[month]}
          {!night && tag && <span className="font-normal text-white/70">{tag}</span>}
        </div>

        {/* How high the midday sun stands this month */}
        <div
          className={cn(
            "pointer-events-none absolute top-2.5 right-2.5 rounded-xl bg-black/50 px-2 pt-1 pb-1.5 text-white backdrop-blur transition-opacity duration-500 sm:top-3 sm:right-3 sm:px-2.5",
            night ? "opacity-0" : "opacity-100",
          )}
          aria-hidden="true"
        >
          <svg viewBox="0 0 120 70" className="block w-20 sm:w-28">
            <path d="M14 62 A46 46 0 0 1 106 62" fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="2 4" />
            <path d="M6 62 H114" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
            <path d="M52 62 V54 L60 48 L68 54 V62 Z" fill="white" fillOpacity="0.85" />
            <text x="112" y="58" textAnchor="end" fontSize="9" fill="white" fillOpacity="0.6">
              N
            </text>
            <motion.line x1={rayX1} y1={rayY1} x2={rayX2} y2={rayY2} stroke="#ffc414" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 3" />
            <motion.circle cx={sunX} cy={sunY} r="7" fill="#ffc414" />
          </svg>
          <p className="num -mt-0.5 text-center text-[11px] leading-tight sm:text-xs">
            <span className="font-bold">{Math.round(sun)}°</span> <span className="text-white/70">midday sun</span>
          </p>
        </div>

        {/* Night: what the batteries keep running, and for how long */}
        <div
          className={cn(
            "absolute inset-x-2 bottom-2 rounded-xl bg-black/60 px-2.5 py-2 text-white backdrop-blur transition-[opacity,transform] duration-500 sm:inset-x-3 sm:bottom-3 sm:p-3",
            night ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
          )}
          aria-live="polite"
        >
          {night &&
            (batteries > 0 ? (
              <>
                <p className="text-xs leading-snug sm:text-sm">
                  <strong className="font-semibold">
                    <span className="sm:hidden">Grid off, lights on.</span>
                    <span className="hidden sm:inline">The grid is off and the lights are on.</span>
                  </strong>{" "}
                  {hours >= 24 ? (
                    "The essentials would run for more than a day."
                  ) : hours >= 12 ? (
                    <>
                      <span className="hidden sm:inline">From 18:00 the</span>
                      <span className="sm:hidden">The</span> essentials would run right through the night.
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">From 18:00 the</span>
                      <span className="sm:hidden">The</span> essentials would run until about {hhmm(18 + hours)}.
                    </>
                  )}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/70 sm:mt-2 sm:text-xs" aria-hidden="true">
                  <span className="num">18:00</span>
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-charge transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.min(100, (hours / 12) * 100)}%` }}
                    />
                  </span>
                  <span className="num">06:00</span>
                </div>
              </>
            ) : (
              <p className="text-xs leading-snug sm:text-sm">
                <strong className="font-semibold">
                  <span className="sm:hidden">Grid off, lights out.</span>
                  <span className="hidden sm:inline">The grid is off, and so are the lights.</span>
                </strong>{" "}
                <span className="hidden sm:inline">Panels make nothing at night: add</span>
                <span className="sm:hidden">Add</span> a battery in step 4 and they stay on.
              </p>
            ))}
        </div>
      </div>

      {/* Play the year, pick a month, or turn the grid off at night */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 px-2.5 py-2.5 sm:px-3">
        <button
          type="button"
          onClick={() => {
            setNight(false);
            setPlaying(!playing);
          }}
          aria-pressed={playing}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/25 px-3 text-xs font-semibold text-white transition-colors hover:border-white sm:text-sm"
        >
          {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          {playing ? "Pause" : "Play the year"}
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={night}
          onPointerEnter={() => setNightReady(true)}
          onFocus={() => setNightReady(true)}
          onClick={() => {
            setNightReady(true);
            setPlaying(false);
            setNight(!night);
          }}
          className={cn(
            "order-2 ml-auto inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors sm:order-3 sm:text-sm",
            night ? "border-sale bg-sale text-white" : "border-white/25 text-white hover:border-white",
          )}
        >
          <span className={cn("relative h-4 w-7 rounded-full transition-colors", night ? "bg-white/40" : "bg-white/25")} aria-hidden="true">
            <span className={cn("absolute top-0.5 size-3 rounded-full bg-white transition-[left] duration-300", night ? "left-3.5" : "left-0.5")} />
          </span>
          Night, grid off
        </button>
        <div
          role="group"
          aria-label="Month shown"
          className={cn("order-3 grid basis-full grid-cols-12 gap-0.5 transition-opacity sm:order-2 sm:basis-0 sm:grow", night && "opacity-40")}
        >
          {MONTHS.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setPlaying(false);
                setNight(false);
                onMonth(i);
              }}
              aria-pressed={!night && month === i}
              aria-label={`${name}${i === weakest ? ", the weakest month" : i === best ? ", the best month" : ""}`}
              title={`${name}${i === weakest ? ": the weakest month" : i === best ? ": the best month" : ""}`}
              className={cn(
                "relative h-8 rounded-md text-xs font-semibold transition-colors",
                !night && month === i ? "bg-sun text-ink" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              {name[0]}
              {i === weakest && (
                <span
                  className={cn("absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full", !night && month === i ? "bg-ink" : "bg-sale")}
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
