import type { Metadata } from "next";
import { FaqBrowser, type Faq } from "@/components/content/faq-browser";
import { PageHeader } from "@/components/content/prose";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about sizing, delivery, payment, installation, warranties and returns.",
  alternates: { canonical: "/faq" },
};

const faqs: Faq[] = [
  {
    topic: "Sizing",
    q: "What size system do I need for load shedding?",
    a: "It depends on what you want to keep running and for how long. Lights, Wi-Fi, TV and the fridge usually need a 3–5 kW inverter and 5–10 kWh of battery. Our sizing guide explains the numbers, and our technician confirms the design at a site assessment.",
    link: { href: "/learn/what-size-inverter", label: "What size inverter do I need?" },
  },
  {
    topic: "Sizing",
    q: "How long will a 5 kWh battery last?",
    a: "Running lights, Wi-Fi, a TV, a fridge and phone chargers, a 5 kWh lithium battery lasts about 12 hours. Add heavy appliances and it drops quickly. Every battery page has a calculator for the appliances you pick.",
    link: { href: "/learn/battery-runtime", label: "How long will a battery last?" },
  },
  {
    topic: "Sizing",
    q: "Will this battery work with my inverter?",
    a: "Product pages and the cart check battery and inverter voltage for you and warn about mismatches. We also confirm battery communication (CAN/RS485) before dispatch.",
  },
  {
    topic: "Sizing",
    q: "Should my geyser run on the inverter?",
    a: "Usually not. A geyser element draws 3–4 kW for long periods and drains a battery quickly. Most homes leave the geyser on the grid or a timer and back up everything else.",
  },
  {
    topic: "Ordering and payment",
    q: "Are your prices VAT inclusive?",
    a: "Yes. Every price on the site includes 15% VAT. Delivery and installation are shown separately before you pay, and nothing else is added.",
  },
  {
    topic: "Ordering and payment",
    q: "How do I pay?",
    a: "Online through PayFast (card, Instant EFT and other methods), or by bank transfer (EFT). For EFT we hold your stock for 48 hours and email a pro forma invoice with our banking details.",
  },
  {
    topic: "Ordering and payment",
    q: "Can I get a quotation first?",
    a: "Yes. Add products to your cart and choose “Download a quotation”. You get a PDF valid for 7 days, which is handy for paying by EFT or getting approval.",
  },
  {
    topic: "Ordering and payment",
    q: "Do I need an account to order?",
    a: "No, you can check out as a guest. With an account you see your orders, invoices and quotes in one place. Orders you placed earlier with the same email address are added once you confirm it.",
    link: { href: "/signup", label: "Create an account" },
  },
  {
    topic: "Delivery and installation",
    q: "Do you deliver to my area?",
    a: "We deliver anywhere in South Africa. The delivery cost depends on your address and what you order (panels travel on a pallet; lithium batteries go with a dangerous-goods courier). You see it at checkout before you pay.",
    link: { href: "/delivery", label: "Delivery prices by province" },
  },
  {
    topic: "Delivery and installation",
    q: "How long does delivery take?",
    a: "Usually 2 to 7 working days after payment, depending on your province and what you order. Remote areas can take longer. When your order ships we email the tracking number, and you can follow it on your order page.",
    link: { href: "/delivery", label: "Delivery times by province" },
  },
  {
    topic: "Delivery and installation",
    q: "Can I buy without installation?",
    a: "Yes. Use your own installer if you prefer. Make sure they are a registered electrical contractor and issue a Certificate of Compliance.",
    link: { href: "/installation", label: "How our installation works" },
  },
  {
    topic: "Warranty and returns",
    q: "What warranty do I get?",
    a: "Products carry the manufacturer's warranty, and under the Consumer Protection Act you may return defective goods within 6 months for repair, replacement or a refund.",
    link: { href: "/warranty-and-returns", label: "Warranty and returns" },
  },
  {
    topic: "Warranty and returns",
    q: "Can I cancel my order?",
    a: "Online purchases can be cancelled within 7 days of receiving the goods under the ECT Act, at the cost of returning them. See our warranty and returns policy for details.",
    link: { href: "/warranty-and-returns", label: "Warranty and returns" },
  },
];

export default function FaqPage() {
  return (
    <div className="container-page py-12 lg:py-16">
      <PageHeader eyebrow="Help" title="Frequently asked questions" intro="Search, or pick a topic. Each answer links to the page with the detail." />
      <FaqBrowser faqs={faqs} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
    </div>
  );
}
