import { ArrowRight, BadgeCheck, Check, ShieldCheck, Sparkles, Truck, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import heroImage from "@/assets/backgrounds/hero-array.webp";
import installersImage from "@/assets/backgrounds/installers-roof.webp";
import fieldImage from "@/assets/backgrounds/field-array.webp";
import { BackupPlanner } from "@/components/home/backup-planner";
import { Reveal, RevealItem, RevealList } from "@/components/motion/reveal";
import { ProductCard } from "@/components/product/product-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { shopNav, site } from "@/config/site";
import type { CategorySlug } from "@/lib/catalogue/classify";
import { sortProducts } from "@/lib/catalogue/filters";
import { getCatalogue } from "@/lib/catalogue/queries";
import { availability, canPurchase, productUrl, specNum, specText, type Product } from "@/lib/catalogue/types";
import { batteryBus, inverterBus } from "@/lib/compatibility/engine";
import type { PlannerStock } from "@/lib/planner/match";
import { formatRand } from "@/lib/pricing/vat";

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
  {
    icon: Wrench,
    title: "Registered technician",
    body: "Installations certified with a CoC",
  },
  {
    icon: ShieldCheck,
    title: "Manufacturer warranties",
    body: "Plus your rights under the CPA",
  },
  {
    icon: BadgeCheck,
    title: "Compatibility checked",
    body: "Inverter and battery matched before you pay",
  },
  {
    icon: Truck,
    title: "Nationwide delivery",
    body: "Anywhere in South Africa",
  },
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

/** The first n in-stock products with photos, one per brand so the row has variety. */
function topInStock(products: Product[], category: CategorySlug, n: number) {
  const brands = new Set<string | null>();
  return sortProducts(
    products.filter((p) => p.category === category && p.images.length > 0 && availability(p).state !== "out_of_stock"),
    "featured",
    category,
  )
    .filter((p) => !brands.has(p.brand) && brands.add(p.brand))
    .slice(0, n);
}

export default async function HomePage() {
  const products = await getCatalogue();
  const brands = new Set(products.map((p) => p.brand).filter(Boolean));
  const categories = shopNav.map((item) => {
    const slug = item.href.replace("/shop/", "") as CategorySlug;
    const items = products.filter((p) => p.category === slug);
    return {
      ...item,
      count: items.length,
      from: items.length ? Math.min(...items.map((p) => p.priceInclVat)) : null,
      image: topInStock(products, slug, 1)[0]?.images[0] ?? null,
    };
  });
  const featured = (["inverters", "batteries", "solar-panels", "kits"] as const).flatMap((c) => topInStock(products, c, 2));
  const brandList = [...brands].sort() as string[];

  // Compact stock list for the backup planner (runs in the browser).
  const plannerItem = (p: Product) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    url: productUrl(p),
    image: p.images[0]?.url ?? null,
    price: p.priceInclVat,
    inStock: canPurchase(p),
  });
  const plannerStock: PlannerStock = {
    kits: products
      .filter((p) => p.category === "kits" && specNum(p, "inverter_power_kw") && specNum(p, "battery_capacity_kwh"))
      .map((p) => ({ ...plannerItem(p), inverterKw: specNum(p, "inverter_power_kw")!, batteryKwh: specNum(p, "battery_capacity_kwh")! })),
    inverters: products
      .filter((p) => p.category === "inverters" && specText(p, "inverter_type") !== "Grid-tie" && specNum(p, "rated_power_kw") && inverterBus(p))
      .map((p) => ({ ...plannerItem(p), kw: specNum(p, "rated_power_kw")!, bus: String(inverterBus(p)) })),
    batteries: products
      .filter((p) => p.category === "batteries" && specNum(p, "capacity_kwh") && batteryBus(p))
      .map((p) => ({ ...plannerItem(p), kwh: specNum(p, "capacity_kwh")!, bus: String(batteryBus(p)) })),
  };

  const facts = [
    `${products.length || 199} products from ${brands.size || 24} brands, prices include VAT`,
    "Delivered anywhere in South Africa",
    "Optional installation by our registered technician",
  ];

  return (
    <>
      {/* Hero: the backup planner is the centrepiece */}
      <section className="relative isolate -mt-px overflow-hidden bg-navy text-white">
        <Image src={heroImage} alt="" fill priority placeholder="blur" sizes="100vw" className="-z-20 object-cover" />
        <div className="photo-wash absolute inset-0 -z-10" aria-hidden="true" />
        <div className="container-page py-12 lg:py-16">
          <div className="grid items-end gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h1 className="max-w-3xl text-5xl leading-[1.02] font-semibold sm:text-6xl xl:text-7xl">Keep the lights on when the power goes off.</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
                Solar panels, lithium batteries and inverters for South African homes and businesses, matched so they work together.
              </p>
            </div>
            <div className="space-y-6 lg:pb-2">
              <ul className="space-y-2">
                {facts.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-white/90">
                    <Check className="size-5 shrink-0 text-sun" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-6 text-base">
                  <Link href="/shop">Shop the range</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="glass h-12 px-6 text-base text-white hover:bg-white/20 hover:text-white">
                  <Link href="/advisor">
                    <Sparkles className="text-sun" /> Ask the Solar Advisor
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <BackupPlanner stock={plannerStock} />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Why buy from us" className="border-b bg-card">
        <RevealList className="container-page grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, body }) => (
            <RevealItem key={title} className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-amber-ink">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm text-muted-foreground">{body}</span>
              </span>
            </RevealItem>
          ))}
        </RevealList>
      </section>

      {/* Categories */}
      <section className="container-page py-20 lg:py-28" aria-labelledby="categories-heading">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="categories-heading" className="text-4xl font-semibold sm:text-5xl">
              Everything for a complete system
            </h2>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-1 font-medium hover:underline">
            View all products <ArrowRight className="size-4" />
          </Link>
        </Reveal>
        <RevealList className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <RevealItem key={c.href}>
              <Link
                href={c.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-2xl hover:shadow-navy/10"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-white">
                  {c.image && (
                    <Image
                      src={c.image.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 border-t p-6">
                  <span className="flex items-center justify-between font-display text-2xl font-semibold">
                    {c.label}
                    <span className="grid size-9 place-items-center rounded-full bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="text-muted-foreground">{c.description}</span>
                  {c.count > 0 && (
                    <span className="mt-auto pt-3 text-sm text-muted-foreground">
                      <span className="num font-medium text-foreground">{c.count}</span> products
                      {c.from !== null && (
                        <>
                          {" "}
                          · from <span className="num font-medium text-foreground">{formatRand(c.from)}</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealList>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="border-y bg-muted/50 py-20 lg:py-28" aria-labelledby="featured-heading">
          <div className="container-page">
            <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="featured-heading" className="text-4xl font-semibold sm:text-5xl">
                  Popular right now
                </h2>
              </div>
              <Link href="/shop" className="inline-flex items-center gap-1 font-medium hover:underline">
                Shop everything <ArrowRight className="size-4" />
              </Link>
            </Reveal>
            <RevealList className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {featured.map((p) => (
                <RevealItem key={p.id}>
                  <ProductCard product={p} />
                </RevealItem>
              ))}
            </RevealList>
          </div>
        </section>
      )}

      {/* How it works, over a photo */}
      <section className="relative isolate overflow-hidden bg-navy text-navy-foreground" aria-labelledby="how-heading">
        <Image src={installersImage} alt="" fill placeholder="blur" sizes="100vw" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-navy/88" aria-hidden="true" />
        <div className="container-page py-20 lg:py-28">
          <Reveal>
            <h2 id="how-heading" className="max-w-3xl text-4xl font-semibold sm:text-5xl">
              From your electricity bill to a working system in three steps
            </h2>
          </Reveal>
          <RevealList className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => (
              <RevealItem key={step.title} className="glass relative rounded-3xl p-8">
                <span className="grid size-12 place-items-center rounded-full bg-sun font-mono text-lg font-semibold text-navy">{i + 1}</span>
                <h3 className="mt-6 text-2xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-white/75">{step.body}</p>
              </RevealItem>
            ))}
          </RevealList>
          <Reveal>
            <Button asChild size="lg" className="mt-14 h-14 px-8 text-base">
              <Link href="/advisor">
                Start with the Solar Advisor <ArrowRight />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* Brands */}
      {brandList.length > 0 && (
        <section className="container-page py-16" aria-labelledby="brands-heading">
          <Reveal>
            <h2 id="brands-heading" className="text-center font-sans text-base font-medium text-muted-foreground">
              Brands we stock
            </h2>
            <ul className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-x-10 gap-y-4">
              {brandList.map((b) => (
                <li key={b} className="font-display text-xl font-semibold text-foreground/45 transition-colors hover:text-foreground sm:text-2xl">
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}

      {/* FAQ */}
      <section className="container-page grid gap-12 border-t py-20 lg:grid-cols-[1fr_1.4fr] lg:py-28" aria-labelledby="faq-heading">
        <Reveal>
          <h2 id="faq-heading" className="text-4xl font-semibold sm:text-5xl">
            Straight answers
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            More in our{" "}
            <Link href="/faq" className="font-medium text-foreground underline underline-offset-4">
              FAQ
            </Link>
            , or{" "}
            <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">
              ask us directly
            </Link>
            .
          </p>
        </Reveal>
        <Reveal>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="py-5 text-left text-lg">{f.q}</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>

      {/* Final CTA, over a solar field */}
      <section className="container-page">
        <Reveal className="relative isolate overflow-hidden rounded-[2rem] bg-navy px-6 py-16 text-white sm:px-14 sm:py-20">
          <Image src={fieldImage} alt="" fill placeholder="blur" sizes="(min-width: 1440px) 1440px, 100vw" className="-z-20 object-cover" />
          <div className="photo-wash absolute inset-0 -z-10" aria-hidden="true" />
          <div className="max-w-2xl">
            <h2 className="text-4xl font-semibold sm:text-5xl">Not sure where to start?</h2>
            <p className="mt-5 text-lg text-white/80">
              Answer a few questions and get a recommended system with estimated savings. Results are estimates until our technician confirms the
              design on site.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 px-8 text-base">
                <Link href="/advisor">
                  Size my system <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="glass h-14 px-8 text-base text-white hover:bg-white/20 hover:text-white">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/65">{site.deliveryArea}. All prices include VAT.</p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
