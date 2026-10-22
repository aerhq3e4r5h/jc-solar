import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PaymentMethods } from "@/components/brand/payment-methods";
import { footerNav, site } from "@/config/site";

export function SiteFooter() {
  const { company } = site;
  const details = [company.legalName, company.registrationNumber && `Reg. ${company.registrationNumber}`, company.vatNumber && `VAT ${company.vatNumber}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <footer className="dark mt-24 border-t bg-background text-foreground lg:mt-32">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:py-20">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">{site.description}</p>
          <p className="text-sm text-muted-foreground">{site.deliveryArea}.</p>
        </div>
        {Object.entries(footerNav).map(([heading, links]) => (
          <nav key={heading} aria-label={heading}>
            <h2 className="mb-4 font-sans text-sm font-semibold">{heading}</h2>
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
      <div className="container-page pb-8">
        <PaymentMethods />
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {company.legalName ?? site.name}. All prices include 15% VAT.
          </p>
          {details && <p>{details}</p>}
        </div>
      </div>
    </footer>
  );
}
