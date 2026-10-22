"use client";

import { GitCompareArrows, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MAX_COMPARE, useCompare } from "./compare-store";

/** Floating bar listing the products picked for comparison. */
export function CompareBar() {
  const { items, remove, clear } = useCompare();
  const pathname = usePathname();
  if (items.length === 0 || pathname === "/compare") return null;
  const href = `/compare?items=${items.map((i) => encodeURIComponent(i.slug)).join(",")}`;
  return (
    <div
      role="region"
      aria-label="Compare products"
      className="fixed inset-x-3 bottom-20 z-30 mx-auto max-w-3xl rounded-2xl border bg-popover/95 p-3 shadow-xl backdrop-blur md:bottom-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <GitCompareArrows className="size-5 text-amber-ink" aria-hidden="true" />
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {items.map((i) => (
            <li key={i.slug} className="flex max-w-[14rem] items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs">
              <span className="truncate">{i.name}</span>
              <button type="button" onClick={() => remove(i.slug)} aria-label={`Remove ${i.name} from compare`} className="rounded p-0.5 hover:bg-background">
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
        <Button asChild size="sm" disabled={items.length < 2}>
          <Link href={href} aria-disabled={items.length < 2}>
            Compare {items.length}/{MAX_COMPARE}
          </Link>
        </Button>
      </div>
    </div>
  );
}
