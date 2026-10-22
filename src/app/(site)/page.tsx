import { ArrowRight, BatteryCharging, Cpu, PackageCheck, PanelsTopLeft, ShieldCheck, Truck, Wrench, Zap } from "lucide-react";
import Link from "next/link";
import { HeroArt } from "@/components/home/hero-art";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { shopNav, site } from "@/config/site";

const categoryIcons = {
  "/shop/solar-panels": PanelsTopLeft,
  "/shop/batteries": BatteryCharging,
  "/shop/inverters": Cpu,
  "/shop/kits": PackageCheck,
} as const;

const steps = [
  {
    title: "Size",
    body: "Tell the Solar Advisor where you live, what you pay for electricity and what you need to keep running. It works out the inverter, battery and panels for you.",
  },
  {
    title: "Buy",
    body: "Order the matched system or individual parts. Every price includes VAT, and we check that your inverter and battery work together before you pay.",
  },
  {
    title: "We install",
    body: "Add installation by our registered technician, or use your own installer. Installed systems get a Certificate of Compliance.",
  },
];

const trust = [
  { icon: Wrench, title: "Registered technician", body: "Installations certified with a CoC" },
  { icon: ShieldCheck, title: "Manufacturer warranties", body: "Plus your rights under the CPA" },
  { icon: Zap, title: "Secure payment", body: "Orders confirmed only once paid" },
  { icon: Truck, title: "Nationwide delivery", body: "Anywhere in South Africa" },
];

const faqs = [
  {
    q: "What size system do I need for load shedding?",
    a: "It depends on what you want to keep running and for how long. Lights, Wi-Fi, TV and the fridge usually need a 3 to 5 kW inverter and 5 to 10 kWh of battery. The Solar Advisor sizes it from your bill and appliances, and our technician confirms it at a site assessment.",
  },
  {
    q: "Can I buy without installation?",
    a: "Yes. Buy the equipment only and use your own installer. If your system will be connected to the grid, your municipality may require it to be registered as a small-scale embedded generator (SSEG).",
  },
  {
    q: "Should my geyser run on the inverter?",
    a: "Usually not. A geyser element draws 3 to 4 kW for long periods and drains a battery quickly. Most homes keep the geyser on the grid or a timer and back up everything else.",
  },
  {
    q: "Are prices shown with VAT?",
    a: "Yes. Every price on the site includes 15% VAT. Delivery and installation are shown separately before you pay.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-8">
            <p className="eyebrow">Solar · Batteries · Backup</p>
            <h1 className="text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl">
              Keep the lights on. <span className="text-amber-ink">Cut the bill.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Solar panels, lithium batteries and inverters for South African homes and small businesses, sized for
              your home and installed by our registered technician if you want.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/advisor">
                  Size my system <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link href="/shop/kits">Shop system kits</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{site.deliveryArea}. All prices include VAT.</p>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <HeroArt />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Why buy from us" className="border-y bg-card">
        <ul className="container-page grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-amber-ink">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-sm text-muted-foreground">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Categories */}
      <section className="container-page py-20" aria-labelledby="categories-heading">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Shop</p>
            <h2 id="categories-heading" className="text-3xl font-semibold sm:text-4xl">
              Everything for a complete system
            </h2>
          </div>
          <Link href="/shop" className="hidden items-center gap-1 text-sm font-medium hover:underline sm:inline-flex">
            View all products <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shopNav.map((item) => {
            const Icon = categoryIcons[item.href];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col gap-10 rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-navy/5"
                >
                  <span className="grid size-12 place-items-center rounded-xl bg-navy text-sun dark:bg-secondary">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="flex items-center justify-between font-display text-xl font-semibold">
                      {item.label}
                      <ArrowRight className="size-5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* How it works */}
      <section className="bg-navy text-navy-foreground" aria-labelledby="how-heading">
        <div className="container-page py-20">
          <p className="eyebrow mb-3 text-sun">How it works</p>
          <h2 id="how-heading" className="max-w-2xl text-3xl font-semibold sm:text-4xl">
            From your electricity bill to a working system in three steps
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <span className="font-mono text-sm text-sun">0{i + 1}</span>
                <h3 className="mt-4 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-navy-foreground/75">{step.body}</p>
              </li>
            ))}
          </ol>
          <Button asChild size="lg" className="mt-12 h-12 px-6 text-base">
            <Link href="/advisor">
              Start with the Solar Advisor <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="faq-heading">
        <div>
          <p className="eyebrow mb-3">Questions</p>
          <h2 id="faq-heading" className="text-3xl font-semibold sm:text-4xl">
            Straight answers
          </h2>
          <p className="mt-4 text-muted-foreground">
            More in our{" "}
            <Link href="/faq" className="font-medium text-foreground underline underline-offset-4">
              FAQ
            </Link>
            .
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-primary-foreground sm:px-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">Not sure where to start?</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Answer a few questions and get a recommended system with estimated savings. Results are estimates until
              our technician confirms the design on site.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8 h-12 px-6 text-base">
              <Link href="/advisor">
                Size my system <ArrowRight />
              </Link>
            </Button>
          </div>
          <svg viewBox="0 0 200 200" aria-hidden="true" className="absolute -right-10 -bottom-16 hidden w-72 opacity-25 md:block">
            <circle cx="100" cy="100" r="60" fill="currentColor" />
            {Array.from({ length: 12 }).map((_, i) => (
              <rect key={i} x="97" y="8" width="6" height="22" rx="3" fill="currentColor" transform={`rotate(${i * 30} 100 100)`} />
            ))}
          </svg>
        </div>
      </section>
    </>
  );
}
