import { AirVent, BatteryCharging, ChevronDown, Cpu, Gauge, PackageCheck, PanelsTopLeft, ShoppingCart, Truck, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { CartBadge } from "@/components/cart/cart-badge";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mainNav, shopNav } from "@/config/site";
import { MobileNav } from "./mobile-nav";
import { ProductSearch } from "./product-search";

const SHOP_ICONS = {
  "/shop/solar-panels": PanelsTopLeft,
  "/shop/batteries": BatteryCharging,
  "/shop/inverters": Cpu,
  "/shop/kits": PackageCheck,
  "/shop/voltage-stabilizers": Gauge,
  "/shop/air-conditioners": AirVent,
} as const;

const navLink =
  "relative rounded-md px-3 py-2 text-[0.95rem] font-medium text-muted-foreground transition-colors after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-sun after:transition-transform hover:text-foreground hover:after:scale-x-100";

export function SiteHeader() {
  return (
    <>
      <div className="bg-navy text-navy-foreground">
        <div className="container-page flex h-9 items-center justify-center gap-6 text-xs sm:justify-between sm:text-sm">
          <p className="flex items-center gap-2">
            <Truck className="size-4 text-sun" aria-hidden="true" />
            Delivery anywhere in South Africa, priced at checkout
          </p>
          <p className="hidden items-center gap-2 sm:flex">
            <Wrench className="size-4 text-sun" aria-hidden="true" />
            <Link href="/installation" className="underline-offset-4 hover:underline">
              Installation by a registered technician
            </Link>
          </p>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <div className="container-page flex h-16 items-center gap-3 lg:h-20">
          <MobileNav />
          <Link href="/" className="rounded-md" aria-label="JC Solar home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className={`${navLink} inline-flex items-center gap-1 outline-none data-[state=open]:text-foreground`}>
                Shop <ChevronDown className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={10} className="w-[22rem] p-2">
                {shopNav.map((item) => {
                  const Icon = SHOP_ICONS[item.href];
                  return (
                    <DropdownMenuItem key={item.href} asChild className="items-start gap-3 rounded-lg p-3">
                      <Link href={item.href}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-amber-ink">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block font-medium">{item.label}</span>
                          <span className="block text-xs text-muted-foreground">{item.description}</span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg p-3 font-medium">
                  <Link href="/shop">Everything in the shop</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {mainNav
              .filter((item) => item.href !== "/shop")
              .map((item) => (
                <Link key={item.href} href={item.href} className={navLink}>
                  {item.label}
                </Link>
              ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ProductSearch />
            <Button asChild className="mx-1 hidden xl:inline-flex lg:h-10 lg:px-5">
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
    </>
  );
}
