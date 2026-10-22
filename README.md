# JC Solar

Online shop for solar panels, lithium batteries, inverters and system kits, with optional installation by a registered technician. Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui and Supabase.

**Status: phase 2 of 9.** Done: project setup, design system, database and Excel import (phase 1); shop, product pages, filters, compatibility engine, compare and cart (phase 2). Checkout, courier, installation booking, AI advisor, accounts, admin dashboard and legal pages come in later phases.

## Phase 1 contents

| Area | Where |
|---|---|
| Design tokens (navy, solar amber, light and dark) | `src/app/globals.css` |
| Fonts, layout, header, footer, homepage | `src/app/layout.tsx`, `src/app/(site)/`, `src/components/` |
| Database schema, RLS, functions | `supabase/migrations/` |
| Database tests (RLS, stock, payments, invoices, import) | `supabase/tests/`, `scripts/test-db.sh` |
| Generated database types | `src/lib/supabase/database.types.ts` |
| Excel import: read, clean, classify, specs, validate, plan | `src/lib/catalogue/` |
| Import and export scripts | `scripts/import-catalogue.ts`, `scripts/export-catalogue.ts` |
| Admin import page and Excel export | `/admin/import`, `/admin/catalogue/export` |
| Sign-in (Google and email link) | `/login`, `src/app/auth/callback/` |
| Product data file | `data/products.xlsx`, seed generated to `supabase/seed.sql` |

## Phase 2 contents

| Area | Where |
|---|---|
| Shop overview, category pages with filters and sorting | `/shop`, `/shop/[category]`, `src/lib/catalogue/filters.ts` |
| Product pages (specs, stock, installation add-on, compatible products, reviews, JSON-LD) | `/shop/[category]/[slug]` |
| Cached catalogue queries (refreshed on import) | `src/lib/catalogue/queries.ts` |
| Compatibility engine (battery/inverter voltage, grid-tie, panel strings, cart checks) | `src/lib/compatibility/engine.ts` |
| Cart (cookie with IDs and quantities only; prices and stock always read live) | `/cart`, `src/lib/cart/` |
| Compare up to 3 products | `/compare`, `src/components/compare/` |

### Compatibility rules

- A battery and inverter are **likely compatible** when their battery voltages match (12, 24 or 48 V; a "60 V" inverter input is the top of the 48 V range). Battery communication (CAN/RS485) is confirmed by staff before dispatch.
- **Not compatible:** different voltages, or any battery with a grid-tie inverter.
- **Check with us:** high-voltage systems (need a matched battery management unit) and products whose battery voltage is not on file.
- Pairs an admin confirms or rules out in `product_compatibility` override the rules.
- Panel strings: cold-morning Voc is taken as Voc x 1.09 (-5 °C, -0.30 %/°C), and a string must stay under the inverter's maximum PV voltage.

## Setup

Requirements: Node 22+, a Supabase project (or the Supabase CLI with Docker for local development).

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
```

### Database

Hosted Supabase:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push                       # applies supabase/migrations
npm run catalogue:import -- data/products.xlsx --apply
```

Local Supabase (needs Docker):

```bash
npx supabase start          # applies migrations and supabase/seed.sql
npm run db:types            # regenerate src/lib/supabase/database.types.ts
```

Then enable these in the Supabase dashboard:

- **Auth > Providers > Google**: add the Google OAuth client ID and secret, and add `https://<your-site>/auth/callback` to the redirect URLs.
- **Database > Extensions > pg_cron**: lets unpaid orders release their reserved stock every 5 minutes. Re-run the last block of `20261022000003_commerce.sql` after enabling it.
- **Backups**: daily backups are included on the Pro plan; turn on point-in-time recovery if you need it.

### Make yourself an admin

Sign in once at `/login`, then run this in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

### Run

```bash
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Products: import, update and export

The spreadsheet is the source of truth for products, SKUs, prices and stock.

- **Preview an import:** `npm run catalogue:import -- data/products.xlsx`. With Supabase keys set it also shows how many products are new, changed or unchanged.
- **Save it:** add `--apply`, or upload the file at `/admin/import`, check the preview and confirm.
- **Update prices or stock:** edit the spreadsheet and import it again. Products are matched on SKU (ignoring case), so existing products are updated, never duplicated. The whole import runs in one transaction: if any row fails, nothing is saved.
- **Data you add by hand is kept.** An import only changes name, brand, category, price, stock and backorder, plus specs it reads from the product name. Descriptions, images, weights, dimensions, warranty, extra specs and shipping class entered in the admin are never overwritten.
- **Export:** `npm run catalogue:export -- out.xlsx`, or "Export to Excel" in the admin. It uses the same column layout as the import.
- **Report:** every run prints rows read, valid, skipped (with reasons), invalid and warnings. `--report report.json` saves the full list; `import_logs` keeps a record of each saved import.

### How the spreadsheet is read

| Column | Used as |
|---|---|
| SKU | SKU, kept exactly as written; must be unique |
| Product | Product name; specs are read from it |
| Brand | Brand, standardised (e.g. `INGE` → Inge, `Dyness (LTL)` → Dyness); blank or "Web Special" is taken from the name |
| All categories + name | Category: Solar panels, Batteries, Inverters or Kits; anything else is skipped |
| Price incl. 15% VAT (R) | Selling price shown on the site |
| Price excl. VAT (R) | Cross-check only; used if the incl. price is blank |
| Stock note | Stock: "N in stock" → N, "Out Of Stock" → 0, "Available on backorder" → 0 with backorder on |

Rows are rejected (not imported) for a missing SKU, a duplicate SKU or a price of R0.00. Missing SKUs are never generated without approval.

Fields the spreadsheet does not have (description, images, weight, dimensions, warranty, datasheet, and specs that are not in the name) are left blank and listed in each product's `incomplete_fields`, shown as "incomplete" in the admin. Nothing is made up.

Shipping classes are set on import: panels are `oversized`, lithium batteries and kits with batteries are `dangerous_goods` (UN3480, Class 9), everything else is `standard`.

## Tests

```bash
npm test               # unit tests: cleaning, classification, specs, VAT, import plan, Excel round trip
npm run typecheck
npm run lint
scripts/test-db.sh     # applies all migrations to a throwaway Postgres and runs the database tests
```

`scripts/test-db.sh` needs Postgres 15+ server binaries (`initdb`, `pg_ctl`) and must run as a non-root user. It checks, among other things, that customers cannot see each other's orders, cannot change prices or their own role, cannot mark orders paid, that stock is only taken on verified payment, that invoice numbers are sequential and cannot be deleted or changed, and that re-imports update instead of duplicating.

## Security model

- Row Level Security is on for every table. Customers see only their own data; only admins write products and prices; cost prices are in a separate admin-only table.
- Orders, payments and invoices are written only by server code with the service role. An order becomes paid only through `confirm_order_paid()`, which requires a verified, signature-checked payment for the exact order total and is idempotent.
- Stock is reserved at checkout (`reserve_order_stock`) and taken only on confirmed payment; `release_expired_reservations` frees it after the timeout.
- Invoice numbers come from a single locked counter inside the payment transaction, so they are sequential, gap-free and never reused.
- Changes to products, orders, refunds, profiles, bookings and data requests are written to `audit_log`.
- The service role key and every other secret are read only in server code; see `.env.example`.

## Environment variables

See `.env.example` for the full list. Only `NEXT_PUBLIC_*` values reach the browser.

## Compliance checklist

Status of each item. Legal text on the site is a starting point, not legal advice; items marked ⚖️ need confirming with a lawyer.

| Requirement | Status |
|---|---|
| ECT Act s43 disclosures (company name, registration, address, VAT number, directors) | Footer and `/legal` page planned for phase 9; fields are in `src/config/site.ts`, blank until supplied |
| ECT Act: order review before payment, accepted terms version and timestamp | Schema ready: `orders.terms_version`, `orders.terms_accepted_at` (phase 3) |
| ECT Act s44: 7-day cooling-off ⚖️ (treatment of installed work) | Schema ready: `return_requests.within_cooling_off` (phase 7) |
| CPA: prices include VAT, no hidden charges | All prices stored and shown incl. VAT |
| CPA s56: 6-month implied warranty | Schema ready: `warranty_claims.within_cpa_six_months` (phase 7) |
| POPIA: consent records, marketing opt-in unticked by default | `consent_records` (append-only); `profiles.marketing_*_opt_in` default false |
| POPIA: access, export, correction, deletion requests | `data_requests` table (phase 7 UI) |
| POPIA: audit log of admin access to personal data | `audit_log` + triggers |
| POPIA: Information Officer named in privacy policy ⚖️ | Phase 9 |
| PAIA manual | Placeholder page in phase 9 |
| VAT Act tax invoices | `invoices` table with sequential numbers; PDF in phase 3 |
| NRS 097-2-1 grid-tie approval | `products.nrs_097_2_1_approved` (blank = not verified; flagged incomplete for inverters) |
| SANS 10142-1 CoC for installations | `installation_bookings.coc_path`, `coc-documents` storage bucket |
| Lithium batteries as dangerous goods | Forced by trigger on `products.is_dangerous_goods` |
