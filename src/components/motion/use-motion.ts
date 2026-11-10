"use client";

import { useSyncExternalStore } from "react";
import { MOTION_EVENT, MOTION_KEY, type MotionChoice, type MotionPref } from "@/lib/motion/pref";

const subscribe = (cb: () => void) => {
  window.addEventListener(MOTION_EVENT, cb);
  return () => window.removeEventListener(MOTION_EVENT, cb);
};

/** The level in force right now (for code outside React, e.g. fly-to-cart). */
export function currentMotion(): MotionPref {
  const m = document.documentElement.dataset.motion;
  return m === "calm" || m === "off" ? m : "full";
}

function currentChoice(): MotionChoice {
  try {
    const s = localStorage.getItem(MOTION_KEY);
    return s === "full" || s === "calm" || s === "off" ? s : "auto";
  } catch {
    return "auto";
  }
}

/**
 * The motion level: "full", "calm" or "off". The server can't know it, so
 * the first render says "full" and corrects itself as the page hydrates;
 * anything that must be right before then is done in CSS with [data-motion].
 */
export function useMotion(): MotionPref {
  return useSyncExternalStore(subscribe, currentMotion, () => "full");
}

/** What the visitor picked in the Motion menu, or "auto" when the device decides. */
export function useMotionChoice(): MotionChoice {
  return useSyncExternalStore(subscribe, currentChoice, () => "auto");
}

/** Save the visitor's choice ("auto" forgets it) and apply it at once. */
export function chooseMotion(choice: MotionChoice) {
  try {
    if (choice === "auto") localStorage.removeItem(MOTION_KEY);
    else localStorage.setItem(MOTION_KEY, choice);
  } catch {
    // Private windows can refuse storage: the choice then lasts for this page only.
  }
  const d = document.documentElement;
  d.dataset.motion = choice === "auto" ? (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "calm" : "full") : choice;
  delete d.dataset.motionHint;
  window.dispatchEvent(new Event(MOTION_EVENT));
}
