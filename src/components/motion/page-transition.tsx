import { ViewTransition } from "react";

/**
 * Wrap a page's content so navigations tagged "nav-forward" or "nav-back"
 * slide it in that direction (put it in each page.tsx, not a layout).
 * Untagged navigations (the browser's back button) don't slide.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/** The same thing on two pages (a product photo, a category tile and banner) morphs between them. */
export function Shared({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}

/** View-transition names must be valid CSS identifiers. */
export const vtName = (kind: "product" | "category", id: string) => `${kind}-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
