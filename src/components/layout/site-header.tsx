import { ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { CartBadge } from "@/components/cart/cart-badge";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { mainNav } from "@/config/site";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center gap-4 lg:h-20">
        <MobileNav />
        <Link href="/" className="rounded-md" aria-label="JC Solar home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-8 hidden items-center gap-1 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative rounded-md px-4 py-2 text-[0.95rem] font-medium text-muted-foreground transition-colors after:absolute after:inset-x-4 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-sun after:transition-transform hover:text-foreground hover:after:scale-x-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button asChild className="mr-2 hidden sm:inline-flex lg:h-11 lg:px-5">
            <Link href="/advisor">Size my system</Link>
          </Button>
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon">
            <Link href="/account" aria-label="Your account">
              <UserRound />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/cart" aria-label="Cart">
              <ShoppingCart />
              <Suspense>
                <CartBadge />
              </Suspense>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
