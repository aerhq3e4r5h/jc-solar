import { ArrowRight, BadgeCheck, MessagesSquare, PlugZap, ReceiptText, Truck, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import installersImage from "@/assets/backgrounds/installers-roof.webp";
import heroDark from "@/assets/home/hero-night-off.webp";
import heroLit from "@/assets/home/hero-night-on.webp";
import houseDark from "@/assets/home/house-night-off.webp";
import houseLit from "@/assets/home/house-night-on.webp";
import { MARK } from "@/components/brand/logo";
import { LazyPlanner, LazySolarDay } from "@/components/home/lazy-sections";
import { SavingsCalculator } from "@/components/home/savings-calculator";
import { ToolsTabs } from "@/components/home/tools-tabs";
import { Carousel } from "@/components/motion/carousel";
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
import { slugify } from "@/lib/catalogue/normalise";
import { getCatalogue } from "@/lib/catalogue/queries";
import { availability, canPurchase, productFullTitle, productUrl, specNum, specText, type Product } from "@/lib/catalogue/types";
import { batteryBus, inverterBus } from "@/lib/compatibility/engine";
import { calculatorPrices } from "@/lib/planner/calculator-prices";
import type { PlannerStock } from "@/lib/planner/match";
import { formatPrice } from "@/lib/pricing/vat";

// The home page, in the order a shopper needs it: what we sell, what's on
// offer, help choosing, why a system is sized the way it is, how buying
// works. One section pattern throughout (SectionHead, the same spacing),
// and two moments of motion only: the house's lights coming on in the hero,
// and the 24-hour story.

const promises = [
  { icon: Truck, title: "Delivered to all 9 provinces", body: "The courier cost is shown before you pay." },
  { icon: ReceiptText, title: "Every price includes VAT", body: "The price you see is the price of the goods." },
  { icon: PlugZap, title: "Checked to work together", body: "Your cart matches inverter, battery and panels." },
  { icon: Wrench, title: "Installed by a registered technician", body: "Optional, with a Certificate of Compliance." },
];

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
    a: "It depends on what you want to keep running and for how long. Lights, Wi-Fi, TV and the fridge usually need a 3 to 5 kW inverter and 5 to 10 kWh of battery. A battery is only run down to 30%, which is what makes it last, so we size it on the 70% that is used. The Solar Advisor works it out from your bill and appliances, and our technician confirms it at a site assessment.",
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
const INTRO_SCRIPT = `try{if(!sessionStorage.getItem("jc-intro")){sessionStorage.setItem("jc-intro","1");var d=document.documentElement;d.dataset.intro="1";setTimeout(function(){delete d.dataset.intro},3400)}}catch(e){}`;

// The headline acts out what it says: "on" is lit, "off." is dim (see .hero-title in globals.css).
const HEADLINE = ["Keep", "the", "lights", "on", "when", "the", "grid", "goes", "off."];

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
      // A real product stands for its department.
      image: topInStock(products, slug, 1)[0]?.images[0] ?? null,
      slug,
    };
  });
  const onSale = products
    .filter((p) => canPurchase(p) && discountPercent(p.priceInclVat, p.compareAtPriceInclVat))
    .sort((a, b) => (discountPercent(b.priceInclVat, b.compareAtPriceInclVat) ?? 0) - (discountPercent(a.priceInclVat, a.compareAtPriceInclVat) ?? 0))
    .slice(0, 4);
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

  const kitsFrom = categories.find((c) => c.slug === "kits")?.from ?? null;
  const topDiscount = onSale.length ? discountPercent(onSale[0].priceInclVat, onSale[0].compareAtPriceInclVat) : null;
  const saleCount = products.filter((p) => canPurchase(p) && discountPercent(p.priceInclVat, p.compareAtPriceInclVat)).length;

  return (
    <PageTransition>
      {/* Hero: our own house at night with the grid off. Its lights come up as the headline says "on" (see .hero-lit in globals.css). */}
      <section aria-labelledby="hero-heading" className="container-page pt-4 sm:pt-6" data-home>
        {/* Plays the entrance on the first home page view of a visit only. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <div className="relative isolate flex min-h-[41rem] flex-col overflow-hidden rounded-2xl bg-[#0f0f11] text-white sm:min-h-[43rem] lg:h-[min(72svh,41rem)] lg:min-h-[31rem] lg:justify-center">
          {/* Wide screens: the house stands on the right, at the height of the panel, and the sky fades out towards the words. */}
          <div
            className="absolute inset-x-0 bottom-0 -z-20 hidden aspect-[3/2] [mask-image:linear-gradient(to_bottom,transparent,black_20%)] sm:block lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:[mask-image:linear-gradient(to_right,transparent,black_34%)]"
            aria-hidden="true"
          >
            <Image src={heroDark} alt="" fill priority sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
            <Image src={heroLit} alt="" fill priority sizes="(min-width: 1024px) 66vw, 100vw" className="hero-lit object-cover" />
          </div>
          {/* Phones: the house itself, under the words. */}
          <div className="absolute inset-x-0 bottom-0 -z-20 aspect-[4/3] [mask-image:linear-gradient(to_bottom,transparent,black_26%)] sm:hidden" aria-hidden="true">
            <Image src={houseDark} alt="" fill priority sizes="100vw" className="object-cover" />
            <Image src={houseLit} alt="" fill priority sizes="100vw" className="hero-lit object-cover" />
          </div>
          <div
            className="absolute inset-0 -z-10 hidden bg-[linear-gradient(90deg,rgb(15_15_17/0.85)_0%,rgb(15_15_17/0.5)_36%,transparent_60%)] sm:block"
            aria-hidden="true"
          />
          <div className="drift-up p-6 sm:p-10 lg:max-w-[46rem] lg:p-14">
            <h1
              id="hero-heading"
              className="hero-title type-wide max-w-[13ch] text-[2.35rem] leading-[0.95] sm:text-[clamp(2.75rem,7vw,3.75rem)] lg:text-[clamp(2.75rem,min(4.4vw,8.6svh),4.25rem)]"
            >
              {HEADLINE.map((w, i) => (
                <Fragment key={i}>
                  <span className={w === "on" ? "hw hero-on" : w === "off." ? "hw hero-off" : "hw"} style={{ "--w": i } as React.CSSProperties}>
                    {w}
                  </span>
                  {i < HEADLINE.length - 1 ? " " : ""}
                </Fragment>
              ))}
            </h1>
            <p className="intro-rise mt-5 max-w-md text-lg leading-relaxed text-white/80" style={{ "--i": 3 } as React.CSSProperties}>
              Inverters, lithium batteries and solar panels for South African homes and businesses, delivered anywhere in the country.
            </p>
            <div className="intro-rise mt-7 flex flex-col gap-3 sm:flex-row" style={{ "--i": 4 } as React.CSSProperties}>
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
            {kitsFrom !== null && (
              <p className="intro-rise mt-5 text-sm text-white/65" style={{ "--i": 5 } as React.CSSProperties}>
                Backup kits from <span className="num font-semibold text-white">{formatPrice(kitsFrom)}</span>, VAT included.
              </p>
            )}
          </div>
        </div>

        {/* What you can count on, said once and standing still. */}
        <ul className="grid grid-cols-2 gap-x-5 gap-y-4 border-b py-6 sm:gap-x-8 sm:gap-y-5 sm:py-7 lg:grid-cols-4 lg:py-8">
          {promises.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-2.5 sm:gap-3.5">
              <Icon className="mt-0.5 size-4.5 shrink-0 text-amber-ink sm:size-5" aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold leading-snug sm:text-base">{title}</span>
                <span className="mt-0.5 hidden text-sm text-muted-foreground sm:block">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Departments */}
      <section className="container-page py-14 lg:py-20" aria-labelledby="categories-heading">
        <SectionHead id="categories-heading" title="Shop by category" link={{ href: "/shop", label: `All ${products.length} products` }} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.href} data-reveal>
              <Shared name={vtName("category", c.slug)}>
                <Link
                  href={c.href}
                  transitionTypes={["nav-forward"]}
                  className="group relative isolate flex h-48 flex-col overflow-hidden rounded-xl bg-tile p-4 text-tile-foreground sm:h-60 sm:p-6 lg:h-64"
                >
                  <span className="type-wide text-lg leading-none sm:text-2xl">{c.label}</span>
                  <span className="mt-1.5 text-xs text-tile-foreground/70 sm:text-sm">
                    {c.count > 0 ? (
                      <>
                        <span className="num">{c.count}</span> products
                        {c.from !== null && (
                          <span className="hidden min-[420px]:inline">
                            , from <span className="num font-semibold text-tile-foreground">{formatPrice(c.from)}</span>
                          </span>
                        )}
                      </>
                    ) : (
                      "Coming soon"
                    )}
                  </span>
                  <span className="mt-auto hidden items-center gap-1.5 text-sm font-semibold underline-offset-4 group-hover:underline sm:inline-flex">
                    Shop {c.label.toLowerCase()}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  {c.image ? (
                    /* "multiply" sits on the element that moves, or the photo's white would show while it does */
                    <span className="absolute right-2 bottom-2 -z-10 block h-[62%] w-[74%] mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.04] sm:right-4 sm:bottom-4 sm:h-[78%] sm:w-[52%]">
                      <Image src={c.image.url} alt="" fill sizes="(min-width: 1024px) 16rem, (min-width: 640px) 26vw, 36vw" className="object-contain object-right-bottom" />
                    </span>
                  ) : (
                    <CategoryGlyph category={c.slug} className="absolute right-2 bottom-2 -z-10 size-28 sm:size-44" />
                  )}
                </Link>
              </Shared>
            </li>
          ))}
        </ul>
      </section>

      {/* On sale (only when the admin has discounted something) */}
      {onSale.length > 0 && (
        <section className="container-page pb-14 lg:pb-20" aria-labelledby="sale-heading">
          <SectionHead
            id="sale-heading"
            title="On sale now"
            lede={topDiscount ? `Marked down by up to ${topDiscount}%, while stock lasts.` : undefined}
            link={{ href: "/shop?sale=1", label: saleCount > onSale.length ? `All ${saleCount} markdowns` : "All markdowns" }}
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {onSale.map((p) => (
              <li key={p.id} data-reveal>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Popular products */}
      {featured.length > 0 && (
        <section className="container-page pb-14 lg:pb-20" aria-labelledby="featured-heading">
          <SectionHead id="featured-heading" title="Popular right now" link={{ href: "/shop", label: "Shop everything" }} flush />
          <Carousel label="Popular products">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </Carousel>
        </section>
      )}

      {/* Help choosing: two estimators in one place, and the two longer routes */}
      <section id="planner" className="relative scroll-mt-24 border-y bg-shelf py-14 lg:py-20" aria-labelledby="tools-heading">
        <span id="savings" className="absolute -top-24" aria-hidden="true" />
        <div className="container-page">
          <SectionHead
            id="tools-heading"
            title="Work out what you need"
            lede="Two quick estimates, priced from what is in stock today. Our technician confirms the design before anything is installed."
          />
          <ToolsTabs
            tabs={[
              {
                id: "planner",
                label: "Plan your backup",
                hint: "Pick what must stay on in a power cut",
                content: <LazyPlanner stock={plannerStock} />,
              },
              {
                id: "savings",
                label: "Estimate your savings",
                hint: "What solar takes off your bill",
                content: <SavingsCalculator prices={calculatorPrices(products)} />,
              },
            ]}
          />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            <li>
              <Link href="/build" className="group flex h-full items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/40">
                <PlugZap className="size-6 shrink-0 text-amber-ink" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Build your system part by part</span>
                  <span className="block text-sm text-muted-foreground">Choose the panels, inverter and batteries, sized for your province.</span>
                </span>
                <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link href="/advisor" className="group flex h-full items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/40">
                <MessagesSquare className="size-6 shrink-0 text-amber-ink" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Ask the Solar Advisor</span>
                  <span className="block text-sm text-muted-foreground">Describe your home in your own words and get a matched system.</span>
                </span>
                <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* A day on solar, driven by scrolling: why a system is sized the way it is */}
      <LazySolarDay />

      {/* How buying works */}
      <section className="container-page py-14 lg:py-20" aria-labelledby="how-heading">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          <Link href="/installation" className="group relative isolate order-last block min-h-72 overflow-hidden rounded-xl bg-ink text-white lg:order-first lg:min-h-0">
            <Image
              src={installersImage}
              alt="Two installers fitting solar panels to a roof"
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="-z-20 object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span className="photo-wash-bottom absolute inset-0 -z-10" aria-hidden="true" />
            <span className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/85">
                <BadgeCheck className="size-4 text-sun" aria-hidden="true" /> Certificate of Compliance included
              </span>
              <span className="mt-2 flex items-center gap-2 text-lg font-semibold underline-offset-4 group-hover:underline">
                How installation works <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </span>
          </Link>
          <div>
            <h2 id="how-heading" className="type-wide max-w-xl text-3xl leading-[1.02] sm:text-4xl">
              From your electricity bill to a working system
            </h2>
            <ol className="mt-8 divide-y border-y">
              {steps.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[2.75rem_1fr] gap-x-4 py-5">
                  <span className="num type-wide grid size-10 place-items-center rounded-full bg-sun text-lg text-ink" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/advisor">Size my system with the Solar Advisor</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      {brandList.length > 0 && (
        <section className="border-y bg-shelf" aria-labelledby="brands-heading">
          <div className="container-page grid gap-6 py-12 lg:grid-cols-[16rem_1fr] lg:gap-14 lg:py-14">
            <div>
              <h2 id="brands-heading" className="type-wide text-2xl leading-tight sm:text-3xl">
                {brandList.length} brands we stock
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">Each with its manufacturer&apos;s warranty.</p>
            </div>
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {brandList.map((b) => (
                <li key={b} className="border-b border-foreground/10">
                  <Link href={`/brands/${slugify(b)}`} className="block truncate py-2.5 font-semibold text-foreground/75 transition-colors hover:text-foreground">
                    {b}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="container-page grid gap-8 py-14 lg:grid-cols-[1fr_1.6fr] lg:gap-14 lg:py-20" aria-labelledby="faq-heading">
        <div>
          <h2 id="faq-heading" className="type-wide text-3xl leading-[1.02] sm:text-4xl">
            Straight answers
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
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
        <Accordion type="single" collapsible className="w-full border-t">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="py-5 text-left text-lg font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* The last word, and the two ways in */}
      <section className="container-page" aria-labelledby="closing-heading">
        <div className="grain relative isolate grid items-center gap-8 overflow-hidden rounded-2xl bg-ink px-6 py-12 text-white sm:px-10 lg:grid-cols-[1fr_auto] lg:px-14 lg:py-16">
          <div>
            <h2 id="closing-heading" className="type-wide text-3xl leading-[1.04] sm:text-4xl xl:text-[2.75rem]">
              <span className="block">The grid switches off on a schedule.</span>
              <span className="block text-sun">Your lights don&apos;t have to.</span>
            </h2>
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
                <Link href="/advisor">Ask the Solar Advisor</Link>
              </Button>
            </div>
          </div>
          <svg viewBox="0 0 100 100" className="hidden size-44 overflow-visible lg:block xl:size-52" aria-hidden="true">
            <g fill="none" stroke="var(--sun)" strokeLinecap="round">
              <path d={MARK.arms} strokeWidth="9.5" />
              <path d={MARK.shank} strokeWidth="9.5" />
              <path d={MARK.stock} strokeWidth="7.1" />
              <circle cx={MARK.ring.cx} cy={MARK.ring.cy} r={MARK.ring.r} strokeWidth="5.9" />
            </g>
          </svg>
        </div>
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

/** Every section opens the same way: a heading, sometimes a line under it, sometimes a link to the full list. */
function SectionHead({
  id,
  title,
  lede,
  link,
  flush = false,
}: {
  id: string;
  title: string;
  lede?: string;
  link?: { href: string; label: string };
  /** Sits tight above a carousel, which brings its own space for the arrows. */
  flush?: boolean;
}) {
  return (
    <div className={flush ? "mb-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2" : "mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 lg:mb-9"}>
      <div className="max-w-2xl">
        <h2 id={id} className="type-wide text-3xl leading-[1.02] sm:text-4xl">
          {title}
        </h2>
        {lede && <p className="mt-2.5 text-lg text-muted-foreground">{lede}</p>}
      </div>
      {link && (
        <Link href={link.href} className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline">
          {link.label} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
