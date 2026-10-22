"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filtersToQuery, SORTS, type Filters, type SortKey } from "@/lib/catalogue/filters";

export function SortSelect({ filters }: { filters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="sort" className="hidden text-sm text-muted-foreground sm:block">
        Sort
      </Label>
      <Select
        value={filters.sort}
        onValueChange={(sort) =>
          startTransition(() => router.replace(`${pathname}${filtersToQuery({ ...filters, sort: sort as SortKey })}`, { scroll: false }))
        }
      >
        <SelectTrigger id="sort" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SORTS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
