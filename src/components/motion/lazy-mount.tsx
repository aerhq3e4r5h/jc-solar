"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders `children` only once its spot comes within `margin` of the screen,
 * so heavy sections (and the code behind them) load when they're needed.
 * The placeholder keeps the same height, so the page doesn't jump.
 */
export function LazyMount({
  children,
  placeholderClassName,
  margin = "800px",
}: {
  children: React.ReactNode;
  placeholderClassName: string;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Very old browsers: just show it.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off fallback when there's no IntersectionObserver
    if (!("IntersectionObserver" in window)) return void setShow(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShow(true), io.disconnect()), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return show ? children : <div ref={ref} className={placeholderClassName} aria-hidden="true" />;
}
