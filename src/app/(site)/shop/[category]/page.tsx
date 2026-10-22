import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { StaticImageData } from "next/image";
import closeupImage from "@/assets/backgrounds/panel-closeup.webp";
import heroImage from "@/assets/backgrounds/hero-array.webp";
import homeImage from "@/assets/backgrounds/home-roof.webp";
import installerImage from "@/assets/backgrounds/installer-commercial.webp";
import { PhotoBanner } from "@/components/layout/photo-banner";
import { ProductCard } from "@/components/product/product-card";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { FiltersPanel } from "@/components/shop/filters-panel";
import { SortSelect } from "@/components/shop/sort-select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategorySlug } from "@/lib/catalogue/classify";
import {
  activeFilterCount,
  applyFilters,
  buildFacets,
  parseFilters,
  SIZE_SPEC,
  sortProducts,
  TYPE_SPEC,
  type SearchParams,
} from "@/lib/catalogue/filters";
import { getCatalogue } from "@/lib/catalogue/queries";
import { CATEGORIES, isCategorySlug } from "@/lib/catalogue/types";
import { siteUrl } from "@/lib/env";

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (!isCategorySlug(category)) return {};
  const c = CATEGORIES[category];
  return {
    title: `${c.name} for sale in South Africa`,
    description: `${c.blurb} All prices include VAT. Delivery anywhere in South Africa.`,
    alternates: { canonical: `/shop/${category}` },
  };
}

const BANNER: Record<CategorySlug, StaticImageData> = {
  "solar-panels": closeupImage,
  batteries: homeImage,
  inverters: installerImage,
  kits: heroImage,
};

const TYPE_LABEL: Partial<Record<CategorySlug, string>> = {
  "solar-panels": "Cell type",
  inverters: "Inverter type",
  kits: "Configuration",
};

async function Results({ category, searchParams }: { category: CategorySlug; searchParams: Promise<SearchParams> }) {
  const [catalogue, params] = await Promise.all([getCatalogue(), searchParams]);
  const all = catalogue.filter((p) => p.category === category);
  const filters = parseFilters(params);
  const results = sortProducts(applyFilters(all, filters, category), filters.sort, category);
  const facets = buildFacets(all, category);
  const active = activeFilterCount(filters);
  const size = SIZE_SPEC[category];

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
      <FiltersPanel
        facets={facets}
        filters={filters}
        activeCount={active}
        sizeLabel={size.label}
        sizeUnit={size.unit}
        typeLabel={TYPE_SPEC[category] ? TYPE_LABEL[category] : undefined}
      />
      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" role="status">
            <span className="num font-medium text-foreground">{results.length}</span> of {all.length} products
          </p>
          <SortSelect filters={filters} />
        </div>
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <p className="font-medium">No products match these filters.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try removing a filter, or ask us and we&apos;ll help you find the right product.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
            {results.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 3} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <Skeleton className="hidden h-96 lg:block" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function CategoryBody({ params, searchParams }: { params: Promise<{ category: string }>; searchParams: Promise<SearchParams> }) {
  const { category } = await params;
  if (!isCategorySlug(category)) notFound();
  const c = CATEGORIES[category];

  return (
    <>
      <PhotoBanner image={BANNER[category]} eyebrow="Shop" title={c.name}>
        <p>{c.blurb}</p>
      </PhotoBanner>
      <div className="container-page py-8">
        <Breadcrumbs
          siteUrl={siteUrl()}
          items={[
            { href: "/", label: "Home" },
            { href: "/shop", label: "Shop" },
            { href: `/shop/${category}`, label: c.name },
          ]}
        />
        <div className="mt-8">
          <Suspense fallback={<ResultsSkeleton />}>
            <Results category={category} searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

// Params are read inside <Suspense> so the page can also be rendered on
// demand (e.g. when a hosting cache regenerates it), not only at build time.
export default function CategoryPage(props: { params: Promise<{ category: string }>; searchParams: Promise<SearchParams> }) {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-72 w-full rounded-none" />
          <div className="container-page py-16">
            <ResultsSkeleton />
          </div>
        </>
      }
    >
      <CategoryBody {...props} />
    </Suspense>
  );
}
