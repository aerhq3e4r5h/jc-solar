import { LoadCheck, PanelYield, Runtime } from "@/components/tools/plain-terms";
import { specNum, specText, type Product } from "@/lib/catalogue/types";

/**
 * "In plain terms": the product's headline spec turned into an everyday
 * answer. Inverters and kits: what runs at once. Batteries and kits: how
 * long it lasts. Panels: what they make. Home-sized equipment only; big
 * commercial units and grid-tie inverters don't get a household calculator.
 */
export function PlainTermsSection({ product }: { product: Product }) {
  const c = product.category;
  const gridTie = specText(product, "inverter_type") === "Grid-tie";
  const kw = c === "inverters" && !gridTie ? specNum(product, "rated_power_kw") : c === "kits" ? specNum(product, "inverter_power_kw") : null;
  const kwh = c === "batteries" ? specNum(product, "capacity_kwh") : c === "kits" ? specNum(product, "battery_capacity_kwh") : null;
  const watts = c === "solar-panels" ? specNum(product, "wattage_w") : null;
  const showLoad = kw !== null && kw >= 0.5 && kw <= 20;
  const showRuntime = kwh !== null && kwh >= 0.5 && kwh <= 40;
  const showYield = watts !== null && watts >= 50;
  if (!showLoad && !showRuntime && !showYield) return null;
  const lithium = !/lead|agm|gel/i.test(specText(product, "chemistry") ?? "");

  return (
    <section aria-labelledby="plain-heading" data-reveal>
      <h2 id="plain-heading" className="text-2xl font-bold">
        In plain terms
      </h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        What the numbers mean in a home. These are estimates from typical appliances: our technician confirms the design for yours.
      </p>
      <div className="space-y-5">
        {showLoad && <LoadCheck kw={kw} />}
        {showRuntime && <Runtime kwh={kwh} lithium={lithium} />}
        {showYield && <PanelYield watts={watts} />}
      </div>
    </section>
  );
}
