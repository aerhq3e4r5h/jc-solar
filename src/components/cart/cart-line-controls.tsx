"use client";

import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { removeFromCart, setCartInstallation, setCartQuantity, type CartActionResult } from "@/lib/cart/actions";

export function CartLineControls({
  productId,
  name,
  quantity,
  maxQty,
  installation,
  installationEligible,
}: {
  productId: string;
  name: string;
  quantity: number;
  maxQty: number;
  installation: boolean;
  installationEligible: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<CartActionResult>) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
    });

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center rounded-lg border" role="group" aria-label={`Quantity of ${name}`}>
        <Button variant="ghost" size="icon-sm" aria-label="Decrease quantity" disabled={pending || quantity <= 1} onClick={() => run(() => setCartQuantity(productId, quantity - 1))}>
          <Minus />
        </Button>
        <output className="num w-9 text-center text-sm font-medium" aria-live="polite">
          {pending ? <Loader2 className="mx-auto size-4 animate-spin" /> : quantity}
        </output>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Increase quantity"
          disabled={pending || quantity >= maxQty}
          onClick={() => run(() => setCartQuantity(productId, quantity + 1))}
        >
          <Plus />
        </Button>
      </div>
      {installationEligible && (
        <div className="flex items-center gap-2">
          <Switch id={`install-${productId}`} checked={installation} disabled={pending} onCheckedChange={(v) => run(() => setCartInstallation(productId, v))} />
          <Label htmlFor={`install-${productId}`} className="font-normal">
            Installation
          </Label>
        </div>
      )}
      <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={pending} onClick={() => run(() => removeFromCart(productId))}>
        <Trash2 /> Remove
      </Button>
    </div>
  );
}
