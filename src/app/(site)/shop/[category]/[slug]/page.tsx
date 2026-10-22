import { BadgeCheck, FileDown, ShieldCheck, Star, TriangleAlert, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/product/gallery";
import { artLabel } from "@/components/product/key-specs";
import { Price } from "@/components/product/price";
import { ProductArt } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { StockBadge } from "@/components/product/stock-badge";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { getApprovedReviews, getCatalogue, getCompatibilityOverrides } from "@/lib/catalogue/queries";
import { availability, canPurchase, CATEGORIES, productUrl, specText, type Product } from "@/lib/catalogue/types";
import { checkPair, maxPanelsPerString, type Override } from "@/lib/compatibility/engine";
import { siteUrl } from "@/lib/env";

type Params = { category: string; slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const products = await getCatalogue();
  // At least one entry is needed for build-time validation when the catalogue is empty.
  if (products.length === 0) return [{ category: "kits", slug: "example" }];
  return products.map((p) => ({ category: p.category, slug: p.slug }));
}

async function findProduct(slug: string) {
  return (await getCatalogue()).find((p) => p.slug === slug) ?? null;
}

function describe(p: Product): string {
  const lead = p.shortDescription ?? `${p.name}.`;
  return `${lead} ${availability(p).label}. Price includes VAT. Delivery anywhere in South Africa.`.slice(0, 300);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await findProduct(slug);
  if (!p) return {};
  return {
    title: p.name,
    description: describe(p),
    alternates: { canonical: productUrl(p) },
    openGraph: { title: p.name, description: describe(p), type: "website", images: p.images.slice(0, 1).map((i) => i.url) },
  };
}

function SpecTable({ product }: { product: Product }) {
  const rows: [string, string][] = [
    ["Brand", product.brand ?? ""],
    ["SKU", product.sku],
    ...product.specs.map((s) => [s.label, s.valueText] as [string, string]),
    ["Warranty", product.warrantyMonths ? `${product.warrantyMonths / 12} years (manufacturer)` : ""],
    ["Performance warranty", product.performanceWarrantyYears ? `${product.performanceWarrantyYears} years` : ""],
    ["Grid-tie approval (NRS 097-2-1)", product.nrsApproved === true ? "Approved" : product.nrsApproved === false ? "Not approved" : ""],
  ];
  return (
    <dl className="divide-y rounded-2xl border bg-card">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 px-5 py-3 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium break-words">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Products that work with this one, using the compatibility rules. */
function compatibleWith(product: Product, catalogue: Product[], overrides: Override[]) {
  const inStockFirst = (a: Product, b: Product) =>
    Number(availability(a).state === "out_of_stock") - Number(availability(b).state === "out_of_stock") || a.priceInclVat - b.priceInclVat;

  if (product.category === "inverters") {
    const items = catalogue
      .filter((b) => b.category === "batteries")
      .map((b) => ({ p: b, r: checkPair(product, b, overrides) }))
      .filter(({ r }) => r.status === "confirmed" || r.status === "likely")
      .sort((a, b) => Number(b.p.brand === product.brand) - Number(a.p.brand === product.brand) || inStockFirst(a.p, b.p));
    return { title: "Batteries that suit this inverter", items: items.slice(0, 8).map((i) => i.p), note: items[0]?.r.reason };
  }
  if (product.category === "batteries") {
    const items = catalogue
      .filter((i) => i.category === "inverters")
      .map((i) => ({ p: i, r: checkPair(i, product, overrides) }))
      .filter(({ r }) => r.status === "confirmed" || r.status === "likely")
      .sort((a, b) => Number(b.p.brand === product.brand) - Number(a.p.brand === product.brand) || inStockFirst(a.p, b.p));
    return { title: "Inverters that suit this battery", items: items.slice(0, 8).map((i) => i.p), note: items[0]?.r.reason };
  }
  if (product.category === "solar-panels") {
    const items = catalogue
      .filter((i) => i.category === "inverters" && (maxPanelsPerString(product, i) ?? 0) >= 4)
      .sort(inStockFirst);
    return {
      title: "Inverters for these panels",
      items: items.slice(0, 8),
      note: "Each takes at least 4 of these panels per string, allowing for cold-morning voltage.",
    };
  }
  return null;
}

async function Reviews({ productId }: { productId: string }) {
  const reviews = await getApprovedReviews(productId);
  if (reviews.length === 0) {
    return <p className="text-muted-foreground">No reviews yet. Bought this? You&apos;ll be able to review it from your account.</p>;
  }
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 text-lg font-semibold">
        <Star className="size-5 fill-sun text-sun" aria-hidden="true" />
        {avg.toFixed(1)} out of 5 <span className="text-sm font-normal text-muted-foreground">({reviews.length} reviews)</span>
      </p>
      <ul className="space-y-6">
        {reviews.map((r) => (
          <li key={r.id} className="border-b pb-6">
            <p className="font-medium">
              {"★".repeat(r.rating)}
              <span className="sr-only">{r.rating} out of 5</span>
              {r.title && <span className="ml-2">{r.title}</span>}
            </p>
            <p className="mt-2 text-muted-foreground">{r.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {r.author}
              {r.verified && " · Verified purchase"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { category, slug } = await params;
  const [catalogue, overrides] = await Promise.all([getCatalogue(), getCompatibilityOverrides()]);
  const product = catalogue.find((p) => p.slug === slug);
  if (!product) notFound();
  if (product.category !== category) permanentRedirect(productUrl(product));

  const c = CATEGORIES[product.category];
  const url = siteUrl();
  const related = compatibleWith(product, catalogue, overrides);
  const type = specText(product, "inverter_type");
  const gridConnected = product.category === "inverters" && (type === "Grid-tie" || type === "Hybrid");
  const stock = availability(product);

  return (
    <div className="container-page py-8 pb-28 md:pb-8">
      <Breadcrumbs
        siteUrl={url}
        items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { href: `/shop/${product.category}`, label: c.name },
          { href: productUrl(product), label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          {product.images.length ? (
            <Gallery images={product.images} name={product.name} />
          ) : (
            <div>
              <ProductArt category={product.category} label={artLabel(product)} className="rounded-2xl border" />
              <p className="mt-2 text-xs text-muted-foreground">Illustration. Product photos coming soon.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            {product.brand && <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{product.brand}</p>}
            <h1 className="mt-1 text-2xl leading-tight font-semibold sm:text-3xl">{product.name}</h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">SKU {product.sku}</p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Price amount={product.priceInclVat} compareAt={product.compareAtPriceInclVat} size="lg" />
              <p className="text-sm text-muted-foreground">Includes 15% VAT</p>
            </div>
            <StockBadge product={product} />
          </div>

          {product.nrsApproved === true && (
            <p className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium">
              <BadgeCheck className="size-4 text-success" aria-hidden="true" /> Grid-tie approved (NRS 097-2-1)
            </p>
          )}

          {product.shortDescription && <p className="leading-relaxed text-muted-foreground">{product.shortDescription}</p>}

          <PurchasePanel
            productId={product.id}
            slug={product.slug}
            category={product.category}
            name={product.name}
            price={product.priceInclVat}
            canBuy={canPurchase(product)}
            maxQty={product.allowBackorder ? 500 : product.stockQty}
            installationEligible={product.installationEligible}
          />

          <ul className="space-y-3 rounded-2xl border bg-card p-5 text-sm">
            <li className="flex gap-3">
              <Truck className="size-5 shrink-0 text-amber-ink" aria-hidden="true" />
              <span>
                <strong className="font-medium">Delivery anywhere in South Africa.</strong> The cost is worked out at checkout from your address
                {product.shippingClass === "oversized" && "; panels travel on a pallet"}
                {product.isDangerousGoods && "; lithium batteries ship with a dangerous-goods courier"}.
              </span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="size-5 shrink-0 text-amber-ink" aria-hidden="true" />
              <span>
                <strong className="font-medium">
                  {product.warrantyMonths ? `${product.warrantyMonths / 12}-year manufacturer warranty` : "Manufacturer warranty"}
                </strong>
                {!product.warrantyMonths && " (ask us for the term)"}, plus 6 months to return defective goods under the Consumer Protection Act.
              </span>
            </li>
            {gridConnected && (
              <li className="flex gap-3">
                <TriangleAlert className="size-5 shrink-0 text-warning" aria-hidden="true" />
                <span>
                  If this inverter will be connected to the grid, your municipality may require the system to be registered as a small-scale
                  embedded generator (SSEG). Ask us if you&apos;re not sure what applies to you.
                </span>
              </li>
            )}
          </ul>

          {product.datasheetUrl && (
            <a href={product.datasheetUrl} className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4" target="_blank" rel="noopener">
              <FileDown className="size-4" aria-hidden="true" /> Download the datasheet (PDF)
            </a>
          )}
        </div>
      </div>

      <section className="mt-16 grid gap-10 lg:grid-cols-2" aria-labelledby="specs-heading">
        <div>
          <h2 id="specs-heading" className="mb-4 text-2xl font-semibold">
            Specifications
          </h2>
          <SpecTable product={product} />
          <p className="mt-3 text-xs text-muted-foreground">
            Need a figure that isn&apos;t listed? <Link href="/contact" className="underline underline-offset-4">Ask us</Link> and we&apos;ll send the datasheet.
          </p>
        </div>
        {product.description && (
          <div>
            <h2 className="mb-4 text-2xl font-semibold">About this product</h2>
            <div className="space-y-4 leading-relaxed whitespace-pre-line text-muted-foreground">{product.description}</div>
          </div>
        )}
      </section>

      {related && related.items.length > 0 && (
        <section className="mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl font-semibold">
            {related.title}
          </h2>
          {related.note && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{related.note}</p>}
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.items.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 max-w-3xl" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="mb-4 text-2xl font-semibold">
          Reviews
        </h2>
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <Reviews productId={product.id} />
        </Suspense>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          sku: product.sku,
          ...(product.brand && { brand: { "@type": "Brand", name: product.brand } }),
          ...(product.images.length && { image: product.images.map((i) => i.url) }),
          description: describe(product),
          url: new URL(productUrl(product), url).toString(),
          offers: {
            "@type": "Offer",
            price: product.priceInclVat.toFixed(2),
            priceCurrency: "ZAR",
            url: new URL(productUrl(product), url).toString(),
            itemCondition: "https://schema.org/NewCondition",
            availability:
              stock.state === "out_of_stock"
                ? "https://schema.org/OutOfStock"
                : stock.state === "backorder"
                  ? "https://schema.org/BackOrder"
                  : "https://schema.org/InStock",
          },
        }}
      />
    </div>
  );
}
