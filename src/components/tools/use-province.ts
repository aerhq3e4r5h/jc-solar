"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_PROVINCE, isProvince, type Province } from "@/lib/solar/seasons";

// Where the visitor's roof is. It is the same fact as where their order is
// delivered, so it lives in the cookie the delivery estimate already keeps
// (jc_delivery): pick a province in either place and both remember it.

const COOKIE = "jc_delivery";
/** Fired on window when the saved province changes. */
export const PROVINCE_EVENT = "ga-province";

function saved(): { province?: unknown; postalCode?: unknown } {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1))) ?? {};
  } catch {
    return {};
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener(PROVINCE_EVENT, cb);
  return () => window.removeEventListener(PROVINCE_EVENT, cb);
};
const read = (): Province => {
  const p = saved().province;
  return isProvince(p) ? p : DEFAULT_PROVINCE;
};

/** The visitor's province (Gauteng until they choose), and a way to change it. */
export function useProvince(): [Province, (p: Province) => void] {
  const province = useSyncExternalStore(subscribe, read, () => DEFAULT_PROVINCE);
  const set = (p: Province) => {
    const old = saved();
    // A postal code belongs to the province it was entered for.
    const postalCode = old.province === p && typeof old.postalCode === "string" ? old.postalCode : "";
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify({ province: p, postalCode }))}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(PROVINCE_EVENT));
  };
  return [province, set];
}
