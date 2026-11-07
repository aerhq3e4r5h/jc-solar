import Image from "next/image";
import Link from "next/link";
import { canPurchase, productTitle, productUrl, type Product } from "@/lib/catalogue/types";
import { DiscountRibbon } from "./discount-ribbon";
import { artLabel, cardSpecs } from "./key-specs";
import { Price } from "./price";
import { ProductArt } from "./product-art";
import { QuickAdd } from "./quick-add";
import { StockBadge } from "./stock-badge";

/**
 * Shop-shelf product tile: the photo on a grey tile, then brand, name, key
 * specs and price. No card chrome, so a grid of products reads like a shelf.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images[0];
  const specs = cardSpecs(product);
  const quickAdd = canPurchase(product) ? <QuickAdd productId={product.id} name={productTitle(product)} /> : null;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-white transition-colors duration-300 group-hover:border-foreground/30">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            priority={priority}
          />
        ) : (
          <ProductArt category={product.category} label={artLabel(product)} className="rounded-none" />
        )}
        <DiscountRibbon price={product.priceInclVat} compareAt={product.compareAtPriceInclVat} />
        {quickAdd}
      </div>
      <div className="flex flex-1 flex-col pt-3.5">
        {product.brand && <p className="text-[13px] font-semibold text-muted-foreground">{product.brand}</p>}
        <h3 className="mt-0.5 line-clamp-2 font-sans text-[0.95rem] leading-snug font-medium [font-stretch:100%] sm:text-base">
          <Link href={productUrl(product)} className="decoration-2 underline-offset-2 after:absolute after:inset-0 group-hover:underline">
            {productTitle(product)}
          </Link>
        </h3>
        {specs.length > 0 && <p className="mt-1.5 line-clamp-1 text-[13px] text-muted-foreground">{specs.join(", ")}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-3">
          <Price amount={product.priceInclVat} compareAt={product.compareAtPriceInclVat} />
          <StockBadge product={product} className="text-xs" />
        </div>
      </div>
    </article>
  );
}
