"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type Faq = { topic: string; q: string; a: string; link?: { href: string; label: string } };

/** The FAQ with a search box and topic filter. Everything is in the page from the start; filtering just hides. */
export function FaqBrowser({ faqs }: { faqs: Faq[] }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const topics = useMemo(() => [...new Set(faqs.map((f) => f.topic))], [faqs]);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = faqs.filter((f) => (!topic || f.topic === topic) && words.every((w) => `${f.q} ${f.a}`.toLowerCase().includes(w)));

  return (
    <div className="grid gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16">
      <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the answers"
            aria-label="Search the answers"
            className="h-11 w-full rounded-full border border-input bg-transparent pr-10 pl-10 text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1" aria-label="Topics">
          {[null, ...topics].map((t) => {
            const count = t ? faqs.filter((f) => f.topic === t).length : faqs.length;
            const on = topic === t;
            return (
              <li key={t ?? "all"}>
                <button
                  type="button"
                  onClick={() => setTopic(t)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors lg:rounded-lg",
                    on
                      ? "bg-ink text-ink-foreground dark:bg-sun dark:text-ink"
                      : "border text-muted-foreground hover:text-foreground lg:border-0 lg:hover:bg-muted",
                  )}
                >
                  {t ?? "All questions"}
                  <span className="num text-xs opacity-70">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="sr-only" role="status">
          {shown.length} {shown.length === 1 ? "answer" : "answers"}
        </p>
        {shown.length > 0 ? (
          <Accordion type="single" collapsible>
            {shown.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="py-5 text-left text-lg font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                  <p>{f.a}</p>
                  {f.link && (
                    <Link
                      href={f.link.href}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4"
                    >
                      {f.link.label} <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Nothing matches &quot;{query}&quot;.{" "}
            <button
              type="button"
              onClick={() => (setQuery(""), setTopic(null))}
              className="font-semibold text-foreground underline underline-offset-4"
            >
              Show all questions
            </button>
          </p>
        )}
        <div className="dark grain relative isolate mt-10 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl bg-ink p-6 text-ink-foreground">
          <p>
            <span className="block text-lg font-bold">Still stuck?</span>
            <span className="text-sm text-white/70">Ask us directly, or let the Solar Advisor size a system for you.</span>
          </p>
          <span className="flex flex-wrap gap-2">
            <Link href="/contact" className="inline-flex h-10 items-center gap-2 rounded-full bg-sun px-5 text-sm font-semibold text-ink">
              Contact us <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/advisor"
              className="inline-flex h-10 items-center rounded-full border border-white/30 px-5 text-sm font-semibold hover:border-white"
            >
              Solar Advisor
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
