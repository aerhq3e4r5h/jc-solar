"use client";

import { MotionConfig } from "motion/react";
import { useMotion } from "./use-motion";

/**
 * Tells the motion library the site's motion level: on "full" everything
 * animates; on "calm" and "off" it skips movement (transforms, layout) and
 * keeps fades. Scroll reveals are plain CSS: see [data-reveal] in globals.css
 * and <Words> in ./words.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const motion = useMotion();
  return (
    <MotionConfig reducedMotion={motion === "full" ? "never" : "always"} transition={motion === "off" ? { duration: 0 } : undefined}>
      {children}
    </MotionConfig>
  );
}
