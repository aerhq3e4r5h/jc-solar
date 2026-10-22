import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductArt } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";
import { sortProducts } from "@/lib/catalogue/filters";
import { getCatalogue } from "@/lib/catalogue/queries";
import { availability, CATEGORIES } from "@/lib/catalogue/types";
import type { CategorySlug } from "@/lib/catalogue/classify";
import { formatRand } from "@/lib/pricing/vat";

export const metadata: Metadata = {
  title: "Shop solar panels, batteries and inverters",
  description: "Solar panels, lithium batteries, inverters and system kits. All prices include VAT. Delivery anywhere in South Africa.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const products = await getCatalogue();
  const slugs = Object.keys(CATEGORIES) as CategorySlug[];

  return (
    <div className="container-page py-12">
      <p className="eyebrow mb-3">Shop</p>
      <h1 className="text-4xl font-semibold sm:text-5xl">Everything for a complete system</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        All prices include 15% VAT. Not sure what you need? The Solar Advisor can size a system for you.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {slugs.map((slug) => {
          const items = products.filter((p) => p.category === slug);
          const inStock = items.filter((p) => availability(p).state !== "out_of_stock").length;
          const from = items.length ? Math.min(...items.map((p) => p.priceInclVat)) : null;
          return (
            <li key={slug}>
              <Link
                href={`/shop/${slug}`}
                className="group flex h-full flex-col gap-4 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-navy/5"
              >
                <ProductArt category={slug} className="aspect-[4/3]" />
                <span className="flex items-center justify-between font-display text-xl font-semibold">
                  {CATEGORIES[slug].name}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
                <span className="text-sm text-muted-foreground">
                  {items.length} products · {inStock} in stock
                  {from !== null && (
                    <>
                      {" "}
                      · from <span className="num">{formatRand(from)}</span>
                    </>
                  )}
                </span>
              </Link>
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
          <section key={slug} className="mt-16" aria-labelledby={`${slug}-heading`}>
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id={`${slug}-heading`} className="text-2xl font-semibold">
                {CATEGORIES[slug].name} in stock
              </h2>
              <Link href={`/shop/${slug}`} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
                See all <ArrowRight className="size-4" />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {top.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
