"use client";

import { Loader2, Truck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROVINCES } from "@/lib/checkout/schema";
import { formatRand } from "@/lib/pricing/vat";
import { estimateProductDelivery } from "@/lib/shipping/actions";
import { etaText } from "@/lib/shipping/format";

// Remembered in a cookie (a year), so every product page and the checkout can use it.
const COOKIE = "jc_delivery";

function readSaved(): { province: string; postalCode: string } | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (raw) {
    try {
      const v = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)));
      if (typeof v?.province === "string") return { province: v.province, postalCode: typeof v.postalCode === "string" ? v.postalCode : "" };
    } catch {}
  }
  // Older visits stored only the province.
  try {
    const p = localStorage.getItem("jc_province");
    if (p) return { province: p, postalCode: "" };
  } catch {}
  return null;
}

function save(province: string, postalCode: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify({ province, postalCode }))}; path=/; max-age=31536000; samesite=lax`;
}

type Estimate = { price: number | null; eta: string | null } | { error: string };

/** "Delivery to <province>: R450, 4–5 working days", remembered across product pages. */
export function DeliveryEstimate({ productId, note }: { productId: string; note: string | null }) {
  const [province, setProvince] = useState<string>("");
  const [postalCode, setPostalCode] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [pending, startTransition] = useTransition();

  const check = (p: string, code = postalCode) => {
    setProvince(p);
    if (code && !/^\d{4}$/.test(code)) return;
    save(p, code);
    startTransition(async () => {
      const r = await estimateProductDelivery(productId, p, code);
      if (!r.ok) return setEstimate({ error: r.error });
      const s = r.quote.shipments[0];
      setEstimate({ price: s?.price ?? null, eta: s ? etaText(s.etaDaysMin, s.etaDaysMax) : null });
    });
  };

  useEffect(() => {
    const saved = readSaved();
    if (saved && (PROVINCES as readonly string[]).includes(saved.province)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the remembered address once after hydration
      setPostalCode(saved.postalCode);
      check(saved.province, saved.postalCode);
    }
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
          <label className="inline-flex items-center gap-2">
            <span className="sr-only">Postcode (optional)</span>
            <input
              value={postalCode}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPostalCode(v);
                if (province && (v.length === 4 || v.length === 0)) check(province, v);
              }}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="Postcode"
              aria-describedby="postcode-hint"
              className="num h-8 w-24 rounded-md border border-input bg-transparent px-2.5 text-sm"
            />
          </label>
        </div>
        <p id="postcode-hint" className="sr-only">
          Optional. Some areas have their own rate.
        </p>
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
