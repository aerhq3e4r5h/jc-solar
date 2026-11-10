import type { Metadata } from "next";
import Link from "next/link";
import { GuideShell } from "@/components/content/guide-shell";
import { Prose } from "@/components/content/prose";

export const metadata: Metadata = {
  title: "Lithium vs lead-acid batteries",
  description:
    "Why lithium iron phosphate (LFP) batteries have become the default for home backup in South Africa, and when lead-acid still makes sense.",
  alternates: { canonical: "/learn/lithium-vs-lead-acid" },
};

const toc = [
  { id: "compare", label: "Side by side" },
  { id: "why-lithium", label: "Why lithium usually wins" },
  { id: "matching", label: "Matching the battery to the inverter" },
  { id: "lead-acid", label: "When lead-acid still makes sense" },
];

export default function Guide() {
  return (
    <GuideShell
      slug="lithium-vs-lead-acid"
      toc={toc}
      intro="Most new home backup systems in South Africa use lithium iron phosphate (LFP, also written LiFePO4) batteries. Here's why, and when lead-acid still has a place."
      cta={{
        title: "See batteries in stock",
        body: "Each battery page shows how long it runs the appliances you pick.",
        href: "/shop/batteries",
        label: "Shop batteries",
      }}
    >
      <Prose>
        <h2 id="compare" className="mt-0! scroll-mt-28">
          Side by side
        </h2>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Lithium (LFP)</th>
              <th>Lead-acid (AGM/gel)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Usable capacity</td>
              <td>About 80–90% of rated kWh</td>
              <td>About 50% for a long life</td>
            </tr>
            <tr>
              <td>Typical cycle life</td>
              <td>Several thousand cycles</td>
              <td>A few hundred to about a thousand</td>
            </tr>
            <tr>
              <td>Weight for the same usable energy</td>
              <td>Much lighter</td>
              <td>Heavy</td>
            </tr>
            <tr>
              <td>Maintenance</td>
              <td>None; built-in BMS</td>
              <td>Keep fully charged, check regularly</td>
            </tr>
            <tr>
              <td>Up-front cost</td>
              <td>Higher</td>
              <td>Lower</td>
            </tr>
          </tbody>
        </table>
        <h2 id="why-lithium" className="scroll-mt-28">
          Why lithium usually wins
        </h2>
        <p>
          Daily load shedding means daily cycling. Lead-acid batteries wear out quickly when deeply discharged every day, while LFP batteries are
          built for it. Over the life of the system, lithium usually costs less per kWh actually used.
        </p>
        <h2 id="matching" className="scroll-mt-28">
          Matching the battery to the inverter
        </h2>
        <p>
          Batteries and inverters must share the same voltage (most home systems are 48 V; smaller ones 12 or 24 V), and ideally &quot;talk&quot; to
          each other over CAN or RS485 so the inverter charges the battery correctly. Our product pages and cart check the voltage for you.
        </p>
        <h2 id="lead-acid" className="scroll-mt-28">
          When lead-acid still makes sense
        </h2>
        <p>
          For a small, occasional-use backup (a few lights and a router) on a tight budget, lead-acid can be enough. For anything used daily, choose
          lithium.
        </p>
        <p>
          Next: <Link href="/learn/battery-runtime">how long a battery will last</Link>, or browse <Link href="/shop/batteries">batteries</Link>.
        </p>
      </Prose>
    </GuideShell>
  );
}
