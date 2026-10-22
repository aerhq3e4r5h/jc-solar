import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import bannerImage from "@/assets/backgrounds/panel-closeup.webp";
import { PhotoBanner } from "@/components/layout/photo-banner";

export const metadata: Metadata = {
  title: "Solar guides",
  description: "Plain-language guides to sizing inverters, choosing batteries and going solar in South Africa.",
  alternates: { canonical: "/learn" },
};

const guides = [
  {
    href: "/learn/what-size-inverter",
    title: "What size inverter do I need?",
    blurb: "Add up your loads, allow for start-up surges and pick the right kW rating.",
  },
  {
    href: "/learn/lithium-vs-lead-acid",
    title: "Lithium vs lead-acid batteries",
    blurb: "Why LFP lithium has become the default for home backup, and when lead-acid still makes sense.",
  },
];

export default function LearnPage() {
  return (
    <>
      <PhotoBanner image={bannerImage} eyebrow="Learn" title="Solar guides">
        <p>Short, practical guides to help you choose with confidence.</p>
      </PhotoBanner>
      <div className="container-page py-14">
        <ul className="grid max-w-4xl gap-4 sm:grid-cols-2">
          {guides.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="group flex h-full flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-foreground/20">
                <h2 className="text-xl font-semibold">{g.title}</h2>
                <p className="mt-2 flex-1 text-muted-foreground">{g.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Read the guide <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
