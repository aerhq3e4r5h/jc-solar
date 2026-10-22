-- Commerce: carts, wishlists, coupons, orders, stock reservations, payments,
-- refunds and invoices.
--
-- Orders, payments and invoices are written only by server code (service
-- role). Customers can read their own orders; they can never mark anything
-- paid. An order becomes paid only through confirm_order_paid(), which the
-- payment webhook calls after verifying the gateway's signature.

create type public.order_status as enum (
  'pending_payment', 'paid', 'processing', 'ready_for_collection', 'shipped',
  'delivered', 'completed', 'cancelled', 'expired', 'refunded', 'partially_refunded'
);
create type public.payment_status as enum ('pending', 'verified', 'failed', 'cancelled');
create type public.refund_status as enum ('requested', 'approved', 'processed', 'rejected');
create type public.reservation_status as enum ('active', 'consumed', 'released');
create type public.coupon_type as enum ('percent', 'fixed');
create type public.delivery_method as enum ('courier', 'own_delivery', 'collection', 'installer_delivery');

-- ---------------------------------------------------------------------------
-- Carts. Guest carts have no user_id and are reached only by server code
-- through a hashed cookie token.
-- ---------------------------------------------------------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  guest_token_hash text unique,
  coupon_code text,
  email_for_recovery text,
  recovery_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_token_hash is not null)
);

create index carts_user_idx on public.carts (user_id);
create trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity int not null check (quantity > 0 and quantity <= 500),
  with_installation boolean not null default false,
  added_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Coupons (validated server-side; never listable by customers)
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique,
  type public.coupon_type not null,
  value numeric(12, 2) not null check (value > 0),
  min_order_incl_vat numeric(12, 2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  uses int not null default 0,
  is_referral boolean not null default false,
  referrer_id uuid references auth.users (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (type <> 'percent' or value <= 100)
);

-- ---------------------------------------------------------------------------
-- Orders. Every price, SKU and name is snapshotted at purchase time.
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start 100001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('JC-' || nextval('public.order_number_seq')),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  phone text,
  status public.order_status not null default 'pending_payment',
  currency char(3) not null default 'ZAR',
  vat_rate numeric(5, 4) not null default 0.15,
  subtotal_incl_vat numeric(12, 2) not null check (subtotal_incl_vat >= 0),
  discount_incl_vat numeric(12, 2) not null default 0 check (discount_incl_vat >= 0),
  shipping_incl_vat numeric(12, 2) not null default 0 check (shipping_incl_vat >= 0),
  installation_incl_vat numeric(12, 2) not null default 0 check (installation_incl_vat >= 0),
  total_incl_vat numeric(12, 2) not null check (total_incl_vat >= 0),
  vat_amount numeric(12, 2) not null check (vat_amount >= 0),
  coupon_code text,
  delivery_method public.delivery_method not null default 'courier',
  shipping_address jsonb,
  billing_address jsonb,
  customer_notes text,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  marketing_opt_in boolean not null default false,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (total_incl_vat = subtotal_incl_vat - discount_incl_vat + shipping_incl_vat + installation_incl_vat)
);

create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger orders_audit after update or delete on public.orders
  for each row execute function public.audit_row_change();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  sku text not null,
  name text not null,
  unit_price_incl_vat numeric(12, 2) not null check (unit_price_incl_vat >= 0),
  quantity int not null check (quantity > 0),
  vat_rate numeric(5, 4) not null default 0.15,
  line_total_incl_vat numeric(12, 2) not null,
  line_vat_amount numeric(12, 2) not null,
  shipping_class public.shipping_class,
  is_service boolean not null default false,
  check (line_total_incl_vat = unit_price_incl_vat * quantity)
);

create index order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Stock reservations: held at checkout, consumed on verified payment,
-- released on timeout.
-- ---------------------------------------------------------------------------
create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity int not null check (quantity > 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index stock_reservations_active_idx on public.stock_reservations (product_id)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- Payments and refunds
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  method text,
  amount numeric(12, 2) not null check (amount >= 0),
  status public.payment_status not null default 'pending',
  signature_valid boolean,
  raw_payload jsonb,
  received_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (provider, provider_payment_id)
);

create index payments_order_idx on public.payments (order_id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null,
  status public.refund_status not null default 'requested',
  provider_refund_id text,
  requested_by uuid references auth.users (id),
  processed_by uuid references auth.users (id),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create trigger refunds_audit after insert or update on public.refunds
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Invoices: sequential, gap-free, never reused. A single locked counter row
-- hands out numbers inside the payment transaction, so a rolled-back payment
-- never consumes a number.
-- ---------------------------------------------------------------------------
create table public.invoice_counter (
  id boolean primary key default true check (id),
  last_number bigint not null default 0
);
insert into public.invoice_counter (id, last_number) values (true, 0);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  invoice_number bigint not null unique,
  invoice_code text generated always as ('INV-' || lpad(invoice_number::text, 6, '0')) stored,
  issued_at timestamptz not null default now(),
  pdf_path text,
  supplier_snapshot jsonb not null default '{}'::jsonb,
  customer_snapshot jsonb not null default '{}'::jsonb
);

create or replace function public.prevent_invoice_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Invoices cannot be deleted';
  end if;
  if new.invoice_number <> old.invoice_number or new.order_id <> old.order_id then
    raise exception 'Invoice numbers cannot be changed';
  end if;
  return new;
end;
$$;

create trigger invoices_immutable before update or delete on public.invoices
  for each row execute function public.prevent_invoice_changes();

-- ---------------------------------------------------------------------------
-- Stock functions (server/service role only)
-- ---------------------------------------------------------------------------

-- Public-safe available stock: on hand minus active, unexpired reservations.
create or replace function public.available_stock(p_product_ids uuid[])
returns table (product_id uuid, available int, allow_backorder boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         greatest(p.stock_qty - coalesce(sum(r.quantity) filter (
           where r.status = 'active' and r.expires_at > now()), 0), 0)::int,
         p.allow_backorder
  from public.products p
  left join public.stock_reservations r on r.product_id = p.id
  where p.id = any (p_product_ids) and p.is_active and p.deleted_at is null
  group by p.id
$$;

-- Reserve stock for every physical item on a pending order.
create or replace function public.reserve_order_stock(p_order_id uuid, p_minutes int default 30)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  v_available int;
begin
  for item in
    select oi.product_id, sum(oi.quantity)::int as qty, p.sku, p.stock_qty, p.allow_backorder
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id and not oi.is_service
    group by oi.product_id, p.sku, p.stock_qty, p.allow_backorder
    order by oi.product_id  -- consistent lock order avoids deadlocks
  loop
    perform 1 from public.products where id = item.product_id for update;

    select greatest(p.stock_qty - coalesce(sum(r.quantity), 0), 0)::int
      into v_available
    from public.products p
    left join public.stock_reservations r
      on r.product_id = p.id and r.status = 'active' and r.expires_at > now()
         and r.order_id <> p_order_id
    where p.id = item.product_id
    group by p.id;

    if v_available < item.qty and not item.allow_backorder then
      raise exception 'insufficient_stock:%', item.sku using errcode = 'P0001';
    end if;

    insert into public.stock_reservations (order_id, product_id, quantity, expires_at)
    values (p_order_id, item.product_id, item.qty, now() + make_interval(mins => p_minutes))
    on conflict (order_id, product_id)
      do update set quantity = excluded.quantity, expires_at = excluded.expires_at, status = 'active';
  end loop;
end;
$$;

-- Called by the payment webhook after server-side verification. Idempotent:
-- a repeated notification for an already-paid order does nothing.
create or replace function public.confirm_order_paid(p_order_id uuid, p_payment_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_invoice bigint;
  res record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status <> 'pending_payment' and v_order.status <> 'expired' then
    select invoice_number into v_invoice from public.invoices where order_id = p_order_id;
    return v_invoice;
  end if;

  select * into v_payment from public.payments where id = p_payment_id and order_id = p_order_id for update;
  if not found or v_payment.status <> 'verified' or v_payment.signature_valid is not true then
    raise exception 'payment_not_verified';
  end if;
  if v_payment.amount <> v_order.total_incl_vat then
    raise exception 'payment_amount_mismatch';
  end if;

  for res in
    select * from public.stock_reservations
    where order_id = p_order_id and status in ('active', 'released')
    order by product_id
  loop
    -- A late payment on an expired order may find the stock already sold.
    -- The customer has paid, so never fail here: flag it for staff instead.
    if exists (select 1 from public.products where id = res.product_id and stock_qty < res.quantity) then
      insert into public.audit_log (action, table_name, record_id, details)
      values ('oversold', 'orders', p_order_id::text,
              jsonb_build_object('product_id', res.product_id, 'quantity', res.quantity));
    end if;
    update public.products
      set stock_qty = greatest(stock_qty - res.quantity, 0)
      where id = res.product_id;
    insert into public.inventory_movements (product_id, delta, reason, reference)
      values (res.product_id, -res.quantity, 'order_paid', v_order.order_number);
    update public.stock_reservations set status = 'consumed' where id = res.id;
  end loop;

  update public.invoice_counter set last_number = last_number + 1
    where id returning last_number into v_invoice;
  insert into public.invoices (order_id, invoice_number) values (p_order_id, v_invoice);

  update public.orders set status = 'paid', paid_at = now() where id = p_order_id;

  if v_order.coupon_code is not null then
    update public.coupons set uses = uses + 1 where code = v_order.coupon_code;
  end if;

  return v_invoice;
end;
$$;

-- Release reservations that timed out and expire their unpaid orders.
create or replace function public.release_expired_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with released as (
    update public.stock_reservations
      set status = 'released'
      where status = 'active' and expires_at <= now()
      returning order_id
  )
  update public.orders o
    set status = 'expired'
    where o.status = 'pending_payment' and o.id in (select order_id from released);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.reserve_order_stock(uuid, int) from public, anon, authenticated;
revoke execute on function public.confirm_order_paid(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
grant execute on function public.reserve_order_stock(uuid, int) to service_role;
grant execute on function public.confirm_order_paid(uuid, uuid) to service_role;
grant execute on function public.release_expired_reservations() to service_role;
grant execute on function public.available_stock(uuid[]) to anon, authenticated, service_role;

-- Run the release job every 5 minutes when pg_cron is available (it is on
-- hosted Supabase once enabled under Database > Extensions).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('release-expired-reservations', '*/5 * * * *',
      'select public.release_expired_reservations()');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.invoice_counter enable row level security;
alter table public.invoices enable row level security;

create policy "carts: owner all" on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items: owner all" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "carts: staff read" on public.carts
  for select to authenticated using (public.is_staff());
create policy "cart_items: staff read" on public.cart_items
  for select to authenticated using (public.is_staff());

create policy "wishlists: owner all" on public.wishlists
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "coupons: admin all" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "coupons: sales read" on public.coupons
  for select to authenticated using (public.is_staff());

create policy "orders: owner read" on public.orders
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy "orders: staff read" on public.orders
  for select to authenticated using (public.is_staff());
create policy "orders: staff update" on public.orders
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "order_items: owner read" on public.order_items
  for select to authenticated using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid() and o.deleted_at is null));
create policy "order_items: staff read" on public.order_items
  for select to authenticated using (public.is_staff());

create policy "stock_reservations: staff read" on public.stock_reservations
  for select to authenticated using (public.is_staff());

create policy "payments: staff read" on public.payments
  for select to authenticated using (public.is_staff());

create policy "refunds: owner read" on public.refunds
  for select to authenticated using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "refunds: staff read" on public.refunds
  for select to authenticated using (public.is_staff());
create policy "refunds: admin write" on public.refunds
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "invoices: owner read" on public.invoices
  for select to authenticated using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "invoices: staff read" on public.invoices
  for select to authenticated using (public.is_staff());
-- invoice_counter: no policies at all, so only the service role and the
-- security-definer payment function can touch it.
