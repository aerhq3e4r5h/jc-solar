import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRand } from "@/lib/pricing/vat";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { STATUS_TONE } from "./status";

const FILTERS = {
  dispatch: { label: "To dispatch", statuses: ["paid", "processing"] },
  shipped: { label: "Shipped", statuses: ["shipped"] },
  awaiting: { label: "Awaiting payment", statuses: ["pending_payment"] },
  all: { label: "All", statuses: null },
} as const;
type FilterKey = keyof typeof FILTERS;

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });

async function Orders({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const filter: FilterKey = show && show in FILTERS ? (show as FilterKey) : "dispatch";
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, created_at, paid_at, customer_name, email, status, total_incl_vat, shipping_incl_vat, delivery_method, delivery_pending, shipping_address, shipments(id, status)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: filter === "dispatch" })
    .limit(200);
  const statuses = FILTERS[filter].statuses;
  if (statuses) query = query.in("status", [...statuses]);
  const { data: orders, error } = await query;

  return (
    <div className="space-y-6">
      <nav aria-label="Order filters" className="flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
          <Link
            key={k}
            href={`/admin/orders?show=${k}`}
            aria-current={k === filter ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              k === filter ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
            )}
          >
            {FILTERS[k].label}
          </Link>
        ))}
      </nav>
      {error && <p className="text-destructive">Could not load orders: {error.message}</p>}
      {orders && orders.length === 0 && (
        <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          {filter === "dispatch" ? "Nothing waiting to be dispatched." : "No orders here."}
        </p>
      )}
      {orders && orders.length > 0 && (
        <div className="rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Deliver to</TableHead>
                <TableHead className="text-right">Delivery</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const addr = o.shipping_address as Record<string, string> | null;
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium underline-offset-4 hover:underline">
                        {o.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{date(o.paid_at ?? o.created_at)}</TableCell>
                    <TableCell>
                      <span className="block">{o.customer_name}</span>
                      <span className="block text-xs text-muted-foreground">{o.email}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{addr ? [addr.city, addr.province].filter(Boolean).join(", ") : "–"}</TableCell>
                    <TableCell className="num text-right">
                      {o.delivery_method === "installer_delivery"
                        ? "Installer"
                        : o.delivery_pending
                          ? "To quote"
                          : formatRand(Number(o.shipping_incl_vat))}
                    </TableCell>
                    <TableCell className="num text-right">{formatRand(Number(o.total_incl_vat))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-0", STATUS_TONE[o.status])}>
                        {o.status.replace(/_/g, " ")}
                      </Badge>
                      {o.shipments.length > 0 && <span className="ml-2 text-xs text-muted-foreground">{o.shipments.length} shipment(s)</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage(props: { searchParams: Promise<{ show?: string }> }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="mt-2 text-muted-foreground">Paid orders waiting for dispatch come first, oldest at the top.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Orders {...props} />
      </Suspense>
    </div>
  );
}
