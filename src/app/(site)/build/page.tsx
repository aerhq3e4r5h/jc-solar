import type { Metadata } from "next";
import { Suspense } from "react";
import { SystemBuilder } from "@/components/home/system-builder";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { getCatalogue, getCompatibilityOverrides } from "@/lib/catalogue/queries";
import { builderData } from "@/lib/planner/builder-data";

export const metadata: Metadata = {
  title: "Build your solar system",
  description:
    "Size a solar system for your home's weakest month for sun, then choose an inverter and batteries that work with the panels. Live prices from stock, including VAT.",
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
            Tell us where your roof is and what you pay for electricity. We work out how many panels cover your home in its weakest month for sun,
            then you pick an inverter and batteries from stock that work with them.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-[36rem] w-full rounded-xl" />}>
          <Builder />
        </Suspense>
      </div>
    </PageTransition>
  );
}
