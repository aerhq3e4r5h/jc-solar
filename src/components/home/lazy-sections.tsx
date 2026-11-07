"use client";

import dynamic from "next/dynamic";
import { LazyMount } from "@/components/motion/lazy-mount";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlannerStock } from "@/lib/planner/match";

// The two heaviest parts of the home page, split into their own code and
// loaded as you scroll towards them.
const SolarDay = dynamic(() => import("./solar-day").then((m) => m.SolarDay));
const BackupPlanner = dynamic(() => import("./backup-planner").then((m) => m.BackupPlanner), {
  loading: () => <Skeleton className="h-[38rem] rounded-xl" />,
});

export function LazySolarDay() {
  return (
    <LazyMount placeholderClassName="h-[340vh] bg-ink lg:h-[400vh]">
      <SolarDay />
    </LazyMount>
  );
}

export function LazyPlanner({ stock }: { stock: PlannerStock }) {
  return (
    <LazyMount placeholderClassName="h-[38rem]" margin="600px">
      <BackupPlanner stock={stock} />
    </LazyMount>
  );
}
