// Matches a sized backup system to products in stock: a ready-made kit,
// or an inverter plus batteries on the same battery voltage. Pure, so the
// home-page planner can run it in the browser as the visitor taps.

export type PlannerItem = {
  id: string;
  name: string;
  brand: string | null;
  url: string;
  image: string | null;
  price: number;
  inStock: boolean;
};
export type PlannerKit = PlannerItem & { inverterKw: number; batteryKwh: number };
export type PlannerInverter = PlannerItem & { kw: number; bus: string };
export type PlannerBattery = PlannerItem & { kwh: number; bus: string };
export type PlannerStock = { kits: PlannerKit[]; inverters: PlannerInverter[]; batteries: PlannerBattery[] };

export type Match = {
  kind: "kit" | "pair";
  lines: { item: PlannerItem; quantity: number }[];
  total: number;
  inverterKw: number;
  batteryKwh: number;
  bus: string | null;
};

const MAX_BATTERIES = 4;

/** Cheapest in-stock way to get at least `kw` of inverter and `kwh` of battery, or null. */
export function matchSystem(stock: PlannerStock, kw: number, kwh: number): Match | null {
  const options: Match[] = [];

  for (const k of stock.kits) {
    if (k.inStock && k.inverterKw >= kw && k.batteryKwh >= kwh) {
      options.push({ kind: "kit", lines: [{ item: k, quantity: 1 }], total: k.price, inverterKw: k.inverterKw, batteryKwh: k.batteryKwh, bus: null });
    }
  }

  for (const inv of stock.inverters) {
    // Don't put a home on a 30 kW commercial unit just because it's cheap per kW.
    if (!inv.inStock || inv.kw < kw || inv.kw > Math.max(kw * 2.5, kw + 3)) continue;
    for (const bat of stock.batteries) {
      if (!bat.inStock || bat.bus !== inv.bus || bat.kwh <= 0) continue;
      const count = Math.max(1, Math.ceil(kwh / bat.kwh - 1e-9));
      if (count > MAX_BATTERIES) continue;
      options.push({
        kind: "pair",
        lines: [
          { item: inv, quantity: 1 },
          { item: bat, quantity: count },
        ],
        total: inv.price + bat.price * count,
        inverterKw: inv.kw,
        batteryKwh: Math.round(bat.kwh * count * 100) / 100,
        bus: inv.bus,
      });
    }
  }

  options.sort((a, b) => a.total - b.total || (a.kind === "kit" ? -1 : 1));
  return options[0] ?? null;
}
