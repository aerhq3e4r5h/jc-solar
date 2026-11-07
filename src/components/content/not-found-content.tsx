import Link from "next/link";
import { CategoryGlyph } from "@/components/product/product-art";
import { Button } from "@/components/ui/button";
import { shopNav } from "@/config/site";
import type { CategorySlug } from "@/lib/catalogue/classify";

/** The 404 page body: what happened, and the quickest ways back into the shop. */
export function NotFoundContent() {
  return (
    <div className="container-page py-16 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <p className="num type-wide text-7xl text-amber-ink sm:text-8xl" aria-hidden="true">
            404
          </p>
          <h1 className="type-wide mt-4 text-4xl sm:text-5xl">We can&apos;t find that page</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            The link may be old, or the product may no longer be listed. Search the shop or pick a department below.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-7 text-base">
              <Link href="/shop">Browse the shop</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
              <Link href="/advisor">Ask the Solar Advisor</Link>
            </Button>
          </div>
        </div>
        <CategoryGlyph category="inverters" className="hidden size-64 lg:block" />
      </div>
      <ul className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {shopNav.map((n) => (
          <li key={n.href}>
            <Link href={n.href} className="flex flex-col items-center gap-2 rounded-xl bg-shelf p-4 text-center font-semibold transition-colors hover:bg-sun hover:text-ink">
              <CategoryGlyph category={n.href.replace("/shop/", "") as CategorySlug} className="size-20" />
              {n.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
