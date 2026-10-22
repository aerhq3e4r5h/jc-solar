import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice, PageHeader, Prose } from "@/components/content/prose";

export const metadata: Metadata = { title: "Warranty, returns and cancellations", alternates: { canonical: "/warranty-and-returns" } };

export default function ReturnsPage() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Help" title="Warranty, returns and cancellations" />
      <DraftNotice updated="22 October 2026" />
      <Prose>
        <h2>Changed your mind (7-day cooling-off)</h2>
        <p>Under section 44 of the ECT Act you may cancel an online purchase within 7 days of receiving the goods, without giving a reason. Return the goods unused and in their original packaging; you pay only the direct cost of returning them. We refund you within 30 days of the cancellation.</p>
        <p>Equipment that has already been installed, and work done to your specific requirements, may be treated differently. We will explain this before you book installation.</p>
        <h2>Defective goods (6-month implied warranty)</h2>
        <p>Under section 56 of the Consumer Protection Act, if goods are defective you may return them within 6 months of delivery, and choose a repair, a replacement or a refund. This is in addition to the manufacturer&apos;s warranty.</p>
        <h2>Manufacturer warranties</h2>
        <p>Panels, batteries and inverters carry their manufacturer&apos;s warranty, often 5 to 10 years for batteries and inverters and longer for panel performance. The term is shown on the product page where we have it. We handle warranty claims with the manufacturer for you.</p>
        <h2>How to start a return or claim</h2>
        <p><Link href="/contact">Contact us</Link> with your order number, the product and a short description (and photos for damage or faults). We will tell you how to send it back or arrange collection.</p>
      </Prose>
    </div>
  );
}
