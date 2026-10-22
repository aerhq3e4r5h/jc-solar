-- Checkout: order creation, quotations, PayFast notifications and
-- cancelling unpaid orders. All functions here are for server code only
-- (service role): customers never call them directly.
--
-- Prices always come from the products table at the moment of ordering.
-- The cart only supplies product IDs and quantities, so nothing the
-- browser sends can change what a customer pays.

create type public.payment_method as enum ('payfast', 'eft');

alter table public.orders
  add column customer_name text,
  add column payment_method public.payment_method not null default 'payfast',
  add column installation_requested boolean not null default false,
  -- Delivery cost not yet known: we confirm it before dispatch.
  add column delivery_pending boolean not null default true,
  -- sha256 of the secret in the guest's order link / cookie.
  add column access_token_hash text;

-- ---------------------------------------------------------------------------
-- Quotations (PDF quotes customers download, e.g. to pay by EFT)
-- ---------------------------------------------------------------------------
create sequence public.quote_number_seq start 1;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number bigint not null unique default nextval('public.quote_number_seq'),
  quote_code text generated always as ('Q-' || lpad(quote_number::text, 6, '0')) stored,
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null,
  email text not null,
  phone text,
  company text,
  items jsonb not null,
  subtotal_incl_vat numeric(12, 2) not null,
  vat_amount numeric(12, 2) not null,
  total_incl_vat numeric(12, 2) not null,
  installation_requested boolean not null default false,
  marketing_opt_in boolean not null default false,
  valid_until date not null,
  access_token_hash text not null,
  converted_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create index quotes_email_idx on public.quotes (lower(email), created_at desc);

alter table public.quotes enable row level security;
create policy "quotes: owner read" on public.quotes
  for select to authenticated using (user_id = auth.uid());
create policy "quotes: staff read" on public.quotes
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Shared: price a list of {productId, quantity, installation} from the
-- products table. Raises if a product is missing, inactive or not for sale.
-- ---------------------------------------------------------------------------
create or replace function public.price_items(p_items jsonb)
returns table (
  product_id uuid, sku text, name text, unit_price numeric, quantity int,
  line_total numeric, line_vat numeric, installation boolean, shipping_class public.shipping_class
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count int := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
begin
  if v_count = 0 then
    raise exception 'empty_cart' using errcode = 'P0001';
  end if;
  if v_count > 40 then
    raise exception 'too_many_items' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i
             where coalesce((i ->> 'quantity')::int, 0) not between 1 and 500) then
    raise exception 'invalid_quantity' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i
             left join public.products p
               on p.id = (i ->> 'productId')::uuid and p.is_active and p.deleted_at is null
             where p.id is null) then
    raise exception 'product_unavailable' using errcode = 'P0001';
  end if;

  return query
  with wanted as (
    select (i ->> 'productId')::uuid as pid,
           sum((i ->> 'quantity')::int)::int as qty,
           bool_or(coalesce((i ->> 'installation')::boolean, false)) as install
    from jsonb_array_elements(p_items) i
    group by 1
  )
  select p.id, p.sku, p.name, p.price_incl_vat, w.qty,
         p.price_incl_vat * w.qty,
         round(p.price_incl_vat * w.qty * 0.15 / 1.15, 2),
         w.install and p.installation_eligible,
         p.shipping_class
  from wanted w
  join public.products p on p.id = w.pid and p.is_active and p.deleted_at is null
  order by p.name;

end;
$$;

-- ---------------------------------------------------------------------------
-- Create an order from the cart and reserve its stock, in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.create_checkout_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric;
  v_install boolean;
  v_method public.payment_method := coalesce(p ->> 'paymentMethod', 'payfast')::public.payment_method;
begin
  if coalesce(p ->> 'termsVersion', '') = '' then
    raise exception 'terms_not_accepted' using errcode = 'P0001';
  end if;

  drop table if exists _lines;
  create temporary table _lines on commit drop as
    select * from public.price_items(p -> 'items');

  select sum(line_total), bool_or(installation) into v_subtotal, v_install from _lines;

  insert into public.orders (
    user_id, email, phone, customer_name, status, subtotal_incl_vat, total_incl_vat, vat_amount,
    delivery_method, shipping_address, billing_address, customer_notes, terms_version, terms_accepted_at,
    marketing_opt_in, payment_method, installation_requested, delivery_pending, access_token_hash)
  values (
    nullif(p ->> 'userId', '')::uuid,
    p ->> 'email',
    p ->> 'phone',
    p ->> 'customerName',
    'pending_payment',
    v_subtotal,
    v_subtotal,
    round(v_subtotal * 0.15 / 1.15, 2),
    coalesce(p ->> 'deliveryMethod', 'courier')::public.delivery_method,
    p -> 'shippingAddress',
    coalesce(p -> 'billingAddress', p -> 'shippingAddress'),
    nullif(p ->> 'notes', ''),
    p ->> 'termsVersion',
    now(),
    coalesce((p ->> 'marketingOptIn')::boolean, false),
    v_method,
    v_install,
    true,
    p ->> 'accessTokenHash')
  returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, sku, name, unit_price_incl_vat, quantity,
                                  line_total_incl_vat, line_vat_amount, shipping_class)
  select v_order_id, product_id, sku, name, unit_price, quantity, line_total, line_vat, shipping_class
  from _lines;

  -- PayFast payments complete within minutes; EFT needs time to clear.
  perform public.reserve_order_stock(v_order_id, case when v_method = 'eft' then 60 * 48 else 30 end);

  if p ? 'quoteId' then
    update public.quotes set converted_order_id = v_order_id where id = (p ->> 'quoteId')::uuid;
  end if;

  return jsonb_build_object('orderId', v_order_id, 'orderNumber', v_order_number, 'total', v_subtotal);
end;
$$;

-- ---------------------------------------------------------------------------
-- Create a quotation with prices from the products table.
-- ---------------------------------------------------------------------------
create or replace function public.create_quote(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
  v_subtotal numeric;
  v_install boolean;
  v_id uuid;
  v_code text;
begin
  select jsonb_agg(jsonb_build_object(
           'productId', product_id, 'sku', sku, 'name', name, 'unitPrice', unit_price,
           'quantity', quantity, 'lineTotal', line_total, 'lineVat', line_vat, 'installation', installation)
           order by name),
         sum(line_total), bool_or(installation)
    into v_items, v_subtotal, v_install
  from public.price_items(p -> 'items');

  insert into public.quotes (user_id, customer_name, email, phone, company, items, subtotal_incl_vat,
                             vat_amount, total_incl_vat, installation_requested, marketing_opt_in,
                             valid_until, access_token_hash)
  values (nullif(p ->> 'userId', '')::uuid, p ->> 'customerName', p ->> 'email', nullif(p ->> 'phone', ''),
          nullif(p ->> 'company', ''), v_items, v_subtotal, round(v_subtotal * 0.15 / 1.15, 2), v_subtotal,
          v_install, coalesce((p ->> 'marketingOptIn')::boolean, false),
          current_date + coalesce((p ->> 'validDays')::int, 7), p ->> 'accessTokenHash')
  returning id, quote_code into v_id, v_code;

  return jsonb_build_object('quoteId', v_id, 'quoteCode', v_code, 'total', v_subtotal);
end;
$$;

-- ---------------------------------------------------------------------------
-- Record a PayFast notification (ITN) that server code has already verified
-- (signature, source address and PayFast's own confirmation). A COMPLETE
-- payment for the exact order total marks the order paid; anything else is
-- recorded and flagged for staff.
-- ---------------------------------------------------------------------------
create or replace function public.apply_payfast_itn(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := (p ->> 'orderId')::uuid;
  v_status text := upper(coalesce(p ->> 'paymentStatus', ''));
  v_payment_id uuid;
  v_invoice bigint;
begin
  perform 1 from public.orders where id = v_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  insert into public.payments (order_id, provider, provider_payment_id, method, amount, status,
                               signature_valid, raw_payload, verified_at)
  values (v_order_id, 'payfast', p ->> 'pfPaymentId', p ->> 'method', (p ->> 'amountGross')::numeric,
          case v_status when 'COMPLETE' then 'verified' when 'CANCELLED' then 'cancelled' else 'failed' end::public.payment_status,
          true, p -> 'raw', case when v_status = 'COMPLETE' then now() end)
  on conflict (provider, provider_payment_id) do update
    set status = excluded.status, raw_payload = excluded.raw_payload,
        verified_at = coalesce(public.payments.verified_at, excluded.verified_at)
  returning id into v_payment_id;

  if v_status <> 'COMPLETE' then
    return jsonb_build_object('result', 'recorded', 'status', v_status);
  end if;

  begin
    v_invoice := public.confirm_order_paid(v_order_id, v_payment_id);
  exception when others then
    -- Keep the payment record; staff resolve it (e.g. amount mismatch).
    insert into public.audit_log (action, table_name, record_id, details)
    values ('payment_problem', 'orders', v_order_id::text,
            jsonb_build_object('error', sqlerrm, 'payment_id', v_payment_id));
    return jsonb_build_object('result', 'problem', 'error', sqlerrm);
  end;

  return jsonb_build_object('result', 'paid', 'invoiceNumber', v_invoice);
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancel an unpaid order (customer chose to change it) and free its stock.
-- Returns the items so the cart can be restored.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_pending_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
begin
  update public.orders set status = 'cancelled', cancelled_at = now()
  where id = p_order_id and status in ('pending_payment', 'expired');
  if not found then
    raise exception 'order_not_cancellable' using errcode = 'P0001';
  end if;
  update public.stock_reservations set status = 'released'
  where order_id = p_order_id and status = 'active';
  select coalesce(jsonb_agg(jsonb_build_object('productId', product_id, 'quantity', quantity)), '[]'::jsonb)
    into v_items
  from public.order_items where order_id = p_order_id and product_id is not null;
  return v_items;
end;
$$;

revoke execute on function public.price_items(jsonb) from public, anon, authenticated;
revoke execute on function public.create_checkout_order(jsonb) from public, anon, authenticated;
revoke execute on function public.create_quote(jsonb) from public, anon, authenticated;
revoke execute on function public.apply_payfast_itn(jsonb) from public, anon, authenticated;
revoke execute on function public.cancel_pending_order(uuid) from public, anon, authenticated;
grant execute on function public.price_items(jsonb) to service_role;
grant execute on function public.create_checkout_order(jsonb) to service_role;
grant execute on function public.create_quote(jsonb) to service_role;
grant execute on function public.apply_payfast_itn(jsonb) to service_role;
grant execute on function public.cancel_pending_order(uuid) to service_role;
