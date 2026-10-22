import Image from "next/image";
import Link from "next/link";
import { productUrl, type Product } from "@/lib/catalogue/types";
import { artLabel, cardSpecs } from "./key-specs";
import { Price } from "./price";
import { ProductArt } from "./product-art";
import { StockBadge } from "./stock-badge";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images[0];
  const specs = cardSpecs(product);
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-navy/5">
      {image ? (
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-4 transition-transform group-hover:scale-[1.03]"
            priority={priority}
          />
        </div>
      ) : (
        <ProductArt category={product.category} label={artLabel(product)} />
      )}
      <div className="flex flex-1 flex-col gap-2 px-1 pt-4 pb-1">
        {product.brand && <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{product.brand}</p>}
        <h3 className="line-clamp-2 font-sans text-sm leading-snug font-medium">
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
