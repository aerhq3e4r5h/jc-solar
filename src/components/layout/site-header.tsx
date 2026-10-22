import { ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
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
      <div className="container-page flex h-16 items-center gap-4">
        <MobileNav />
        <Link href="/" className="rounded-md" aria-label="JC Solar home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-8 hidden items-center gap-1 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button asChild size="sm" className="mr-2 hidden sm:inline-flex">
            <Link href="/advisor">Size my system</Link>
          </Button>
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon">
            <Link href="/account" aria-label="Your account">
              <UserRound />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link href="/cart" aria-label="Cart">
              <ShoppingCart />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
