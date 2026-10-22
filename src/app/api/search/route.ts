import type { NextRequest } from "next/server";
import { getCatalogue } from "@/lib/catalogue/queries";
import { availability, CATEGORIES, productUrl } from "@/lib/catalogue/types";
import { searchProducts } from "@/lib/search/search";

// Product search for the header search box. Public catalogue data only.
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const results = searchProducts(await getCatalogue(), q).map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    category: CATEGORIES[p.category].singular,
    url: productUrl(p),
    image: p.images[0]?.url ?? null,
    price: p.priceInclVat,
    stock: availability(p).label,
    inStock: availability(p).state !== "out_of_stock",
  }));
  return Response.json({ results }, { headers: { "cache-control": "public, max-age=60" } });
}
