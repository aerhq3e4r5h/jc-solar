// Shop-facing product titles. Supplier names pack the brand, SKU and wiring
// details into one string ("Deye: 5Kw Single Phase Hybrid Inverter (NEW) –
// VOC: 500V Battery: 48V CT&WIFI Incl (SUN-5K-SG04LP1-EU-SM2)"). Cards and
// headings show the brand separately and the details in the spec table, so the
// title keeps only what describes the product. Orders and invoices keep the
// full supplier name.

const UNIT_FIXES: [RegExp, string][] = [
  [/(\d)\s?kwh\b/gi, "$1 kWh"],
  [/(\d)\s?kva\b/gi, "$1 kVA"],
  [/(\d)\s?kw\b/gi, "$1 kW"],
  [/(\d)\s?ah\b/gi, "$1 Ah"],
  [/(\d)\s?w\b/gi, "$1 W"],
  [/(\d)\s?v\b/gi, "$1 V"],
];

export function displayName(name: string, sku?: string | null): string {
  let n = name.trim();
  // Brand or promo prefix: "Deye: …", "Web Special: …".
  n = n.replace(/^web special:\s*/i, "");
  const colon = n.indexOf(":");
  if (colon > 0 && colon <= 40 && !/voc|battery|input|isc/i.test(n.slice(0, colon))) n = n.slice(colon + 1).trim();
  // Trailing SKU in brackets.
  if (sku) {
    const esc = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    n = n.replace(new RegExp(`\\s*\\(${esc}\\)\\s*$`, "i"), "");
  }
  n = n
    // Electrical details live in the spec table.
    .replace(/\s*[–-]\s*voc:?.*?(?=\(|$)/i, " ")
    .replace(/\bvoc:?\s*[\d.]+\s?v\s*(\/\s*isc:?\s*[\d.]+\s?a)?/gi, " ")
    .replace(/\binput:?\s*\d+\s*[-–]\s*\d+\s*v(ac)?\b.*?(?:\d{2}(?:\/\d{2})?\s?hz\b|$)/i, " ")
    .replace(/\bbattery:\s*[\d.]+\s?v\b/gi, " ")
    // "CT&WIFI Incl", "CT, WIFI & BT Incl", "(NEW)".
    .replace(/\b(ct|wifi|bt|breaker)\b[\w\s,&]*\bincl\b/gi, " ")
    .replace(/\(\s*new\s*\)/gi, " ");
  for (const [re, to] of UNIT_FIXES) n = n.replace(re, to);
  return n
    .replace(/\(\s*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([),.])/g, "$1")
    .replace(/[\s–-]+$/g, "")
    .trim();
}
