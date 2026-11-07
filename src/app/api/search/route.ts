import type { NextRequest } from "next/server";
import { getCatalogue } from "@/lib/catalogue/queries";
import { availability, CATEGORIES, productFullTitle, productUrl } from "@/lib/catalogue/types";
import { closestCategory, searchProducts } from "@/lib/search/search";

// Product search for the header search box. Public catalogue data only.
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const results = searchProducts(await getCatalogue(), q, 12).map((p) => ({
    categorySlug: p.category,
    id: p.id,
    name: productFullTitle(p),
    brand: p.brand,
    sku: p.sku,
    category: CATEGORIES[p.category].singular,
    url: productUrl(p),
    image: p.images[0]?.url ?? null,
    price: p.priceInclVat,
    compareAt: p.compareAtPriceInclVat,
    stock: availability(p).label,
    inStock: availability(p).state !== "out_of_stock",
  }));
  // Nothing found: point at the category the words were probably about.
  const slug = results.length === 0 ? closestCategory(q) : null;
  const closest = slug ? { slug, name: CATEGORIES[slug].name } : null;
  return Response.json({ results, closest }, { headers: { "cache-control": "public, max-age=60" } });
}
