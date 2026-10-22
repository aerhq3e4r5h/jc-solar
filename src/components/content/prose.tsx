import { cn } from "@/lib/utils";

/** Readable long-form text (guides, policies) without a typography plugin. */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-3xl text-base leading-relaxed text-foreground/90",
        "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground",
        "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
        "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_table]:my-6 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_td]:border-b [&_td]:py-2 [&_td]:pr-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: React.ReactNode }) {
  return (
    <header className="mb-10 max-w-3xl">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
    </header>
  );
}

/** Banner on legal pages: the wording still needs a lawyer's review. */
export function DraftNotice({ updated }: { updated: string }) {
  return (
    <p className="mb-10 max-w-3xl rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
      <strong className="font-semibold">Draft for review.</strong> This page is a working draft and has not yet been reviewed by a lawyer.
      Last updated {updated}.
    </p>
  );
}

/** Company details from site config, or a clear placeholder until supplied. */
export function Detail({ value }: { value: string | null }) {
  return value ? <>{value}</> : <span className="rounded bg-muted px-1.5 py-0.5 text-sm text-muted-foreground">to be added</span>;
}
