import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";

export type Crumb = { href: string; label: string };

export function Breadcrumbs({ items, siteUrl }: { items: Crumb[]; siteUrl: string }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
              {i === items.length - 1 ? (
                <span aria-current="page" className="line-clamp-1 text-foreground">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-foreground hover:underline">
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: new URL(c.href, siteUrl).toString(),
          })),
        }}
      />
    </>
  );
}
