"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CategoryGlyph } from "@/components/product/product-art";
import { Button } from "@/components/ui/button";

/** Something on the page failed to load. Say so plainly and offer a retry. */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page py-16 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <h1 className="type-wide text-4xl sm:text-5xl">This page didn&apos;t load</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Something went wrong on our side while loading it. Try again; if it keeps happening, the shop and your cart are still available.
          </p>
          {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-7 text-base" onClick={reset}>
              Try again
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
              <Link href="/shop">Go to the shop</Link>
            </Button>
          </div>
        </div>
        <CategoryGlyph category="voltage-stabilizers" className="hidden size-64 lg:block" />
      </div>
    </div>
  );
}
