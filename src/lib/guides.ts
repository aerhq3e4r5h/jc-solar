import type { CategorySlug } from "@/lib/catalogue/classify";

/** The guides, in reading order. `tool` names the calculator or diagram inside, if any. */
export const guides: { slug: string; title: string; blurb: string; minutes: number; glyph: CategorySlug; tool?: string }[] = [
  {
    slug: "what-size-inverter",
    title: "What size inverter do I need?",
    blurb: "Add up what runs at the same time, allow for start-up surges and pick the right kW.",
    minutes: 4,
    glyph: "inverters",
    tool: "Load checker",
  },
  {
    slug: "battery-runtime",
    title: "How long will a battery last?",
    blurb: "From kWh to hours: usable capacity, average draw and what drains a battery fastest.",
    minutes: 4,
    glyph: "batteries",
    tool: "Runtime calculator",
  },
  {
    slug: "how-many-solar-panels",
    title: "How many solar panels do I need?",
    blurb: "From your electricity bill to a number of panels, and how much roof they take.",
    minutes: 4,
    glyph: "solar-panels",
    tool: "Panel calculators",
  },
  {
    slug: "inverter-types",
    title: "Hybrid, off-grid or grid-tied?",
    blurb: "Three kinds of inverter, and the one question that separates them: what happens when the grid goes off?",
    minutes: 5,
    glyph: "kits",
    tool: "Interactive diagram",
  },
  {
    slug: "lithium-vs-lead-acid",
    title: "Lithium vs lead-acid batteries",
    blurb: "Why LFP lithium has become the default for home backup, and when lead-acid still makes sense.",
    minutes: 3,
    glyph: "batteries",
  },
];

export const guide = (slug: string) => guides.find((g) => g.slug === slug)!;
