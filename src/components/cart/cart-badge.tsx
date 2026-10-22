import { readCart } from "@/lib/cart/cart";

/** Item count on the header cart icon. Reads the cart cookie, so render inside <Suspense>. */
export async function CartBadge() {
  const count = (await readCart()).reduce((n, l) => n + l.q, 0);
  if (count === 0) return null;
  return (
    <span className="num absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-5 font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> items in cart</span>
    </span>
  );
}
