"use client";

import { Check, Wind } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MotionPref } from "@/lib/motion/pref";
import { cn } from "@/lib/utils";
import { chooseMotion, useMotion, useMotionChoice } from "./use-motion";

const LEVELS: { id: MotionPref; label: string; detail: string }[] = [
  { id: "full", label: "Full", detail: "Everything moves" },
  { id: "calm", label: "Gentle", detail: "Soft fades, nothing flies around" },
  { id: "off", label: "Off", detail: "No animation at all" },
];
const name = (m: MotionPref) => LEVELS.find((l) => l.id === m)!.label;

/** Header control: how much the site animates. */
export function MotionMenu({ className }: { className?: string }) {
  const motion = useMotion();
  const choice = useMotionChoice();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2 underline-offset-4 hover:bg-ink/10", className)}
        aria-label={`Animations: ${name(motion)}. Change`}
      >
        <Wind className="size-4" aria-hidden="true" />
        <span className="hidden lg:inline">Animations</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Animations</DropdownMenuLabel>
        {LEVELS.map((l) => (
          <DropdownMenuItem key={l.id} onSelect={() => chooseMotion(l.id)} className="items-start gap-3">
            <Check className={cn("mt-0.5 size-4", motion === l.id ? "opacity-100" : "opacity-0")} aria-hidden="true" />
            <span>
              <span className="block font-semibold">
                {l.label}
                {motion === l.id && <span className="sr-only"> (current)</span>}
              </span>
              <span className="block text-xs text-muted-foreground">{l.detail}</span>
            </span>
          </DropdownMenuItem>
        ))}
        {choice !== "auto" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => chooseMotion("auto")} className="text-xs text-muted-foreground">
              Follow my device&apos;s setting
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Footer control: the same three levels as buttons. */
export function MotionSwitch() {
  const motion = useMotion();
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Animations">
      <span className="inline-flex items-center gap-1.5">
        <Wind className="size-3.5" aria-hidden="true" /> Animations
      </span>
      <span className="inline-flex rounded-full border p-0.5">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => chooseMotion(l.id)}
            aria-pressed={motion === l.id}
            title={l.detail}
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold transition-colors",
              motion === l.id ? "bg-sun text-ink" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
      </span>
    </div>
  );
}

/**
 * One line under the top bar, only while the device (not the visitor) has
 * set animations to gentle. It is in the page from the start and shown by
 * CSS (html[data-motion-hint]), so it never makes the page jump.
 */
export function MotionHint() {
  return (
    <div className="motion-hint bg-ink text-ink-foreground">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-2 text-center text-[13px]">
        <p>
          <Wind className="mr-1.5 inline size-3.5 text-sun" aria-hidden="true" />
          Animations are set to gentle because your device asks for less motion.
        </p>
        <span className="flex items-center gap-3">
          <button type="button" onClick={() => chooseMotion("full")} className="rounded-full bg-sun px-3 py-0.5 font-semibold text-ink">
            See the full animations
          </button>
          <button type="button" onClick={() => chooseMotion("calm")} className="font-semibold underline underline-offset-4">
            Keep gentle
          </button>
        </span>
      </div>
    </div>
  );
}
