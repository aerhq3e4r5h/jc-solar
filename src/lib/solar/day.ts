import { daylight, MONTHS, noonSunHeight, panelsFor, SOLAR_SHARE, solarYear, type Province } from "./seasons";

// One day of a home on solar, hour by hour: what the panels make, what the
// house uses, what the battery stores and gives back, and what is left for
// the grid. The home page tells this as a story, for the best and the
// weakest month of the visitor's province and for two sizes of array, so
// that the reason we size for the weakest month can be seen.
//
// The day's solar total is the province's real average for that month
// (PVGIS, see seasons.ts); how it is spread over the day, and the house's
// own habits, are a plain illustration.

/** The example home. */
export const STORY = {
  /** Watts of one panel. */ panelWatts: 550,
  /** The battery's size, kWh. */ batteryKwh: 10,
  /** Kept back for a power cut while the grid is on: share of the battery. */ reserve: 0.2,
  /** The lowest the battery is run, in a power cut: share of the battery. */ floor: 0.1,
  /** Load shedding in the story: from and to, hours on the clock. */ shedding: [18, 20.5] as const,
} as const;

/** The roof the yields in seasons.ts were worked out for, degrees. */
const ROOF_TILT = 20;

/** Linear interpolation through [hour, value] points. */
function curve(points: readonly (readonly [number, number])[], h: number): number {
  if (h <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [h1, v1] = points[i];
    const [h0, v0] = points[i - 1];
    if (h <= h1) return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0);
  }
  return points[points.length - 1][1];
}

const HOUSE: readonly (readonly [number, number])[] = [
  [0, 0.5],
  [5, 0.4],
  [6.5, 1.0],
  [9, 0.8],
  [17, 0.9],
  [19, 1.5],
  [22, 1.0],
  [24, 0.5],
];
/** What the house is using, kW: low overnight, a morning bump, highest in the evening. About 20 kWh over the day. */
export const houseKw = (h: number) => curve(HOUSE, ((h % 24) + 24) % 24);

const STEP = 1 / 20; // three minutes
const STEPS = Math.round(24 / STEP);
/** What the house uses in a day, kWh. */
export const HOUSE_KWH = Array.from({ length: STEPS }, (_, i) => houseKw((i + 0.5) * STEP)).reduce((sum, kw) => sum + kw * STEP, 0);

export const gridOff = (h: number) => h >= STORY.shedding[0] && h < STORY.shedding[1];

/** The shape of a day's sun between sunrise and sunset: 0 at both ends, 1 at its highest. */
const sunShape = (h: number, rise: number, set: number) => (h > rise && h < set ? Math.pow(Math.sin((Math.PI * (h - rise)) / (set - rise)), 1.3) : 0);

export type Moment = {
  /** kW from the panels. */ solar: number;
  /** kW the house is using. */ house: number;
  /** kW into the battery (+) or out of it (-). */ battery: number;
  /** How full the battery is, 0 to 1. */ charge: number;
  /** kW bought from the grid. */ grid: number;
  /** kW of sun with nowhere to go: the house is supplied and the battery is full. */ spare: number;
  /** kW the house wants and nothing can supply: a power cut with an empty battery. */ short: number;
};

export type DaySim = {
  /** kW of panels. */ kwp: number;
  rise: number;
  set: number;
  /** The state of things at an hour on the clock (0 to 24). */
  at: (h: number) => Moment;
  /** Over the whole day, kWh. */
  totals: { solar: number; house: number; grid: number; spare: number; short: number };
  /** Share of the day's use that did not come from the grid, 0 to 1. */
  ownShare: number;
  /** The fullest the battery gets, 0 to 1, and when it first gets there. */
  peak: { charge: number; hour: number };
  /** When, after sunset, the battery is down to its reserve and the grid takes over; null if it lasts to sunrise. */
  reserveAt: number | null;
  /** When the lights go out in the power cut, if they do. */
  darkAt: number | null;
};

/**
 * A day in its steady state (it starts with whatever the night before
 * left in the battery). Solar goes to the house first, then the battery;
 * the battery covers the house when the sun can't, down to its reserve
 * while the grid is on and lower when it is off.
 */
export function simulateDay(input: { kwp: number; yieldPerKw: number; rise: number; set: number }): DaySim {
  const { kwp, yieldPerKw, rise, set } = input;
  const cap = STORY.batteryKwh;
  // Scale the day's shape so that its total is the month's real average.
  let area = 0;
  for (let i = 0; i < STEPS; i++) area += sunShape((i + 0.5) * STEP, rise, set) * STEP;
  const peakKw = area > 0 ? (kwp * yieldPerKw) / area : 0;

  let stored = cap * STORY.reserve;
  let frames: Moment[] = [];
  // A few days in a row: by then each day starts as the one before ended.
  for (let day = 0; day < 6; day++) {
    const before = stored;
    frames = [];
    for (let i = 0; i < STEPS; i++) {
      const h = (i + 0.5) * STEP;
      const solar = peakKw * sunShape(h, rise, set);
      const house = houseKw(h);
      const off = gridOff(h);
      let battery = 0;
      let grid = 0;
      let spare = 0;
      let short = 0;
      if (solar >= house) {
        battery = Math.min(solar - house, (cap - stored) / STEP);
        spare = solar - house - battery;
      } else {
        const lowest = cap * (off ? STORY.floor : STORY.reserve);
        const out = Math.min(house - solar, Math.max(0, stored - lowest) / STEP);
        battery = -out;
        if (off) short = house - solar - out;
        else grid = house - solar - out;
      }
      stored += battery * STEP;
      frames.push({ solar, house, battery, charge: stored / cap, grid, spare, short });
    }
    if (Math.abs(stored - before) < 0.005) break;
  }

  const sum = (pick: (m: Moment) => number) => frames.reduce((total, m) => total + pick(m) * STEP, 0);
  const totals = { solar: sum((m) => m.solar), house: sum((m) => m.house), grid: sum((m) => m.grid), spare: sum((m) => m.spare), short: sum((m) => m.short) };
  const hourOf = (i: number) => (i + 1) * STEP;

  let top = 0;
  frames.forEach((m, i) => {
    if (m.charge > frames[top].charge + 1e-6) top = i;
  });
  // After sunset: the first moment the grid has to help (the battery is at its reserve). It may be after midnight.
  let reserveAt: number | null = null;
  const from = Math.ceil(set / STEP);
  for (let k = 0; k < STEPS; k++) {
    const i = (from + k) % STEPS;
    const h = (i + 0.5) * STEP;
    if (h > rise && h < set) break; // the sun is back
    if (frames[i].grid > 0.01) {
      reserveAt = hourOf(i) - STEP;
      break;
    }
  }
  const dark = frames.findIndex((m) => m.short > 0.01);

  const at = (h: number): Moment => {
    const x = Math.min(STEPS - 1, Math.max(0, h / STEP - 0.5));
    const i = Math.floor(x);
    const j = Math.min(STEPS - 1, i + 1);
    const t = x - i;
    const a = frames[i];
    const b = frames[j];
    const mix = (p: number, q: number) => p + (q - p) * t;
    return {
      solar: mix(a.solar, b.solar),
      house: mix(a.house, b.house),
      battery: mix(a.battery, b.battery),
      charge: mix(a.charge, b.charge),
      grid: mix(a.grid, b.grid),
      spare: mix(a.spare, b.spare),
      short: mix(a.short, b.short),
    };
  };

  return {
    kwp,
    rise,
    set,
    at,
    totals,
    ownShare: totals.house > 0 ? 1 - (totals.grid + totals.short) / totals.house : 1,
    peak: { charge: frames[top].charge, hour: hourOf(top) },
    reserveAt,
    darkAt: dark < 0 ? null : hourOf(dark) - STEP,
  };
}

export type StoryMonth = {
  month: number;
  name: string;
  /** kWh a day from each kW of panels. */ yield: number;
  rise: number;
  set: number;
  /** Degrees above the horizon of the midday sun. */ sunHeight: number;
  /** How much of the month's shortfall against the best month is weather rather than the sun's path: 0 (none) to 1. Only used to draw clouds. */
  cloud: number;
  /** Panels that cover the example home in this month. */ panels: number;
};
export type Which = "best" | "weakest";

/**
 * The story for a province: its best and weakest months for solar, the
 * number of panels that covers the example home in each, and the day
 * that results for every pairing of month and array.
 */
export function dayStory(province: Province) {
  const year = solarYear(province);
  const need = HOUSE_KWH * SOLAR_SHARE.withBattery;
  // What the sun's path alone would give a roof tilted 20° to the north: longer days and a squarer midday sun make more.
  const geometry = (month: number) => daylight(province, month).hours * Math.cos(((90 - noonSunHeight(province, month) - ROOF_TILT) * Math.PI) / 180);
  const describe = (m: { month: number; yield: number }): StoryMonth => ({
    month: m.month,
    name: MONTHS[m.month],
    yield: m.yield,
    ...daylight(province, m.month),
    sunHeight: noonSunHeight(province, m.month),
    cloud: Math.min(1, Math.max(0, 1 - m.yield / year.best.yield / (geometry(m.month) / geometry(year.best.month)))),
    panels: panelsFor(need, STORY.panelWatts, m.yield),
  });
  const months: Record<Which, StoryMonth> = { best: describe(year.best), weakest: describe(year.weakest) };
  const run = (month: Which, sizedFor: Which) =>
    simulateDay({
      kwp: (months[sizedFor].panels * STORY.panelWatts) / 1000,
      yieldPerKw: months[month].yield,
      rise: months[month].rise,
      set: months[month].set,
    });
  /** days[month][sizedFor] */
  const days: Record<Which, Record<Which, DaySim>> = {
    best: { best: run("best", "best"), weakest: run("best", "weakest") },
    weakest: { best: run("weakest", "best"), weakest: run("weakest", "weakest") },
  };
  return { province, city: year.city, need, months, days };
}
export type DayStory = ReturnType<typeof dayStory>;

/** "14:30" from 14.5. Rounds down to the quarter hour, as the story's clock does. */
export function clock(h: number): string {
  const hh = Math.floor(h + 1e-9) % 24;
  const mm = Math.floor(((h + 1e-9 - Math.floor(h + 1e-9)) * 60) / 15) * 15;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
