"use client";

import { ArrowUp, Loader2, RotateCcw, ShoppingCart, Sparkles, SunMedium, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { RecommendationCard } from "@/lib/advisor/tools";
import { addManyToCart, addToCart } from "@/lib/cart/actions";
import { formatRand } from "@/lib/pricing/vat";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; text: string; products?: RecommendationCard[] };

const STORAGE_KEY = "jc_advisor_chat";

const STARTERS = [
  "I want to keep my lights, Wi-Fi, TV and fridge on during load shedding",
  "My electricity bill is about R2 500 a month. What solar system do I need?",
  "Which battery works with a Deye 5 kW hybrid inverter?",
  "I need backup for a small office with 6 computers for 4 hours",
];

const PROGRESS = ["Thinking about your home…", "Checking our stock…", "Working out the sizing…", "Matching compatible products…"];

/** Tiny, safe formatter for the advisor's replies: paragraphs, bullet and numbered lists, **bold**. */
function RichText({ text }: { text: string }) {
  const clean = text.replace(/\s*\[\[[^\]\n]{1,80}\]\]/g, "");
  const blocks = clean.split(/\n{2,}/);
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <Fragment key={i}>{part.replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=$|[\s.,!?:;)])/g, "$1$2")}</Fragment>
      ),
    );
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function ProductCards({ products }: { products: RecommendationCard[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const buyable = products.filter((p) => p.stock.state !== "out_of_stock");
  const total = buyable.reduce((n, p) => n + p.price, 0);

  const viewCart = { label: "View cart", onClick: () => router.push("/cart") };
  const addOne = (p: RecommendationCard) =>
    startTransition(async () => {
      const r = await addToCart({ productId: p.id, quantity: 1, installation: false });
      if (r.ok) toast.success("Added to cart", { description: p.name, action: viewCart });
      else toast.error(r.error);
    });
  const addAll = () =>
    startTransition(async () => {
      const r = await addManyToCart(
        buyable.map((p) => ({ productId: p.id, quantity: 1 })),
        false,
      );
      if (r.ok) toast.success(`Added ${buyable.length} products to your cart`, { action: viewCart });
      else toast.error(r.error);
    });

  return (
    <div className="mt-4 space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((p) => (
          <li key={p.id} className="flex gap-3 rounded-2xl border bg-card p-3 shadow-sm">
            <Link href={p.url} className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-white" aria-label={p.name}>
              {p.image ? (
                <Image src={p.image} alt="" fill sizes="80px" className="object-contain p-1" />
              ) : (
                <SunMedium className="m-auto size-8 h-full text-amber-ink" aria-hidden="true" />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              {p.brand && <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{p.brand}</p>}
              <Link href={p.url} className="line-clamp-2 text-sm leading-snug font-medium hover:underline">
                {p.name}
              </Link>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <span>
                  <span className="num block font-semibold">{formatRand(p.price)}</span>
                  <span className={cn("block text-xs", p.stock.state === "out_of_stock" ? "text-destructive" : "text-success")}>{p.stock.label}</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || p.stock.state === "out_of_stock"}
                  onClick={() => addOne(p)}
                  aria-label={`Add ${p.name} to cart`}
                >
                  <ShoppingCart /> Add
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {buyable.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sun/40 bg-accent/50 p-4">
          <p className="text-sm">
            All {buyable.length} items: <span className="num font-semibold">{formatRand(total)}</span>{" "}
            <span className="text-muted-foreground">incl. VAT, before delivery and installation</span>
          </p>
          <Button onClick={addAll} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />} Add all to cart
          </Button>
        </div>
      )}
    </div>
  );
}

function Avatar({ role }: { role: Message["role"] }) {
  return role === "assistant" ? (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy text-sun shadow-sm dark:bg-secondary" aria-hidden="true">
      <Sparkles className="size-4" />
    </span>
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
      <UserRound className="size-4" />
    </span>
  );
}

export function AdvisorChat({ enabled }: { enabled: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Restore this tab's conversation (a convenience; nothing is stored on our side).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after hydration
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
    if (messages.length > 0 || loading) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setProgress((p) => (p + 1) % PROGRESS.length), 2200);
    return () => clearInterval(t);
  }, [loading]);

  const send = async (text: string, history = messages) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...history, { role: "user", text: trimmed }];
    setMessages(next);
    setInput("");
    setError(null);
    setProgress(0);
    setLoading(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, text }) => ({ role, text })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; products?: RecommendationCard[]; error?: string; code?: string };
      if (!res.ok || !data.reply) {
        const message = data.error ?? "The advisor didn't respond. Please try again.";
        throw new Error(data.code ? `${message} (${data.code})` : message);
      }
      setMessages([...next, { role: "assistant", text: data.reply, products: data.products ?? [] }]);
    } catch (e) {
      setError(
        e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Couldn't reach the advisor. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
      textarea.current?.focus();
    }
  };

  const retry = () => {
    const last = messages[messages.length - 1];
    if (last?.role === "user") send(last.text, messages.slice(0, -1));
  };

  const reset = () => {
    setMessages([]);
    setError(null);
    textarea.current?.focus();
  };

  return (
    <div className="flex h-[min(78vh,760px)] min-h-[520px] flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-navy/10">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar role="assistant" />
          <div>
            <p className="font-semibold">Solar Advisor</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2 rounded-full", enabled ? "bg-success" : "bg-muted-foreground")} aria-hidden="true" />
              {enabled ? "Online · uses our live stock and prices" : "Not switched on yet"}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} disabled={loading}>
            <RotateCcw /> New chat
          </Button>
        )}
      </div>

      <div ref={scroller} className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite" aria-busy={loading}>
        {messages.length === 0 && (
          <div className="mx-auto max-w-2xl py-4 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-navy text-sun shadow-lg dark:bg-secondary">
              <SunMedium className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold sm:text-3xl">Hi! Let&apos;s size your system.</h2>
            <p className="mt-2 text-muted-foreground">
              Tell me what you want to keep running, for how long, or what you pay for electricity. I&apos;ll recommend a matched system from our
              stock, with prices.
            </p>
            <ul className="mt-8 grid gap-2 text-left sm:grid-cols-2">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    disabled={!enabled}
                    className="h-full w-full rounded-2xl border bg-background p-4 text-sm transition-all hover:-translate-y-0.5 hover:border-sun hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}
            >
              <Avatar role={m.role} />
              <div className={cn("max-w-[85%] min-w-0", m.role === "user" && "text-right")}>
                <div
                  className={cn(
                    "inline-block rounded-3xl px-4 py-3 text-left leading-relaxed sm:px-5",
                    m.role === "user"
                      ? "rounded-tr-md bg-navy text-navy-foreground dark:bg-secondary"
                      : "rounded-tl-md bg-muted/70 text-foreground/90",
                  )}
                >
                  {m.role === "assistant" ? <RichText text={m.text} /> : <p className="whitespace-pre-wrap">{m.text}</p>}
                </div>
                {m.products && m.products.length > 0 && <ProductCards products={m.products} />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-3">
            <Avatar role="assistant" />
            <div className="flex items-center gap-3 rounded-3xl rounded-tl-md bg-muted/70 px-5 py-3 text-sm text-muted-foreground">
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-1.5 animate-bounce rounded-full bg-amber-ink" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </span>
              {PROGRESS[progress]}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <span>{error}</span>
            {messages[messages.length - 1]?.role === "user" && enabled && (
              <Button size="sm" variant="outline" onClick={retry}>
                Try again
              </Button>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t bg-background p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/50">
          <label htmlFor="advisor-input" className="sr-only">
            Message the Solar Advisor
          </label>
          <textarea
            id="advisor-input"
            ref={textarea}
            rows={1}
            value={input}
            maxLength={1500}
            disabled={!enabled}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={enabled ? "Ask about sizing, batteries, inverters or panels…" : "The advisor isn't switched on yet"}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none placeholder:text-muted-foreground field-sizing-content"
          />
          <Button type="submit" size="icon" className="size-11 shrink-0 rounded-xl" disabled={!enabled || loading || !input.trim()} aria-label="Send">
            {loading ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          Estimates only: our technician confirms the design at a site assessment. Messages are processed by Google Gemini and not stored by us.
          Please don&apos;t share personal details.
        </p>
      </form>
    </div>
  );
}
