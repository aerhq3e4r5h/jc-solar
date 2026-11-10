import type { Metadata } from "next";
import Link from "next/link";
import { GuideShell } from "@/components/content/guide-shell";
import { Prose } from "@/components/content/prose";
import { PanelsNeeded, PanelYield } from "@/components/tools/plain-terms";

export const metadata: Metadata = {
  title: "How many solar panels do I need?",
  description:
    "From your electricity bill to a number of solar panels: what one panel makes in a South African day, roof space and the inverter's limits. With calculators.",
  alternates: { canonical: "/learn/how-many-solar-panels" },
};

const toc = [
  { id: "try", label: "From your bill to a number" },
  { id: "use", label: "Start from what you use" },
  { id: "one-panel", label: "What one panel makes" },
  { id: "not-all", label: "Why you rarely cover everything" },
  { id: "roof", label: "Roof space and direction" },
  { id: "limit", label: "Your inverter sets the limit" },
];

export default function Guide() {
  return (
    <GuideShell
      slug="how-many-solar-panels"
      toc={toc}
      intro="There is no single right number: it depends on how much electricity you use, how much sun your roof gets and how many panels your inverter can take. Here is how to get to a sensible figure in a few minutes."
      cta={{
        title: "Build it panel by panel",
        body: "Our builder only offers inverters that take your panels on their strings.",
        href: "/build",
        label: "Build a system",
      }}
    >
      <div id="try" className="scroll-mt-28">
        <PanelsNeeded />
      </div>
      <Prose>
        <h2 id="use" className="scroll-mt-28">
          Start from what you use
        </h2>
        <p>
          Your bill shows the units (kWh) you used in the month. If it only shows rands, divide by what you pay per unit: R2,500 at R3.50 a unit is
          about 714 kWh a month, or roughly 23 kWh a day.
        </p>
        <h2 id="one-panel" className="scroll-mt-28">
          What one panel makes
        </h2>
        <p>
          A panel&apos;s watts are what it makes in full sun. Over a whole day, each kilowatt of panels makes about 4.8 kWh on average in South Africa
          once real-world losses are counted; less on the coast and in winter, more in the Northern Cape. A 550 W panel therefore makes about 2.6 kWh
          a day.
        </p>
      </Prose>
      <div className="my-8">
        <PanelYield />
      </div>
      <Prose>
        <h2 id="not-all" className="scroll-mt-28">
          Why you rarely cover everything
        </h2>
        <p>
          Panels make power while the sun is up, and most homes use a lot of theirs in the evening. Without a battery, solar typically replaces a bit
          under half of a home&apos;s use. A battery stores the midday surplus for the evening and takes that to most of it. Power you neither use nor
          store is lost, since most municipalities don&apos;t pay for power sent back.
        </p>
        <h2 id="roof" className="scroll-mt-28">
          Roof space and direction
        </h2>
        <ul>
          <li>A modern 550 W panel is about 2.3 m by 1.1 m, so allow about 2.6 m² each.</li>
          <li>North-facing roofs make the most. East and west work well too, for somewhat less.</li>
          <li>Shade matters more than direction: one shaded panel can hold back a whole string.</li>
        </ul>
        <h2 id="limit" className="scroll-mt-28">
          Your inverter sets the limit
        </h2>
        <p>
          Every inverter has a maximum solar input and a voltage window that its strings of panels must stay inside. That decides how many panels of a
          given model it can take. Our <Link href="/build">system builder</Link> checks this for you, and our technician confirms the string design
          before installation.
        </p>
        <p>
          Next: <Link href="/learn/inverter-types">hybrid, off-grid or grid-tied</Link>, or see{" "}
          <Link href="/shop/solar-panels">solar panels in stock</Link>.
        </p>
      </Prose>
    </GuideShell>
  );
}
