"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * On large screens the section pins in place and scrolling down slides the
 * row sideways. Everywhere else (phones, reduced motion, no JavaScript) it's
 * an ordinary row you can swipe.
 */
export function HorizontalScroll({ header, children, className }: { header: React.ReactNode; children: React.ReactNode; className?: string }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -distance]);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const measure = () => {
      const el = track.current;
      setDistance(wide.matches && el ? Math.max(0, el.scrollWidth - el.clientWidth) : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    wide.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, []);

  const pinned = distance > 0;
  return (
    <section ref={section} className={cn("relative", className)} style={pinned ? { height: `calc(100svh + ${distance}px)` } : undefined}>
      <div className={cn(pinned && "sticky top-0 flex h-svh flex-col justify-center overflow-hidden")}>
        <div className="container-page">{header}</div>
        <motion.div
          ref={track}
          style={pinned ? { x } : undefined}
          className={cn(
            "container-page flex gap-5 pb-4",
            pinned ? "overflow-visible" : "snap-x snap-mandatory scroll-px-4 overflow-x-auto [scrollbar-width:none] sm:scroll-px-6 [&::-webkit-scrollbar]:hidden",
          )}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
