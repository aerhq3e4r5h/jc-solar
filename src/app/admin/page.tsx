import { ArrowRight, BadgePercent, PackageOpen, PackageSearch, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { discountPercent } from "@/lib/pricing/sale";
import { formatRand } from "@/lib/pricing/vat";
import { createClient } from "@/lib/supabase/server";

/** Start of the 30-day sales window (the page renders per request: createClient opts into it). */
function thirtyDaysAgo() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString();
}

async function Overview() {
  const supabase = await createClient();
  const since = thirtyDaysAgo();
  const [{ data: products }, { data: toShip }, { data: recent }] = await Promise.all([
    supabase.from("products").select("id, price_incl_vat, compare_at_price_incl_vat, stock_qty, is_active").is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact" }).in("status", ["paid", "processing"]),
    supabase
      .from("orders")
      .select("total_incl_vat, status")
      .gte("created_at", since)
      .in("status", ["paid", "processing", "shipped", "delivered", "completed"]),
  ]);
  const list = products ?? [];
  const onSale = list.filter((p) =>
    discountPercent(Number(p.price_incl_vat), p.compare_at_price_incl_vat === null ? null : Number(p.compare_at_price_incl_vat)),
  ).length;
  const outOfStock = list.filter((p) => p.is_active && p.stock_qty <= 0).length;
  const revenue = (recent ?? []).reduce((n, o) => n + Number(o.total_incl_vat), 0);

  const tiles = [
    {
      href: "/admin/orders",
      icon: PackageSearch,
      label: "Orders to dispatch",
      value: String(toShip?.length ?? 0),
      hint: "Paid and waiting for a waybill",
    },
    {
      href: "/admin/orders?show=all",
      icon: PackageOpen,
      label: "Sales, last 30 days",
      value: formatRand(revenue),
      hint: `${recent?.length ?? 0} paid orders, incl. VAT`,
    },
    { href: "/admin/products", icon: BadgePercent, label: "Products on sale", value: String(onSale), hint: "Shown with a discount ribbon" },
    { href: "/admin/products", icon: TriangleAlert, label: "Out of stock", value: String(outOfStock), hint: `of ${list.length} products` },
  ];

  return (
    <div className="space-y-8">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="group block h-full rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/25">
              <span className="flex items-center justify-between text-sm text-muted-foreground">
                {t.label}
                <t.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="num mt-3 block font-display text-3xl font-semibold">{t.value}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{t.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            href: "/admin/products",
            title: "Change prices or run a sale",
            body: "Edit prices and stock, or select products and take a percentage off. Discount ribbons appear automatically.",
          },
          { href: "/admin/delivery", title: "Delivery rates", body: "Set what DSV delivery costs per province and type of item." },
          {
            href: "/admin/import",
            title: "Update from the spreadsheet",
            body: "Upload the latest product list to add products and refresh prices and stock.",
          },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="group rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/25">
            <span className="flex items-center justify-between font-semibold">
              {c.title} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">{c.body}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Overview</h1>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <Overview />
      </Suspense>
    </div>
  );
}
