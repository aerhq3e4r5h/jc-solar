import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Prose } from "@/components/content/prose";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Solar Advisor: size your system",
  description: "Work out the inverter, battery and panels you need for load shedding and lower electricity bills.",
  alternates: { canonical: "/advisor" },
};

export default function AdvisorPage() {
  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Solar Advisor"
        title="Size your system"
        intro="Our AI Solar Advisor is on its way. It will ask about your home, bill and appliances and recommend a matched system from our stock. Until then, here's how sizing works, and we're happy to size it for you."
      />
      <div className="mb-12 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/contact">
            <Sparkles /> Ask us to size it for you
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/shop/kits">
            Browse system kits <ArrowRight />
          </Link>
        </Button>
      </div>
      <Prose>
        <h2>The three numbers that matter</h2>
        <ol>
          <li>
            <strong>Inverter size (kW):</strong> the most power you&apos;ll draw at once. Add up what runs together, then allow 20–30% headroom. Kettles,
            microwaves, pool and borehole pumps start with a surge well above their running power.
          </li>
          <li>
            <strong>Battery capacity (kWh):</strong> how much energy you need during an outage. Multiply what you run by the hours it must last.
            Lithium (LFP) batteries can use about 80–90% of their rated capacity.
          </li>
          <li>
            <strong>Panels (kWp):</strong> enough to run your daytime load and recharge the battery. Most of South Africa gets about 5 to 6 peak sun
            hours a day, and real systems lose roughly 15–20% to heat, wiring and dust.
          </li>
        </ol>
        <h2>Typical starting points</h2>
        <table>
          <thead>
            <tr>
              <th>Goal</th>
              <th>Inverter</th>
              <th>Battery</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Lights, Wi-Fi, TV, fridge, laptops</td>
              <td>3–5 kW</td>
              <td>5–10 kWh</td>
            </tr>
            <tr>
              <td>Most of a home except geyser, oven and pool pump</td>
              <td>5–8 kW</td>
              <td>10–15 kWh</td>
            </tr>
            <tr>
              <td>Large home or small business</td>
              <td>8–16 kW</td>
              <td>15 kWh and up</td>
            </tr>
          </tbody>
        </table>
        <p>
          These are rough guides, not a design. Your exact system depends on your appliances, roof and supply, and is confirmed by our technician at a
          site assessment.
        </p>
      </Prose>
    </div>
  );
}
