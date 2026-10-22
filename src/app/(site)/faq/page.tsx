import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/content/prose";
import { JsonLd } from "@/components/seo/json-ld";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about sizing, delivery, payment, installation, warranties and returns.",
  alternates: { canonical: "/faq" },
};

const faqs: [string, string][] = [
  ["What size system do I need for load shedding?", "It depends on what you want to keep running and for how long. Lights, Wi-Fi, TV and the fridge usually need a 3–5 kW inverter and 5–10 kWh of battery. Our sizing guide explains the numbers, and our technician confirms the design at a site assessment."],
  ["Are your prices VAT inclusive?", "Yes. Every price on the site includes 15% VAT. Delivery and installation are shown separately before you pay, and nothing else is added."],
  ["How do I pay?", "Online through PayFast (card, Instant EFT and other methods), or by bank transfer (EFT). For EFT we hold your stock for 48 hours and email a pro forma invoice with our banking details."],
  ["Can I get a quotation first?", "Yes. Add products to your cart and choose “Download a quotation”. You get a PDF valid for 7 days, which is handy for paying by EFT or getting approval."],
  ["Do you deliver to my area?", "We deliver anywhere in South Africa. The delivery cost depends on your address and what you order (panels travel on a pallet; lithium batteries go with a dangerous-goods courier). We confirm it before dispatch."],
  ["Can I buy without installation?", "Yes. Use your own installer if you prefer. Make sure they are a registered electrical contractor and issue a Certificate of Compliance."],
  ["Will this battery work with my inverter?", "Product pages and the cart check battery and inverter voltage for you and warn about mismatches. We also confirm battery communication (CAN/RS485) before dispatch."],
  ["Should my geyser run on the inverter?", "Usually not. A geyser element draws 3–4 kW for long periods and drains a battery quickly. Most homes leave the geyser on the grid or a timer and back up everything else."],
  ["What warranty do I get?", "Products carry the manufacturer's warranty, and under the Consumer Protection Act you may return defective goods within 6 months for repair, replacement or a refund."],
  ["Can I cancel my order?", "Online purchases can be cancelled within 7 days of receiving the goods under the ECT Act, at the cost of returning them. See our warranty and returns policy for details."],
];

export default function FaqPage() {
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Help" title="Frequently asked questions" intro={<>Can&apos;t find your answer? <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">Contact us</Link>.</>} />
      <Accordion type="single" collapsible className="max-w-3xl">
        {faqs.map(([q, a]) => (
          <AccordionItem key={q} value={q}>
            <AccordionTrigger className="text-left text-base">{q}</AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }}
      />
    </div>
  );
}
