import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice, PageHeader, Prose } from "@/components/content/prose";
import { site } from "@/config/site";
import { TERMS_VERSION } from "@/lib/checkout/schema";

export const metadata: Metadata = { title: "Terms and conditions", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Legal" title="Terms and conditions" intro={`Version ${TERMS_VERSION}. These terms apply when you buy from ${site.name} online.`} />
      <DraftNotice updated="22 October 2026" />
      <Prose>
        <h2>1. Who we are</h2>
        <p>{site.name} sells solar panels, batteries, inverters and related equipment, and offers installation. Our full company details are on the <Link href="/legal">company information</Link> page.</p>
        <h2>2. Prices</h2>
        <p>All prices are in South African rand and include 15% VAT. Delivery and installation are not included in product prices; delivery is confirmed before dispatch and installation is quoted after a site assessment. We will not add any other charges. If a price on the site is clearly wrong, we will contact you before accepting your order.</p>
        <h2>3. Placing an order</h2>
        <p>Before you pay, you see your full order, including all items, quantities and the total, and can change it. An order is accepted when we confirm your payment. If an item turns out to be unavailable, we will tell you and refund you for it in full.</p>
        <h2>4. Payment</h2>
        <p>You can pay online through PayFast or by bank transfer (EFT). For EFT, stock is held for 48 hours; if payment is not received in that time the order may be cancelled.</p>
        <h2>5. Delivery and risk</h2>
        <p>We deliver anywhere in South Africa. Ownership and risk pass to you on delivery. Please check goods on arrival and tell us within 48 hours about any visible damage. See our <Link href="/delivery">delivery policy</Link>.</p>
        <h2>6. Cancelling and returns</h2>
        <p>You may cancel an online purchase within 7 days of receiving the goods, as provided by the Electronic Communications and Transactions Act; you pay only the direct cost of returning them. Defective goods may be returned within 6 months under the Consumer Protection Act. See our <Link href="/warranty-and-returns">warranty and returns policy</Link>.</p>
        <h2>7. Installation</h2>
        <p>Installation is optional and quoted separately after a site assessment. It is carried out by a registered electrical contractor and certified with a Certificate of Compliance. Grid-tied systems may need registration with your municipality.</p>
        <h2>8. Sizing estimates</h2>
        <p>Sizing guidance and savings figures on this site are estimates. The final design is confirmed by our technician.</p>
        <h2>9. Liability</h2>
        <p>Nothing in these terms limits your rights under the Consumer Protection Act or any other law.</p>
        <h2>10. Privacy</h2>
        <p>How we use your information is explained in our <Link href="/privacy">privacy policy</Link>.</p>
        <h2>11. Governing law</h2>
        <p>These terms are governed by the laws of South Africa.</p>
      </Prose>
    </div>
  );
}
