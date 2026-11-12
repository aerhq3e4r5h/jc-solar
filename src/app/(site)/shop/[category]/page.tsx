import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";
import type { StaticImageData } from "next/image";
import closeupImage from "@/assets/backgrounds/panel-closeup.webp";
import heroImage from "@/assets/backgrounds/hero-array.webp";
import homeImage from "@/assets/home/house-day.webp";
import installerImage from "@/assets/backgrounds/installer-commercial.webp";
import { PhotoBanner } from "@/components/layout/photo-banner";
import { PageTransition, vtName } from "@/components/motion/page-transition";
import { ProductCard } from "@/components/product/product-card";
import { ProductRow } from "@/components/product/product-row";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { ActiveFilters } from "@/components/shop/active-filters";
import { FiltersPanel } from "@/components/shop/filters-panel";
import { AnimatedCount, LoadMore, TileSkeleton, ViewToggle } from "@/components/shop/results-controls";
import { SortSelect } from "@/components/shop/sort-select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategorySlug } from "@/lib/catalogue/classify";
import {
  activeFilterCount,
  applyFilters,
  buildFacets,
  filtersToQuery,
  parseFilters,
  SIZE_SPEC,
  sortProducts,
  TYPE_SPEC,
  type SearchParams,
} from "@/lib/catalogue/filters";
import { getCatalogue } from "@/lib/catalogue/queries";
import { CATEGORIES, isCategorySlug } from "@/lib/catalogue/types";
import { siteUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

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
  "voltage-stabilizers": installerImage,
  "air-conditioners": homeImage,
};

const TYPE_LABEL: Partial<Record<CategorySlug, string>> = {
  "solar-panels": "Cell type",
  inverters: "Inverter type",
  kits: "Configuration",
  "voltage-stabilizers": "Regulation type",
};

/** Columns for the list view, per category. */
const LIST_COLUMNS: Record<CategorySlug, string[]> = {
  "solar-panels": ["wattage_w", "cell_type", "voc_v", "isc_a"],
  batteries: ["capacity_kwh", "nominal_voltage_v", "voltage_class", "capacity_ah"],
  inverters: ["rated_power_kw", "inverter_type", "phases", "battery_voltage_v"],
  kits: ["inverter_power_kw", "battery_capacity_kwh", "config", "phases"],
  "voltage-stabilizers": ["capacity_kva", "phases", "stabilizer_type", "input_voltage_range"],
  "air-conditioners": ["cooling_btu", "cooling_kw", "compressor", "unit_type"],
};

/** Buying guides worth a look before choosing, per category. */
const GUIDES: Partial<Record<CategorySlug, { href: string; label: string }[]>> = {
  inverters: [{ href: "/learn/what-size-inverter", label: "What size inverter do I need?" }],
  batteries: [{ href: "/learn/lithium-vs-lead-acid", label: "Lithium vs lead-acid" }],
  kits: [{ href: "/learn/what-size-inverter", label: "What size system do I need?" }],
};

/** "Shop by size" steps: a handful of sizes people actually shop by. */
function sizeSteps(category: CategorySlug, sizes: { value: number; count: number }[]) {
  const steps: Partial<Record<CategorySlug, number[]>> = {
    inverters: [3, 5, 8, 10, 15],
    batteries: [2.5, 5, 10, 15],
    "solar-panels": [100, 400, 550, 600],
    kits: [3, 5, 8],
    "voltage-stabilizers": [5, 10, 20, 60],
    "air-conditioners": [12000, 18000, 24000],
  };
  const list = steps[category] ?? [];
  return list
    .map((from, i) => {
      const to = list[i + 1];
      const count = sizes.filter((s) => s.value >= from && (to === undefined || s.value < to)).reduce((n, s) => n + s.count, 0);
      return { from, to: to === undefined ? null : to, count };
    })
    .filter((s) => s.count > 0);
}

async function Results({ category, searchParams }: { category: CategorySlug; searchParams: Promise<SearchParams> }) {
  const [catalogue, params] = await Promise.all([getCatalogue(), searchParams]);
  const all = catalogue.filter((p) => p.category === category);
  const filters = parseFilters(params);
  const results = sortProducts(applyFilters(all, filters, category), filters.sort, category);
  const facets = buildFacets(all, category);
  const active = activeFilterCount(filters);
  const size = SIZE_SPEC[category];
  const shown = results.slice(0, filters.show);
  const columns = LIST_COLUMNS[category].map((key) => ({ key, label: all.flatMap((p) => p.specs).find((s) => s.key === key)?.label ?? key }));
  const steps = sizeSteps(category, facets.sizes);
  const guides = GUIDES[category] ?? [];
  const fmtSize = (n: number) => (size.unit === "BTU" ? `${n / 1000}k BTU` : `${n} ${size.unit}`);

  return (
    <>
      {(steps.length > 1 || guides.length > 0) && (
        <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          {steps.length > 1 && (
            <nav aria-label="Shop by size" className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-semibold">Shop by size</span>
              {steps.map((st) => {
                const on = filters.smin === st.from && filters.smax === (st.to === null ? null : st.to - size.step);
                return (
                  <Link
                    key={st.from}
                    href={`/shop/${category}${filtersToQuery({ ...filters, show: undefined, smin: st.from, smax: st.to === null ? null : st.to - size.step })}`}
                    scroll={false}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      on ? "border-ink bg-ink text-ink-foreground dark:border-foreground dark:bg-foreground dark:text-background" : "hover:border-foreground",
                    )}
                  >
                    {st.to === null ? `${fmtSize(st.from)}+` : `${fmtSize(st.from)} to ${fmtSize(st.to)}`}
                  </Link>
                );
              })}
            </nav>
          )}
          {guides.length > 0 && (
            <nav aria-label="Buying guides" className="flex flex-wrap items-center gap-2">
              {guides.map((g) => (
                <Link key={g.href} href={g.href} className="inline-flex items-center gap-1.5 rounded-full bg-shelf px-3.5 py-1.5 text-sm font-medium hover:bg-sun hover:text-ink">
                  <BookOpen className="size-4" aria-hidden="true" /> {g.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      )}
      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <FiltersPanel
          facets={facets}
          filters={filters}
          activeCount={active}
          resultCount={results.length}
          sizeLabel={size.label}
          sizeUnit={size.unit}
          typeLabel={TYPE_SPEC[category] ? TYPE_LABEL[category] : undefined}
        />
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" role="status">
              <span className="font-semibold text-foreground">
                <AnimatedCount value={results.length} />
              </span>{" "}
              of {all.length} products
            </p>
            <div className="flex items-center gap-3">
              <ViewToggle filters={filters} />
              <SortSelect filters={filters} />
            </div>
          </div>
          <ActiveFilters filters={filters} sizeUnit={size.unit} />
          {/* Same place, different content: the results crossfade when the filters change. */}
          <ViewTransition key={filtersToQuery({ ...filters, show: undefined })} name="results" share="auto" enter="auto" default="none">
            {results.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <p className="font-semibold">No products match these filters.</p>
                <p className="mt-1 text-sm text-muted-foreground">Remove a filter above, or ask us and we&apos;ll help you find the right product.</p>
              </div>
            ) : filters.view === "list" ? (
              <ul className="space-y-3">
                {shown.map((p) => (
                  <li key={p.id}>
                    <ProductRow product={p} columns={columns} />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3 2xl:grid-cols-4">
                {shown.map((p, i) => (
                  <li key={p.id} data-reveal>
                    <ProductCard product={p} priority={i < 3} />
                  </li>
                ))}
              </ul>
            )}
          </ViewTransition>
          <LoadMore filters={filters} total={results.length} />
        </div>
      </div>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
      <Skeleton className="hidden h-96 lg:block" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <TileSkeleton key={i} />
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
      <PhotoBanner image={BANNER[category]} title={c.name} shared={vtName("category", category)}>
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
        <RecentlyViewed className="mt-20" />
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
      <PageTransition>
        <CategoryBody {...props} />
      </PageTransition>
    </Suspense>
  );
}
