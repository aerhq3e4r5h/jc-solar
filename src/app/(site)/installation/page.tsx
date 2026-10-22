import { ArrowRight, ClipboardCheck, FileCheck2, HardHat, Ruler } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/content/prose";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Solar installation by a registered technician",
  description: "Add professional installation to any JC Solar order. Site assessment, installation to SANS 10142-1 and a Certificate of Compliance.",
  alternates: { canonical: "/installation" },
};

const steps = [
  { icon: ClipboardCheck, title: "Add installation to your order", body: "Switch on “Add professional installation” on any product, in your cart or at checkout." },
  { icon: Ruler, title: "Site assessment", body: "Our technician contacts you to look at your roof, DB board and supply (single or three phase), and confirms the design." },
  { icon: HardHat, title: "Quote and booking", body: "You receive a fixed installation quote. Nothing is charged for installation until you accept it and we agree a date." },
  { icon: FileCheck2, title: "Installation and CoC", body: "Installed by our registered technician, tested, and handed over with a Certificate of Compliance for your records." },
];

export default function InstallationPage() {
  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Installation"
        title="Installed properly, certified, done"
        intro="Buy your equipment from us and add installation by our registered technician, or use your own installer. It's your choice."
      />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-2xl border bg-card p-6">
            <s.icon className="size-6 text-amber-ink" aria-hidden="true" />
            <p className="mt-4 font-mono text-xs text-muted-foreground">Step {i + 1}</p>
            <h2 className="mt-1 text-lg font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <Prose className="mt-12">
        <h2>What installation includes</h2>
        <ul>
          <li>Mounting the panels and inverter, and wiring the battery and DC protection.</li>
          <li>Connecting the system to your distribution board, with the right isolators and surge protection.</li>
          <li>Setting up the inverter and battery communication, and showing you the monitoring app.</li>
          <li>Testing and a Certificate of Compliance (CoC) under SANS 10142-1, including its section for solar PV systems.</li>
        </ul>
        <p>
          Every home is different, so installation is quoted after the site assessment. Complex jobs (long cable runs, flat roofs needing ballast,
          three-phase or commercial systems) may need a longer assessment.
        </p>
        <h2>Connecting to the grid</h2>
        <p>
          If your system will be connected to the municipal grid, your municipality may require it to be registered as a small-scale embedded
          generator (SSEG), and grid-tied inverters should appear on the NRS 097-2-1 approved list. Ask us what applies in your area.
        </p>
        <h2>Using your own installer?</h2>
        <p>
          That&apos;s fine. We&apos;ll deliver anywhere in South Africa. Make sure your installer is a registered electrical contractor and issues a CoC.
        </p>
      </Prose>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/shop/kits">
            Shop system kits <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Ask about installation</Link>
        </Button>
      </div>
    </div>
  );
}
