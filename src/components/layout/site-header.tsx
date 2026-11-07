import { ShoppingCart, Sparkles, Truck, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { CartBadge } from "@/components/cart/cart-badge";
import { ThemeToggle } from "@/components/theme";
import { getCatalogue } from "@/lib/catalogue/queries";
import { discountPercent } from "@/lib/pricing/sale";
import { CategoryBar, CategoryLinks } from "./category-bar";
import { MobileNav } from "./mobile-nav";
import { ProductSearch } from "./product-search";

// Display is set per link (flex or hidden), so it isn't part of the shared style.
const action = "relative h-10 shrink-0 items-center gap-2 rounded-full px-2.5 text-sm font-semibold transition-colors hover:bg-shelf [&_svg]:size-5";

/** Whether anything is marked down, so the "On sale" link only shows when it leads somewhere. */
async function Departments() {
  const products = await getCatalogue();
  const hasSale = products.some((p) => discountPercent(p.priceInclVat, p.compareAtPriceInclVat));
  return (
    <Suspense fallback={<CategoryLinks pathname={null} hasSale={hasSale} />}>
      <CategoryBar hasSale={hasSale} />
    </Suspense>
  );
}

export function SiteHeader() {
  return (
    <>
      <div className="bg-sun text-ink">
        <div className="container-page flex h-9 items-center justify-between gap-6 text-[13px] font-medium">
          <p className="flex min-w-0 items-center gap-2">
            <Truck className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Delivery anywhere in South Africa, priced at checkout</span>
          </p>
          <nav aria-label="Help" className="hidden items-center gap-5 sm:flex">
            <Link href="/delivery" className="underline-offset-4 hover:underline">
              Delivery
            </Link>
            <Link href="/warranty-and-returns" className="underline-offset-4 hover:underline">
              Returns
            </Link>
            <Link href="/faq" className="underline-offset-4 hover:underline">
              Help
            </Link>
            <Link href="/contact" className="underline-offset-4 hover:underline">
              Contact
            </Link>
            <span className="-mr-2 [&_button]:size-7 [&_button]:hover:bg-ink/10">
              <ThemeToggle />
            </span>
          </nav>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b bg-background">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <div className="container-page flex h-16 items-center gap-2 lg:h-[4.5rem] lg:gap-4">
          <MobileNav />
          <Link href="/" className="shrink-0 rounded-md" aria-label="JC Solar home">
            <Logo />
          </Link>
          <div className="ml-auto flex min-w-0 items-center md:mx-4 md:ml-6 md:flex-1 lg:mx-8">
            <ProductSearch />
          </div>
          <nav aria-label="Your shop" className="flex items-center gap-0.5">
            <Link href="/advisor" className={`${action} hidden lg:flex`}>
              <Sparkles className="text-amber-ink" aria-hidden="true" /> Solar Advisor
            </Link>
            <Link href="/account" className={`${action} hidden sm:flex`} aria-label="Your account">
              <UserRound aria-hidden="true" />
              <span className="hidden xl:inline">Account</span>
            </Link>
            <Link href="/cart" className={`${action} flex`} aria-label="Cart">
              <ShoppingCart aria-hidden="true" />
              <span className="hidden xl:inline">Cart</span>
              <Suspense>
                <CartBadge />
              </Suspense>
            </Link>
          </nav>
        </div>
      </header>
      <nav aria-label="Shop by department" className="border-b bg-background">
        <Suspense fallback={<CategoryLinks pathname={null} hasSale={false} />}>
          <Departments />
        </Suspense>
      </nav>
    </>
  );
}
