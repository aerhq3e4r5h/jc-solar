"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestQuote } from "@/lib/checkout/actions";

export function QuoteDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({ name: "", email: "", phone: "", company: "", marketingOptIn: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ pdfUrl: string; code: string } | null>(null);

  const set = (k: "name" | "email" | "phone" | "company") => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await requestQuote(v);
      if (!r.ok) {
        setErrors(r.fields ?? {});
        setError(r.error);
        return;
      }
      setErrors({});
      setDone({ pdfUrl: r.pdfUrl, code: r.code });
      window.location.assign(r.pdfUrl); // starts the download
    });
  };

  const field = (k: "name" | "email" | "phone" | "company", label: string, type = "text", autoComplete?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`q-${k}`}>{label}</Label>
      <Input
        id={`q-${k}`}
        type={type}
        autoComplete={autoComplete}
        value={v[k]}
        onChange={set(k)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `q-${k}-error` : undefined}
      />
      {errors[k] && (
        <p id={`q-${k}-error`} className="text-sm text-destructive">
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setDone(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full">
          <FileText /> Download a quotation (PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{done ? `Quotation ${done.code}` : "Get a quotation"}</DialogTitle>
          <DialogDescription>
            {done
              ? "Your download should start now. We've also emailed you a copy."
              : "A PDF of your cart with our banking details, valid for 7 days. Handy for paying by EFT or getting approval."}
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <Button asChild size="lg">
            <a href={done.pdfUrl}>
              <Download /> Download again
            </a>
          </Button>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            {field("name", "Name for the quotation", "text", "name")}
            {field("email", "Email", "email", "email")}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("phone", "Phone (optional)", "tel", "tel")}
              {field("company", "Company (optional)", "text", "organization")}
            </div>
            <p className="text-xs text-muted-foreground">We use these details to prepare and email your quotation, and may follow up about it once.</p>
            <div className="flex items-start gap-3">
              <Checkbox id="q-marketing" checked={v.marketingOptIn} onCheckedChange={(c) => setV((s) => ({ ...s, marketingOptIn: c === true }))} />
              <Label htmlFor="q-marketing" className="font-normal text-muted-foreground">
                Also email me occasional specials (optional).
              </Label>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Download />} Create quotation
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
