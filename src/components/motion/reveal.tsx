"use client";

import { MotionConfig } from "motion/react";

// Sections render immediately: no scroll-triggered fades, so content is
// visible to every visitor and crawler. The hero's load sequence is the
// site's one orchestrated motion. These wrappers keep the page markup tidy.

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function RevealList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={className}>{children}</ul>;
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <li className={className}>{children}</li>;
}
