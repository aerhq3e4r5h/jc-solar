"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

/** A number that rolls up or down (like a slot machine) when it changes. */
export function RollingNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  // Which way to roll: remember the last value (updated during render, the React way).
  const [prev, setPrev] = useState(value);
  const [dir, setDir] = useState(1);
  if (value !== prev) {
    setDir(value > prev ? 1 : -1);
    setPrev(value);
  }
  return (
    <span className={`relative inline-flex h-[1.4em] items-center justify-center overflow-hidden ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          initial={reduce ? false : { y: `${dir * 100}%`, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: `${dir * -100}%`, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className="num"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
