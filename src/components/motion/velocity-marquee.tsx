"use client";

import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/** Keeps v inside [min, max), wrapping around like a clock. */
const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * A row that loops round and round on its own, speeds up while the page
 * scrolls, and turns around when you scroll back up. The items are rendered
 * twice so the loop is seamless; the copy is hidden from screen readers and
 * keyboard. It stops while the pointer or keyboard focus is on it, and the
 * caller can pause it. With reduced motion it still turns, but slowly and
 * steadily: no scroll speed-up and no change of direction.
 */
export function VelocityMarquee({
  children,
  speed = 2,
  paused = false,
  label,
  className,
}: {
  children: React.ReactNode;
  /** Percent of the row per second; negative runs right to left. */
  speed?: number;
  paused?: boolean;
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotionAfterHydration();
  const [held, setHeld] = useState(false);
  const offset = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [0, 1000], [0, 5], { clamp: false });
  const direction = useRef(1);
  const x = useTransform(offset, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (paused || held) return;
    // Long gaps (a background tab) would make it jump; skip them.
    const dt = Math.min(delta, 100) / 1000;
    if (reduce) {
      offset.set(offset.get() + speed * 0.4 * dt);
      return;
    }
    const b = boost.get();
    if (b < 0) direction.current = -1;
    else if (b > 0) direction.current = 1;
    const step = direction.current * speed * dt;
    offset.set(offset.get() + step + step * Math.abs(b));
  });

  return (
    <div
      role="region"
      aria-label={label}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
      className={cn("relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]", className)}
    >
      <motion.div className="flex w-max will-change-transform" style={{ x }}>
        <ul className="flex shrink-0 items-center">{children}</ul>
        <ul className="flex shrink-0 items-center" aria-hidden="true" inert>
          {children}
        </ul>
      </motion.div>
    </div>
  );
}

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/**
 * The reduced-motion setting, but `false` while hydrating, so the browser's
 * first render matches the server's HTML (the server can't know the setting).
 */
function useReducedMotionAfterHydration() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
