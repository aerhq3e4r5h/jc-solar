import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { ProductCard } from "@/components/product/product-card";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { sortProducts } from "@/lib/catalogue/filters";
import { slugify } from "@/lib/catalogue/normalise";
import { getCatalogue } from "@/lib/catalogue/queries";
import { availability, CATEGORIES, type Product } from "@/lib/catalogue/types";
import { siteUrl } from "@/lib/env";
import { formatPrice } from "@/lib/pricing/vat";

type Params = { brand: string };

async function brandProducts(slug: string): Promise<{ name: string; products: Product[] } | null> {
  const all = (await getCatalogue()).filter((p) => p.brand && slugify(p.brand) === slug);
  return all.length ? { name: all[0].brand!, products: all } : null;
}

export async function generateStaticParams(): Promise<Params[]> {
  const brands = new Set((await getCatalogue()).map((p) => p.brand).filter((b): b is string => !!b));
  return brands.size ? [...brands].map((b) => ({ brand: slugify(b) })) : [{ brand: "example" }];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const found = await brandProducts((await params).brand);
  if (!found) return {};
  return {
    title: `${found.name} for sale in South Africa`,
    description: `${found.products.length} ${found.name} products in stock and on order. All prices include VAT. Delivery anywhere in South Africa.`,
    alternates: { canonical: `/brands/${slugify(found.name)}` },
  };
}

/** The most common warranty among the brand's products, in words. */
function warrantySummary(products: Product[]) {
  const terms = products.map((p) => p.warrantyMonths).filter((m): m is number => !!m);
  if (!terms.length) return "Manufacturer warranty on every product. Ask us for the term on a specific model.";
  const counts = new Map<number, number>();
  terms.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  const [months] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return `Most ${products[0].brand} products carry a ${months / 12}-year manufacturer warranty. Each product page shows its own term.`;
}

async function BrandBody({ params }: { params: Promise<Params> }) {
  const found = await brandProducts((await params).brand);
  if (!found) notFound();
  const { name, products } = found;
  const byCategory = (Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[])
    .map((slug) => ({ slug, items: sortProducts(products.filter((p) => p.category === slug), "featured", slug) }))
    .filter((g) => g.items.length);
  const inStock = products.filter((p) => availability(p).state !== "out_of_stock").length;
  const from = Math.min(...products.map((p) => p.priceInclVat));

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        siteUrl={siteUrl()}
        items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { href: `/brands/${slugify(name)}`, label: name },
        ]}
      />
      <header className="mt-8 border-b pb-10">
        <h1 className="type-wide text-5xl sm:text-7xl">{name}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          {products.length} {name} product{products.length === 1 ? "" : "s"} in{" "}
          {byCategory.map((g, i) => (
            <span key={g.slug}>
              {i > 0 && (i === byCategory.length - 1 ? " and " : ", ")}
              <Link href={`/shop/${g.slug}?brand=${encodeURIComponent(name)}`} className="font-semibold text-foreground underline underline-offset-4">
                {CATEGORIES[g.slug].name.toLowerCase()}
              </Link>
            </span>
          ))}
          , {inStock} in stock now, from <span className="num font-semibold text-foreground">{formatPrice(from)}</span>. Prices include VAT.
        </p>
        <p className="mt-3 max-w-2xl text-muted-foreground">{warrantySummary(products)}</p>
      </header>
      {byCategory.map((g) => (
        <section key={g.slug} className="mt-14" aria-labelledby={`${g.slug}-heading`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id={`${g.slug}-heading`} className="type-wide text-3xl">
              {CATEGORIES[g.slug].name}
            </h2>
            <Link href={`/shop/${g.slug}?brand=${encodeURIComponent(name)}`} className="text-sm font-semibold underline-offset-4 hover:underline">
              Filter and compare
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {g.items.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function BrandPage(props: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<Skeleton className="container-page mt-8 h-96" />}>
      <PageTransition>
        <BrandBody {...props} />
      </PageTransition>
    </Suspense>
  );
}
