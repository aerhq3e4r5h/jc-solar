"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ToolTab = { id: string; label: string; hint: string; content: React.ReactNode };

/**
 * The home page's two estimators in one place, a tab each. A link to
 * "/#planner" or "/#savings" opens that tab. Both stay mounted, so what a
 * visitor entered in one is still there when they come back to it.
 */
export function ToolsTabs({ tabs }: { tabs: ToolTab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  const move = (from: number, by: number) => {
    const next = tabs[(from + by + tabs.length) % tabs.length];
    setActive(next.id);
    buttons.current[next.id]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Estimators" className="grid gap-2 sm:inline-grid sm:grid-flow-col sm:auto-cols-fr">
        {tabs.map((t, i) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => void (buttons.current[t.id] = el)}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => {
                const by = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                if (!by) return;
                e.preventDefault();
                move(i, by);
              }}
              className={cn(
                "rounded-xl border px-5 py-3.5 text-left transition-colors",
                on ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-foreground/40",
              )}
            >
              <span className="block font-semibold">{t.label}</span>
              <span className={cn("mt-0.5 block text-sm", on ? "text-ink-foreground/70" : "text-muted-foreground")}>{t.hint}</span>
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={t.id !== active} className="mt-6">
          {t.content}
        </div>
      ))}
    </div>
  );
}
