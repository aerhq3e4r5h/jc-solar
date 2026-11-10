import type { Metadata } from "next";
import Link from "next/link";
import { GuideShell } from "@/components/content/guide-shell";
import { Prose } from "@/components/content/prose";
import { Runtime } from "@/components/tools/plain-terms";

export const metadata: Metadata = {
  title: "How long will a battery last?",
  description:
    "How to turn a battery's kWh into hours of backup: usable capacity, average draw, and what drains a battery fastest. With a runtime calculator.",
  alternates: { canonical: "/learn/battery-runtime" },
};

const toc = [
  { id: "try", label: "Try your own appliances" },
  { id: "sum", label: "The sum" },
  { id: "usable", label: "Usable is less than the label" },
  { id: "average", label: "Average draw is what counts" },
  { id: "power", label: "Power matters as well as energy" },
  { id: "longer", label: "Making it last longer" },
];

export default function Guide() {
  return (
    <GuideShell
      slug="battery-runtime"
      toc={toc}
      intro="A battery's size is given in kilowatt-hours (kWh): how much energy it stores. How long that lasts depends on what you run from it. The sum is simple, and two details change the answer more than people expect."
      cta={{
        title: "See batteries in stock",
        body: "Each battery page works out its own runtime for the appliances you pick.",
        href: "/shop/batteries",
        label: "Shop batteries",
      }}
    >
      <div id="try" className="scroll-mt-28">
        <Runtime />
      </div>
      <Prose>
        <h2 id="sum" className="scroll-mt-28">
          The sum
        </h2>
        <p>
          <strong>Hours = usable energy (kWh) ÷ average draw (kW).</strong> A battery with 4.3 kWh you can actually use, feeding appliances that
          average 0.36 kW, lasts about 12 hours.
        </p>
        <h2 id="usable" className="scroll-mt-28">
          Usable is less than the label
        </h2>
        <p>Two things come off the number printed on the battery:</p>
        <ul>
          <li>
            <strong>Depth of discharge.</strong> A lithium (LFP) battery is happy using about 90% of its capacity. A lead-acid battery should only use
            about half, or it wears out quickly.
          </li>
          <li>
            <strong>Inverter losses.</strong> Turning battery power into 230 V costs roughly 5 to 10%.
          </li>
        </ul>
        <p>So a 5.12 kWh lithium battery gives you about 4.3 kWh at the plug. The calculator above already takes both off.</p>
        <h2 id="average" className="scroll-mt-28">
          Average draw is what counts
        </h2>
        <p>
          A fridge is rated at about 150 W, but its motor only runs about half the time. A kettle draws 2,000 W, but for three minutes. What empties a
          battery is the average over the hours, so the big drains are the things that run hard for a long time: aircons, pool and borehole pumps,
          heaters and the geyser.
        </p>
        <table>
          <thead>
            <tr>
              <th>Lithium battery</th>
              <th>Lights, Wi-Fi, TV, fridge, phones</th>
              <th>The same, plus working from home and the alarm</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>5 kWh</td>
              <td>about 12 hours</td>
              <td>about 7 hours</td>
            </tr>
            <tr>
              <td>10 kWh</td>
              <td>about 24 hours</td>
              <td>about 14 hours</td>
            </tr>
            <tr>
              <td>15 kWh</td>
              <td>about 35 hours</td>
              <td>about 21 hours</td>
            </tr>
          </tbody>
        </table>
        <h2 id="power" className="scroll-mt-28">
          Power matters as well as energy
        </h2>
        <p>
          A battery also has a limit on how fast it can be emptied. A typical 5 kWh wall battery can supply somewhere between 2.5 and 5 kW at once
          (its datasheet lists this as the maximum continuous discharge current). A big inverter therefore needs more than one battery to reach its
          full output, even if one battery holds enough energy for your evening.
        </p>
        <h2 id="longer" className="scroll-mt-28">
          Making it last longer
        </h2>
        <ul>
          <li>Keep the geyser, oven and heaters off the backup circuits.</li>
          <li>Run the kettle, microwave and washing machine when the grid is on, or one at a time.</li>
          <li>Add solar panels: on a sunny day they run the house and refill the battery before the evening.</li>
          <li>Add a second battery. Most wall batteries are made to be connected side by side.</li>
        </ul>
        <p>
          Next: <Link href="/learn/lithium-vs-lead-acid">lithium or lead-acid</Link>, or{" "}
          <Link href="/learn/what-size-inverter">what size inverter to pair it with</Link>. These are estimates from typical appliances; our
          technician confirms the design for your home.
        </p>
      </Prose>
    </GuideShell>
  );
}
