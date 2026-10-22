import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const nav = [
  { href: "/admin/import", label: "Import products" },
  { href: "/admin/catalogue/export", label: "Export to Excel", download: true },
];

async function StaffGate({ children }: { children: React.ReactNode }) {
  await requireRole(["admin", "sales"], "/admin/import");
  return children;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background">
        <div className="container-page flex h-14 items-center gap-6">
          <Link href="/" aria-label="Back to the shop">
            <Logo />
          </Link>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Admin</span>
          <nav aria-label="Admin" className="flex gap-1">
            {nav.map((item) =>
              item.download ? (
                <a key={item.href} href={item.href} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main" className="container-page py-8">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <StaffGate>{children}</StaffGate>
        </Suspense>
      </main>
    </div>
  );
}
