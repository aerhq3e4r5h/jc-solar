import "server-only";
import { lookup } from "node:dns/promises";
import { PAYFAST_NOTIFY_HOSTS, type ItnChecks } from "./payfast";

let ipCache: { ips: string[]; at: number } | null = null;

/** The real network checks used in production. */
export const payfastNetworkChecks: ItnChecks = {
  async resolvePayfastIps() {
    if (ipCache && Date.now() - ipCache.at < 10 * 60 * 1000) return ipCache.ips;
    const results = await Promise.all(
      PAYFAST_NOTIFY_HOSTS.map((h) => lookup(h, { all: true }).then((a) => a.map((x) => x.address)).catch(() => [])),
    );
    ipCache = { ips: [...new Set(results.flat())], at: Date.now() };
    return ipCache.ips;
  },
  async confirmWithPayfast(host, paramString) {
    const res = await fetch(`https://${host}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: paramString,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return (await res.text()).trim() === "VALID";
  },
};

/**
 * The address the notification came from, as reported by the hosting
 * platform's edge (clients cannot forge these on Netlify or Vercel):
 * Netlify sets x-nf-client-connection-ip; Vercel puts the client first in
 * x-forwarded-for.
 */
export function requestIp(headers: Headers): string | null {
  const netlify = headers.get("x-nf-client-connection-ip")?.trim();
  if (netlify) return netlify;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}
