import { sortProducts } from "@/lib/catalogue/filters";
import { getCatalogue } from "@/lib/catalogue/queries";
import { CATEGORIES, isCategorySlug } from "@/lib/catalogue/types";
import { SHARE_SIZE, shareImage } from "@/lib/og/share-image";

export const alt = "Category name, price range and a product photo";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isCategorySlug(category)) return shareImage({ eyebrow: "GridAnchor", title: "Shop", image: null });
  const items = (await getCatalogue()).filter((p) => p.category === category);
  const top = sortProducts(
    items.filter((p) => p.images[0]?.url.startsWith("/")),
    "featured",
    category,
  )[0];
  const from = items.length ? Math.min(...items.map((p) => p.priceInclVat)) : null;
  return shareImage({
    eyebrow: `${items.length} products from ${new Set(items.map((p) => p.brand).filter(Boolean)).size} brands`,
    pricePrefix: "From",
    title: CATEGORIES[category].name,
    price: from,
    image: top?.images[0]?.url.replace(/\/[^/]+$/, "/og.jpg") ?? null,
    note: CATEGORIES[category].blurb,
  });
}
