"use client";

import { Check, Loader2, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/account/actions";

export type ProfileValues = { fullName: string; phone: string; company: string; marketing: boolean };

export function ProfileForm({ initial, email }: { initial: ProfileValues; email: string | null }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof ProfileValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: k === "marketing" ? e.target.checked : e.target.value });

  if (!editing) {
    return (
      <div className="space-y-3">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Row label="Name" value={initial.fullName || "Not added"} />
          <Row label="Email" value={email ?? ""} />
          <Row label="Phone" value={initial.phone || "Not added"} />
          <Row label="Company" value={initial.company || "None"} />
          <Row label="Offers by email" value={initial.marketing ? "Yes" : "No"} />
        </dl>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil /> Edit details
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await updateProfile(v);
          if (!r.ok) return setError(r.error);
          toast.success("Details saved");
          setEditing(false);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-name">Full name</Label>
          <Input id="p-name" autoComplete="name" value={v.fullName} onChange={set("fullName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-phone">Phone</Label>
          <Input id="p-phone" type="tel" autoComplete="tel" value={v.phone} onChange={set("phone")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="p-company">Company (optional)</Label>
          <Input id="p-company" autoComplete="organization" value={v.company} onChange={set("company")} />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={v.marketing} onChange={set("marketing")} className="mt-0.5 size-4 accent-[var(--ink)]" />
        Email me specials and new stock. You can stop any time.
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />} Save
        </Button>
        <Button type="button" variant="ghost" onClick={() => (setV(initial), setEditing(false))}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}
