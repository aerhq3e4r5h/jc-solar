-- Catalogue: categories, brands, products, specs, images, compatibility, kits.
-- Anyone may read active catalogue rows; only admins write them.

create type public.shipping_class as enum ('standard', 'oversized', 'dangerous_goods');
create type public.compatibility_status as enum ('proposed', 'confirmed', 'incompatible');
create type public.inventory_reason as enum (
  'import', 'manual_adjustment', 'order_paid', 'order_cancelled', 'return', 'stocktake'
);

-- ---------------------------------------------------------------------------
-- Categories and brands
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  sku_prefix text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, name, sku_prefix, sort_order) values
  ('solar-panels', 'Solar Panels', 'PNL', 1),
  ('batteries', 'Batteries', 'BAT', 2),
  ('inverters', 'Inverters', 'INV', 3),
  ('kits', 'System Kits', 'KIT', 4);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique,
  sku_code text,
  logo_path text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand_id uuid references public.brands (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  short_description text,
  description text,
  price_incl_vat numeric(12, 2) not null check (price_incl_vat >= 0),
  compare_at_price_incl_vat numeric(12, 2) check (compare_at_price_incl_vat is null or compare_at_price_incl_vat >= 0),
  stock_qty int not null default 0 check (stock_qty >= 0),
  allow_backorder boolean not null default false,
  low_stock_threshold int not null default 2,
  warranty_months int check (warranty_months is null or warranty_months >= 0),
  performance_warranty_years int,
  datasheet_path text,
  weight_kg numeric(8, 2) check (weight_kg is null or weight_kg > 0),
  length_mm int check (length_mm is null or length_mm > 0),
  width_mm int check (width_mm is null or width_mm > 0),
  height_mm int check (height_mm is null or height_mm > 0),
  shipping_class public.shipping_class not null default 'standard',
  is_dangerous_goods boolean not null default false,
  installation_eligible boolean not null default true,
  -- NRS 097-2-1 grid-tie approval. null = not yet verified.
  nrs_097_2_1_approved boolean,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  -- Fields the import could not fill. Shown as "incomplete" in admin.
  incomplete_fields text[] not null default '{}',
  source_import_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- SKUs are kept exactly as supplied but must be unique regardless of case.
create unique index products_sku_unique on public.products (lower(sku));
create index products_category_idx on public.products (category_id) where deleted_at is null and is_active;
create index products_brand_idx on public.products (brand_id);
create index products_price_idx on public.products (price_incl_vat);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.audit_row_change();

-- Lithium batteries always travel as dangerous goods.
create or replace function public.enforce_dangerous_goods()
returns trigger
language plpgsql
as $$
begin
  if new.is_dangerous_goods then
    new.shipping_class := 'dangerous_goods';
  end if;
  return new;
end;
$$;

create trigger products_dangerous_goods before insert or update on public.products
  for each row execute function public.enforce_dangerous_goods();

-- Cost prices live in their own table so customers can never read them.
create table public.product_costs (
  product_id uuid primary key references public.products (id) on delete cascade,
  cost_price_excl_vat numeric(12, 2) not null check (cost_price_excl_vat >= 0),
  supplier text,
  updated_at timestamptz not null default now()
);

create trigger product_costs_updated_at before update on public.product_costs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Specs, images
-- ---------------------------------------------------------------------------
-- One row per spec. value_num holds the number in the canonical unit so the
-- shop can filter (e.g. panels >= 550 W); value_text holds the display value.
create table public.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  label text not null,
  value_text text not null,
  value_num numeric,
  unit text,
  sort_order int not null default 0,
  unique (product_id, key)
);

create index product_specs_filter_idx on public.product_specs (key, value_num);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Compatibility (battery <-> inverter)
-- ---------------------------------------------------------------------------
create table public.product_compatibility (
  id uuid primary key default gen_random_uuid(),
  inverter_id uuid not null references public.products (id) on delete cascade,
  battery_id uuid not null references public.products (id) on delete cascade,
  status public.compatibility_status not null default 'proposed',
  protocol text,
  reason text,
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (inverter_id, battery_id),
  check (inverter_id <> battery_id)
);

-- ---------------------------------------------------------------------------
-- Kits (bundles). A kit is also a product (category 'kits') so it can be
-- listed, priced and carted like anything else.
-- ---------------------------------------------------------------------------
create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  size_kw numeric(6, 2),
  battery_kwh numeric(7, 2),
  config text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  product_id uuid references public.products (id) on delete restrict,
  -- Kits imported from the spreadsheet name their parts in text only.
  description text,
  quantity int not null default 1 check (quantity > 0),
  check (product_id is not null or description is not null)
);

-- ---------------------------------------------------------------------------
-- Inventory movements and stock reservations
-- ---------------------------------------------------------------------------
create table public.inventory_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  delta int not null,
  reason public.inventory_reason not null,
  reference text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Import logs
-- ---------------------------------------------------------------------------
create table public.import_logs (
  id bigint generated always as identity primary key,
  file_name text not null,
  file_sha256 text,
  run_by uuid references auth.users (id),
  dry_run boolean not null default true,
  rows_total int not null default 0,
  rows_inserted int not null default 0,
  rows_updated int not null default 0,
  rows_skipped int not null default 0,
  rows_invalid int not null default 0,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.products
  add constraint products_source_import_fk foreign key (source_import_id)
  references public.import_logs (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.product_specs enable row level security;
alter table public.product_images enable row level security;
alter table public.product_compatibility enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.import_logs enable row level security;

-- Public catalogue reads
create policy "categories: public read" on public.categories for select using (true);
create policy "brands: public read" on public.brands for select using (true);
create policy "products: public read active" on public.products
  for select using (is_active and deleted_at is null);
create policy "product_specs: public read" on public.product_specs
  for select using (exists (
    select 1 from public.products p where p.id = product_id and p.is_active and p.deleted_at is null));
create policy "product_images: public read" on public.product_images
  for select using (exists (
    select 1 from public.products p where p.id = product_id and p.is_active and p.deleted_at is null));
create policy "product_compatibility: public read confirmed" on public.product_compatibility
  for select using (status <> 'proposed');
create policy "bundles: public read approved" on public.bundles for select using (is_approved);
create policy "bundle_items: public read" on public.bundle_items
  for select using (exists (select 1 from public.bundles b where b.id = bundle_id and b.is_approved));

-- Staff can see everything in the catalogue, including inactive rows and costs.
create policy "products: staff read all" on public.products
  for select to authenticated using (public.is_staff());
create policy "product_compatibility: staff read all" on public.product_compatibility
  for select to authenticated using (public.is_staff());
create policy "bundles: staff read all" on public.bundles
  for select to authenticated using (public.is_staff());
create policy "bundle_items: staff read all" on public.bundle_items
  for select to authenticated using (public.is_staff());
create policy "inventory_movements: staff read" on public.inventory_movements
  for select to authenticated using (public.is_staff());
create policy "import_logs: staff read" on public.import_logs
  for select to authenticated using (public.is_staff());
create policy "product_costs: admin read" on public.product_costs
  for select to authenticated using (public.is_admin());

-- Only admins write products and prices.
create policy "categories: admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "brands: admin write" on public.brands
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products: admin write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_costs: admin write" on public.product_costs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_specs: admin write" on public.product_specs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_images: admin write" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_compatibility: admin write" on public.product_compatibility
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "bundles: admin write" on public.bundles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "bundle_items: admin write" on public.bundle_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "inventory_movements: admin insert" on public.inventory_movements
  for insert to authenticated with check (public.is_admin());
