import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import heroImage from "@/assets/backgrounds/home-roof.webp";
import { PhotoBanner } from "@/components/layout/photo-banner";
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
    <>
      <PhotoBanner image={heroImage} eyebrow="Shop" title="Everything for a complete system">
        <p>
          {products.length} products from tier-one brands. All prices include 15% VAT. Not sure what you need? The Solar Advisor can size a system for
          you.
        </p>
      </PhotoBanner>
      <div className="container-page py-14">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {slugs.map((slug) => {
            const items = products.filter((p) => p.category === slug);
            const inStock = items.filter((p) => availability(p).state !== "out_of_stock").length;
            const from = items.length ? Math.min(...items.map((p) => p.priceInclVat)) : null;
            const image = items.find((p) => p.images.length > 0 && availability(p).state !== "out_of_stock")?.images[0];
            return (
              <li key={slug}>
                <Link
                  href={`/shop/${slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-2xl hover:shadow-navy/10"
                >
                  {image ? (
                    <span className="relative block aspect-[4/3] overflow-hidden border-b bg-white">
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        priority
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                      />
                    </span>
                  ) : (
                    <ProductArt category={slug} className="m-4 mb-0 aspect-[4/3]" />
                  )}
                  <span className="flex items-center justify-between px-6 pt-5 font-display text-2xl font-semibold">
                    {CATEGORIES[slug].name}
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <span className="px-6 pt-2 pb-6 text-sm text-muted-foreground">
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
            <section key={slug} className="mt-20" aria-labelledby={`${slug}-heading`}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 id={`${slug}-heading`} className="text-3xl font-semibold">
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
    </>
  );
}
