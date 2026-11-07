import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import heroImage from "@/assets/backgrounds/home-roof.webp";
import { PhotoBanner } from "@/components/layout/photo-banner";
import { PageTransition, Shared, vtName } from "@/components/motion/page-transition";
import { CategoryGlyph } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";
import { sortProducts } from "@/lib/catalogue/filters";
import { getCatalogue } from "@/lib/catalogue/queries";
import { closestCategory, searchProducts } from "@/lib/search/search";
import { availability, CATEGORIES } from "@/lib/catalogue/types";
import type { CategorySlug } from "@/lib/catalogue/classify";
import { formatPrice } from "@/lib/pricing/vat";

export const metadata: Metadata = {
  title: "Shop solar panels, batteries and inverters",
  description: "Solar panels, lithium batteries, inverters and system kits. All prices include VAT. Delivery anywhere in South Africa.",
  alternates: { canonical: "/shop" },
};

/** Results for ?q= (brand links, "See all results" in search). Reads searchParams, so it renders inside <Suspense>. */
async function SearchResults({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";
  if (!q) return null;
  const results = searchProducts(await getCatalogue(), q, 60);
  const closest = results.length === 0 ? closestCategory(q) : null;
  return (
    <section className="mb-16" aria-labelledby="results-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 id="results-heading" className="type-wide text-3xl">
          {results.length ? `${results.length} result${results.length === 1 ? "" : "s"} for “${q}”` : `Nothing matches “${q}”`}
        </h2>
        <Link href="/shop" className="text-sm font-medium underline underline-offset-4">
          Clear search
        </Link>
      </div>
      {results.length === 0 ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">Check the spelling, try a brand or size (e.g. &ldquo;5 kW&rdquo;), or ask the Solar Advisor.</p>
          {closest && (
            <Link href={`/shop/${closest}`} className="inline-flex rounded-full bg-sun px-4 py-2 font-semibold text-ink">
              Browse all {CATEGORIES[closest].name.toLowerCase()}
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {results.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const products = await getCatalogue();
  const slugs = Object.keys(CATEGORIES) as CategorySlug[];

  return (
    <PageTransition>
      <PhotoBanner image={heroImage} title="Everything for a complete system">
        <p>
          {products.length} products from tier-one brands. All prices include 15% VAT. Not sure what you need? The Solar Advisor can size a system for
          you.
        </p>
      </PhotoBanner>
      <div className="container-page py-14">
        <Suspense>
          <SearchResults searchParams={searchParams} />
        </Suspense>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slugs.map((slug) => {
            const items = products.filter((p) => p.category === slug);
            const inStock = items.filter((p) => availability(p).state !== "out_of_stock").length;
            const from = items.length ? Math.min(...items.map((p) => p.priceInclVat)) : null;
            const image = items.find((p) => p.images.length > 0 && availability(p).state !== "out_of_stock")?.images[0];
            return (
              <li key={slug}>
                <Shared name={vtName("category", slug)}>
                  <Link
                    href={`/shop/${slug}`}
                    transitionTypes={["nav-forward"]}
                    className="group relative isolate flex h-full min-h-60 flex-col overflow-hidden rounded-xl bg-shelf p-6 transition-colors duration-300 hover:bg-sun hover:text-ink sm:p-7"
                  >
                    <span className="type-wide max-w-[70%] text-2xl leading-none sm:text-[1.75rem]">{CATEGORIES[slug].name}</span>
                    <span className="mt-2 max-w-[60%] text-sm text-muted-foreground group-hover:text-ink/75">
                      {items.length} products, {inStock} in stock
                      {from !== null && (
                        <>
                          , from <span className="num font-semibold text-foreground group-hover:text-ink">{formatPrice(from)}</span>
                        </>
                      )}
                    </span>
                    <CategoryGlyph
                      category={slug}
                      className="absolute -right-3 -bottom-5 -z-10 size-44 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-rotate-3"
                    />
                    <span className="mt-auto grid size-11 place-items-center rounded-full bg-background transition-colors group-hover:bg-ink group-hover:text-sun">
                      <ArrowRight className="size-5" aria-hidden="true" />
                    </span>
                  </Link>
                </Shared>
              </li>
            );
          })}
        </ul>

        {slugs.map((slug) => {
          const top = sortProducts(
            products.filter((p) => p.category === slug && availability(p).state !== "out_of_stock"),
            "featured",
            slug,
          ).slice(0, 4);
          if (top.length === 0) return null;
          return (
            <section key={slug} className="scroll-rise mt-20" aria-labelledby={`${slug}-heading`}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 id={`${slug}-heading`} className="type-wide text-3xl">
                  {CATEGORIES[slug].name} in stock
                </h2>
                <Link href={`/shop/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
                  See all <ArrowRight className="size-4" />
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
                {top.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} morph={false} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </PageTransition>
  );
}
