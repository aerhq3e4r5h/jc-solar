import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/account/sign-out-button";
import { PageHeader } from "@/components/content/prose";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";
import { formatRand } from "@/lib/pricing/vat";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const STATUS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  ready_for_collection: "Ready for collection",
  shipped: "On its way",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Not paid in time",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
};

async function AccountContents() {
  const user = await requireRole(["customer", "admin", "sales", "technician"], "/account");
  const supabase = await createClient();
  // RLS returns only this customer's own orders.
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total_incl_vat, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-6">
        <div>
          <p className="font-medium">{user.fullName ?? user.email}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {(user.role === "admin" || user.role === "sales") && (
            <Link href="/admin/import" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="mb-4 text-2xl font-semibold">
          Your orders
        </h2>
        {orders && orders.length > 0 ? (
          <ul className="divide-y rounded-2xl border bg-card">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-muted/50">
                  <span>
                    <span className="font-mono text-sm">{o.order_number}</span>
                    <span className="ml-3 text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </span>
                  <span className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{STATUS[o.status] ?? o.status}</span>
                    <span className="num font-medium">{formatRand(Number(o.total_incl_vat))}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            No orders yet. Orders you place while signed in appear here. <Link href="/shop" className="underline underline-offset-4">Browse the shop</Link>.
          </p>
        )}
        <p className="mt-6 text-sm text-muted-foreground">Installation bookings, warranty claims, saved quotes and privacy settings will appear here soon.</p>
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="container-page py-12">
      <PageHeader title="Your account" />
      <Suspense fallback={<Skeleton className="h-64 w-full max-w-3xl rounded-2xl" />}>
        <AccountContents />
      </Suspense>
    </div>
  );
}
