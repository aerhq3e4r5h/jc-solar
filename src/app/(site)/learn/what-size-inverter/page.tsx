import type { Metadata } from "next";
import Link from "next/link";
import { GuideShell } from "@/components/content/guide-shell";
import { Prose } from "@/components/content/prose";
import { LoadCheck } from "@/components/tools/plain-terms";

export const metadata: Metadata = {
  title: "What size inverter do I need?",
  description: "How to size an inverter for a South African home: running loads, surge, headroom and single vs three phase. With a load checker.",
  alternates: { canonical: "/learn/what-size-inverter" },
};

const toc = [
  { id: "try", label: "Try your own appliances" },
  { id: "list", label: "List what runs at the same time" },
  { id: "surge", label: "Allow for start-up surge" },
  { id: "headroom", label: "Add 20 to 30% headroom" },
  { id: "supply", label: "Check your supply" },
  { id: "geyser", label: "What about the geyser?" },
];

export default function Guide() {
  return (
    <GuideShell
      slug="what-size-inverter"
      toc={toc}
      intro="The inverter turns battery and solar power into the 230 V supply your home uses. Its size, in kilowatts (kW), is the most it can deliver at once. Too small and it trips when the kettle and microwave run together; too big and you pay for capacity you never use."
      cta={{
        title: "See inverters in stock",
        body: "Every one lists its size, surge rating and the batteries that suit it.",
        href: "/shop/inverters",
        label: "Shop inverters",
      }}
    >
      <div id="try" className="scroll-mt-28">
        <LoadCheck />
      </div>
      <Prose>
        <h2 id="list" className="scroll-mt-28">
          1. List what must run at the same time
        </h2>
        <p>Write down the appliances you want during load shedding and their power (on the label, in watts). Typical figures:</p>
        <table>
          <thead>
            <tr>
              <th>Appliance</th>
              <th>Typical running power</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>LED lights (whole house)</td>
              <td>100–300 W</td>
            </tr>
            <tr>
              <td>Wi-Fi router, TV, decoder</td>
              <td>150–250 W</td>
            </tr>
            <tr>
              <td>Fridge / freezer</td>
              <td>100–250 W (higher at start-up)</td>
            </tr>
            <tr>
              <td>Laptop and phone charging</td>
              <td>50–150 W</td>
            </tr>
            <tr>
              <td>Microwave</td>
              <td>1,000–1,500 W</td>
            </tr>
            <tr>
              <td>Kettle</td>
              <td>2,000–2,400 W</td>
            </tr>
            <tr>
              <td>Geyser element</td>
              <td>3,000–4,000 W</td>
            </tr>
          </tbody>
        </table>
        <h2 id="surge" className="scroll-mt-28">
          2. Allow for start-up surge
        </h2>
        <p>
          Motors (fridges, pumps, aircons) briefly draw two to three times their running power when they start. Check that the inverter&apos;s peak or
          surge rating covers the biggest motor starting while everything else runs.
        </p>
        <h2 id="headroom" className="scroll-mt-28">
          3. Add 20–30% headroom
        </h2>
        <p>
          Inverters run cooler and last longer below their limit, and you&apos;ll likely add loads later. If your total is 3.5 kW, a 5 kW inverter is
          a sensible choice.
        </p>
        <h2 id="supply" className="scroll-mt-28">
          4. Check your supply
        </h2>
        <p>
          Most homes are single phase. If your DB board has a three-phase supply and you want to back up all three phases, you need a three-phase
          inverter (or one per phase). Grid-tied systems should use an inverter on the NRS 097-2-1 approved list.
        </p>
        <h2 id="geyser" className="scroll-mt-28">
          What about the geyser?
        </h2>
        <p>
          Most homes keep the geyser off the inverter. It would need a much bigger inverter and battery for little benefit. A geyser timer or a solar
          geyser is usually the better answer.
        </p>
        <p>
          Next: <Link href="/learn/battery-runtime">how long a battery will last</Link>, or{" "}
          <Link href="/learn/inverter-types">which kind of inverter suits you</Link>. Our technician confirms the final size at a site assessment.
        </p>
      </Prose>
    </GuideShell>
  );
}
