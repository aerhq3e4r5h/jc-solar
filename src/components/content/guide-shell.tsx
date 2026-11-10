import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { Words } from "@/components/motion/words";
import { CategoryGlyph } from "@/components/product/product-art";
import { JsonLd } from "@/components/seo/json-ld";
import { site } from "@/config/site";
import { siteUrl } from "@/lib/env";
import { guide, guides } from "@/lib/guides";

/**
 * The frame every guide sits in: a big headline, the article on the left
 * and, on wide screens, a sticky column with the contents and a next step.
 * `toc` lists the article's <h2 id> headings.
 */
export function GuideShell({
  slug,
  intro,
  toc,
  cta,
  children,
}: {
  slug: string;
  intro: React.ReactNode;
  toc: { id: string; label: string }[];
  cta: { title: string; body: string; href: string; label: string };
  children: React.ReactNode;
}) {
  const g = guide(slug);
  const others = guides.filter((o) => o.slug !== slug).slice(0, 3);
  return (
    <article className="container-page py-10 lg:py-14">
      <header className="max-w-4xl">
        <p className="eyebrow mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/learn" className="underline-offset-4 hover:underline">
            Guides
          </Link>
          <span aria-hidden="true">/</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" /> {g.minutes} min read
          </span>
        </p>
        <h1 data-reveal="words" className="type-wide text-4xl leading-[0.98] sm:text-6xl">
          <Words text={g.title} />
        </h1>
        <p data-reveal="fade" className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {intro}
        </p>
      </header>

      <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-20">
        <div className="min-w-0">{children}</div>
        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="In this guide" className="rounded-xl border p-5">
            <h2 className="text-sm font-bold">In this guide</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {toc.map((t, i) => (
                <li key={t.id} className="flex gap-2.5">
                  <span className="num font-semibold text-muted-foreground">{i + 1}</span>
                  <a href={`#${t.id}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="dark grain relative isolate overflow-hidden rounded-xl bg-ink p-5 text-ink-foreground">
            <h2 className="font-bold">{cta.title}</h2>
            <p className="mt-1.5 text-sm text-white/70">{cta.body}</p>
            <Link href={cta.href} className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-sun px-4 text-sm font-semibold text-ink">
              {cta.label} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>

      <section aria-labelledby="more-guides" className="mt-20 border-t pt-12">
        <h2 id="more-guides" className="type-wide text-3xl">
          Keep reading
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {others.map((o) => (
            <li key={o.slug} data-reveal>
              <GuideCard slug={o.slug} />
            </li>
          ))}
        </ul>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.blurb,
          author: { "@type": "Organization", name: site.name },
          publisher: { "@type": "Organization", name: site.name },
          mainEntityOfPage: `${siteUrl()}/learn/${g.slug}`,
        }}
      />
    </article>
  );
}

/** A guide as a card: its drawing comes alive on hover. */
export function GuideCard({ slug, big = false }: { slug: string; big?: boolean }) {
  const g = guide(slug);
  return (
    <Link
      href={`/learn/${g.slug}`}
      transitionTypes={["nav-forward"]}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-shelf p-6 transition-colors duration-300 hover:bg-sun hover:text-ink"
    >
      <span className="flex items-center gap-3 text-xs font-semibold text-muted-foreground group-hover:text-ink/70">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden="true" /> {g.minutes} min
        </span>
        {g.tool && <span className="rounded-full bg-background px-2 py-0.5 text-foreground">{g.tool}</span>}
      </span>
      <span className={big ? "type-wide mt-4 max-w-md text-3xl leading-[1.02] sm:text-4xl" : "type-wide mt-4 text-xl leading-tight"}>{g.title}</span>
      <span className="mt-2 max-w-md flex-1 text-sm text-muted-foreground group-hover:text-ink/75">{g.blurb}</span>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
        Read the guide <ArrowRight className="size-4" aria-hidden="true" />
      </span>
      <CategoryGlyph
        category={g.glyph}
        className={
          big
            ? "glyph-live pointer-events-none absolute -right-6 -bottom-8 size-52 opacity-90 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3 max-sm:hidden"
            : "glyph-live pointer-events-none absolute -right-5 -bottom-6 size-28 opacity-90 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3"
        }
      />
    </Link>
  );
}
