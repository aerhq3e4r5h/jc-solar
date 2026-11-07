"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Swipeable row with arrow buttons. Children should be <li> items. */
export function Carousel({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }, []);
  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className={cn("relative", className)}>
      <div className="mb-4 flex justify-end gap-2">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => go(-1)} disabled={edge.start} aria-label="Previous products">
          <ArrowLeft />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => go(1)} disabled={edge.end} aria-label="More products">
          <ArrowRight />
        </Button>
      </div>
      <ul
        ref={ref}
        aria-label={label}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden [&>li]:w-[70%] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[42%] lg:[&>li]:w-[calc(25%-15px)]"
      >
        {children}
      </ul>
    </div>
  );
}
