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
 * The address the notification came from. On Vercel the platform sets
 * x-forwarded-for with the client address first, so it can be trusted.
 */
export function requestIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}
