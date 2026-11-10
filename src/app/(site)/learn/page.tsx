import { ArrowRight, Blocks, PiggyBank, PlugZap, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import bannerImage from "@/assets/backgrounds/panel-closeup.webp";
import { GuideCard } from "@/components/content/guide-shell";
import { PhotoBanner } from "@/components/layout/photo-banner";
import { Words } from "@/components/motion/words";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Solar guides and calculators",
  description:
    "Plain-language guides to sizing inverters, batteries and solar panels in South Africa, each with a calculator you can use on your own numbers.",
  alternates: { canonical: "/learn" },
};

const tools = [
  { href: "/#planner", icon: PlugZap, title: "Backup planner", body: "Tap your appliances and get a matched inverter and battery from stock." },
  { href: "/#savings", icon: PiggyBank, title: "Savings calculator", body: "What solar could take off your bill, and how soon it pays for itself." },
  { href: "/build", icon: Blocks, title: "Build a system", body: "Pick panels, an inverter and batteries that are checked to fit together." },
  { href: "/advisor", icon: Sparkles, title: "Solar Advisor", body: "Describe your home and let our AI advisor size a system for you." },
];

export default function LearnPage() {
  return (
    <>
      <PhotoBanner image={bannerImage} eyebrow="Learn" title="Solar guides">
        <p>Short, practical guides. Most have a calculator inside, so you can try your own numbers as you read.</p>
      </PhotoBanner>
      <div className="container-page py-14 lg:py-20">
        <ul className="grid gap-4 lg:grid-cols-6">
          {guides.map((g, i) => (
            <li key={g.slug} data-reveal className={i < 2 ? "lg:col-span-3" : "lg:col-span-2"}>
              <GuideCard slug={g.slug} big={i < 2} />
            </li>
          ))}
        </ul>

        <section aria-labelledby="tools-heading" className="mt-20 lg:mt-28">
          <h2 id="tools-heading" data-reveal="words" className="type-wide text-4xl sm:text-5xl">
            <Words text="Or just work it out" />
          </h2>
          <p data-reveal="fade" className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Four tools that do the sums for you, using what&apos;s in stock today.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map(({ href, icon: Icon, title, body }) => (
              <li key={href} data-reveal>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-xl border bg-card p-6 transition-[border-color,box-shadow,translate] duration-300 hover:border-foreground/40 hover:shadow-lg motion-full:hover:-translate-y-1"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-sun text-ink">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mt-5 text-lg font-bold">{title}</span>
                  <span className="mt-1.5 flex-1 text-sm text-muted-foreground">{body}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                    Open <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
