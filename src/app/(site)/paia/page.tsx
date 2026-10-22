import type { Metadata } from "next";
import Link from "next/link";
import { Detail, DraftNotice, PageHeader, Prose } from "@/components/content/prose";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "PAIA manual", alternates: { canonical: "/paia" } };

export default function PaiaPage() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Legal" title="PAIA manual" intro="Our manual under section 51 of the Promotion of Access to Information Act 2 of 2000." />
      <DraftNotice updated="22 October 2026" />
      <Prose>
        <p><strong>This is a placeholder.</strong> The full manual is being prepared and will be published here.</p>
        <h2>Contact details</h2>
        <table>
          <tbody>
            <tr><th>Company</th><td><Detail value={site.company.legalName} /></td></tr>
            <tr><th>Information Officer</th><td><Detail value={null} /></td></tr>
            <tr><th>Email</th><td><Detail value={site.company.email} /></td></tr>
            <tr><th>Address</th><td><Detail value={site.company.address} /></td></tr>
          </tbody>
        </table>
        <h2>Requesting a record</h2>
        <p>Requests for access to records can be made to the Information Officer. Until the full manual is published, please <Link href="/contact">contact us</Link>.</p>
      </Prose>
    </div>
  );
}
