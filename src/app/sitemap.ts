import type { MetadataRoute } from "next";
import { slugify } from "@/lib/catalogue/normalise";
import { getCatalogue } from "@/lib/catalogue/queries";
import { CATEGORIES, productUrl } from "@/lib/catalogue/types";
import { siteUrl } from "@/lib/env";

const PAGES = [
  "/",
  "/shop",
  "/advisor",
  "/build",
  "/installation",
  "/delivery",
  "/warranty-and-returns",
  "/faq",
  "/contact",
  "/learn",
  "/learn/what-size-inverter",
  "/learn/battery-runtime",
  "/learn/how-many-solar-panels",
  "/learn/inverter-types",
  "/learn/lithium-vs-lead-acid",
  "/terms",
  "/privacy",
  "/paia",
  "/legal",
];

/** Every public page: content, departments, brands and products. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await getCatalogue();
  const url = (path: string) => new URL(path, base).toString();
  const brands = [...new Set(products.map((p) => p.brand).filter((b): b is string => !!b))];
  return [
    ...PAGES.map((p) => ({ url: url(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...Object.keys(CATEGORIES).map((c) => ({ url: url(`/shop/${c}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...brands.map((b) => ({ url: url(`/brands/${slugify(b)}`), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...products.map((p) => ({
      url: url(productUrl(p)),
      changeFrequency: "daily" as const,
      priority: 0.7,
      ...(p.images[0] && { images: [url(p.images[0].url)] }),
    })),
  ];
}
