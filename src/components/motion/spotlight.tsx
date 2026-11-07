"use client";

import { useEffect, useRef } from "react";

/**
 * A faint light that follows the mouse across a dark band. Mouse only (not
 * touch), very low intensity, and absent with reduced motion. Place inside a
 * `relative` parent; it covers the parent and ignores clicks.
 */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const move = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      el.style.setProperty("--x", `${e.clientX - r.left}px`);
      el.style.setProperty("--y", `${e.clientY - r.top}px`);
      el.style.opacity = "1";
    };
    const leave = () => (el.style.opacity = "0");
    parent.addEventListener("pointermove", move);
    parent.addEventListener("pointerleave", leave);
    return () => {
      parent.removeEventListener("pointermove", move);
      parent.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
      style={{ background: "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), oklch(0.86 0.17 88 / 0.07), transparent 70%)" }}
    />
  );
}
