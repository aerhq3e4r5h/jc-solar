import { FileText, KeyRound, LayoutDashboard, Package, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProfileForm } from "@/components/account/profile-form";
import { SignOutButton } from "@/components/account/sign-out-button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";
import { formatRand } from "@/lib/pricing/vat";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const STATUS: Record<string, { label: string; tone: "wait" | "go" | "done" | "stop" }> = {
  pending_payment: { label: "Awaiting payment", tone: "wait" },
  paid: { label: "Paid", tone: "go" },
  processing: { label: "Being prepared", tone: "go" },
  ready_for_collection: { label: "Ready for collection", tone: "go" },
  shipped: { label: "On its way", tone: "go" },
  delivered: { label: "Delivered", tone: "done" },
  completed: { label: "Completed", tone: "done" },
  cancelled: { label: "Cancelled", tone: "stop" },
  expired: { label: "Not paid in time", tone: "stop" },
  refunded: { label: "Refunded", tone: "stop" },
  partially_refunded: { label: "Partly refunded", tone: "stop" },
};
const TONE = {
  wait: "bg-sun/25 text-foreground ring-sun/60",
  go: "bg-charge/15 text-charge ring-charge/30",
  done: "bg-muted text-foreground ring-border",
  stop: "bg-muted text-muted-foreground ring-border",
};
const date = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

async function AccountContents() {
  const user = await requireRole(["customer", "admin", "sales", "technician"], "/account");
  const supabase = await createClient();
  // Guest orders with this confirmed email join the account (no-op when there are none).
  await supabase.rpc("claim_guest_orders").then(
    () => undefined,
    () => undefined,
  );
  // Filtered to this user: staff can read every order, but this page is "your orders".
  const [{ data: orders }, { data: quotes }, { data: profile }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, total_incl_vat, created_at, delivery_method, order_items(name, quantity)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("quotes")
      .select("id, quote_code, total_incl_vat, created_at, valid_until, converted_order_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("profiles").select("full_name, phone, company_name, marketing_email_opt_in, created_at").eq("id", user.id).maybeSingle(),
  ]);

  const active = (orders ?? []).filter((o) => STATUS[o.status]?.tone === "wait" || STATUS[o.status]?.tone === "go").length;
  const spent = (orders ?? [])
    .filter((o) => !["cancelled", "expired", "pending_payment", "refunded"].includes(o.status))
    .reduce((s, o) => s + Number(o.total_incl_vat), 0);
  const first = (user.fullName ?? "").split(" ")[0];

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div className="dark grain relative isolate overflow-hidden rounded-2xl bg-ink p-6 text-ink-foreground sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-white/60">{profile?.created_at ? `Customer since ${date(profile.created_at)}` : "Your account"}</p>
            <h1 className="type-wide mt-1 text-3xl sm:text-4xl">{first ? `Hello, ${first}` : "Your account"}</h1>
            <p className="mt-1 text-white/70">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(user.role === "admin" || user.role === "sales") && (
              <Link
                href="/admin"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold hover:bg-white/10"
              >
                <LayoutDashboard className="size-4" /> Admin
              </Link>
            )}
            <Link
              href="/account/password"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold hover:bg-white/10"
            >
              <KeyRound className="size-4" /> Change password
            </Link>
            <SignOutButton />
          </div>
        </div>
        <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10">
          {[
            { label: "Orders", value: String(orders?.length ?? 0) },
            { label: "In progress", value: String(active) },
            { label: "Spent with us", value: formatRand(spent) },
          ].map((s) => (
            <div key={s.label} className="bg-ink px-4 py-3">
              <dt className="text-xs text-white/60">{s.label}</dt>
              <dd className="num mt-0.5 text-lg font-bold sm:text-xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* Orders */}
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="mb-4 flex items-center gap-2 text-2xl font-bold">
            <Package className="size-5" /> Your orders
          </h2>
          {orders && orders.length > 0 ? (
            <ul className="space-y-3">
              {orders.map((o) => {
                const st = STATUS[o.status] ?? { label: o.status, tone: "done" as const };
                const items = o.order_items ?? [];
                const count = items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <li key={o.id}>
                    <Link href={`/order/${o.id}`} className="group block rounded-xl border bg-card p-4 transition-colors hover:border-foreground/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold">{o.order_number}</span>
                          <span className="text-sm text-muted-foreground">{date(o.created_at)}</span>
                        </span>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", TONE[st.tone])}>{st.label}</span>
                      </div>
                      <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                        {count} {count === 1 ? "item" : "items"}:{" "}
                        {items.map((i) => (i.quantity > 1 ? `${i.quantity} x ${i.name}` : i.name)).join(", ")}
                      </p>
                      <p className="mt-2 flex items-center justify-between text-sm">
                        <span className="num font-bold">{formatRand(Number(o.total_incl_vat))}</span>
                        <span className="font-semibold underline-offset-4 group-hover:underline">View order, invoice and tracking</span>
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <ShoppingBag className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-semibold">No orders yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Orders you place while signed in, or with {user.email ?? "your email"}, appear here.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Browse the shop
              </Link>
            </div>
          )}
        </section>

        <div className="space-y-10">
          {/* Details */}
          <section aria-labelledby="details-heading" className="rounded-xl border bg-card p-5">
            <h2 id="details-heading" className="mb-4 text-lg font-bold">
              Your details
            </h2>
            <ProfileForm
              email={user.email}
              initial={{
                fullName: profile?.full_name ?? "",
                phone: profile?.phone ?? "",
                company: profile?.company_name ?? "",
                marketing: profile?.marketing_email_opt_in ?? false,
              }}
            />
          </section>

          {/* Quotes */}
          <section aria-labelledby="quotes-heading">
            <h2 id="quotes-heading" className="mb-3 flex items-center gap-2 text-lg font-bold">
              <FileText className="size-4" /> Your quotes
            </h2>
            {quotes && quotes.length > 0 ? (
              <ul className="divide-y rounded-xl border bg-card">
                {quotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span>
                      <span className="font-mono font-semibold">{q.quote_code}</span>
                      <span className="block text-xs text-muted-foreground">
                        {q.converted_order_id ? "Ordered" : new Date(q.valid_until) < new Date() ? "Expired" : `Valid until ${date(q.valid_until)}`}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="num font-semibold">{formatRand(Number(q.total_incl_vat))}</span>
                      <a href={`/api/quotes/${q.id}/pdf`} className="font-semibold underline underline-offset-4">
                        PDF
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved quotes. You can download a quote from your{" "}
                <Link href="/cart" className="underline underline-offset-4">
                  cart
                </Link>
                .
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="container-page py-10 lg:py-14">
      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-2xl" />}>
        <AccountContents />
      </Suspense>
    </div>
  );
}
