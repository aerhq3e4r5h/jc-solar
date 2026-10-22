"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mainNav, shopNav } from "@/config/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col gap-6 px-4">
          <div>
            <p className="eyebrow mb-2">Shop</p>
            <ul className="space-y-1">
              {shopNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-base font-medium hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ul className="space-y-1 border-t pt-4">
            {mainNav
              .filter((item) => item.href !== "/shop")
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-base font-medium hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
          <Button asChild size="lg" onClick={() => setOpen(false)}>
            <Link href="/advisor">Size my system</Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
