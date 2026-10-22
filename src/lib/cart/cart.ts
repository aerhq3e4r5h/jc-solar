import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

// The cart lives in a cookie as product IDs, quantities and the
// installation choice only. Prices, stock and names are always read fresh
// from the catalogue, so editing the cookie cannot change what anyone pays.
// At checkout the cart is copied into the database.

export const CART_COOKIE = "jc_cart";
export const MAX_LINES = 40;
export const MAX_QTY = 500;

const lineSchema = z.object({
  id: z.uuid(),
  q: z.number().int().min(1).max(MAX_QTY),
  i: z.boolean().default(false),
});
const cartSchema = z.array(lineSchema).max(MAX_LINES);

export type CartCookieLine = z.infer<typeof lineSchema>;

export function parseCart(raw: string | undefined): CartCookieLine[] {
  if (!raw) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function readCart(): Promise<CartCookieLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(lines: CartCookieLine[]) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(lines.slice(0, MAX_LINES)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Pure cart updates, kept separate so they can be unit-tested. */
export const cartOps = {
  add(lines: CartCookieLine[], id: string, qty: number, installation: boolean): CartCookieLine[] {
    const existing = lines.find((l) => l.id === id);
    if (existing) {
      return lines.map((l) => (l.id === id ? { ...l, q: Math.min(l.q + qty, MAX_QTY), i: l.i || installation } : l));
    }
    if (lines.length >= MAX_LINES) return lines;
    return [...lines, { id, q: Math.min(qty, MAX_QTY), i: installation }];
  },
  setQuantity(lines: CartCookieLine[], id: string, qty: number): CartCookieLine[] {
    if (qty <= 0) return lines.filter((l) => l.id !== id);
    return lines.map((l) => (l.id === id ? { ...l, q: Math.min(qty, MAX_QTY) } : l));
  },
  setInstallation(lines: CartCookieLine[], id: string, on: boolean): CartCookieLine[] {
    return lines.map((l) => (l.id === id ? { ...l, i: on } : l));
  },
  remove(lines: CartCookieLine[], id: string): CartCookieLine[] {
    return lines.filter((l) => l.id !== id);
  },
};
