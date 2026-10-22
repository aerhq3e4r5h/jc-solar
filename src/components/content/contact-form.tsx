"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendContactMessage } from "@/lib/contact/actions";

export function ContactForm() {
  const [v, setV] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  if (sent) {
    return (
      <p role="status" className="flex items-start gap-3 rounded-2xl border bg-card p-6">
        <CheckCircle2 className="mt-0.5 size-5 text-success" aria-hidden="true" />
        Thanks, we&apos;ve received your message and will reply by email.
      </p>
    );
  }

  const field = (k: "name" | "email" | "phone", label: string, type: string, autoComplete: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`c-${k}`}>{label}</Label>
      <Input id={`c-${k}`} type={type} autoComplete={autoComplete} value={v[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `c-${k}-error` : undefined} />
      {errors[k] && (
        <p id={`c-${k}-error`} className="text-sm text-destructive">
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <form
      noValidate
      className="space-y-4 rounded-2xl border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await sendContactMessage(v);
          if (r.ok) setSent(true);
          else {
            setErrors(r.fields ?? {});
            setError(r.error);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", "Name", "text", "name")}
        {field("email", "Email", "email", "email")}
      </div>
      {field("phone", "Phone (optional)", "tel", "tel")}
      <div className="space-y-1.5">
        <Label htmlFor="c-message">How can we help?</Label>
        <Textarea id="c-message" rows={6} value={v.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "c-message-error" : undefined} />
        {errors.message && (
          <p id="c-message-error" className="text-sm text-destructive">
            {errors.message}
          </p>
        )}
      </div>
      <div aria-hidden="true" className="hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
      </div>
      <p className="text-xs text-muted-foreground">We use your details only to reply to this message.</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Send />} Send message
      </Button>
    </form>
  );
}
