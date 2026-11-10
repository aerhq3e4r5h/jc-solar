"use client";

import { MOTION_LEVEL, type MotionPref } from "@/lib/motion/pref";

// The level is fixed for the whole site (see src/lib/motion/pref.ts), so
// these simply report it. Components ask through here rather than assuming
// "full", so changing the one constant changes every animation with it.

/** The site's motion level, for code outside React (e.g. fly-to-cart). */
export function currentMotion(): MotionPref {
  return MOTION_LEVEL;
}

/** The site's motion level: "full", "calm" or "off". */
export function useMotion(): MotionPref {
  return MOTION_LEVEL;
}
