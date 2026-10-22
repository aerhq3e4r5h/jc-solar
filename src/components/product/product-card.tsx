import Image from "next/image";
import Link from "next/link";
import { canPurchase, productUrl, type Product } from "@/lib/catalogue/types";
import { artLabel, cardSpecs } from "./key-specs";
import { Price } from "./price";
import { ProductArt } from "./product-art";
import { QuickAdd } from "./quick-add";
import { StockBadge } from "./stock-badge";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images[0];
  const specs = cardSpecs(product);
  const quickAdd = canPurchase(product) ? <QuickAdd productId={product.id} name={product.name} /> : null;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-xl hover:shadow-navy/10">
      {image ? (
        <div className="relative aspect-square overflow-hidden border-b bg-white">
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            priority={priority}
          />
          {quickAdd}
        </div>
      ) : (
        <div className="relative p-3 pb-0">
          <ProductArt category={product.category} label={artLabel(product)} />
          {quickAdd}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {product.brand && <p className="text-sm font-medium text-muted-foreground">{product.brand}</p>}
        <h3 className="line-clamp-2 font-sans text-sm leading-snug font-medium sm:text-base">
          <Link href={productUrl(product)} className="after:absolute after:inset-0 after:rounded-2xl">
            {product.name}
          </Link>
        </h3>
        {specs.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Key specs">
            {specs.map((s) => (
              <li key={s} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {s}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <Price amount={product.priceInclVat} compareAt={product.compareAtPriceInclVat} />
          <StockBadge product={product} className="text-xs" />
        </div>
      </div>
    </article>
  );
}
