import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | JC Solar admin" }, robots: { index: false, follow: false } };

async function StaffGate({ children }: { children: React.ReactNode }) {
  await requireRole(["admin", "sales"], "/admin");
  return children;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
          <Link href="/admin" aria-label="Admin overview" className="flex items-center gap-3">
            <Logo />
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              View shop <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="lg:grid lg:grid-cols-[230px_1fr]">
        <aside className="border-b bg-background px-3 py-3 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:border-r lg:border-b-0 lg:py-5">
          <Suspense>
            <AdminNav />
          </Suspense>
        </aside>
        <main id="main" className="min-w-0 px-4 py-8 lg:px-8">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <StaffGate>{children}</StaffGate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
