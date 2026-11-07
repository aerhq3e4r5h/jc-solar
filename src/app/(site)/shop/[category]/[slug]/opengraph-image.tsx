import { getCatalogue } from "@/lib/catalogue/queries";
import { CATEGORIES, productFullTitle } from "@/lib/catalogue/types";
import { SHARE_SIZE, shareImage } from "@/lib/og/share-image";

export const alt = "Product photo, name and price";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { slug } = await params;
  const p = (await getCatalogue()).find((x) => x.slug === slug);
  if (!p) return shareImage({ eyebrow: "JC Solar", title: "Solar panels, batteries and inverters", image: null });
  const photo = p.images[0]?.url ?? null;
  return shareImage({
    eyebrow: [p.brand, CATEGORIES[p.category].name].filter(Boolean).join(", "),
    title: productFullTitle(p),
    price: p.priceInclVat,
    compareAt: p.compareAtPriceInclVat,
    // The renderer can't read WebP, so each bundled photo folder has a small og.jpg copy of the main photo.
    image: photo?.startsWith("/products/") ? photo.replace(/\/[^/]+$/, "/og.jpg") : null,
  });
}
