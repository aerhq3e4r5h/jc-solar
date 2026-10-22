"use client";

import { Loader2, Truck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROVINCES } from "@/lib/checkout/schema";
import { formatRand } from "@/lib/pricing/vat";
import { estimateProductDelivery } from "@/lib/shipping/actions";
import { etaText } from "@/lib/shipping/format";

const KEY = "jc_province";

type Estimate = { price: number | null; eta: string | null } | { error: string };

/** "Delivery to <province>: R450, 4–5 working days", remembered across product pages. */
export function DeliveryEstimate({ productId, note }: { productId: string; note: string | null }) {
  const [province, setProvince] = useState<string>("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [pending, startTransition] = useTransition();

  const check = (p: string) => {
    setProvince(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {}
    startTransition(async () => {
      const r = await estimateProductDelivery(productId, p);
      if (!r.ok) return setEstimate({ error: r.error });
      const s = r.quote.shipments[0];
      setEstimate({ price: s?.price ?? null, eta: s ? etaText(s.etaDaysMin, s.etaDaysMax) : null });
    });
  };

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the remembered province once after hydration
    if (saved && (PROVINCES as readonly string[]).includes(saved)) check(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, with the remembered province
  }, []);

  return (
    <div className="flex gap-3">
      <Truck className="size-5 shrink-0 text-amber-ink" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-medium">Delivery to</span>
          <Select value={province} onValueChange={check}>
            <SelectTrigger size="sm" className="h-8 w-48" aria-label="Your province">
              <SelectValue placeholder="Choose your province" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground" aria-live="polite">
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking…
            </span>
          ) : !estimate ? (
            "Anywhere in South Africa. Choose your province to see the cost."
          ) : "error" in estimate ? (
            estimate.error
          ) : estimate.price === null ? (
            "We'll quote delivery to your area after you order."
          ) : (
            <>
              <span className="num font-semibold text-foreground">{formatRand(estimate.price)}</span>
              {estimate.eta ? `, usually ${estimate.eta}` : ""}.
            </>
          )}
        </p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}
