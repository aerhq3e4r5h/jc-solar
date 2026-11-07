import type { Metadata } from "next";
import { Suspense } from "react";
import { SystemBuilder } from "@/components/home/system-builder";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { getCatalogue, getCompatibilityOverrides } from "@/lib/catalogue/queries";
import { builderData } from "@/lib/planner/builder-data";

export const metadata: Metadata = {
  title: "Build your solar system",
  description: "Choose how many panels, then an inverter and battery that work with them. Live prices from stock, all including VAT.",
  alternates: { canonical: "/build" },
};

async function Builder() {
  const [products, overrides] = await Promise.all([getCatalogue(), getCompatibilityOverrides()]);
  return <SystemBuilder data={builderData(products, overrides)} />;
}

export default function BuildPage() {
  return (
    <PageTransition>
      <div className="container-page py-10 lg:py-14">
        <div className="mb-10 max-w-2xl">
          <h1 className="type-wide text-4xl sm:text-6xl">Build your system</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Pick how many panels fit your roof, then an inverter and battery from stock that work with them. The price updates as you go.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-[36rem] w-full rounded-xl" />}>
          <Builder />
        </Suspense>
      </div>
    </PageTransition>
  );
}
