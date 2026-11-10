import { ArrowRight, CircleHelp, MessageCircle, PackageSearch, RotateCcw, Sparkles, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/content/contact-form";
import { PageHeader } from "@/components/content/prose";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about a system, a quote or an order? Send us a message.",
  alternates: { canonical: "/contact" },
};

// Most questions already have an answer on the site: offer those before the form's reply arrives.
const quick = [
  { href: "/account", icon: PackageSearch, title: "Where is my order?", body: "Sign in to see its status, invoice and tracking." },
  { href: "/delivery", icon: Truck, title: "What does delivery cost?", body: "Prices and times for every province." },
  { href: "/warranty-and-returns", icon: RotateCcw, title: "Returns and warranty", body: "What to do if something is damaged or faulty." },
  { href: "/advisor", icon: Sparkles, title: "What system do I need?", body: "The Solar Advisor sizes one from your bill." },
  { href: "/faq", icon: CircleHelp, title: "Common questions", body: "Payment, quotations, installation and more." },
];

export default function ContactPage() {
  const { email, phone, whatsapp, address } = site.company;
  const wa = whatsapp?.replace(/\D/g, "");
  return (
    <div className="container-page py-12 lg:py-16">
      <PageHeader
        eyebrow="Contact"
        title="Talk to us"
        intro="Sizing a system, a commercial project or a question about an order: send us a message and we'll reply by email."
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <div data-reveal>
          <ContactForm />
          <p className="mt-4 text-sm text-muted-foreground">For orders, include your order number (it starts with GA-) so we can find it quickly.</p>
        </div>
        <aside className="space-y-6">
          {(wa || email || phone || address) && (
            <div data-reveal className="dark grain relative isolate space-y-3 overflow-hidden rounded-xl bg-ink p-6 text-sm text-ink-foreground">
              <h2 className="text-lg font-bold">Reach us directly</h2>
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1f9d55] px-4 font-semibold text-white"
                >
                  <MessageCircle className="size-4" aria-hidden="true" /> Chat on WhatsApp
                </a>
              )}
              {email && (
                <p>
                  Email:{" "}
                  <a href={`mailto:${email}`} className="font-semibold underline underline-offset-4">
                    {email}
                  </a>
                </p>
              )}
              {phone && (
                <p>
                  Phone:{" "}
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-semibold underline underline-offset-4">
                    {phone}
                  </a>
                </p>
              )}
              {address && <p className="text-white/70">{address}</p>}
            </div>
          )}
          <div>
            <h2 className="mb-3 text-lg font-bold">Quick answers</h2>
            <ul className="divide-y rounded-xl border">
              {quick.map(({ href, icon: Icon, title, body }, i) => (
                <li key={href} data-reveal="fade" style={{ "--i": i } as React.CSSProperties}>
                  <Link href={href} className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/60">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sun text-ink">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-sm text-muted-foreground">{body}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
