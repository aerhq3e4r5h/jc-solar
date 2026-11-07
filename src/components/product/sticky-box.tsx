"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticks in view on large screens. When it's taller than the window, it
 * scrolls with the page until its bottom is visible, then sticks there, so
 * nothing in it is ever out of reach.
 */
export function StickyBox({ children, className, offset = 96 }: { children: React.ReactNode; className?: string; offset?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(offset);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setTop(Math.min(offset, window.innerHeight - el.offsetHeight - 16));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [offset]);

  return (
    <div ref={ref} className={cn("lg:sticky", className)} style={{ top }}>
      {children}
    </div>
  );
}
