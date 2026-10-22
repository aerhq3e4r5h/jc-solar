import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/content/prose";

export const metadata: Metadata = {
  title: "What size inverter do I need?",
  description: "How to size an inverter for a South African home: running loads, surge, headroom and single vs three phase.",
  alternates: { canonical: "/learn/what-size-inverter" },
};

export default function Guide() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Guide" title="What size inverter do I need?" />
      <Prose>
        <p>The inverter turns battery and solar power into the 230 V supply your home uses. Its size, in kilowatts (kW), is the most it can deliver at once. Too small and it trips when the kettle and microwave run together; too big and you pay for capacity you never use.</p>
        <h2>1. List what must run at the same time</h2>
        <p>Write down the appliances you want during load shedding and their power (on the label, in watts). Typical figures:</p>
        <table>
          <thead><tr><th>Appliance</th><th>Typical running power</th></tr></thead>
          <tbody>
            <tr><td>LED lights (whole house)</td><td>100–300 W</td></tr>
            <tr><td>Wi-Fi router, TV, decoder</td><td>150–250 W</td></tr>
            <tr><td>Fridge / freezer</td><td>100–250 W (higher at start-up)</td></tr>
            <tr><td>Laptop and phone charging</td><td>50–150 W</td></tr>
            <tr><td>Microwave</td><td>1,000–1,500 W</td></tr>
            <tr><td>Kettle</td><td>2,000–2,400 W</td></tr>
            <tr><td>Geyser element</td><td>3,000–4,000 W</td></tr>
          </tbody>
        </table>
        <h2>2. Allow for start-up surge</h2>
        <p>Motors (fridges, pumps, aircons) briefly draw two to three times their running power when they start. Check that the inverter&apos;s peak or surge rating covers the biggest motor starting while everything else runs.</p>
        <h2>3. Add 20–30% headroom</h2>
        <p>Inverters run cooler and last longer below their limit, and you&apos;ll likely add loads later. If your total is 3.5 kW, a 5 kW inverter is a sensible choice.</p>
        <h2>4. Check your supply</h2>
        <p>Most homes are single phase. If your DB board has a three-phase supply and you want to back up all three phases, you need a three-phase inverter (or one per phase). Grid-tied systems should use an inverter on the NRS 097-2-1 approved list.</p>
        <h2>What about the geyser?</h2>
        <p>Most homes keep the geyser off the inverter. It would need a much bigger inverter and battery for little benefit. A geyser timer or a solar geyser is usually the better answer.</p>
        <p>
          Next: browse <Link href="/shop/inverters">inverters</Link>, or see <Link href="/learn/lithium-vs-lead-acid">which battery to pair it with</Link>.
          Our technician confirms the final size at a site assessment.
        </p>
      </Prose>
    </div>
  );
}
