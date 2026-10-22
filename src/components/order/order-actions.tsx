"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { changeOrder } from "@/lib/checkout/actions";

export function ChangeOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Cancel this order and put the items back in your cart so you can change them?")) return;
          const r = await changeOrder(orderId);
          if (r.ok) router.push(r.url);
          else toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Pencil />} Change my order
    </Button>
  );
}

/** After returning from PayFast: re-checks the order until the payment notification has arrived. */
export function AwaitPayment() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 30) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, 4000);
    return () => clearTimeout(t);
  }, [tries, router]);
  return (
    <p role="status" className="flex items-center gap-2 text-sm">
      {tries < 30 ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Confirming your payment with PayFast. This usually takes a few seconds.
        </>
      ) : (
        "We haven't had confirmation from PayFast yet. If you paid, you'll get an email as soon as it arrives; there's no need to pay again."
      )}
    </p>
  );
}
