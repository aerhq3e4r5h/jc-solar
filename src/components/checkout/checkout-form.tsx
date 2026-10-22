"use client";

import { Building2, CreditCard, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { placeOrder } from "@/lib/checkout/actions";
import { PROVINCES } from "@/lib/checkout/schema";
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

export function CheckoutForm({ defaultEmail }: { defaultEmail?: string | null }) {
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
            <Input id="phone" type="tel" autoComplete="tel" placeholder="082 123 4567" value={v.phone} onChange={set("phone")} {...aria("phone", true)} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-xl font-semibold">Delivery address</legend>
        <p className="text-sm text-muted-foreground">We deliver anywhere in South Africa and confirm the delivery cost before dispatch.</p>
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

      <fieldset>
        <legend className="mb-4 font-display text-xl font-semibold">Payment</legend>
        <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: "payfast", icon: CreditCard, title: "Pay online", body: "Card, Instant EFT and more through PayFast. Your order is confirmed straight away." },
              { value: "eft", icon: Building2, title: "Bank transfer (EFT)", body: "We hold your stock for 48 hours and email our banking details and a pro forma invoice." },
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
  );
}
