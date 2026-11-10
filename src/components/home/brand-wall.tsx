"use client";

import { Pause, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useMotion } from "@/components/motion/use-motion";
import { VelocityMarquee } from "@/components/motion/velocity-marquee";
import { slugify } from "@/lib/catalogue/normalise";

/** Every brand in the shop, in big type, looping in two rows that run opposite ways. */
export function BrandWall({ brands }: { brands: string[] }) {
  // Starts paused when animations are off; the button still lets you play it.
  const still = useMotion() === "off";
  const [choice, setPaused] = useState<boolean | null>(null);
  const paused = choice ?? still;
  const half = Math.ceil(brands.length / 2);
  const rows = [brands.slice(0, half), brands.slice(half)];

  return (
    <section className="overflow-hidden border-y py-14" aria-labelledby="brands-heading">
      <div className="container-page mb-8 flex items-center justify-between gap-4">
        <h2 id="brands-heading" className="text-lg font-semibold [font-stretch:100%]">
          Brands we stock
        </h2>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
          className="inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
          {paused ? "Play" : "Pause"}
          <span className="sr-only"> the brand list</span>
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, r) => (
          <VelocityMarquee key={r} label={r === 0 ? "Brands" : "More brands"} speed={r === 0 ? -1.6 : 1.6} paused={paused}>
            {row.map((b) => (
              <li key={b} className="flex items-center">
                <Link
                  href={`/brands/${slugify(b)}`}
                  transitionTypes={["nav-forward"]}
                  className="type-wide px-6 text-4xl whitespace-nowrap text-foreground/20 transition-colors duration-300 hover:text-foreground sm:text-6xl"
                >
                  {b}
                </Link>
                <span className="size-3 shrink-0 rotate-45 bg-sun" aria-hidden="true" />
              </li>
            ))}
          </VelocityMarquee>
        ))}
      </div>
    </section>
  );
}
