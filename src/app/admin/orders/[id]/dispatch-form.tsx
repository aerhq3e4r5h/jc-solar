"use client";

import { Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SHIPPING_CLASS_LABEL } from "@/lib/shipping/format";
import type { ShippingClass } from "@/lib/shipping/types";
import { recordShipment, setShipmentStatus } from "../actions";

type ClassChoice = "" | ShippingClass;

/** Record a shipment booked with the courier (waybill and tracking number). */
export function DispatchForm({ orderId, carrier, classes }: { orderId: string; carrier: string; classes: ShippingClass[] }) {
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({
    shippingClass: (classes.length === 1 ? classes[0] : "") as ClassChoice,
    provider: carrier,
    trackingNumber: "",
    waybillNumber: "",
    costInclVat: "",
    note: "",
    notifyCustomer: true,
  });
  const set = (k: "provider" | "trackingNumber" | "waybillNumber" | "costInclVat" | "note") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await recordShipment({ orderId, ...v });
      if (r.ok) {
        toast.success(r.message);
        setV((s) => ({ ...s, trackingNumber: "", waybillNumber: "", costInclVat: "", note: "" }));
      } else toast.error(r.error);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="d-class">What&apos;s in this shipment</Label>
          <Select
            value={v.shippingClass || "all"}
            onValueChange={(c) => setV((s) => ({ ...s, shippingClass: c === "all" ? "" : (c as ShippingClass) }))}
          >
            <SelectTrigger id="d-class" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">The whole order</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {SHIPPING_CLASS_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-provider">Courier</Label>
          <Input id="d-provider" value={v.provider} onChange={set("provider")} maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-tracking">Tracking number</Label>
          <Input id="d-tracking" value={v.trackingNumber} onChange={set("trackingNumber")} required maxLength={80} autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-waybill">Waybill number (if different)</Label>
          <Input id="d-waybill" value={v.waybillNumber} onChange={set("waybillNumber")} maxLength={80} autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-cost">What the courier charged us (R, optional)</Label>
          <Input id="d-cost" inputMode="decimal" value={v.costInclVat} onChange={set("costInclVat")} placeholder="e.g. 450.00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d-note">Note (optional, the customer sees it)</Label>
          <Input id="d-note" value={v.note} onChange={set("note")} maxLength={300} placeholder="e.g. 2 pallets" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="d-notify" checked={v.notifyCustomer} onCheckedChange={(c) => setV((s) => ({ ...s, notifyCustomer: c === true }))} />
        <Label htmlFor="d-notify" className="font-normal">
          Email the customer their tracking number
        </Label>
      </div>
      <Button type="submit" disabled={pending || !v.trackingNumber.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <Send />} Save shipment
      </Button>
    </form>
  );
}

const NEXT: Record<string, { status: "collected" | "in_transit" | "out_for_delivery" | "delivered"; label: string }[]> = {
  booked: [
    { status: "collected", label: "Collected" },
    { status: "in_transit", label: "In transit" },
  ],
  collected: [{ status: "in_transit", label: "In transit" }],
  in_transit: [
    { status: "out_for_delivery", label: "Out for delivery" },
    { status: "delivered", label: "Delivered" },
  ],
  out_for_delivery: [{ status: "delivered", label: "Delivered" }],
  failed: [{ status: "in_transit", label: "Back in transit" }],
};

/** Buttons to move a shipment along, plus "problem" and "cancel". */
export function ShipmentStatusControl({ orderId, shipmentId, status }: { orderId: string; shipmentId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  if (status === "delivered" || status === "cancelled") return null;
  const go = (next: "collected" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled") =>
    startTransition(async () => {
      if (next === "cancelled" && !confirm("Cancel this shipment? The customer will no longer see it.")) return;
      const r = await setShipmentStatus({ orderId, shipmentId, status: next, note });
      if (r.ok) {
        toast.success(r.message);
        setNote("");
      } else toast.error(r.error);
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="h-8 w-48"
        maxLength={300}
        aria-label="Status note"
      />
      {(NEXT[status] ?? []).map((n) => (
        <Button key={n.status} size="sm" variant={n.status === "delivered" ? "default" : "outline"} disabled={pending} onClick={() => go(n.status)}>
          {n.label}
        </Button>
      ))}
      {status !== "failed" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => go("failed")}>
          Problem
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => go("cancelled")}>
        Cancel
      </Button>
    </div>
  );
}
