"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** "SKU ABC-123" with a copy button that confirms with a tick. */
export function CopySku({ sku }: { sku: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sku);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the SKU is still selectable text.
    }
  };
  return (
    <p className="mt-2 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
      SKU {sku}
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-sans font-semibold hover:bg-shelf hover:text-foreground"
        aria-label={copied ? "SKU copied" : `Copy SKU ${sku}`}
      >
        {copied ? <Check className="size-3.5 text-success motion-safe:animate-in motion-safe:zoom-in-50" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </p>
  );
}
