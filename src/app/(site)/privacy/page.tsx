import type { Metadata } from "next";
import Link from "next/link";
import { Detail, DraftNotice, PageHeader, Prose } from "@/components/content/prose";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Legal" title="Privacy policy" intro="How we collect and use your personal information, in line with the Protection of Personal Information Act 4 of 2013 (POPIA)." />
      <DraftNotice updated="22 October 2026" />
      <Prose>
        <h2>Who is responsible</h2>
        <p>{site.name} is the responsible party for the information described here. Our Information Officer is <Detail value={null} />, contactable at <Detail value={site.company.email} />.</p>
        <h2>What we collect and why</h2>
        <ul>
          <li><strong>Orders:</strong> name, email, phone and delivery address, to process, deliver and invoice your order.</li>
          <li><strong>Quotations:</strong> name, email and optionally phone and company, to prepare and send your quotation.</li>
          <li><strong>Installation:</strong> address, property and supply details and photos you upload, to plan and certify the installation.</li>
          <li><strong>Account:</strong> email and sign-in details, if you create an account.</li>
          <li><strong>Messages:</strong> what you send us through the contact form.</li>
        </ul>
        <p>We collect only what we need for these purposes. Payment card details are handled by PayFast and never reach us.</p>
        <h2>Marketing</h2>
        <p>We send marketing emails only if you tick the opt-in box, which is never ticked for you. Every marketing message includes a way to unsubscribe.</p>
        <h2>Cookies</h2>
        <p>We use essential cookies to keep your cart, your order link and your sign-in working. We will ask before using any analytics or marketing cookies.</p>
        <h2>Who we share it with</h2>
        <p>Only service providers that help us run the shop: Supabase (database hosting), Netlify (website hosting), PayFast (payments), our email provider, and couriers for delivery. Conversations with the AI Solar Advisor are sent to Google (Gemini API) to generate replies. We do not store them, and the advisor asks you not to share personal details.</p>
        <h2>How long we keep it</h2>
        <p>Order and invoice records are kept as long as tax law requires. Other information is kept only as long as needed for the purpose above.</p>
        <h2>Your rights</h2>
        <p>You may ask to see, correct or delete your personal information, or object to how we use it, by <Link href="/contact">contacting us</Link>. You may also complain to the Information Regulator (South Africa).</p>
        <h2>Security</h2>
        <p>Our site uses HTTPS, data is encrypted at rest, and access to customer information is limited to staff who need it and recorded in an audit log.</p>
      </Prose>
    </div>
  );
}
