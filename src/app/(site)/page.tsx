import { ArrowRight, BadgePercent, BadgeCheck, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import installersImage from "@/assets/backgrounds/installers-roof.webp";
import homeImage from "@/assets/backgrounds/home-roof.webp";
import { LazyPlanner, LazySolarDay } from "@/components/home/lazy-sections";
import { PowerOn } from "@/components/home/power-on";
import { BrandWall } from "@/components/home/brand-wall";
import { SavingsCalculator } from "@/components/home/savings-calculator";
import { Carousel } from "@/components/motion/carousel";
import { CountUp } from "@/components/motion/count-up";
import { HorizontalScroll } from "@/components/motion/horizontal-scroll";
import { Marquee } from "@/components/motion/marquee";
import { Words } from "@/components/motion/words";
import { Spotlight } from "@/components/motion/spotlight";
import { PageTransition, Shared, vtName } from "@/components/motion/page-transition";
import { CategoryGlyph } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";
import { discountPercent } from "@/lib/pricing/sale";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { shopNav, site } from "@/config/site";
import { siteUrl } from "@/lib/env";
import type { CategorySlug } from "@/lib/catalogue/classify";
import { sortProducts } from "@/lib/catalogue/filters";
import { getCatalogue } from "@/lib/catalogue/queries";
import { availability, canPurchase, productFullTitle, productUrl, specNum, specText, type Product } from "@/lib/catalogue/types";
import { batteryBus, inverterBus } from "@/lib/compatibility/engine";
import { calculatorPrices } from "@/lib/planner/calculator-prices";
import type { PlannerStock } from "@/lib/planner/match";
import { formatPrice } from "@/lib/pricing/vat";

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

// Runs as the page HTML is parsed, before the hero paints, so there's no flash.
const INTRO_SCRIPT = `try{if(!sessionStorage.getItem("jc-intro")){sessionStorage.setItem("jc-intro","1");var d=document.documentElement;d.dataset.intro="1";setTimeout(function(){delete d.dataset.intro},1400)}}catch(e){}`;

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
  // Not the sale items again: a product shown twice on one page can't morph into its own page.
  const saleIds = new Set(onSale.map((p) => p.id));
  const featured = (["inverters", "batteries", "solar-panels", "kits"] as const).flatMap((c) =>
    topInStock(
      products.filter((p) => !saleIds.has(p.id)),
      c,
      2,
    ),
  );
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
      .map((p) => ({
        ...plannerItem(p),
        inverterKw: specNum(p, "inverter_power_kw")!,
        batteryKwh: specNum(p, "battery_capacity_kwh")!,
      })),
    inverters: products
      .filter((p) => p.category === "inverters" && specText(p, "inverter_type") !== "Grid-tie" && specNum(p, "rated_power_kw") && inverterBus(p))
      .map((p) => ({
        ...plannerItem(p),
        kw: specNum(p, "rated_power_kw")!,
        bus: String(inverterBus(p)),
      })),
    batteries: products
      .filter((p) => p.category === "batteries" && specNum(p, "capacity_kwh") && batteryBus(p))
      .map((p) => ({
        ...plannerItem(p),
        kwh: specNum(p, "capacity_kwh")!,
        bus: String(batteryBus(p)),
      })),
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
  const kitsFrom = categories.find((c) => c.slug === "kits")?.from ?? null;
  const topDiscount = onSale.length ? discountPercent(onSale[0].priceInclVat, onSale[0].compareAtPriceInclVat) : null;
  const saleImage = onSale.find((p) => p.images.length > 0)?.images[0] ?? null;
  const aircons = categories.find((c) => c.slug === "air-conditioners");

  return (
    <PageTransition>
      {/* Hero: a shop window, not a slogan. Big promo with a real price, plus two smaller offers. */}
      <section aria-labelledby="hero-heading" className="container-page pt-4 sm:pt-6">
        {/* Plays the entrance on the first home page view of a visit only. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <div className="grid gap-3 lg:h-[min(76svh,46rem)] lg:grid-cols-3 lg:grid-rows-2">
          <div className="relative isolate flex min-h-[32rem] flex-col justify-end overflow-hidden rounded-xl bg-ink text-white lg:col-span-2 lg:row-span-2 lg:min-h-0">
            <div className="parallax-hero absolute inset-0 -z-20">
              <Image src={homeImage} alt="" fill priority placeholder="blur" sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
            </div>
            <div className="photo-wash-bottom absolute inset-0 -z-10 lg:hidden" aria-hidden="true" />
            <div className="photo-wash absolute inset-0 -z-10 hidden lg:block" aria-hidden="true" />
            <div className="drift-up p-6 sm:p-10 lg:p-14">
              {kitsFrom !== null && (
                <p className="intro-stamp mb-6 inline-flex -rotate-2 items-baseline gap-2 rounded-sm bg-sun px-3 py-1.5 text-ink shadow-lg">
                  <span className="text-sm font-semibold">Backup kits from</span>
                  <span className="num type-wide text-xl">{formatPrice(kitsFrom)}</span>
                </p>
              )}
              <h1 id="hero-heading" className="intro-sweep type-wide max-w-3xl text-[2.35rem] leading-[0.95] sm:text-6xl xl:text-7xl">
                Keep the lights on when the grid goes off.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
                Inverters, lithium batteries and solar panels for South African homes and businesses. Every price includes VAT.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-13 px-7 text-base">
                  <Link href="/shop/kits">Shop backup kits</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-13 border-white/40 bg-transparent px-7 text-base text-white hover:border-white hover:bg-white hover:text-ink"
                >
                  <Link href="#planner">Plan my system</Link>
                </Button>
              </div>
            </div>
          </div>

          {onSale.length > 0 && topDiscount ? (
            <Link
              href="/shop?sale=1"
              className="intro-rise group relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-xl bg-sun p-6 text-ink sm:p-8"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <BadgePercent className="size-4" aria-hidden="true" /> On sale now
              </span>
              <span>
                <span className="type-wide block text-5xl leading-[0.95] sm:text-6xl">
                  Up to
                  <br />
                  <span className="num">{topDiscount}%</span> off
                </span>
                <span className="mt-3 inline-flex items-center gap-2 font-semibold underline-offset-4 group-hover:underline">
                  Shop {onSale.length} markdowns <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </span>
              {saleImage && (
                <span className="absolute top-5 right-5 size-20 rotate-6 overflow-hidden rounded-lg shadow-xl transition-transform duration-500 group-hover:rotate-2 min-[390px]:size-24 sm:size-32">
                  <Image src={saleImage.url} alt="" fill sizes="128px" className="object-cover" />
                </span>
              )}
            </Link>
          ) : (
            <Link
              href={aircons?.href ?? "/shop"}
              className="intro-rise group relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-xl bg-sun p-6 text-ink sm:p-8"
            >
              <span className="text-sm font-semibold">New in the shop</span>
              <span>
                <span className="type-wide block text-4xl leading-none sm:text-5xl">Inverter aircons</span>
                <span className="mt-3 inline-flex items-center gap-2 font-semibold underline-offset-4 group-hover:underline">
                  {aircons?.from ? <>From {formatPrice(aircons.from)}</> : "Shop aircons"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </span>
              <CategoryGlyph category="air-conditioners" className="absolute -right-4 -bottom-6 -z-10 size-44 opacity-90" />
            </Link>
          )}

          <Link
            href="/installation"
            style={{ "--i": 1 } as React.CSSProperties}
            className="intro-rise group relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-xl bg-ink p-6 text-white sm:p-8"
          >
            <Image
              src={installersImage}
              alt=""
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="-z-20 object-cover opacity-50 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="photo-wash-bottom absolute inset-0 -z-10" aria-hidden="true" />
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
              <BadgeCheck className="size-4 text-sun" aria-hidden="true" /> Certificate of Compliance included
            </span>
            <span>
              <span className="type-wide block text-3xl leading-none sm:text-4xl">Installed by a registered technician</span>
              <span className="mt-3 inline-flex items-center gap-2 font-semibold underline-offset-4 group-hover:underline">
                How installation works <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* Ticker of what you get */}
      <div className="mt-3 bg-ink text-ink-foreground">
        <Marquee label="Why buy from GridAnchor" seconds={50} className="py-3.5">
          {ticker.map((t) => (
            <li key={t} className="flex items-center gap-6 pr-6 text-base font-semibold whitespace-nowrap sm:text-lg">
              {t}
              <Sun className="size-5 shrink-0 text-sun" aria-hidden="true" />
            </li>
          ))}
        </Marquee>
      </div>

      {/* Departments: slide sideways as you scroll */}
      <HorizontalScroll
        className="py-16 lg:py-0"
        header={
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="categories-heading" className="type-wide max-w-3xl text-4xl leading-[0.98] sm:text-6xl">
              <CountUp to={products.length || 218} /> products from <CountUp to={brands.size || 25} /> brands
            </h2>
            <Link href="/shop" className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline">
              Shop everything <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        }
      >
        {categories.map((c) => (
          <div key={c.href} className="w-[78vw] shrink-0 snap-start sm:w-[22rem] lg:w-[25rem]">
            <Shared name={vtName("category", c.slug)}>
              <Link
                href={c.href}
                transitionTypes={["nav-forward"]}
                className="group relative isolate flex h-[26rem] flex-col overflow-hidden rounded-xl bg-shelf p-7 transition-colors duration-300 hover:bg-sun hover:text-ink"
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="type-wide text-[1.75rem] leading-none">{c.label}</span>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-background text-foreground transition-transform duration-300 group-hover:-rotate-45 group-hover:bg-ink group-hover:text-sun">
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </span>
                </span>
                <span className="mt-2 text-sm text-muted-foreground group-hover:text-ink/75">
                  {c.count > 0 ? (
                    <>
                      <span className="num font-semibold text-foreground group-hover:text-ink">{c.count}</span> products
                      {c.from !== null && (
                        <>
                          , from <span className="num font-semibold text-foreground group-hover:text-ink">{formatPrice(c.from)}</span>
                        </>
                      )}
                    </>
                  ) : (
                    "Coming soon"
                  )}
                </span>
                <CategoryGlyph
                  category={c.slug}
                  className="mx-auto mt-auto size-56 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-rotate-3"
                />
              </Link>
            </Shared>
          </div>
        ))}
      </HorizontalScroll>

      {/* On sale (only when the admin has discounted something) */}
      {onSale.length > 0 && (
        <section className="container-page pb-20 lg:pb-24" aria-labelledby="sale-heading">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="sale-heading" data-reveal="words" className="type-wide text-4xl sm:text-5xl">
              <Words text="On sale now" />
            </h2>
            <Link href="/shop?sale=1" className="inline-flex items-center gap-1.5 font-semibold text-sale underline-offset-4 hover:underline">
              All markdowns <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {onSale.map((p) => (
              <li key={p.id} data-reveal>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The planner: tap appliances, get a matched system from stock */}
      <section id="planner" className="scroll-mt-24 border-y bg-shelf py-16 lg:py-24" aria-label="Backup planner">
        <div className="container-page">
          <LazyPlanner stock={plannerStock} />
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Rather pick every part yourself?{" "}
            <Link href="/build" className="font-semibold text-foreground underline underline-offset-4">
              Build your system panel by panel
            </Link>
          </p>
        </div>
      </section>

      {/* What solar saves: an estimate from the visitor's own bill */}
      <section className="container-page py-16 lg:py-24" aria-labelledby="savings-heading">
        <div className="mb-8 max-w-2xl">
          <h2 id="savings-heading" data-reveal="words" className="type-wide text-4xl sm:text-5xl">
            <Words text="What could solar save you?" />
          </h2>
          <p data-reveal="fade" className="mt-3 text-lg text-muted-foreground">
            Move the sliders to your own bill. Prices come from what&apos;s in stock today.
          </p>
        </div>
        <div data-reveal>
          <SavingsCalculator prices={calculatorPrices(products)} />
        </div>
      </section>

      {/* The bold moment: the words light up and the logo switches on as you scroll */}
      <PowerOn />

      {/* A day on solar, driven by scrolling */}
      <LazySolarDay />

      {/* Popular products */}
      {featured.length > 0 && (
        <section className="container-page py-20 lg:py-28" aria-labelledby="featured-heading">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
            <h2 id="featured-heading" data-reveal="words" className="type-wide text-4xl sm:text-5xl">
              <Words text="Popular right now" />
            </h2>
            <Link href="/shop" className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline">
              Shop everything <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <Carousel label="Popular products">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </Carousel>
        </section>
      )}

      {/* Brands, in big type, looping both ways and speeding up as you scroll */}
      {brandList.length > 0 && <BrandWall brands={brandList} />}

      {/* How it works, over a photo */}
      <section className="container-page pt-20 lg:pt-28" aria-labelledby="how-heading">
        <div className="grain relative isolate overflow-hidden rounded-xl bg-ink text-ink-foreground">
          <div className="parallax-band absolute inset-0 -z-20">
            <Image src={installersImage} alt="" fill placeholder="blur" sizes="(min-width: 1440px) 1440px, 100vw" className="object-cover" />
          </div>
          <div className="absolute inset-0 -z-10 bg-ink/85" aria-hidden="true" />
          <Spotlight />
          <div className="px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
            <h2 id="how-heading" data-reveal="words" className="type-wide max-w-3xl text-4xl leading-[0.98] sm:text-5xl">
              <Words text="From your electricity bill to a working system" />
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
              {steps.map((step, i) => (
                <li key={step.title} data-reveal className="border-t-2 border-sun pt-6" style={{ "--i": i } as React.CSSProperties}>
                  <p className="type-wide text-2xl text-white">
                    <span className="num mr-3 text-sun">{i + 1}</span>
                    {step.title}
                  </p>
                  <p className="mt-3 leading-relaxed text-white/75">{step.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-13 px-7 text-base">
                <Link href="/advisor">
                  Size my system with the Solar Advisor <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 border-white/40 bg-transparent px-7 text-base text-white hover:border-white hover:bg-white hover:text-ink"
              >
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.4fr] lg:py-28" aria-labelledby="faq-heading">
        <div>
          <h2 id="faq-heading" data-reveal="words" className="type-wide text-4xl sm:text-5xl">
            <Words text="Straight answers" />
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            More in our{" "}
            <Link href="/faq" className="font-semibold text-foreground underline underline-offset-4">
              FAQ
            </Link>
            , or{" "}
            <Link href="/contact" className="font-semibold text-foreground underline underline-offset-4">
              ask us directly
            </Link>
            .
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full" data-reveal="fade">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="py-5 text-left text-lg font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "OnlineStore",
          name: site.name,
          url: siteUrl(),
          description: site.description,
          areaServed: "ZA",
        }}
      />
    </PageTransition>
  );
}
