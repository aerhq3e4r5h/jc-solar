import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice, PageHeader, Prose } from "@/components/content/prose";
import { formatRand } from "@/lib/pricing/vat";
import { etaText, SHIPPING_CLASS_LABEL } from "@/lib/shipping/format";
import { getProvinceRates } from "@/lib/shipping/rates";
import type { ShippingClass } from "@/lib/shipping/types";

const CLASSES: ShippingClass[] = ["standard", "oversized", "dangerous_goods"];

export const metadata: Metadata = { title: "Delivery", alternates: { canonical: "/delivery" } };

export default async function DeliveryPage() {
  const { carrier, provinces } = await getProvinceRates();
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Help" title="Delivery" intro="We deliver anywhere in South Africa." />
      <DraftNotice updated="22 October 2026" />
      <Prose>
        <h2>Delivery cost</h2>
        <p>
          You see the exact delivery cost at checkout, after entering your address, before you pay. We deliver with {carrier} from our supplier&apos;s
          warehouse in Gauteng. Each type of item travels separately (see below), so an order with panels, a battery and an inverter has three
          delivery lines.
        </p>
        <p>
          <strong>Free delivery with installation:</strong> if you add professional installation, our technician brings everything on installation
          day.
        </p>
        {provinces.length > 0 && (
          <>
            <h3>Starting prices by province (incl. VAT)</h3>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Province</th>
                    {CLASSES.map((c) => (
                      <th key={c}>{SHIPPING_CLASS_LABEL[c]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {provinces.map((p) => (
                    <tr key={p.province}>
                      <td>{p.province}</td>
                      {CLASSES.map((c) => {
                        const r = p.rates[c];
                        return (
                          <td key={c} className="num">
                            {r ? (
                              <>
                                {formatRand(r.base)}
                                {r.perItem > 0 && (
                                  <span className="block text-xs text-muted-foreground">+{formatRand(r.perItem)} per extra item</span>
                                )}
                                {etaText(r.etaMin, r.etaMax) && (
                                  <span className="block text-xs text-muted-foreground">{etaText(r.etaMin, r.etaMax)}</span>
                                )}
                              </>
                            ) : (
                              "Quoted"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Times are working days after payment. Remote areas can take longer.</p>
          </>
        )}
        <h2>How items travel</h2>
        <ul>
          <li>
            <strong>Solar panels</strong> are large (often over 2 m) and travel on a pallet by freight.
          </li>
          <li>
            <strong>Lithium batteries</strong> are classed as dangerous goods (UN3480, Class 9) and go only with couriers approved to carry them.
          </li>
          <li>
            <strong>Inverters and accessories</strong> go by standard courier.
          </li>
        </ul>
        <p>Large orders may arrive in more than one delivery.</p>
        <h2>Tracking</h2>
        <p>When your order ships, we email you the {carrier} tracking number. You can also follow it on your order page.</p>
        <h2>On arrival</h2>
        <p>
          Please check the delivery and tell us within 48 hours about any visible damage, with photos. See{" "}
          <Link href="/warranty-and-returns">warranty and returns</Link>.
        </p>
      </Prose>
    </div>
  );
}
