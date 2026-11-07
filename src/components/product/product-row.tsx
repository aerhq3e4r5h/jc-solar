import Image from "next/image";
import Link from "next/link";
import { canPurchase, productTitle, productUrl, spec, type Product } from "@/lib/catalogue/types";
import { DiscountPill } from "./discount-ribbon";
import { Price } from "./price";
import { ProductArt } from "./product-art";
import { QuickAdd } from "./quick-add";
import { StockBadge } from "./stock-badge";

/** One product as a row with spec columns: the list view, for people comparing numbers. */
export function ProductRow({ product, columns }: { product: Product; columns: { key: string; label: string }[] }) {
  const image = product.images[0];
  return (
    <article className="group relative grid grid-cols-[5rem_minmax(0,1fr)] gap-4 rounded-lg border p-3 transition-colors hover:border-foreground/30 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center">
      <div className="relative aspect-square overflow-hidden rounded-md border bg-white">
        {image ? (
          <Image src={image.url} alt={image.alt} fill sizes="96px" className="object-contain" />
        ) : (
          <ProductArt category={product.category} className="rounded-none" />
        )}
      </div>
      <div className="min-w-0">
        {product.brand && <p className="text-xs font-semibold text-muted-foreground">{product.brand}</p>}
        <h3 className="line-clamp-2 font-sans text-[0.95rem] leading-snug font-semibold [font-stretch:100%]">
          <Link href={productUrl(product)} transitionTypes={["nav-forward"]} className="after:absolute after:inset-0 group-hover:underline">
            {productTitle(product)}
          </Link>
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          {columns.map((c) => (
            <div key={c.key}>
              <dt className="text-muted-foreground">{c.label}</dt>
              <dd className="font-semibold">{spec(product, c.key)?.valueText ?? "–"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
        <span className="flex items-center gap-2">
          <DiscountPill price={product.priceInclVat} compareAt={product.compareAtPriceInclVat} />
          <Price amount={product.priceInclVat} compareAt={product.compareAtPriceInclVat} />
        </span>
        <span className="flex items-center gap-3">
          <StockBadge product={product} className="text-xs" />
          {canPurchase(product) && (
            <span className="relative z-10 [&>button]:static [&>button]:opacity-100 [&>button]:translate-y-0">
              <QuickAdd productId={product.id} name={productTitle(product)} image={image?.url} />
            </span>
          )}
        </span>
      </div>
    </article>
  );
}
