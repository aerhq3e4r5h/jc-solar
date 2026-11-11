import { PROVINCES } from "@/lib/checkout/schema";

// What solar panels make through the year, province by province, and how to
// size an array so that it still covers a home in its weakest month.
//
// SOLAR_YIELD is the average energy a day from 1 kW of panels, for each
// month (January first), in kWh. Source: PVGIS 5.2, European Commission
// Joint Research Centre (https://re.jrc.ec.europa.eu/pvg_tools/), queried
// on 11 November 2026 for each province's main city: a fixed, north-facing
// roof at 20°, crystalline silicon panels, 14% system losses.
//
// Two things the numbers show:
//  - In the Western and Eastern Cape, June makes about half of December.
//  - In the summer-rainfall north (Gauteng, Limpopo, North West, Mpumalanga)
//    output is nearly flat: clear, dry winters make up for the short days,
//    and the weakest month is April or even November.
// So we never apply one "winter factor": each province has its own weakest month.

export type Province = (typeof PROVINCES)[number];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const SOLAR_YIELD: Record<Province, { city: string; monthly: number[] }> = {
  "Eastern Cape": { city: "Gqeberha", monthly: [5.22, 5.02, 4.72, 3.95, 3.27, 3.14, 3.24, 3.76, 4.54, 4.85, 5.19, 5.41] },
  "Free State": { city: "Bloemfontein", monthly: [5.1, 4.99, 4.88, 4.44, 4.37, 4.22, 4.51, 4.81, 5.29, 5.37, 5.52, 5.37] },
  Gauteng: { city: "Johannesburg", monthly: [4.54, 4.7, 4.43, 4.25, 4.53, 4.44, 4.73, 5.04, 5.39, 5.15, 5.0, 4.78] },
  "KwaZulu-Natal": { city: "Durban", monthly: [4.45, 4.71, 4.3, 3.84, 3.75, 3.55, 3.7, 3.83, 3.97, 3.91, 3.96, 4.21] },
  Limpopo: { city: "Polokwane", monthly: [4.47, 4.71, 4.44, 4.17, 4.56, 4.54, 4.72, 4.94, 5.3, 5.03, 4.65, 4.47] },
  Mpumalanga: { city: "Mbombela", monthly: [4.08, 4.42, 4.15, 3.89, 4.17, 4.13, 4.26, 4.4, 4.44, 3.95, 3.86, 3.96] },
  "North West": { city: "Rustenburg", monthly: [4.54, 4.76, 4.43, 4.18, 4.5, 4.43, 4.69, 4.96, 5.26, 5.02, 4.79, 4.58] },
  "Northern Cape": { city: "Kimberley", monthly: [5.07, 4.99, 4.92, 4.47, 4.36, 4.17, 4.47, 4.82, 5.29, 5.36, 5.54, 5.35] },
  "Western Cape": { city: "Cape Town", monthly: [6.03, 5.87, 5.15, 4.24, 3.07, 2.65, 3.02, 3.41, 4.27, 5.28, 5.76, 6.06] },
};

/** Used until the visitor says where their roof is. */
export const DEFAULT_PROVINCE: Province = "Gauteng";

export const isProvince = (v: unknown): v is Province => typeof v === "string" && (PROVINCES as readonly string[]).includes(v);

export type SolarYear = {
  city: string;
  /** kWh a day per kW of panels, January first. */
  monthly: number[];
  /** The same over the whole year. */
  average: number;
  weakest: { month: number; name: string; yield: number };
  best: { month: number; name: string; yield: number };
};

/** A province's solar year: every month, the average, and its weakest and best months. */
export function solarYear(province: Province): SolarYear {
  const { city, monthly } = SOLAR_YIELD[province];
  const at = (month: number) => ({ month, name: MONTHS[month], yield: monthly[month] });
  let low = 0;
  let high = 0;
  monthly.forEach((v, i) => {
    if (v < monthly[low]) low = i;
    if (v > monthly[high]) high = i;
  });
  const average = monthly.reduce((sum, v, i) => sum + v * DAYS[i], 0) / 365;
  return { city, monthly, average, weakest: at(low), best: at(high) };
}

/** How much of a home's electricity solar can replace: only daytime use, unless a battery stores the rest. */
export const SOLAR_SHARE = { withBattery: 0.85, withoutBattery: 0.45 } as const;
const DAYS_IN_MONTH = 30.4;

/** Panels of `panelWatts` needed to make `needKwh` a day when each kW of panels makes `yieldPerKw`. */
export function panelsFor(needKwh: number, panelWatts: number, yieldPerKw: number): number {
  if (needKwh <= 0 || panelWatts <= 0 || yieldPerKw <= 0) return 1;
  return Math.max(1, Math.ceil(needKwh / ((panelWatts / 1000) * yieldPerKw) - 1e-9));
}

export type HomeSizing = {
  year: SolarYear;
  /** What the home uses in a day, kWh. */
  dailyUse: number;
  /** The part of that solar is asked to cover, kWh a day. */
  need: number;
  share: number;
  /** Panels to cover the need in the weakest month (what we recommend), the best month, and on the yearly average. */
  panels: { weakest: number; best: number; average: number };
};

/**
 * From a monthly bill to a number of panels. The recommendation is the
 * weakest month's figure: an array sized on the yearly average comes up
 * short for part of every year.
 */
export function sizeForHome(input: { province: Province; billRand: number; tariff: number; panelWatts: number; battery: boolean }): HomeSizing {
  const year = solarYear(input.province);
  const share = input.battery ? SOLAR_SHARE.withBattery : SOLAR_SHARE.withoutBattery;
  const dailyUse = input.tariff > 0 ? input.billRand / input.tariff / DAYS_IN_MONTH : 0;
  const need = dailyUse * share;
  return {
    year,
    dailyUse,
    need,
    share,
    panels: {
      weakest: panelsFor(need, input.panelWatts, year.weakest.yield),
      best: panelsFor(need, input.panelWatts, year.best.yield),
      average: panelsFor(need, input.panelWatts, year.average),
    },
  };
}

/**
 * For when the province isn't known: the middle province's weakest month
 * (for sizing) and the average across provinces (for savings).
 */
export const TYPICAL_YIELD = (() => {
  const years = PROVINCES.map(solarYear);
  const lows = years.map((y) => y.weakest.yield).sort((a, b) => a - b);
  return { weakest: lows[Math.floor(lows.length / 2)], average: years.reduce((sum, y) => sum + y.average, 0) / years.length };
})();

/**
 * The energy an array of `kw` usefully supplies over a year (kWh) when the
 * home can take at most `needKwh` a day from it: in good months the surplus
 * is not counted, in weak months the shortfall is.
 */
export function usefulPerYear(province: Province, kw: number, needKwh: number): number {
  return SOLAR_YIELD[province].monthly.reduce((sum, y, i) => sum + DAYS[i] * Math.min(y * kw, needKwh), 0);
}

/** What an array of `kw` makes each day, month by month, in a province (kWh). */
export const monthlyOutput = (province: Province, kw: number) => SOLAR_YIELD[province].monthly.map((y) => y * kw);

// How high the midday sun stands, month by month. This is geometry, not
// weather: it explains why winter days are weaker (a lower sun, a shorter
// day), while SOLAR_YIELD above says by how much once cloud is counted.

/** Degrees south of the equator, for each province's main city. */
const LATITUDE: Record<Province, number> = {
  "Eastern Cape": 33.96,
  "Free State": 29.12,
  Gauteng: 26.2,
  "KwaZulu-Natal": 29.86,
  Limpopo: 23.9,
  Mpumalanga: 25.47,
  "North West": 25.67,
  "Northern Cape": 28.74,
  "Western Cape": 33.92,
};
/** Degrees east, for the same cities. South African time is set for 30° east, so the sun is at its highest a little after twelve further west. */
const LONGITUDE: Record<Province, number> = {
  "Eastern Cape": 25.6,
  "Free State": 26.21,
  Gauteng: 28.05,
  "KwaZulu-Natal": 31.03,
  Limpopo: 29.45,
  Mpumalanga: 30.97,
  "North West": 27.24,
  "Northern Cape": 24.77,
  "Western Cape": 18.42,
};
const TILT = 23.44; // the earth's axis, degrees
const RAD = Math.PI / 180;

/** The sun's declination in the middle of a month: degrees north (+) or south (-) of the equator. */
function declination(month: number): number {
  const day = DAYS.slice(0, month).reduce((sum, d) => sum + d, 0) + DAYS[month] / 2;
  return -TILT * Math.cos((2 * Math.PI * (day + 10)) / 365);
}

/** Degrees above the northern horizon of the midday sun, in the middle of a month. Every city here lies south of the tropic, so the sun is always to the north. */
export function noonSunHeight(province: Province, month: number): number {
  return 90 - LATITUDE[province] - declination(month);
}

/**
 * Sunrise, sunset and the sun's highest point, as hours on the clock, for
 * the middle of a month. Good to about a quarter of an hour: it leaves out
 * the few minutes the sun runs fast or slow through the year.
 */
export function daylight(province: Province, month: number): { rise: number; set: number; noon: number; hours: number } {
  const half = Math.acos(Math.tan(LATITUDE[province] * RAD) * Math.tan(declination(month) * RAD)) / RAD / 15;
  const noon = 12 + (30 - LONGITUDE[province]) / 15;
  return { rise: noon - half, set: noon + half, noon, hours: half * 2 };
}

/** Where a month sits between the year's lowest midday sun (0, late June) and its highest (1, late December). The same for every province. */
export function sunLevel(month: number): number {
  return (TILT - declination(month)) / (2 * TILT);
}
