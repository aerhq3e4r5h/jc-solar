-- Fulfilment: shipping (quotes, fallback rate table, shipments) and the
-- installation service (tiers, technicians, availability, bookings).

create type public.shipment_status as enum (
  'pending', 'booked', 'collected', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'
);
create type public.installation_status as enum (
  'requested', 'site_assessment', 'scheduled', 'in_progress', 'completed', 'cancelled'
);
create type public.property_type as enum ('house', 'townhouse', 'apartment', 'farm', 'business', 'other');
create type public.roof_type as enum ('ibr', 'corrugated', 'tile', 'clip_lock', 'flat_concrete', 'ground_mount', 'other');
create type public.supply_phase as enum ('single', 'three', 'unknown');

-- ---------------------------------------------------------------------------
-- Shipping
-- ---------------------------------------------------------------------------
-- Admin-editable fallback used when the courier API fails or has no service.
-- A row with postal_code_from/to set wins over a province-wide row.
create table public.shipping_rate_table (
  id uuid primary key default gen_random_uuid(),
  shipping_class public.shipping_class not null,
  province text not null,
  postal_code_from text check (postal_code_from ~ '^[0-9]{4}$'),
  postal_code_to text check (postal_code_to ~ '^[0-9]{4}$'),
  base_price_incl_vat numeric(12, 2) not null check (base_price_incl_vat >= 0),
  per_kg_incl_vat numeric(12, 2) not null default 0,
  per_item_incl_vat numeric(12, 2) not null default 0,
  eta_days_min int,
  eta_days_max int,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger shipping_rate_table_updated_at before update on public.shipping_rate_table
  for each row execute function public.set_updated_at();

-- Store-wide delivery settings (single row).
create table public.shipping_settings (
  id boolean primary key default true check (id),
  free_delivery_with_installation boolean not null default true,
  free_delivery_threshold_incl_vat numeric(12, 2),
  collection_enabled boolean not null default true,
  collection_address text,
  quote_after_order_when_unavailable boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.shipping_settings (id) values (true);

create table public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references public.carts (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  provider text not null,
  service_code text not null,
  service_name text not null,
  shipping_class public.shipping_class not null,
  price_incl_vat numeric(12, 2) not null check (price_incl_vat >= 0),
  eta_days_min int,
  eta_days_max int,
  is_fallback boolean not null default false,
  request_payload jsonb,
  response_payload jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (cart_id is not null or order_id is not null)
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null,
  service_code text,
  shipping_class public.shipping_class not null,
  status public.shipment_status not null default 'pending',
  waybill_number text,
  tracking_number text,
  tracking_url text,
  label_path text,
  cost_incl_vat numeric(12, 2),
  parcels jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  booked_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shipments_order_idx on public.shipments (order_id);
create unique index shipments_tracking_unique on public.shipments (provider, tracking_number)
  where tracking_number is not null;
create trigger shipments_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Installation
-- ---------------------------------------------------------------------------
create table public.installation_tiers (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (sku ~ '^SVC-[A-Z0-9-]+$'),
  name text not null,
  description text,
  inclusions text[] not null default '{}',
  -- null = price on site assessment
  price_incl_vat numeric(12, 2) check (price_incl_vat is null or price_incl_vat >= 0),
  requires_site_assessment boolean not null default false,
  is_maintenance boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Tiers are seeded without prices: prices are set by the business in admin.
insert into public.installation_tiers (sku, name, requires_site_assessment, is_maintenance, sort_order, is_active) values
  ('SVC-INSTALL-BASIC', 'Basic installation', false, false, 1, false),
  ('SVC-INSTALL-STD', 'Standard installation', false, false, 2, false),
  ('SVC-INSTALL-FULL', 'Full system installation', false, false, 3, false),
  ('SVC-INSTALL-ASSESS', 'Site assessment required', true, false, 4, false),
  ('SVC-MAINT-ANNUAL', 'Annual maintenance and panel cleaning', false, true, 5, false);

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  display_name text not null,
  registration_number text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.technician_availability (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.technicians (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index technician_availability_time_idx on public.technician_availability (starts_at);

create table public.installation_bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  tier_id uuid references public.installation_tiers (id),
  technician_id uuid references public.technicians (id),
  -- A slot can hold one booking only, so booked slots are unavailable.
  availability_id uuid unique references public.technician_availability (id) on delete set null,
  status public.installation_status not null default 'requested',
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null,
  address jsonb not null,
  property_type public.property_type,
  roof_type public.roof_type,
  supply_phase public.supply_phase not null default 'unknown',
  existing_system text,
  access_notes text,
  db_board_photo_paths text[] not null default '{}',
  roof_photo_paths text[] not null default '{}',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  coc_path text,
  completion_photo_paths text[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index installation_bookings_user_idx on public.installation_bookings (user_id);
create index installation_bookings_technician_idx on public.installation_bookings (technician_id, scheduled_start);
create trigger installation_bookings_updated_at before update on public.installation_bookings
  for each row execute function public.set_updated_at();
create trigger installation_bookings_audit after update or delete on public.installation_bookings
  for each row execute function public.audit_row_change();

-- The technician assigned to the caller's profile, if any.
create or replace function public.current_technician_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.technicians where profile_id = auth.uid() and is_active
$$;

-- Technicians may only move their own jobs forward and attach completion
-- documents; everything else on the booking is staff-only.
create or replace function public.limit_technician_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;
  if new.technician_id is distinct from old.technician_id
     or new.order_id is distinct from old.order_id
     or new.user_id is distinct from old.user_id
     or new.tier_id is distinct from old.tier_id
     or new.address is distinct from old.address
     or new.availability_id is distinct from old.availability_id then
    raise exception 'Technicians can only update status, notes and completion documents';
  end if;
  return new;
end;
$$;

create trigger installation_bookings_limit_technician before update on public.installation_bookings
  for each row execute function public.limit_technician_updates();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.shipping_rate_table enable row level security;
alter table public.shipping_settings enable row level security;
alter table public.shipping_quotes enable row level security;
alter table public.shipments enable row level security;
alter table public.installation_tiers enable row level security;
alter table public.technicians enable row level security;
alter table public.technician_availability enable row level security;
alter table public.installation_bookings enable row level security;

create policy "shipping_rate_table: staff read" on public.shipping_rate_table
  for select to authenticated using (public.is_staff());
create policy "shipping_rate_table: admin write" on public.shipping_rate_table
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shipping_settings: public read" on public.shipping_settings for select using (true);
create policy "shipping_settings: admin write" on public.shipping_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "shipping_quotes: staff read" on public.shipping_quotes
  for select to authenticated using (public.is_staff());

create policy "shipments: owner read" on public.shipments
  for select to authenticated using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "shipments: staff all" on public.shipments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "installation_tiers: public read active" on public.installation_tiers
  for select using (is_active);
create policy "installation_tiers: staff read all" on public.installation_tiers
  for select to authenticated using (public.is_staff());
create policy "installation_tiers: admin write" on public.installation_tiers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "technicians: admin write" on public.technicians
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "technicians: staff read" on public.technicians
  for select to authenticated using (public.is_staff() or profile_id = auth.uid());

-- Slots are public so the booking calendar can show free times; the
-- booking itself (who, where) is private.
create policy "technician_availability: public read" on public.technician_availability
  for select using (true);
create policy "technician_availability: admin write" on public.technician_availability
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "technician_availability: own write" on public.technician_availability
  for all to authenticated
  using (technician_id = public.current_technician_id())
  with check (technician_id = public.current_technician_id());

create policy "installation_bookings: owner read" on public.installation_bookings
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy "installation_bookings: owner insert" on public.installation_bookings
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'requested' and technician_id is null and coc_path is null);
create policy "installation_bookings: staff all" on public.installation_bookings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "installation_bookings: technician read own jobs" on public.installation_bookings
  for select to authenticated using (technician_id = public.current_technician_id());
create policy "installation_bookings: technician update own jobs" on public.installation_bookings
  for update to authenticated
  using (technician_id = public.current_technician_id())
  with check (technician_id = public.current_technician_id());

-- Public view of which slots are already taken (no customer details).
create or replace function public.booked_slot_ids(p_from timestamptz, p_to timestamptz)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.availability_id
  from public.installation_bookings b
  join public.technician_availability a on a.id = b.availability_id
  where a.starts_at < p_to and a.ends_at > p_from
    and b.status <> 'cancelled' and b.deleted_at is null
$$;

grant execute on function public.booked_slot_ids(timestamptz, timestamptz) to anon, authenticated;
