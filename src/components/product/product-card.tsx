import Image from "next/image";
import Link from "next/link";
import { availability, canPurchase, productTitle, productUrl, type Product } from "@/lib/catalogue/types";
import { formatPrice } from "@/lib/pricing/vat";
import { DiscountRibbon } from "./discount-ribbon";
import { artLabel, cardSpecs, highlightSpecs } from "./key-specs";
import { Price } from "./price";
import { ProductArt } from "./product-art";
import { QuickAdd } from "./quick-add";
import { QuickView, type QuickViewData } from "./quick-view";
import { Shared, vtName } from "@/components/motion/page-transition";
import { cn } from "@/lib/utils";
import { StockBadge } from "./stock-badge";

const TILE_SIZES = "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 33vw, 50vw";

/**
 * Shop-shelf product tile: the photo on a grey tile, then brand, name, key
 * specs and price. No card chrome, so a grid of products reads like a shelf.
 */
/**
 * `morph`: the photo morphs into the product page's gallery on navigation.
 * Turn it off where the same product can appear twice on one page.
 */
export function ProductCard({ product, priority = false, morph = true }: { product: Product; priority?: boolean; morph?: boolean }) {
  const image = product.images[0];
  // A sister model's photo isn't a second view of this product, so it never counts.
  const second = product.images[1] && !product.images[1].sameRange ? product.images[1] : null;
  const specs = cardSpecs(product);
  const quickAdd = canPurchase(product) ? <QuickAdd productId={product.id} name={productTitle(product)} image={image?.url} /> : null;
  return (
    <article className="group relative flex h-full flex-col">
      <MaybeShared on={morph} name={vtName("product", product.id)}>
        <div className="relative aspect-square overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow,translate] duration-300 ease-out group-hover:border-foreground/30 group-hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)] motion-full:group-hover:-translate-y-1">
          {image ? (
            <>
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes={TILE_SIZES}
                className={cn(
                  "object-contain transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.04]",
                  second && "group-hover:opacity-0",
                )}
                priority={priority}
              />
              {/* Second view fades in on hover (Tailwind v4 hover only applies on devices that can hover). */}
              {second && (
                <Image
                  src={second.url}
                  alt=""
                  fill
                  sizes={TILE_SIZES}
                  className="object-contain opacity-0 transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <ProductArt category={product.category} label={artLabel(product)} className="rounded-none" />
          )}
          <DiscountRibbon price={product.priceInclVat} compareAt={product.compareAtPriceInclVat} />
          {quickAdd}
          <QuickView data={quickViewData(product)} />
        </div>
      </MaybeShared>
      <div className="flex flex-1 flex-col pt-3.5">
        {product.brand && <p className="text-[13px] font-semibold text-muted-foreground">{product.brand}</p>}
        <h3 className="mt-0.5 line-clamp-2 font-sans text-[0.95rem] leading-snug font-medium [font-stretch:100%] sm:text-base">
          <Link
            href={productUrl(product)}
            transitionTypes={["nav-forward"]}
            className="decoration-2 underline-offset-2 after:absolute after:inset-0 group-hover:underline"
          >
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

/** What the quick-view dialog needs (plain data, so it can cross to the browser). */
export function quickViewData(product: Product): QuickViewData {
  const onSale = product.compareAtPriceInclVat !== null && product.compareAtPriceInclVat > product.priceInclVat;
  const stock = availability(product);
  return {
    id: product.id,
    url: productUrl(product),
    brand: product.brand,
    title: productTitle(product),
    images: product.images.filter((i) => !i.sameRange || product.images.length === 1).map((i) => i.url),
    specs: highlightSpecs(product),
    priceText: formatPrice(product.priceInclVat),
    wasText: onSale ? formatPrice(product.compareAtPriceInclVat!) : null,
    stockLabel: stock.label,
    inStock: stock.state === "in_stock" || stock.state === "low_stock",
    canBuy: canPurchase(product),
  };
}

function MaybeShared({ on, name, children }: { on: boolean; name: string; children: React.ReactNode }) {
  return on ? <Shared name={name}>{children}</Shared> : children;
}
