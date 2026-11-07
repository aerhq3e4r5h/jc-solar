// Tells the mini cart (and header badge) that the cart changed. Client only.

export const CART_CHANGED = "jc:cart-changed";

/** Call after adding to the cart: refreshes the badge and opens the mini cart. */
export function cartChanged(open = true) {
  window.dispatchEvent(new CustomEvent(CART_CHANGED, { detail: { open } }));
}
