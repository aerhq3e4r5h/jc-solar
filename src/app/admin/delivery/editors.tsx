"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PROVINCES } from "@/lib/checkout/schema";
import { SHIPPING_CLASS_LABEL } from "@/lib/shipping/format";
import type { ShippingClass } from "@/lib/shipping/types";
import { deleteRate, saveDeliverySettings, saveRate } from "./actions";

export type SettingsValues = {
  carrierName: string;
  trackingUrlTemplate: string;
  freeDeliveryWithInstallation: boolean;
  freeDeliveryThreshold: string;
  quoteAfterOrderWhenUnavailable: boolean;
  collectionEnabled: boolean;
  collectionAddress: string;
};

function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SettingsEditor({ initial }: { initial: SettingsValues }) {
  const [v, setV] = useState(initial);
  const [pending, startTransition] = useTransition();
  const text =
    (k: "carrierName" | "trackingUrlTemplate" | "freeDeliveryThreshold" | "collectionAddress") => (e: React.ChangeEvent<HTMLInputElement>) =>
      setV((s) => ({ ...s, [k]: e.target.value }));
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveDeliverySettings(v);
      if (r.ok) toast.success("Delivery settings saved");
      else toast.error(r.error);
    });
  };
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="s-carrier">Courier name (shown to customers)</Label>
          <Input id="s-carrier" value={v.carrierName} onChange={text("carrierName")} maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-threshold">Free delivery on orders over (R, optional)</Label>
          <Input id="s-threshold" inputMode="decimal" value={v.freeDeliveryThreshold} onChange={text("freeDeliveryThreshold")} placeholder="Off" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="s-tracking">Tracking page link (optional)</Label>
          <Input
            id="s-tracking"
            value={v.trackingUrlTemplate}
            onChange={text("trackingUrlTemplate")}
            placeholder="https://…{tracking}…"
            aria-describedby="s-tracking-hint"
          />
          <p id="s-tracking-hint" className="text-xs text-muted-foreground">
            Paste the courier&apos;s tracking link with <code>{"{tracking}"}</code> where the tracking number goes. Leave blank to show just the
            number.
          </p>
        </div>
      </div>
      <Toggle
        id="s-install"
        label="Free delivery when installation is booked"
        hint="Our technician brings the stock on installation day."
        checked={v.freeDeliveryWithInstallation}
        onChange={(c) => setV((s) => ({ ...s, freeDeliveryWithInstallation: c }))}
      />
      <Toggle
        id="s-pending"
        label="Allow orders when an area has no rate"
        hint="On: the order goes through and you quote that part of the delivery afterwards. Off: checkout asks the customer to contact you."
        checked={v.quoteAfterOrderWhenUnavailable}
        onChange={(c) => setV((s) => ({ ...s, quoteAfterOrderWhenUnavailable: c }))}
      />
      <Toggle
        id="s-collect"
        label="Customers can collect"
        hint="Offer free collection from an address you choose."
        checked={v.collectionEnabled}
        onChange={(c) => setV((s) => ({ ...s, collectionEnabled: c }))}
      />
      {v.collectionEnabled && (
        <div className="space-y-1.5">
          <Label htmlFor="s-address">Collection address and hours</Label>
          <Input id="s-address" value={v.collectionAddress} onChange={text("collectionAddress")} maxLength={300} />
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Save settings
      </Button>
    </form>
  );
}

export type RateValues = {
  id?: string;
  shippingClass: ShippingClass;
  province: (typeof PROVINCES)[number];
  postalCodeFrom: string;
  postalCodeTo: string;
  base: string;
  perItem: string;
  perKg: string;
  etaMin: string;
  etaMax: string;
  isActive: boolean;
};

function RateRow({ initial }: { initial: RateValues }) {
  const [v, setV] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const num = (k: "base" | "perItem" | "perKg" | "etaMin" | "etaMax") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));
  const save = () =>
    startTransition(async () => {
      const r = await saveRate(v);
      if (r.ok) toast.success(`Saved ${v.province}${v.postalCodeFrom ? ` ${v.postalCodeFrom}–${v.postalCodeTo || v.postalCodeFrom}` : ""}`);
      else toast.error(r.error);
    });
  const remove = () =>
    startTransition(async () => {
      if (!v.id || !confirm(`Delete this rate for ${v.province}?`)) return;
      const r = await deleteRate(v.id);
      if (r.ok) toast.success("Rate deleted");
      else toast.error(r.error);
    });
  const cell = "h-8 w-24 text-right";
  const label = `${v.province}${v.postalCodeFrom ? ` ${v.postalCodeFrom}–${v.postalCodeTo || v.postalCodeFrom}` : ""}`;
  return (
    <tr className={v.isActive ? "" : "opacity-60"}>
      <td className="py-1.5 pr-3 whitespace-nowrap">
        {v.province}
        {v.postalCodeFrom && (
          <span className="block font-mono text-xs text-muted-foreground">
            {v.postalCodeFrom}–{v.postalCodeTo || v.postalCodeFrom}
          </span>
        )}
      </td>
      <td className="py-1.5 pr-2">
        <Input className={cell} inputMode="decimal" value={v.base} onChange={num("base")} aria-label={`Base price, ${label}`} />
      </td>
      <td className="py-1.5 pr-2">
        <Input className={cell} inputMode="decimal" value={v.perItem} onChange={num("perItem")} aria-label={`Per extra item, ${label}`} />
      </td>
      <td className="py-1.5 pr-2">
        <Input className={cell} inputMode="decimal" value={v.perKg} onChange={num("perKg")} aria-label={`Per kg, ${label}`} />
      </td>
      <td className="py-1.5 pr-2 whitespace-nowrap">
        <Input className="h-8 w-14 text-right" inputMode="numeric" value={v.etaMin} onChange={num("etaMin")} aria-label={`Quickest days, ${label}`} />
        <span className="px-1">–</span>
        <Input className="h-8 w-14 text-right" inputMode="numeric" value={v.etaMax} onChange={num("etaMax")} aria-label={`Longest days, ${label}`} />
      </td>
      <td className="py-1.5 pr-2">
        <Switch checked={v.isActive} onCheckedChange={(c) => setV((s) => ({ ...s, isActive: c }))} aria-label={`Active, ${label}`} />
      </td>
      <td className="py-1.5 whitespace-nowrap">
        <Button size="sm" variant={dirty ? "default" : "ghost"} disabled={pending || !dirty} onClick={save}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
        {v.id && (
          <Button size="icon" variant="ghost" className="size-8" disabled={pending} onClick={remove} aria-label={`Delete rate, ${label}`}>
            <Trash2 />
          </Button>
        )}
      </td>
    </tr>
  );
}

export function RateTable({ shippingClass, rows }: { shippingClass: ShippingClass; rows: RateValues[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Area</th>
            <th className="pb-2 font-medium">First item (R)</th>
            <th className="pb-2 font-medium">Each extra item (R)</th>
            <th className="pb-2 font-medium">Per kg (R)</th>
            <th className="pb-2 font-medium">Working days</th>
            <th className="pb-2 font-medium">Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <RateRow key={`${r.id}-${JSON.stringify(r)}`} initial={r} />
          ))}
        </tbody>
      </table>
      <AddRate shippingClass={shippingClass} />
    </div>
  );
}

function AddRate({ shippingClass }: { shippingClass: ShippingClass }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const blank: RateValues = {
    shippingClass,
    province: "Gauteng",
    postalCodeFrom: "",
    postalCodeTo: "",
    base: "",
    perItem: "0",
    perKg: "0",
    etaMin: "",
    etaMax: "",
    isActive: true,
  };
  const [v, setV] = useState(blank);
  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <Plus /> Add a rate for an area or postal-code range
      </Button>
    );
  }
  const text = (k: keyof RateValues) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveRate(v);
      if (r.ok) {
        toast.success("Rate added");
        setV(blank);
        setOpen(false);
      } else toast.error(r.error);
    });
  };
  return (
    <form onSubmit={add} className="mt-3 grid gap-3 rounded-xl border p-4 sm:grid-cols-4">
      <p className="text-sm text-muted-foreground sm:col-span-4">
        New {SHIPPING_CLASS_LABEL[shippingClass].toLowerCase()} rate. A postal-code range overrides the province rate for those codes (e.g. remote
        towns).
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={`a-${shippingClass}-prov`}>Province</Label>
        <Select value={v.province} onValueChange={(p) => setV((s) => ({ ...s, province: p as RateValues["province"] }))}>
          <SelectTrigger id={`a-${shippingClass}-prov`} className="w-full">
            <SelectValue />
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
      <div className="space-y-1.5">
        <Label htmlFor={`a-${shippingClass}-from`}>Postal codes from</Label>
        <Input
          id={`a-${shippingClass}-from`}
          inputMode="numeric"
          maxLength={4}
          value={v.postalCodeFrom}
          onChange={text("postalCodeFrom")}
          placeholder="All"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`a-${shippingClass}-to`}>to</Label>
        <Input id={`a-${shippingClass}-to`} inputMode="numeric" maxLength={4} value={v.postalCodeTo} onChange={text("postalCodeTo")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`a-${shippingClass}-base`}>First item (R)</Label>
        <Input id={`a-${shippingClass}-base`} inputMode="decimal" value={v.base} onChange={text("base")} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`a-${shippingClass}-item`}>Each extra item (R)</Label>
        <Input id={`a-${shippingClass}-item`} inputMode="decimal" value={v.perItem} onChange={text("perItem")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`a-${shippingClass}-min`}>Quickest (days)</Label>
        <Input id={`a-${shippingClass}-min`} inputMode="numeric" value={v.etaMin} onChange={text("etaMin")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`a-${shippingClass}-max`}>Longest (days)</Label>
        <Input id={`a-${shippingClass}-max`} inputMode="numeric" value={v.etaMax} onChange={text("etaMax")} />
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" disabled={pending || !v.base}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
