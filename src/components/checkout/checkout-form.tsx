"use client";

import { Building2, CreditCard, Loader2, Lock, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { OrderSummary } from "@/components/checkout/order-summary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { placeOrder } from "@/lib/checkout/actions";
import { PROVINCES } from "@/lib/checkout/schema";
import { formatRand } from "@/lib/pricing/vat";
import { getDeliveryQuote } from "@/lib/shipping/actions";
import { etaText, overallEta, quoteToSummary, SHIPPING_CLASS_LABEL, type SummaryDelivery } from "@/lib/shipping/format";
import type { DeliveryQuote } from "@/lib/shipping/types";
import { cn } from "@/lib/utils";

type Errors = Record<string, string>;

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type Delivery = { state: "idle" } | { state: "loading" } | { state: "ready"; quote: DeliveryQuote } | { state: "error"; error: string };

function summaryFor(d: Delivery): SummaryDelivery {
  if (d.state === "ready") return quoteToSummary(d.quote, formatRand);
  if (d.state === "loading") return { amount: null, label: "Calculating…" };
  if (d.state === "error") return { amount: null, label: "Confirmed before dispatch" };
  return { amount: null, label: "Enter your address" };
}

function DeliveryOptions({ delivery }: { delivery: Delivery }) {
  if (delivery.state === "idle") {
    return <p className="text-sm text-muted-foreground">Choose your province above to see the delivery cost and time.</p>;
  }
  if (delivery.state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Working out delivery…
      </p>
    );
  }
  if (delivery.state === "error") {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {delivery.error} You can still place your order.
      </p>
    );
  }
  const q = delivery.quote;
  const eta = overallEta(q.shipments);
  return (
    <div className="space-y-3" role="status">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-sun bg-accent/50 p-4 ring-1 ring-sun">
        <span className="flex gap-3">
          <Truck className="mt-0.5 size-5 shrink-0 text-amber-ink" aria-hidden="true" />
          <span>
            <span className="block font-semibold">
              {q.freeReason === "installation" ? "Delivered by our installer" : `Delivery${q.carrier ? ` by ${q.carrier}` : ""}`}
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {q.freeReason === "installation"
                ? "Free, because you've added installation: our technician brings everything on installation day."
                : eta
                  ? `Usually ${eta} after payment.`
                  : "We'll confirm the delivery date after your order."}
            </span>
          </span>
        </span>
        <span className="num shrink-0 font-semibold">{q.total > 0 ? formatRand(q.total) : q.pending ? "To confirm" : "Free"}</span>
      </div>
      {q.freeReason !== "installation" && q.shipments.length > 1 && (
        <ul className="space-y-1 text-sm text-muted-foreground" aria-label="Delivery breakdown">
          {q.shipments.map((sh) => (
            <li key={sh.shippingClass} className="flex justify-between gap-4">
              <span>
                {SHIPPING_CLASS_LABEL[sh.shippingClass]} ({sh.items} item{sh.items === 1 ? "" : "s"})
                {sh.price !== null && etaText(sh.etaDaysMin, sh.etaDaysMax) ? `, ${etaText(sh.etaDaysMin, sh.etaDaysMax)}` : ""}
              </span>
              <span className="num shrink-0">{sh.price === null ? "Quoted after order" : q.freeReason ? "Free" : formatRand(sh.price)}</span>
            </li>
          ))}
        </ul>
      )}
      {q.shipments.some((sh) => sh.shippingClass === "dangerous_goods") && q.freeReason !== "installation" && (
        <p className="text-xs text-muted-foreground">Lithium batteries travel separately as dangerous goods (UN3480), as courier rules require.</p>
      )}
    </div>
  );
}

export function CheckoutForm({
  defaultEmail,
  lines,
  productsTotal,
  installationRequested,
}: {
  defaultEmail?: string | null;
  lines: { key: string; name: string; quantity: number; lineTotal: number }[];
  productsTotal: number;
  installationRequested: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [v, setV] = useState({
    firstName: "",
    lastName: "",
    email: defaultEmail ?? "",
    phone: "",
    line1: "",
    line2: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
    notes: "",
    paymentMethod: "payfast" as "payfast" | "eft",
    acceptTerms: false,
    marketingOptIn: false,
  });
  const [delivery, setDelivery] = useState<Delivery>({ state: "idle" });
  const request = useRef(0);

  // Re-price delivery when the province or a complete postal code changes.
  useEffect(() => {
    const postalCode = /^\d{4}$/.test(v.postalCode) ? v.postalCode : "";
    if (!v.province) return;
    const id = ++request.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shows the spinner while the quote loads
    setDelivery({ state: "loading" });
    const t = setTimeout(async () => {
      const r = await getDeliveryQuote({ province: v.province, postalCode }).catch(() => ({
        ok: false as const,
        error: "Delivery is confirmed before dispatch.",
      }));
      if (id !== request.current) return;
      setDelivery(r.ok ? { state: "ready", quote: r.quote } : { state: "error", error: r.error });
    }, 250);
    return () => clearTimeout(t);
  }, [v.province, v.postalCode]);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const aria = (key: string, hint = false) => ({
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `${key}-error` : hint ? `${key}-hint` : undefined,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const r = await placeOrder({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
        address: { line1: v.line1, line2: v.line2, suburb: v.suburb, city: v.city, province: v.province as never, postalCode: v.postalCode },
        notes: v.notes,
        paymentMethod: v.paymentMethod,
        acceptTerms: v.acceptTerms as true,
        marketingOptIn: v.marketingOptIn,
      });
      if (r.ok) {
        router.push(r.url);
        return;
      }
      setErrors(r.fields ?? {});
      setFormError(r.error);
      const first = Object.keys(r.fields ?? {})[0];
      if (first) document.getElementById(first)?.focus();
    });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <form onSubmit={submit} noValidate className="space-y-10">
        <fieldset className="space-y-4">
          <legend className="mb-2 font-display text-xl font-semibold">Your details</legend>
          <p className="text-sm text-muted-foreground">We use these to process your order, arrange delivery and send your invoice. Nothing else.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="firstName" label="First name" error={errors.firstName}>
              <Input id="firstName" autoComplete="given-name" value={v.firstName} onChange={set("firstName")} {...aria("firstName")} />
            </Field>
            <Field id="lastName" label="Surname" error={errors.lastName}>
              <Input id="lastName" autoComplete="family-name" value={v.lastName} onChange={set("lastName")} {...aria("lastName")} />
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" value={v.email} onChange={set("email")} {...aria("email")} />
            </Field>
            <Field id="phone" label="Mobile number" error={errors.phone} hint="For delivery and installation updates">
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="082 123 4567"
                value={v.phone}
                onChange={set("phone")}
                {...aria("phone", true)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 font-display text-xl font-semibold">Delivery address</legend>
          <p className="text-sm text-muted-foreground">We deliver anywhere in South Africa.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="address.line1" label="Street address" error={errors["address.line1"]}>
                <Input id="address.line1" autoComplete="address-line1" value={v.line1} onChange={set("line1")} {...aria("address.line1")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id="address.line2" label="Complex, building or unit (optional)">
                <Input id="address.line2" autoComplete="address-line2" value={v.line2} onChange={set("line2")} />
              </Field>
            </div>
            <Field id="address.suburb" label="Suburb (optional)">
              <Input id="address.suburb" autoComplete="address-level3" value={v.suburb} onChange={set("suburb")} />
            </Field>
            <Field id="address.city" label="Town or city" error={errors["address.city"]}>
              <Input id="address.city" autoComplete="address-level2" value={v.city} onChange={set("city")} {...aria("address.city")} />
            </Field>
            <Field id="address.province" label="Province" error={errors["address.province"]}>
              <Select value={v.province} onValueChange={(province) => setV((s) => ({ ...s, province }))}>
                <SelectTrigger id="address.province" className="w-full" {...aria("address.province")}>
                  <SelectValue placeholder="Choose a province" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="address.postalCode" label="Postal code" error={errors["address.postalCode"]}>
              <Input
                id="address.postalCode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={4}
                value={v.postalCode}
                onChange={set("postalCode")}
                {...aria("address.postalCode")}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="notes" label="Delivery notes (optional)" hint="Gate codes, access, best times">
                <Textarea id="notes" rows={2} value={v.notes} onChange={set("notes")} aria-describedby="notes-hint" />
              </Field>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 font-display text-xl font-semibold">Delivery</legend>
          <DeliveryOptions delivery={delivery} />
        </fieldset>

        <fieldset>
          <legend className="mb-4 font-display text-xl font-semibold">Payment</legend>
          <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "payfast",
                  icon: CreditCard,
                  title: "Pay online",
                  body: "Card, Instant EFT and more through PayFast. Your order is confirmed straight away.",
                },
                {
                  value: "eft",
                  icon: Building2,
                  title: "Bank transfer (EFT)",
                  body: "We hold your stock for 48 hours and email our banking details and a pro forma invoice.",
                },
              ] as const
            ).map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={v.paymentMethod === o.value}
                onClick={() => setV((s) => ({ ...s, paymentMethod: o.value }))}
                className={cn(
                  "flex gap-3 rounded-xl border p-4 text-left transition-colors",
                  v.paymentMethod === o.value ? "border-sun bg-accent/60 ring-1 ring-sun" : "hover:bg-muted",
                )}
              >
                <o.icon className="mt-0.5 size-5 shrink-0 text-amber-ink" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{o.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{o.body}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="acceptTerms"
              checked={v.acceptTerms}
              onCheckedChange={(c) => setV((s) => ({ ...s, acceptTerms: c === true }))}
              aria-invalid={!!errors.acceptTerms}
              aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
            />
            <div>
              <Label htmlFor="acceptTerms" className="block font-normal leading-relaxed">
                I accept the{" "}
                <Link href="/terms" target="_blank" className="font-medium underline underline-offset-4">
                  Terms and Conditions
                </Link>{" "}
                and have read the{" "}
                <Link href="/privacy" target="_blank" className="font-medium underline underline-offset-4">
                  Privacy Policy
                </Link>
                , including the{" "}
                <Link href="/warranty-and-returns" target="_blank" className="font-medium underline underline-offset-4">
                  returns and cancellation policy
                </Link>
                .
              </Label>
              {errors.acceptTerms && (
                <p id="acceptTerms-error" className="mt-1 text-sm text-destructive">
                  {errors.acceptTerms}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="marketingOptIn" checked={v.marketingOptIn} onCheckedChange={(c) => setV((s) => ({ ...s, marketingOptIn: c === true }))} />
            <Label htmlFor="marketingOptIn" className="font-normal leading-relaxed text-muted-foreground">
              Email me occasional specials and solar tips. Optional; unsubscribe at any time.
            </Label>
          </div>
        </div>

        {formError && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {formError}
          </p>
        )}

        <div className="space-y-3">
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Lock />}
            Continue to review your order
          </Button>
          <p className="text-center text-xs text-muted-foreground">You&apos;ll see the full order before paying, and can still change it.</p>
        </div>
      </form>
      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary lines={lines} productsTotal={productsTotal} delivery={summaryFor(delivery)} installationRequested={installationRequested} />
        <p className="mt-3 text-center text-sm">
          <Link href="/cart" className="underline underline-offset-4">
            Edit cart
          </Link>
        </p>
      </aside>
    </div>
  );
}
