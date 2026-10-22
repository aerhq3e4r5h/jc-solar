"use client";

import { MotionConfig, motion, type Variants } from "motion/react";

// Scroll-triggered entrances. MotionProvider (in the site layout) honours
// the visitor's reduced-motion setting: movement is dropped, only the fade stays.

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const viewport = { once: true, margin: "0px 0px -8% 0px" } as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp} initial="hidden" whileInView="shown" viewport={viewport}>
      {children}
    </motion.div>
  );
}

/** A list whose items rise in one after another. Children should be <RevealItem>. */
export function RevealList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.ul
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={viewport}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.07 } } }}
    >
      {children}
    </motion.ul>
  );
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.li className={className} variants={fadeUp}>
      {children}
    </motion.li>
  );
}
