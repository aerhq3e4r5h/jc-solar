import { BadgeCheck, PlugZap, ReceiptText, Truck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PaymentMethods } from "@/components/brand/payment-methods";
import { footerNav, site } from "@/config/site";

const PROMISES = [
  { icon: Truck, title: "Delivered nationwide", body: "Courier to all 9 provinces, priced before you pay" },
  { icon: ReceiptText, title: "VAT included", body: "The price you see is the price you pay for the goods" },
  { icon: PlugZap, title: "Checked to work together", body: "Your cart checks the inverter, battery and panels match" },
  { icon: BadgeCheck, title: "Registered installer", body: "Optional installation with a Certificate of Compliance" },
];

export function SiteFooter() {
  const { company } = site;
  const details = [company.legalName, company.registrationNumber && `Reg. ${company.registrationNumber}`, company.vatNumber && `VAT ${company.vatNumber}`]
    .filter(Boolean)
    .join(", ");
  return (
    <footer className="mt-16 lg:mt-20">
      <section aria-label="Why shop with us" className="border-y bg-shelf">
        <ul className="container-page grid grid-cols-1 gap-x-8 gap-y-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sun text-ink">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="dark bg-background text-foreground">
        <div className="container-page grid gap-12 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)] lg:py-20">
          <div className="max-w-sm space-y-5">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">{site.description}</p>
            <PaymentMethods />
          </div>
          {Object.entries(footerNav).map(([heading, links]) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="mb-4 text-base font-bold">{heading}</h2>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t">
          <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {company.legalName ?? site.name}. All prices include 15% VAT.</p>
            {details && <p>{details}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
