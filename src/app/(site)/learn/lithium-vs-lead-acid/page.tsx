import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/content/prose";

export const metadata: Metadata = {
  title: "Lithium vs lead-acid batteries",
  description: "How lithium iron phosphate (LFP) and lead-acid batteries compare for home backup in South Africa.",
  alternates: { canonical: "/learn/lithium-vs-lead-acid" },
};

export default function Guide() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Guide" title="Lithium vs lead-acid batteries" />
      <Prose>
        <p>Most new home backup systems in South Africa use lithium iron phosphate (LFP, also written LiFePO4) batteries. Here&apos;s why, and when lead-acid still has a place.</p>
        <table>
          <thead><tr><th></th><th>Lithium (LFP)</th><th>Lead-acid (AGM/gel)</th></tr></thead>
          <tbody>
            <tr><td>Usable capacity</td><td>About 80–90% of rated kWh</td><td>About 50% for a long life</td></tr>
            <tr><td>Typical cycle life</td><td>Several thousand cycles</td><td>A few hundred to about a thousand</td></tr>
            <tr><td>Weight for the same usable energy</td><td>Much lighter</td><td>Heavy</td></tr>
            <tr><td>Maintenance</td><td>None; built-in BMS</td><td>Keep fully charged, check regularly</td></tr>
            <tr><td>Up-front cost</td><td>Higher</td><td>Lower</td></tr>
          </tbody>
        </table>
        <h2>Why lithium usually wins</h2>
        <p>Daily load shedding means daily cycling. Lead-acid batteries wear out quickly when deeply discharged every day, while LFP batteries are built for it. Over the life of the system, lithium usually costs less per kWh actually used.</p>
        <h2>Matching the battery to the inverter</h2>
        <p>Batteries and inverters must share the same voltage (most home systems are 48 V; smaller ones 12 or 24 V), and ideally &quot;talk&quot; to each other over CAN or RS485 so the inverter charges the battery correctly. Our product pages and cart check the voltage for you, and we confirm communication before dispatch.</p>
        <h2>When lead-acid still makes sense</h2>
        <p>For a small, occasional-use backup (a few lights and a router) on a tight budget, lead-acid can be enough. For anything used daily, choose lithium.</p>
        <p>
          Browse <Link href="/shop/batteries">batteries</Link>, or read <Link href="/learn/what-size-inverter">what size inverter you need</Link>.
        </p>
      </Prose>
    </div>
  );
}
