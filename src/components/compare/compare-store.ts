"use client";

import { useSyncExternalStore } from "react";

// Products picked for comparison, kept in this browser only (a
// convenience, not data we need to store). Up to 3, same category.

export const MAX_COMPARE = 3;
const KEY = "jc-compare";

export type CompareItem = { slug: string; category: string; name: string };

const listeners = new Set<() => void>();
let cache: CompareItem[] | null = null;
const EMPTY: CompareItem[] = [];

function read(): CompareItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((i) => typeof i?.slug === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CompareItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable (private mode): keep the in-memory list.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCompare() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    items,
    has: (slug: string) => items.some((i) => i.slug === slug),
    toggle(item: CompareItem): "added" | "removed" | "full" | "other-category" {
      if (items.some((i) => i.slug === item.slug)) {
        write(items.filter((i) => i.slug !== item.slug));
        return "removed";
      }
      if (items.length && items[0].category !== item.category) {
        write([item]);
        return "other-category";
      }
      if (items.length >= MAX_COMPARE) return "full";
      write([...items, item]);
      return "added";
    },
    remove: (slug: string) => write(items.filter((i) => i.slug !== slug)),
    clear: () => write([]),
  };
}
