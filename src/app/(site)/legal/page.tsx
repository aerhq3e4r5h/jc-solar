import type { Metadata } from "next";
import Link from "next/link";
import { Detail, DraftNotice, PageHeader, Prose } from "@/components/content/prose";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Company information", alternates: { canonical: "/legal" } };

export default function LegalInfoPage() {
  const c = site.company;
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Legal" title="Company information" intro="Information we provide under section 43 of the Electronic Communications and Transactions Act 25 of 2002." />
      <DraftNotice updated="22 October 2026" />
      <Prose>
        <table>
          <tbody>
            <tr><th>Trading name</th><td>{site.name}</td></tr>
            <tr><th>Registered name and legal status</th><td><Detail value={c.legalName} /></td></tr>
            <tr><th>Registration number</th><td><Detail value={c.registrationNumber} /></td></tr>
            <tr><th>VAT number</th><td><Detail value={c.vatNumber} /></td></tr>
            <tr><th>Physical address (for service of legal documents)</th><td><Detail value={c.address} /></td></tr>
            <tr><th>Email</th><td><Detail value={c.email} /></td></tr>
            <tr><th>Phone</th><td><Detail value={c.phone} /></td></tr>
            <tr><th>Directors / office bearers</th><td><Detail value={null} /></td></tr>
            <tr><th>Information Officer (POPIA)</th><td><Detail value={null} /></td></tr>
          </tbody>
        </table>
        <h2>Our policies</h2>
        <ul>
          <li><Link href="/terms">Terms and conditions</Link></li>
          <li><Link href="/privacy">Privacy policy</Link></li>
          <li><Link href="/warranty-and-returns">Warranty, returns and cancellations</Link></li>
          <li><Link href="/delivery">Delivery</Link></li>
          <li><Link href="/paia">PAIA manual</Link></li>
        </ul>
        <h2>Payment security</h2>
        <p>Online payments are processed by PayFast. We never see or store your card details. Our site is served only over encrypted HTTPS, and an order is marked paid only after PayFast confirms the payment to our server directly.</p>
      </Prose>
    </div>
  );
}
