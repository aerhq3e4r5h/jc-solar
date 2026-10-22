import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice, PageHeader, Prose } from "@/components/content/prose";

export const metadata: Metadata = { title: "Delivery", alternates: { canonical: "/delivery" } };

export default function DeliveryPage() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Help" title="Delivery" intro="We deliver anywhere in South Africa." />
      <DraftNotice updated="22 October 2026" />
      <Prose>
        <h2>Delivery cost</h2>
        <p>The cost depends on your address and on what you order. We confirm it for your address before dispatch, and you pay it separately; nothing is dispatched until you have agreed the cost. Live courier rates at checkout are coming soon.</p>
        <h2>How items travel</h2>
        <ul>
          <li><strong>Solar panels</strong> are large (often over 2 m) and travel on a pallet by freight.</li>
          <li><strong>Lithium batteries</strong> are classed as dangerous goods (UN3480, Class 9) and go only with couriers approved to carry them.</li>
          <li><strong>Inverters and accessories</strong> go by standard courier.</li>
        </ul>
        <p>Large orders may arrive in more than one delivery.</p>
        <h2>With installation</h2>
        <p>If you book installation, we can bring the equipment with us. We confirm the arrangement when we schedule the installation.</p>
        <h2>On arrival</h2>
        <p>Please check the delivery and tell us within 48 hours about any visible damage, with photos. See <Link href="/warranty-and-returns">warranty and returns</Link>.</p>
      </Prose>
    </div>
  );
}
