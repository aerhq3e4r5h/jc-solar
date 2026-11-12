// How far a battery is run down, in one place.
//
// The lithium batteries we sell are set up to stop discharging at 30%
// charge. Keeping the last 30% in the battery is what gives it a long cycle
// life, so every battery size on the site is worked out from the 70% that
// is actually used: the energy a home needs from its battery, divided by
// 0.7, is the rated (nameplate) capacity to buy.

export const BATTERY = {
  /** The lowest a lithium battery is run down to: share of its rated capacity left in it. */
  floor: 0.3,
  /** Share of a lithium battery's rated capacity that is used: 1 - floor. */
  usable: 0.7,
  /** A lead-acid battery wears out fast below half. */
  leadAcidUsable: 0.5,
} as const;

/** kWh you get out of a lithium battery with this rated capacity. */
export const usableKwh = (ratedKwh: number) => ratedKwh * BATTERY.usable;

/** Rated capacity to buy for this many kWh of use. */
export const ratedKwhFor = (neededKwh: number) => neededKwh / BATTERY.usable;

/** How many batteries of one size it takes to supply `neededKwh` without going below the floor. At least one. */
export function batteriesFor(neededKwh: number, eachRatedKwh: number): number {
  if (!(eachRatedKwh > 0)) return 1;
  return Math.max(1, Math.ceil(ratedKwhFor(neededKwh) / eachRatedKwh - 1e-9));
}

/** "30%" and "70%", for copy. */
export const BATTERY_FLOOR_PCT = Math.round(BATTERY.floor * 100);
export const BATTERY_USABLE_PCT = Math.round(BATTERY.usable * 100);
