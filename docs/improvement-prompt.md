# JC Solar: next round of improvements (prompt for a coding agent)

Paste everything below the line into a new Claude Code session on the
`jc-solar` repository. It is written so the agent can work through it in
order, verify each step, and ship in small, safe pushes.

---

You are working on **JC Solar** (https://jc-solars.netlify.app), a South
African online store for inverters, lithium batteries, solar panels, backup
kits, voltage stabilizers and Jetman aircons. Products and photos come from
the supplier Solar Europe (JC Solar has their permission to use the photos).
Customers are homeowners and small businesses who want backup power, plus
installers who know the specs.

## Read this first

- **Stack:** Next.js 16.4 App Router with Cache Components (`'use cache'`,
  `cacheLife`, `cacheTag("catalogue")`), React 19, Tailwind v4, shadcn/ui,
  `motion/react`, Supabase (Postgres with RLS, auth, storage), PayFast and EFT,
  Netlify (a push to `main` deploys).
- **This is not the Next.js you remember.** Before you write routing,
  caching or view-transition code, read the guide for it in
  `node_modules/next/dist/docs/`. Key rules already learned in this codebase:
  - Call `connection()` before reading the clock or random values in server code.
  - Read `params` and `searchParams` inside `<Suspense>`.
  - Page files may export only page config.
  - Admin actions use `updateTag(CATALOGUE_TAG)`.
  - The Supabase clients use `noStoreFetch`.
- **Design system (keep it):**
  - Colours are tokens in `src/app/globals.css`:
    - Graphite `--ink` for text, dark bands and selected states.
    - Signal yellow `--sun`, used only as a solid fill with graphite text on it.
    - `--shelf` light grey for quiet bands.
    - `--charge` green for in stock and power flowing.
    - `--sale` red for markdowns.
  - **No blue anywhere.** The owner rejected the previous navy design as
    looking "extremely AI".
  - One typeface, Archivo, through its width axis: `.type-wide` (125% width,
    weight 800) for headlines and prices, normal width for reading.
  - Radii: 8px for tiles, pill-shaped buttons, 4px for badges.
- **Motion rules:**
  - Everything that moves respects `prefers-reduced-motion` and has a still
    fallback.
  - Anything that moves on its own for more than 5 seconds has a pause
    control (see `src/components/home/brand-wall.tsx`).
  - Prefer CSS scroll-driven animations (`animation-timeline`) or
    `motion/react` springs.
  - Never animate layout properties in a loop; use transform and opacity.
- **Honesty rules (non-negotiable):**
  - No fake reviews, ratings, sold counts, countdown timers or "X people
    are viewing this".
  - Stock urgency only from real `stock_qty`.
  - Don't claim services JC Solar does not offer. In particular:
    - Nobody configures or tests equipment before dispatch.
    - Installation is optional, and it does not include free delivery.
  - Delivery is by DSV from Solar Europe's warehouse, priced at checkout.
  - All prices include 15% VAT.
- **Secrets:**
  - Never ask for secrets in chat.
  - Never commit `.env.local`.
  - Service-role keys are server only.
  - Ask before changing shared resources (the production Supabase project,
    Netlify settings, auth config).
- **Verify every step before pushing:**
  - `npx tsc --noEmit`, `npx eslint src --quiet`, `npx vitest run`.
  - A production build.
  - Playwright screenshots on desktop (1440), phone (iPhone 13) and dark mode,
    plus one run with `reducedMotion: "reduce"`.
  - Look at the screenshots yourself and fix what looks off.
  - Push in small commits, then confirm the Netlify deploy is `ready` and the
    change is visible on the live site.

## 1. Product photos and product tiles

The product photos were Solar Europe marketing tiles: coloured backgrounds,
banner text and watermarks. They have now been cut out onto clean white
squares (`public/products/<slug>/w-<n>.webp`, mapped in
`src/data/product-images.json`).

1. **Second photo on hover.**
   - Product tiles are already white with a hairline border.
   - On hover (desktop), crossfade to the product's second photo if it has
     one, and back on leave.
   - Keep the sale ribbon and the quick-add button working on top.
2. **Representative photos.**
   - Products marked `"sameRange": true` in the image map use a sister
     model's photo.
   - The gallery already shows a note. Make it a tidy caption, and replace
     the photo when Solar Europe supplies the real one.
3. **Admin image manager** (`/admin/products`):
   - Upload, reorder and delete photos into Supabase Storage.
   - Show which products still use a representative photo or have none.
   - Uploaded photos take priority over the bundled ones (already supported
     by `storage_path`).
4. **Open Graph images per product** with `next/og` `ImageResponse`:
   - Content: the white packshot, the product name in Archivo wide, the
     price, and the sale badge when discounted.
   - Use the same for categories.

## 2. Product page that sells

1. **Sticky buy box on desktop.** The right column (price, stock, add to
   cart, installation toggle) sticks while the specs scroll past.
2. **Sticky add-to-cart bar on phones.** It appears when the main button
   scrolls out of view and shows the thumbnail, price and Add to cart.
   Animate it in from the bottom with a spring.
3. **Gallery upgrades:**
   - Hover zoom lens on desktop.
   - Swipe with snap and dots on phones.
   - Full-screen viewer with pinch zoom.
   - Keyboard arrows.
4. **"Complete the system"** (frequently bought together):
   - For an inverter, suggest a compatible battery and panels from the
     compatibility engine (`src/lib/compatibility/engine.ts`).
   - Show a running total.
   - "Add all to cart" uses `addManyToCart`.
   - Only suggest items the engine says are compatible and in stock.
5. **Spec table:**
   - Group into sections (electrical, battery, physical, warranty).
   - Highlight the 3 specs that matter for the category.
   - Add a "Compare with similar" button that pre-fills `/compare` with 3
     neighbours.
6. **Delivery estimate by postcode:** use the existing `quote_delivery()`.
   - Remember the postcode in a cookie.
   - Show the estimated cost and the DSV lead time range.
7. **Honest low-stock line:** "Only 3 left" when `stock_qty` is 5 or less.
   Nothing when stock is not tracked.
8. **Recently viewed:** a rail of the last 8 products viewed, stored in
   localStorage and shown on product, category and cart pages.

## 3. Shop and category pages

1. **Filters:**
   - On phones: a bottom sheet with a sticky "Show N products" button.
   - On desktop: chips of active filters above the grid, each removable
     with ×, plus "Clear all".
2. **Animated result count:**
   - The count animates when filters change.
   - Results crossfade using React `<ViewTransition>` (same-route
     transitions; see the guide).
3. **Price range slider** with a small price histogram behind it.
4. **Grid and list view toggle.** List view shows key specs in columns for
   installers.
5. **"Load more"** after 24 items, with skeleton tiles while loading.
6. **Quick view:** a dialog from the tile with photos, key specs, price and
   Add to cart, without leaving the grid.
7. **Category intro:**
   - A compact banner with 3 to 5 buying-guide chips, for example
     "What size inverter?" (links to `/learn`).
   - A "Shop by size" row (3 kW, 5 kW, 8 kW, 10 kW+) that applies the size
     filter.

## 4. Search

1. **Typo tolerance and synonyms:**
   - Treat "inverta" as inverter, "kw" as kW, "lithium" as LiFePO4, and
     "aircon" as air conditioner.
   - Rank exact SKU matches first.
2. **Empty-query panel:** recent searches (localStorage), popular searches,
   and category shortcuts with their drawings.
3. **Results grouped by category** with counts. Show the sale price when
   discounted (already in `/api/search`).
4. **"No results" state:** suggest the closest category, plus "Ask the Solar
   Advisor" with the query pre-filled (partly done).

## 5. Motion and interaction (the "cool stuff")

Spend boldness in a few places. Each item needs a reduced-motion fallback.

1. **Shared-element page transitions** with React `<ViewTransition>`:
   - The product photo on a tile morphs into the product page gallery.
   - Category tiles morph into the category banner.
   - Add a directional slide for back and forward.
   - Follow `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`.
2. **Fly-to-cart:**
   - On Add to cart, a copy of the product thumbnail arcs to the header cart
     icon. The red badge pops with a spring, then the cart drawer opens.
   - Respect reduced motion: no flight, just the badge update.
3. **Hero entrance**, once per visit:
   - A light sweep passes across the headline.
   - The yellow "Backup kits from" sticker stamps in with a slight rotation
     and overshoot.
   - The two promo tiles slide up in sequence.
   - Keep it under 900 ms total.
4. **Interactive savings calculator** (new home section, also on
   `/advisor`):
   - Inputs: monthly electricity bill (slider), municipality or Eskom tariff
     band, and system size.
   - Output: an animated bar chart of monthly cost before and after, plus a
     payback-years figure.
   - Label it clearly as an estimate, with the assumptions listed.
   - Use the dataviz rules: one accent colour (`--sun`) plus graphite.
5. **Roof configurator** ("Build your system"):
   - Drag a slider for the number of panels and watch them tile onto a drawn
     roof.
   - Pick an inverter and battery from compatible stock.
   - The live total ticks up and down.
   - One button adds the bundle to the cart.
   - Reuse `matchSystem` and the compatibility engine.
6. **The 24-hour scroll story** (`src/components/home/solar-day.tsx`):
   - Add a small animated energy-flow diagram (panels → inverter → battery
     and house) whose line thickness follows the kW values.
   - Let people click "Load shedding at 18:00" to jump to that moment.
7. **Micro-interactions:**
   - Buttons press down 1 px.
   - Quantity steppers animate the number (slot-machine roll).
   - The installation toggle shows a small wrench rotating in.
   - Copy-SKU buttons show a "Copied" tick.
   - The wishlist heart bursts when it's added (if wishlist is built).
8. **Dark sections:** a subtle spotlight that follows the cursor on the
   graphite bands (How it works, footer). Desktop pointer only, very low
   intensity.
9. **Loading states:** skeletons shaped like the real tiles, with a shimmer
   that reduced motion turns off. Replace any spinner that covers content.

## 6. Visual polish

1. **Real logo:** ask the owner for the JC Solar logo. Until then keep the
   placeholder mark in `src/components/brand/logo.tsx`.
2. **Prices:**
   - Show whole rands without cents when the cents are zero, for example
     "R15,870" instead of "R15,870.00".
   - Keep cents in the cart, checkout, invoices and PDFs.
   - Update `formatRand` with an option rather than changing every call site.
3. **Empty, error and 404 states:**
   - Pages: empty cart, no search results, a custom 404 (`not-found.tsx`)
     and a friendly error boundary (`error.tsx`).
   - Each gets an illustration in the existing drawing style
     (`CategoryGlyph`) and one clear next step.
4. **Brand page per manufacturer** (`/brands/[brand]`):
   - Content: brand name in big type, a short factual blurb, the warranty
     summary, and all their products.
   - The brand marquee links there instead of to search.
5. **Payment and trust badges:**
   - Use real Visa, Mastercard, PayFast and Instant EFT marks (SVGs with
     permission or official brand assets).
   - Add a "Registered with SAPVIA" or similar badge **only** if it is true.
6. **Dark-mode review:** go page by page. Check contrast of muted text,
   borders on white tiles, and the yellow-on-graphite buttons.
7. **Footer:**
   - Add a short "About JC Solar" paragraph and the business address and
     contact details once the owner supplies them (`site.company` in
     `src/config/site.ts`).
   - Add a newsletter sign-up only if an email provider is set up (Resend
     audiences).

## 7. Trust and conversion

1. **Reviews:** keep them real.
   - After an order is delivered, email a review link.
   - Show the average rating only once a product has 3 or more approved
     reviews.
2. **WhatsApp button:** a floating "Chat on WhatsApp" button, shown only when
   `site.company.whatsapp` is set, with the product name pre-filled on
   product pages.
3. **Installations gallery:** a page of real JC Solar installs (photos from
   the owner) with system size, location (town only) and a short quote.
4. **Admin-editable promotions:**
   - A `promotions` table plus an admin screen to edit the announcement-bar
     text, the hero promo tiles and the ticker items, with start and end
     dates.
   - Seed it with the current hard-coded text.
5. **Scheduled sales:**
   - Add `sale_starts_at` and `sale_ends_at` to products.
   - The was-price only shows inside the window.
   - The admin pricing editor gets date pickers.
   - The ribbon disappears automatically when the sale ends; no cron is
     needed if the read checks the dates (mind `connection()` and caching).

## 8. Performance, SEO and accessibility

1. **Performance:**
   - Lighthouse mobile at least 90 on home, category and product pages.
   - Lazy-load the 24-hour story and the planner when they near the viewport.
   - Check that the hero image is the LCP and preloaded.
   - Keep client JS on the home page under about 200 KB gzipped.
2. **Structured data:**
   - `Product` JSON-LD with `offers`: price, `priceValidUntil` for sales,
     availability, and shipping details (ZA).
   - Plus `BreadcrumbList`, an `Organization` with logo, and a sitemap that
     includes brand pages.
3. **Accessibility pass:**
   - Keyboard through header, search, filters, cart drawer and checkout.
   - Visible focus everywhere.
   - Colour contrast AA.
   - Screen-reader labels on icon buttons.
   - The marquees' duplicate copies stay `inert`.
4. **Analytics:** privacy-friendly analytics and Core Web Vitals reporting,
   only after a POPIA cookie notice is in place. Ask the owner which tool.

## 9. How to work

- Do the sections in order: 1, 2, 5.1–5.3, 3, 4, then the rest.
  - After each numbered item: run the checks, take screenshots, commit with
    a clear message, push, and confirm the live deploy.
- When something needs the owner, do everything else first, then list
  exactly what you need. Examples: the logo, business details, WhatsApp
  number, real install photos, review emails, an analytics choice.
- Keep copy plain and specific, in sentence case. Buttons say what they do:
  "Add to cart", "Add all 3 to cart".
- When you finish, report:
  - what changed (with screenshots),
  - what you verified,
  - anything you skipped and why.

---

## Status (7 November 2026)

**Done.**
- Section 1, all of it.
- Section 2, all of it.
- Section 3, all of it.
- Section 4, all of it.
- Section 5, all of it except the wishlist heart (there is no wishlist).
- 6.2 to 6.4, 6.6, 7.2, 8.1 (lazy loading), 8.2 (sitemap and structured
  data).

**Waiting on the owner.**
- 6.1: the logo.
- 6.5: the official payment logos.
- 6.7: business details. The WhatsApp button appears once
  `site.company.whatsapp` is set.
- 7.1: an email provider for review requests.
- 7.3: real installation photos.
- 7.4 and 7.5: go-ahead to add the `promotions` table and the sale-date
  columns to the production database.
- 8.4: the analytics tool and a cookie notice.

**Not measured here.** Lighthouse scores (no Lighthouse in the build
environment) and a full screen-reader audit.
