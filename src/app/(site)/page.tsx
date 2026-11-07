import { ArrowRight, BadgePercent, Check, Sparkles, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import heroImage from "@/assets/backgrounds/hero-array.webp";
import installersImage from "@/assets/backgrounds/installers-roof.webp";
import fieldImage from "@/assets/backgrounds/field-array.webp";
import { BackupPlanner } from "@/components/home/backup-planner";
import { SolarDay } from "@/components/home/solar-day";
import { Carousel } from "@/components/motion/carousel";
import { CountUp } from "@/components/motion/count-up";
import { HorizontalScroll } from "@/components/motion/horizontal-scroll";
import { Marquee } from "@/components/motion/marquee";
import { Reveal } from "@/components/motion/reveal";
import { CategoryGlyph } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";
import { discountPercent } from "@/lib/pricing/sale";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { shopNav, site } from "@/config/site";
import type { CategorySlug } from "@/lib/catalogue/classify";
import { sortProducts } from "@/lib/catalogue/filters";
import { getCatalogue } from "@/lib/catalogue/queries";
import { availability, canPurchase, productFullTitle, productUrl, specNum, specText, type Product } from "@/lib/catalogue/types";
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
      slug,
    };
  });
  const onSale = products
    .filter((p) => canPurchase(p) && discountPercent(p.priceInclVat, p.compareAtPriceInclVat))
    .sort((a, b) => (discountPercent(b.priceInclVat, b.compareAtPriceInclVat) ?? 0) - (discountPercent(a.priceInclVat, a.compareAtPriceInclVat) ?? 0))
    .slice(0, 8);
  const featured = (["inverters", "batteries", "solar-panels", "kits"] as const).flatMap((c) => topInStock(products, c, 2));
  const brandList = [...brands].sort() as string[];

  // Compact stock list for the backup planner (runs in the browser).
  const plannerItem = (p: Product) => ({
    id: p.id,
    name: productFullTitle(p),
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

  const ticker = [
    "Delivered anywhere in South Africa",
    "Every price includes VAT",
    "Inverter and battery matched before you pay",
    "Installation by a registered technician",
    "Certificate of Compliance on installed systems",
    "Manufacturer warranties",
    "Secure payment with PayFast or EFT",
    `${brands.size || 25} trusted brands`,
  ];
  const stats = [
    { label: "Products in stock and on order", value: products.length || 218, suffix: "" },
    { label: "Brands", value: brands.size || 25, suffix: "" },
    { label: "Provinces we deliver to", value: 9, suffix: "" },
    { label: "Prices with VAT included", value: 100, suffix: "%" },
  ];

  const facts = [
    `${products.length || 199} products from ${brands.size || 24} brands, prices include VAT`,
    "Delivered anywhere in South Africa",
    "Optional installation by our registered technician",
  ];

  return (
    <>
      {/* Hero: the backup planner is the centrepiece */}
      <section className="relative isolate -mt-px overflow-hidden bg-navy text-white">
        <div className="parallax-hero absolute inset-0 -z-20">
          <Image src={heroImage} alt="" fill priority placeholder="blur" sizes="100vw" className="object-cover" />
        </div>
        <div className="photo-wash absolute inset-0 -z-10" aria-hidden="true" />
        <div className="container-page py-12 lg:py-16">
          <div className="drift-up grid items-end gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 lg:grid-cols-[1.4fr_1fr]">
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

      {/* Ticker of what you get */}
      <div className="border-b bg-sun text-navy">
        <Marquee label="Why buy from JC Solar" seconds={45} className="py-4">
          {ticker.map((t) => (
            <li key={t} className="flex items-center gap-6 pr-6 font-display text-lg font-semibold whitespace-nowrap sm:text-xl">
              {t}
              <Sun className="size-5 shrink-0" aria-hidden="true" />
            </li>
          ))}
        </Marquee>
      </div>

      {/* The numbers */}
      <section aria-label="JC Solar in numbers" className="border-b bg-card">
        <dl className="container-page grid grid-cols-2 gap-y-8 py-12 lg:grid-cols-4">
          {stats.map((st, i) => (
            <div key={st.label} className="scroll-rise border-l-2 border-sun pl-5" style={{ "--i": i } as React.CSSProperties}>
              <dt className="text-sm text-muted-foreground">{st.label}</dt>
              <dd className="mt-1 font-display text-4xl font-semibold sm:text-5xl">
                <CountUp to={st.value} suffix={st.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Categories: slide sideways as you scroll */}
      <HorizontalScroll
        className="py-16 lg:py-0"
        header={
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="categories-heading" className="max-w-2xl text-4xl font-semibold sm:text-5xl">
              Everything for a complete system
            </h2>
            <Link href="/shop" className="inline-flex items-center gap-1 font-medium hover:underline">
              View all products <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      >
        {categories.map((c) => (
          <div key={c.href} className="w-[82vw] shrink-0 snap-start sm:w-[24rem] lg:w-[27rem]">
            <Link
              href={c.href}
              className="group relative isolate flex h-full min-h-72 flex-col justify-between overflow-hidden rounded-3xl bg-navy p-7 text-white transition-transform duration-300 hover:-translate-y-1 dark:bg-secondary"
            >
              {/* Low sun behind the drawing */}
              <span
                aria-hidden="true"
                className="absolute -top-16 -right-16 -z-10 size-64 rounded-full bg-sun/25 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
              />
              <CategoryGlyph
                category={c.slug}
                className="absolute top-4 right-5 -z-10 size-32 opacity-95 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2 sm:size-36"
              />
              <span className="max-w-[60%] text-sm text-white/70">
                {c.count > 0 ? (
                  <>
                    <span className="num font-medium text-white">{c.count}</span> products
                    {c.from !== null && (
                      <>
                        <br />
                        from <span className="num font-medium text-white">{formatRand(c.from)}</span>
                      </>
                    )}
                  </>
                ) : (
                  "Coming soon"
                )}
              </span>
              <span className="mt-16 block">
                <span className="flex items-center justify-between gap-3 font-display text-2xl font-semibold">
                  {c.label}
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 transition-colors group-hover:bg-sun group-hover:text-navy">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </span>
                <span className="mt-1.5 block text-white/70">{c.description}</span>
              </span>
            </Link>
          </div>
        ))}
      </HorizontalScroll>

      {/* On sale (only when the admin has discounted something) */}
      {onSale.length > 0 && (
        <section className="container-page pb-20 lg:pb-28" aria-labelledby="sale-heading">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-t pt-16">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-sale/10 px-3 py-1 text-sm font-semibold text-sale">
                <BadgePercent className="size-4" aria-hidden="true" /> Limited-time prices
              </p>
              <h2 id="sale-heading" className="text-4xl font-semibold sm:text-5xl">
                On sale now
              </h2>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {onSale.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* A day on solar, driven by scrolling */}
      <SolarDay />

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
            <Carousel label="Popular products">
              {featured.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* How it works, over a photo */}
      <section className="relative isolate overflow-hidden bg-navy text-navy-foreground" aria-labelledby="how-heading">
        <div className="parallax-band absolute inset-0 -z-20">
          <Image src={installersImage} alt="" fill placeholder="blur" sizes="100vw" className="object-cover" />
        </div>
        <div className="absolute inset-0 -z-10 bg-navy/88" aria-hidden="true" />
        <div className="container-page py-20 lg:py-28">
          <Reveal>
            <h2 id="how-heading" className="max-w-3xl text-4xl font-semibold sm:text-5xl">
              From your electricity bill to a working system in three steps
            </h2>
          </Reveal>
          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="glass scroll-rise relative rounded-3xl p-8" style={{ "--i": i } as React.CSSProperties}>
                <span className="grid size-12 place-items-center rounded-full bg-sun font-mono text-lg font-semibold text-navy">{i + 1}</span>
                <h3 className="mt-6 text-2xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-white/75">{step.body}</p>
              </li>
            ))}
          </ol>
          <Reveal>
            <Button asChild size="lg" className="mt-14 h-14 px-8 text-base">
              <Link href="/advisor">
                Start with the Solar Advisor <ArrowRight />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* Brands, scrolling both ways */}
      {brandList.length > 0 && (
        <section className="overflow-hidden py-20" aria-labelledby="brands-heading">
          <div className="container-page mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="brands-heading" className="scroll-rise text-4xl font-semibold sm:text-5xl">
              {brandList.length} brands, one shop
            </h2>
            <p className="max-w-sm text-muted-foreground">Tier-one names South African installers trust, all with manufacturer warranties.</p>
          </div>
          <div className="space-y-4">
            {[brandList.slice(0, Math.ceil(brandList.length / 2)), brandList.slice(Math.ceil(brandList.length / 2))].map((row, r) => (
              <Marquee key={r} label={r === 0 ? "Brands" : "More brands"} reverse={r === 1} seconds={50}>
                {row.map((b) => (
                  <li key={b} className="pr-4">
                    <Link
                      href={`/shop?q=${encodeURIComponent(b)}`}
                      className="flex h-20 min-w-48 items-center justify-center rounded-2xl border bg-card px-8 font-display text-2xl font-semibold whitespace-nowrap text-foreground/60 transition-colors hover:border-sun hover:text-foreground"
                    >
                      {b}
                    </Link>
                  </li>
                ))}
              </Marquee>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="container-page grid gap-12 border-t py-20 lg:grid-cols-[1fr_1.4fr] lg:py-28" aria-labelledby="faq-heading">
        <Reveal className="scroll-rise">
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
        <Reveal className="scroll-rise relative isolate overflow-hidden rounded-[2rem] bg-navy px-6 py-16 text-white sm:px-14 sm:py-20">
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
