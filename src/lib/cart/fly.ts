// "Fly to cart": a copy of the product photo arcs from where it was added
// to the cart icon in the header, which then pops. Client only. With reduced
// motion (or nothing to fly), it resolves at once and the cart just updates.

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The visible header cart link (desktop and phone headers share one). */
function cartTarget(): HTMLElement | null {
  const el = document.querySelector<HTMLElement>("[data-cart-target]");
  return el && el.getClientRects().length ? el : null;
}

/** The product page's photo that's on screen (the gallery has a desktop and a phone version). */
export function visibleProductPhoto(): Element | null {
  return [...document.querySelectorAll("[data-product-photo]")].find((el) => el.getBoundingClientRect().width > 0) ?? null;
}

/** Pop the cart icon, like a spring. */
export function popCart() {
  const target = cartTarget();
  if (!target || reduced()) return;
  target.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.28)", offset: 0.35 }, { transform: "scale(0.94)", offset: 0.7 }, { transform: "scale(1)" }],
    { duration: 520, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
}

/**
 * Fly `image` from `from` (the photo the shopper added) to the cart icon.
 * Resolves when it lands (or at once when there's no animation to play).
 */
export function flyToCart(from: Element | null | undefined, image: string | null | undefined): Promise<void> {
  const target = cartTarget();
  if (!from || !image || !target || reduced()) return Promise.resolve();
  const a = from.getBoundingClientRect();
  // The photo is off screen (e.g. the phone's sticky bar): just pop the icon.
  if (!a.width || a.bottom < 0 || a.top > window.innerHeight) {
    popCart();
    return Promise.resolve();
  }
  const b = target.getBoundingClientRect();

  const size = Math.min(140, a.width, a.height);
  const startX = a.left + a.width / 2 - size / 2;
  const startY = a.top + a.height / 2 - size / 2;
  const dx = b.left + b.width / 2 - (startX + size / 2);
  const dy = b.top + b.height / 2 - (startY + size / 2);

  const img = document.createElement("img");
  img.src = image;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  Object.assign(img.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "contain",
    background: "white",
    borderRadius: "10px",
    boxShadow: "0 12px 30px rgb(0 0 0 / 0.18)",
    zIndex: "80",
    pointerEvents: "none",
  });
  document.body.appendChild(img);

  // An arc: up and over, shrinking as it goes.
  const lift = Math.min(160, Math.abs(dy) * 0.5 + 60);
  const flight = img.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(0.62) rotate(-8deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(0deg)`, opacity: 0.4 },
    ],
    { duration: 720, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" },
  );
  return flight.finished
    .catch(() => undefined)
    .then(() => {
      img.remove();
      popCart();
    });
}
