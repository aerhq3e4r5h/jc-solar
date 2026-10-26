// Site-wide settings. Company details are intentionally blank until the
// business confirms them; the footer and legal pages only show what is set.

export const site = {
  name: "JC Solar",
  advisorName: "JC Solar Advisor",
  tagline: "Solar power for South African homes and businesses",
  description:
    "Solar panels, lithium batteries, inverters and complete backup kits, with optional installation by our registered technician. Delivered anywhere in South Africa.",
  deliveryArea: "Delivery anywhere in South Africa",
  company: {
    legalName: null as string | null,
    registrationNumber: null as string | null,
    vatNumber: null as string | null,
    address: null as string | null,
    email: null as string | null,
    phone: null as string | null,
    whatsapp: null as string | null,
  },
};

export const shopNav = [
  { href: "/shop/solar-panels", label: "Solar panels", description: "Mono, bifacial and N-type panels from tier-one makers" },
  { href: "/shop/batteries", label: "Batteries", description: "Lithium batteries for backup and self-consumption" },
  { href: "/shop/inverters", label: "Inverters", description: "Hybrid, off-grid and grid-tie inverters" },
  { href: "/shop/kits", label: "System kits", description: "Matched inverter and battery bundles" },
  { href: "/shop/voltage-stabilizers", label: "Voltage stabilizers", description: "Protect appliances from dips and surges" },
  { href: "/shop/air-conditioners", label: "Aircons", description: "Jetman inverter split aircons" },
] as const;

export const mainNav = [
  { href: "/shop", label: "Shop" },
  { href: "/installation", label: "Installation" },
  { href: "/advisor", label: "Solar Advisor" },
  { href: "/learn", label: "Learn" },
] as const;

export const footerNav = {
  Shop: shopNav.map(({ href, label }) => ({ href, label })),
  Help: [
    { href: "/advisor", label: "Size my system" },
    { href: "/installation", label: "Installation" },
    { href: "/delivery", label: "Delivery" },
    { href: "/warranty-and-returns", label: "Warranty and returns" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ],
  Legal: [
    { href: "/terms", label: "Terms and conditions" },
    { href: "/privacy", label: "Privacy policy" },
    { href: "/paia", label: "PAIA manual" },
    { href: "/legal", label: "Company information" },
  ],
};
