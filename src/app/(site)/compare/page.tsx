import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { artLabel } from "@/components/product/key-specs";
import { Price } from "@/components/product/price";
import { ProductArt } from "@/components/product/product-art";
import { StockBadge } from "@/components/product/stock-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCatalogue } from "@/lib/catalogue/queries";
import { CATEGORIES, productUrl, type Product } from "@/lib/catalogue/types";

export const metadata: Metadata = { title: "Compare products", robots: { index: false } };

const MAX = 3;

async function CompareTable({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).items;
  const slugs = (Array.isArray(raw) ? raw.join(",") : (raw ?? "")).split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX);
  const catalogue = await getCatalogue();
  const products = slugs.map((s) => catalogue.find((p) => p.slug === s)).filter((p): p is Product => !!p);

  if (products.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <p className="font-medium">Pick at least two products to compare.</p>
        <p className="mt-1 text-sm text-muted-foreground">Use the Compare button on any product page (up to {MAX} of the same type).</p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  // Every spec any of them has, in first-seen order.
  const specKeys: { key: string; label: string }[] = [];
  for (const p of products) for (const s of p.specs) if (!specKeys.some((k) => k.key === s.key)) specKeys.push({ key: s.key, label: s.label });

  const rows: { label: string; values: string[] }[] = [
    { label: "Brand", values: products.map((p) => p.brand ?? "—") },
    ...specKeys.map(({ key, label }) => ({ label, values: products.map((p) => p.specs.find((s) => s.key === key)?.valueText ?? "—") })),
    { label: "Warranty", values: products.map((p) => (p.warrantyMonths ? `${p.warrantyMonths / 12} years` : "Ask us")) },
    { label: "SKU", values: products.map((p) => p.sku) },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[640px] table-fixed text-sm">
        <caption className="sr-only">Comparison of {products.map((p) => p.name).join(", ")}</caption>
        <thead>
          <tr className="border-b align-top">
            <th scope="col" className="w-40 p-4 text-left font-medium text-muted-foreground">
              {CATEGORIES[products[0].category].name}
            </th>
            {products.map((p) => (
              <th key={p.id} scope="col" className="p-4 text-left font-normal">
                <ProductArt category={p.category} label={artLabel(p)} className="mb-3 aspect-[4/3]" />
                <Link href={productUrl(p)} className="line-clamp-3 font-medium hover:underline">
                  {p.name}
                </Link>
                <Price amount={p.priceInclVat} className="mt-2" />
                <div className="mt-1">
                  <StockBadge product={p} className="text-xs" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const differs = new Set(row.values).size > 1;
            return (
              <tr key={row.label} className="border-b last:border-0">
                <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                  {row.label}
                </th>
                {row.values.map((v, i) => (
                  <td key={i} className={`p-4 break-words ${differs ? "font-medium" : "text-muted-foreground"}`}>
                    {v}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="container-page py-10">
      <h1 className="mb-2 text-4xl font-semibold">Compare</h1>
      <p className="mb-8 text-muted-foreground">Rows where the products differ are shown in bold.</p>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <CompareTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
