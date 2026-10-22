// Best-effort sliding-window limit per visitor, kept in memory. Each server
// instance has its own window, so this caps abuse and cost rather than
// enforcing an exact quota.

const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

export function allowRequest(key: string, limit = 20, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return true;
}
