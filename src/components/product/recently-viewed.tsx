"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

// The last products this visitor looked at, kept in this browser only.
const KEY = "jc-recent";
const MAX = 8;

export type Viewed = { id: string; url: string; name: string; brand: string | null; image: string | null };

const listeners = new Set<() => void>();
let cache: Viewed[] | null = null;
const EMPTY: Viewed[] = [];

function read(): Viewed[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((v) => typeof v?.id === "string" && typeof v?.url === "string").slice(0, MAX) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function remember(item: Viewed) {
  const next = [item, ...read().filter((v) => v.id !== item.id)].slice(0, MAX);
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: keep it for this page view only.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Records a product view. Renders nothing. */
export function TrackView({ item }: { item: Viewed }) {
  useEffect(() => {
    remember(item);
    // Record once per product, with the price seen now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return null;
}

/** A row of recently viewed products (hidden until there are some). */
export function RecentlyViewed({ excludeId, className }: { excludeId?: string; className?: string }) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY).filter((v) => v.id !== excludeId);
  if (items.length === 0) return null;
  return (
    <section className={className} aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="text-2xl font-bold">
        Recently viewed
      </h2>
      <ul className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((v) => (
          <li key={v.id} className="w-40 shrink-0 snap-start sm:w-48">
            <Link href={v.url} className="group block">
              <span className="relative block aspect-square overflow-hidden rounded-xl bg-tile">
                {v.image && <Image src={v.image} alt="" fill sizes="192px" className="object-contain p-2 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.04]" />}
              </span>
              {v.brand && <span className="mt-2 block text-xs font-semibold text-muted-foreground">{v.brand}</span>}
              {/* No price here: a stored price could be out of date. The product page shows the current one. */}
              <span className="line-clamp-2 text-sm font-medium group-hover:underline">{v.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
