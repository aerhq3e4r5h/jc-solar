import "server-only";
import { getCatalogue, getCompatibilityOverrides } from "@/lib/catalogue/queries";
import { createPublicClient } from "@/lib/supabase/public";
import { readCart } from "./cart";
import { buildCartSummary, type CartSummary } from "./summary";

/** The visitor's cart with live prices and live available stock. Reads cookies, so call inside <Suspense>. */
export async function loadCart(): Promise<CartSummary> {
  const [lines, catalogue, overrides] = await Promise.all([readCart(), getCatalogue(), getCompatibilityOverrides()]);
  const available = new Map<string, number>();
  const supabase = createPublicClient();
  if (supabase && lines.length) {
    // Stock minus active checkout reservations, not cached.
    const { data } = await supabase.rpc("available_stock", { p_product_ids: lines.map((l) => l.id) });
    for (const row of data ?? []) available.set(row.product_id, row.available);
  }
  return buildCartSummary(lines, catalogue, available, overrides);
}
