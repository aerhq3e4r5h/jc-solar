import type { Metadata } from "next";
import Link from "next/link";
import { GuideShell } from "@/components/content/guide-shell";
import { Prose } from "@/components/content/prose";
import { InverterTypes } from "@/components/tools/inverter-types";

export const metadata: Metadata = {
  title: "Hybrid, off-grid or grid-tied inverter?",
  description: "The three kinds of solar inverter explained with one question: what happens when the grid goes off? With an interactive diagram.",
  alternates: { canonical: "/learn/inverter-types" },
};

const toc = [
  { id: "try", label: "Switch the grid off and see" },
  { id: "grid-tied", label: "Grid-tied" },
  { id: "off-grid", label: "Off-grid" },
  { id: "hybrid", label: "Hybrid" },
  { id: "compare", label: "Side by side" },
  { id: "rules", label: "Connecting to the grid" },
];

export default function Guide() {
  return (
    <GuideShell
      slug="inverter-types"
      toc={toc}
      intro="Inverters come in three kinds, and the names don't make the difference obvious. One question does: what happens in your house when the grid goes off? Pick a kind below and flip the switch."
      cta={{
        title: "Not sure which you need?",
        body: "Tell the Solar Advisor what you want to keep running and it will suggest a system.",
        href: "/advisor",
        label: "Ask the Solar Advisor",
      }}
    >
      <div id="try" className="scroll-mt-28">
        <InverterTypes />
      </div>
      <Prose>
        <h2 id="grid-tied" className="scroll-mt-28">
          Grid-tied
        </h2>
        <p>
          Panels and an inverter, no battery. Solar power goes to the house first, and anything it can&apos;t supply comes from the grid. It is the
          cheapest way to cut an electricity bill.
        </p>
        <p>
          The catch: it only works while the grid is on. When the grid drops, a grid-tied inverter must shut down so that it can&apos;t make the lines
          live while people work on them. On its own it gives you <strong>no backup during load shedding</strong>.
        </p>
        <h2 id="off-grid" className="scroll-mt-28">
          Off-grid
        </h2>
        <p>
          Panels, an inverter and a battery that run the house on their own. Nothing is ever fed back to the grid. Despite the name, most off-grid
          inverters sold in South Africa can still take grid or generator power as a top-up when the battery runs low.
        </p>
        <p>
          They are simple and good value for backup, which is why they are popular for load shedding. They suit homes that want to keep the essentials
          on.
        </p>
        <h2 id="hybrid" className="scroll-mt-28">
          Hybrid
        </h2>
        <p>
          The do-everything kind. A hybrid blends solar, battery and grid moment by moment: solar first, battery next, grid last. When the grid fails
          it carries the backed-up circuits from the battery without a flicker, and where the municipality allows it, it can feed spare power back.
        </p>
        <p>Hybrids cost more, and they are the usual choice for a whole-home system that both saves money and rides through outages.</p>
        <h2 id="compare" className="scroll-mt-28">
          Side by side
        </h2>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Grid-tied</th>
              <th>Off-grid</th>
              <th>Hybrid</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Works in load shedding</td>
              <td>No</td>
              <td>Yes</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Needs a battery</td>
              <td>No</td>
              <td>Yes</td>
              <td>Yes, for backup</td>
            </tr>
            <tr>
              <td>Can feed power back</td>
              <td>Yes, where allowed</td>
              <td>No</td>
              <td>Yes, where allowed</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Cutting daytime bills</td>
              <td>Affordable backup</td>
              <td>Savings and backup together</td>
            </tr>
          </tbody>
        </table>
        <h2 id="rules" className="scroll-mt-28">
          Connecting to the grid
        </h2>
        <p>
          A system that is connected to the municipal grid usually has to be registered with your municipality (or Eskom) as a small-scale embedded
          generator, and its inverter should be on the NRS 097-2-1 approved list. The rules differ from place to place, so ask us what applies where
          you live.
        </p>
        <p>
          Next: <Link href="/learn/what-size-inverter">what size inverter you need</Link>, or browse{" "}
          <Link href="/shop/inverters">inverters in stock</Link>.
        </p>
      </Prose>
    </GuideShell>
  );
}
