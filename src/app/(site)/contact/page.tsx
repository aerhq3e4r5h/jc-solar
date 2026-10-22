import type { Metadata } from "next";
import { ContactForm } from "@/components/content/contact-form";
import { PageHeader } from "@/components/content/prose";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about a system, a quote or an order? Send us a message.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { email, phone, whatsapp, address } = site.company;
  const wa = whatsapp?.replace(/\D/g, "");
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Contact" title="Talk to us" intro="Sizing a system, a commercial project or a question about an order: send us a message and we'll reply by email." />
      <div className="grid max-w-5xl gap-10 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm />
        <aside className="space-y-4 text-sm">
          {wa && (
            <a href={`https://wa.me/${wa}`} className="block rounded-xl border bg-card p-4 font-medium hover:bg-muted" target="_blank" rel="noopener">
              Chat on WhatsApp
            </a>
          )}
          {email && <p>Email: <a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a></p>}
          {phone && <p>Phone: <a href={`tel:${phone.replace(/\s/g, "")}`} className="underline underline-offset-4">{phone}</a></p>}
          {address && <p className="text-muted-foreground">{address}</p>}
          <p className="text-muted-foreground">For orders, include your order number (it starts with JC-) so we can find it quickly.</p>
        </aside>
      </div>
    </div>
  );
}
