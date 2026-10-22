import { Circle, Document, Font, G, Line, Link, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import path from "node:path";
import { formatRand } from "@/lib/pricing/vat";

// Branded A4 sales documents: quotation, pro forma (EFT orders) and invoice.

const fontDir = path.join(process.cwd(), "src/lib/pdf/fonts");
Font.register({
  family: "Geist",
  fonts: [
    { src: path.join(fontDir, "Geist-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Geist-Medium.ttf"), fontWeight: 500 },
    { src: path.join(fontDir, "Geist-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "Geist-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({ family: "GeistMono", src: path.join(fontDir, "GeistMono-Regular.ttf") });
Font.registerHyphenationCallback((word) => [word]);

const C = {
  navy: "#162033",
  navySoft: "#24324d",
  sun: "#f5a524",
  sunPale: "#fdf3df",
  ink: "#162033",
  muted: "#5b6474",
  line: "#e6e3da",
  zebra: "#faf9f6",
};

const s = StyleSheet.create({
  page: { fontFamily: "Geist", fontSize: 9, color: C.ink, paddingBottom: 56 },
  band: {
    backgroundColor: C.navy,
    paddingHorizontal: 40,
    paddingVertical: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { flexDirection: "row", alignItems: "center" },
  brandName: { color: "#ffffff", fontSize: 20, fontWeight: 700, marginLeft: 10 },
  brandSun: { color: C.sun },
  tagline: { color: "#c9cfdb", fontSize: 8, marginTop: 2, marginLeft: 10 },
  docTitle: { color: "#ffffff", fontSize: 22, fontWeight: 600, textAlign: "right" },
  docMeta: { color: "#c9cfdb", fontSize: 9, textAlign: "right", marginTop: 3 },
  docMetaStrong: { color: C.sun, fontFamily: "GeistMono" },
  body: { paddingHorizontal: 40, paddingTop: 22 },
  parties: { flexDirection: "row", marginBottom: 18 },
  party: { flex: 1, paddingRight: 24 },
  label: { fontSize: 7, fontWeight: 600, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase", marginBottom: 5 },
  partyName: { fontSize: 11, fontWeight: 600, marginBottom: 2 },
  partyLine: { color: C.muted, marginBottom: 2 },
  metaGrid: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 8, marginBottom: 14 },
  metaCell: { flex: 1 },
  metaValue: { fontSize: 10, fontWeight: 500 },
  th: { flexDirection: "row", borderBottomWidth: 1.5, borderColor: C.sun, paddingBottom: 6, marginBottom: 2 },
  thText: { fontSize: 7, fontWeight: 600, letterSpacing: 1, color: C.muted, textTransform: "uppercase" },
  tr: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.5, borderColor: C.line, alignItems: "flex-start" },
  cNum: { width: 22, color: C.muted },
  cDesc: { flex: 1, paddingRight: 10 },
  cQty: { width: 36, textAlign: "right" },
  cUnit: { width: 78, textAlign: "right" },
  cAmt: { width: 84, textAlign: "right", fontWeight: 500 },
  sku: { fontFamily: "GeistMono", fontSize: 7, color: C.muted, marginTop: 2 },
  tag: { fontSize: 7, color: "#9a5b00", marginTop: 2 },
  lower: { flexDirection: "row", marginTop: 16 },
  totals: { width: 220, marginLeft: "auto" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalMuted: { color: C.muted },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: C.navy,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  grandLabel: { fontSize: 10, fontWeight: 600, color: "#ffffff" },
  grandValue: { fontSize: 14, fontWeight: 700, color: C.sun },
  pay: { flex: 1, backgroundColor: C.sunPale, borderRadius: 6, padding: 12, marginRight: 24 },
  payTitle: { fontSize: 10, fontWeight: 600, marginBottom: 6 },
  payRow: { flexDirection: "row", paddingVertical: 1.5 },
  payKey: { width: 82, color: C.muted },
  payVal: { flex: 1, fontWeight: 500 },
  paid: { flex: 1, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: "#2f8f5b", marginRight: 24, alignSelf: "flex-start" },
  notes: { marginTop: 16, borderTopWidth: 1, borderColor: C.line, paddingTop: 10 },
  note: { color: C.muted, fontSize: 7.5, marginBottom: 2.5 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.muted,
  },
  link: { color: "#9a5b00", textDecoration: "none" },
});

function SunMark() {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Rect x={0} y={0} width={32} height={32} rx={9} fill={C.navySoft} />
      <Circle cx={16} cy={14} r={5.5} fill={C.sun} />
      <G stroke={C.sun} strokeWidth={1.6} strokeLinecap="round">
        <Path d="M16 4.5v2.2M6.5 14h2.2M23.3 14h2.2M9.3 7.3l1.5 1.5M22.7 7.3l-1.5 1.5" />
      </G>
      <Line x1={6} y1={24.5} x2={26} y2={24.5} stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
      <Line x1={9} y1={27.5} x2={23} y2={27.5} stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" strokeOpacity={0.5} />
    </Svg>
  );
}

export type DocKind = "quote" | "proforma" | "invoice";

export type SalesDocumentProps = {
  kind: DocKind;
  number: string;
  issuedAt: string;
  validUntil?: string;
  reference: string;
  supplier: { name: string; lines: string[]; vatNumber: string | null; website: string };
  customer: { name: string; company?: string | null; email: string; phone?: string | null; address?: string[] };
  items: { sku: string; name: string; quantity: number; unitPrice: number; lineTotal: number; installation?: boolean }[];
  productsTotal: number;
  /** amount 0 with a label such as "Free" or "To be confirmed". */
  delivery: { amount: number; label: string; pending: boolean; note?: string };
  total: number;
  vat: number;
  installationRequested: boolean;
  bank: { bank: string; accountName: string; accountNumber: string; branchCode: string; accountType: string } | null;
  payOnlineUrl?: string;
  paidAt?: string | null;
};

const TITLES: Record<DocKind, string> = { quote: "Quotation", proforma: "Pro forma invoice", invoice: "Invoice" };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });

export function SalesDocument(p: SalesDocumentProps) {
  // A VAT-registered supplier issues a "Tax invoice" showing its VAT number.
  const title = p.kind === "invoice" && p.supplier.vatNumber ? "Tax invoice" : TITLES[p.kind];
  return (
    <Document title={`${title} ${p.number}`} author="JC Solar" creator="JC Solar" language="en-ZA">
      <Page size="A4" style={s.page}>
        {/* Top margin on continuation pages (page 1 starts with the band). */}
        <View fixed render={({ pageNumber }) => (pageNumber > 1 ? <View style={{ height: 36 }} /> : null)} />
        <View style={s.band}>
          <View>
            <View style={s.brand}>
              <SunMark />
              <Text style={s.brandName}>
                JC <Text style={s.brandSun}>Solar</Text>
              </Text>
            </View>
            <Text style={s.tagline}>Solar panels · Batteries · Inverters · Installation</Text>
          </View>
          <View>
            <Text style={s.docTitle}>{title}</Text>
            <Text style={s.docMeta}>
              No. <Text style={s.docMetaStrong}>{p.number}</Text>
            </Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.parties}>
            <View style={s.party}>
              <Text style={s.label}>From</Text>
              <Text style={s.partyName}>{p.supplier.name}</Text>
              {p.supplier.lines.map((l) => (
                <Text key={l} style={s.partyLine}>
                  {l}
                </Text>
              ))}
              {p.supplier.vatNumber && <Text style={s.partyLine}>VAT no. {p.supplier.vatNumber}</Text>}
            </View>
            <View style={s.party}>
              <Text style={s.label}>{p.kind === "quote" ? "Prepared for" : "Bill to"}</Text>
              <Text style={s.partyName}>{p.customer.name}</Text>
              {p.customer.company && <Text style={s.partyLine}>{p.customer.company}</Text>}
              {(p.customer.address ?? []).map((l) => (
                <Text key={l} style={s.partyLine}>
                  {l}
                </Text>
              ))}
              <Text style={s.partyLine}>{p.customer.email}</Text>
              {p.customer.phone && <Text style={s.partyLine}>{p.customer.phone}</Text>}
            </View>
          </View>

          <View style={s.metaGrid}>
            <View style={s.metaCell}>
              <Text style={s.label}>Date</Text>
              <Text style={s.metaValue}>{date(p.issuedAt)}</Text>
            </View>
            {p.validUntil && (
              <View style={s.metaCell}>
                <Text style={s.label}>Valid until</Text>
                <Text style={s.metaValue}>{date(p.validUntil)}</Text>
              </View>
            )}
            <View style={s.metaCell}>
              <Text style={s.label}>Payment reference</Text>
              <Text style={[s.metaValue, { fontFamily: "GeistMono" }]}>{p.reference}</Text>
            </View>
            <View style={s.metaCell}>
              <Text style={s.label}>Currency</Text>
              <Text style={s.metaValue}>ZAR, incl. 15% VAT</Text>
            </View>
          </View>

          <View style={s.th}>
            <Text style={[s.thText, s.cNum]}>#</Text>
            <Text style={[s.thText, s.cDesc]}>Description</Text>
            <Text style={[s.thText, s.cQty]}>Qty</Text>
            <Text style={[s.thText, s.cUnit]}>Unit price</Text>
            <Text style={[s.thText, s.cAmt]}>Amount</Text>
          </View>
          {p.items.map((item, i) => (
            <View key={item.sku} style={[s.tr, i % 2 === 1 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
              <Text style={s.cNum}>{i + 1}</Text>
              <View style={s.cDesc}>
                <Text>{item.name}</Text>
                <Text style={s.sku}>SKU {item.sku}</Text>
                {item.installation && <Text style={s.tag}>Installation requested</Text>}
              </View>
              <Text style={s.cQty}>{item.quantity}</Text>
              <Text style={s.cUnit}>{formatRand(item.unitPrice)}</Text>
              <Text style={s.cAmt}>{formatRand(item.lineTotal)}</Text>
            </View>
          ))}

          <View style={s.lower} wrap={false}>
            {p.kind === "invoice" ? (
              <View style={s.paid}>
                <Text style={[s.payTitle, { color: "#2f8f5b" }]}>Paid{p.paidAt ? ` on ${date(p.paidAt)}` : ""}</Text>
                <Text style={s.note}>Thank you for your payment. Keep this invoice for your warranty records.</Text>
              </View>
            ) : (
              <View style={s.pay}>
                <Text style={s.payTitle}>How to pay</Text>
                {p.payOnlineUrl && (
                  <Text style={{ marginBottom: 6 }}>
                    Online by card or Instant EFT:{" "}
                    <Link src={p.payOnlineUrl} style={s.link}>
                      {p.payOnlineUrl.replace(/^https?:\/\//, "")}
                    </Link>
                  </Text>
                )}
                {p.bank ? (
                  <>
                    <Text style={{ marginBottom: 4 }}>By EFT to:</Text>
                    {(
                      [
                        ["Bank", p.bank.bank],
                        ["Account name", p.bank.accountName],
                        ["Account no.", p.bank.accountNumber],
                        ["Branch code", p.bank.branchCode],
                        ["Account type", p.bank.accountType],
                        ["Reference", p.reference],
                      ] as [string, string][]
                    )
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <View key={k} style={s.payRow}>
                          <Text style={s.payKey}>{k}</Text>
                          <Text style={s.payVal}>{v}</Text>
                        </View>
                      ))}
                  </>
                ) : (
                  <Text>
                    By EFT: contact us for our banking details and use <Text style={{ fontWeight: 600 }}>{p.reference}</Text> as your reference.
                  </Text>
                )}
              </View>
            )}
            <View style={s.totals}>
              <View style={s.totalRow}>
                <Text>Products</Text>
                <Text>{formatRand(p.productsTotal)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={p.delivery.amount > 0 ? undefined : s.totalMuted}>Delivery</Text>
                <Text style={p.delivery.amount > 0 ? undefined : s.totalMuted}>
                  {p.delivery.amount > 0 ? formatRand(p.delivery.amount) : p.delivery.label}
                </Text>
              </View>
              {p.installationRequested && (
                <View style={s.totalRow}>
                  <Text style={s.totalMuted}>Installation</Text>
                  <Text style={s.totalMuted}>Quoted after site visit</Text>
                </View>
              )}
              <View style={s.grand}>
                <Text style={s.grandLabel}>Total incl. VAT</Text>
                <Text style={s.grandValue}>{formatRand(p.total)}</Text>
              </View>
              <View style={[s.totalRow, { marginTop: 4 }]}>
                <Text style={s.totalMuted}>VAT included (15%)</Text>
                <Text style={s.totalMuted}>{formatRand(p.vat)}</Text>
              </View>
            </View>
          </View>

          <View style={s.notes}>
            <Text style={s.label}>Notes</Text>
            {p.kind === "quote" && (
              <>
                <Text style={s.note}>
                  • Prices are valid until the date above and include 15% VAT. Stock is not reserved until payment is received.
                </Text>
                <Text style={s.note}>• Please use the payment reference above and email your proof of payment so we can process your order.</Text>
              </>
            )}
            {p.kind === "proforma" && (
              <Text style={s.note}>• Your stock is held for 48 hours. Please pay using the reference above and email your proof of payment.</Text>
            )}
            {p.delivery.note && <Text style={s.note}>• {p.delivery.note}</Text>}
            {p.delivery.pending && (
              <Text style={s.note}>
                • {p.delivery.amount > 0 ? "Part of the delivery" : "Delivery"} is not included yet: we confirm the cost for your address before
                dispatch.
              </Text>
            )}
            {p.installationRequested && (
              <Text style={s.note}>
                • Installation is by our registered technician and is quoted after a site assessment. You only pay for it once you accept that quote.
              </Text>
            )}
            <Text style={s.note}>
              • Goods carry the manufacturer&apos;s warranty, plus your right under the Consumer Protection Act to return defective goods within 6
              months.
            </Text>
            {p.kind !== "invoice" && <Text style={s.note}>• This is not a tax invoice. E&amp;OE.</Text>}
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>
            {p.supplier.name} · {p.supplier.website}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
