"use client";

import { BadgePercent } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { shopNav } from "@/config/site";
import { cn } from "@/lib/utils";

const MORE = [
  { href: "/build", label: "Build a system" },
  { href: "/installation", label: "Installation" },
  { href: "/advisor", label: "Solar Advisor" },
  { href: "/learn", label: "Guides" },
] as const;

const pill = "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors";

/** The row of departments under the header. Swipes sideways on small screens. */
export function CategoryLinks({ pathname, hasSale }: { pathname: string | null; hasSale: boolean }) {
  const on = (href: string) => pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
  return (
    <div className="container-page flex h-12 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {shopNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={on(item.href) ? "page" : undefined}
          className={cn(pill, on(item.href) ? "bg-ink text-ink-foreground dark:bg-foreground dark:text-background" : "hover:bg-shelf")}
        >
          {item.label}
        </Link>
      ))}
      {hasSale && (
        <Link href="/shop?sale=1" className={cn(pill, "inline-flex items-center gap-1.5 font-semibold text-sale hover:bg-sale/10")}>
          <BadgePercent className="size-4" aria-hidden="true" /> On sale
        </Link>
      )}
      <span className="mx-2 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      {MORE.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={on(item.href) ? "page" : undefined}
          className={cn(pill, "text-muted-foreground hover:text-foreground", on(item.href) && "text-foreground underline decoration-2 underline-offset-8")}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function CategoryBar({ hasSale }: { hasSale: boolean }) {
  return <CategoryLinks pathname={usePathname()} hasSale={hasSale} />;
}
