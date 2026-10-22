-- Delivery pricing and shipments.
--
-- Delivery is priced in the database, like products, so the browser can
-- never change what a customer pays for it. Each shipping class in the cart
-- (standard parcels, oversized solar panels, dangerous-goods lithium
-- batteries) is a separate shipment priced from shipping_rate_table:
--
--   price = base_price + per_item × (items − 1) + per_kg × weight
--
-- A row for a postal-code range beats the province-wide row. When no row
-- covers a class, the order goes through with that part "quoted after
-- order" (or is refused, if the admin turns that off).
--
-- A live courier API can replace the table later; checkout only sees the
-- result of quote_delivery().

alter table public.shipping_settings
  add column carrier_name text not null default 'DSV',
  -- e.g. https://tracking.example.com/?ref={tracking}; null shows the number only.
  add column tracking_url_template text check (tracking_url_template is null or tracking_url_template like 'https://%{tracking}%'),
  add column dispatch_from text not null default 'Solar Europe warehouse';

-- Stock ships from Solar Europe's warehouse, so there is no counter to collect from (yet).
update public.shipping_settings set collection_enabled = false;

-- One shipment may carry the whole order rather than a single class.
alter table public.shipments alter column shipping_class drop not null;

alter table public.quotes
  add column delivery_province text,
  add column shipping_incl_vat numeric(12, 2) not null default 0 check (shipping_incl_vat >= 0),
  add column delivery_pending boolean not null default true;

-- ---------------------------------------------------------------------------
-- Starter rates (incl. VAT) from a Gauteng warehouse, for the admin to adjust.
-- Parcels: inverters and accessories. Oversized: solar panels on a pallet.
-- Dangerous goods: lithium batteries (UN3480, Class 9) by road freight.
-- ---------------------------------------------------------------------------
insert into public.shipping_rate_table
  (shipping_class, province, base_price_incl_vat, per_item_incl_vat, eta_days_min, eta_days_max)
select c.shipping_class::public.shipping_class, z.province,
       case z.zone when 1 then c.base1 when 2 then c.base2 else c.base3 end,
       case z.zone when 1 then c.item1 when 2 then c.item2 else c.item3 end,
       c.eta_min + z.zone - 1, c.eta_max + z.zone - 1
from (values
  ('Gauteng', 1), ('Limpopo', 2), ('Mpumalanga', 2), ('North West', 2), ('Free State', 2),
  ('KwaZulu-Natal', 3), ('Eastern Cape', 3), ('Northern Cape', 3), ('Western Cape', 3)
) as z(province, zone)
cross join (values
  ('standard',         250,  350,  450,  100, 120, 150, 2, 3),
  ('oversized',        950, 1500, 2200,   25,  35,  45, 3, 5),
  ('dangerous_goods',  450,  750, 1100,  150, 200, 250, 3, 5)
) as c(shipping_class, base1, base2, base3, item1, item2, item3, eta_min, eta_max);

-- ---------------------------------------------------------------------------
-- Price delivery for a list of {productId, quantity, installation} to an
-- address. Returns
--   { method, carrier, total, pending, freeReason,
--     shipments: [{ shippingClass, items, weightKg, price, etaDaysMin, etaDaysMax }] }
-- where price is null for a shipment we can't price yet (pending).
-- ---------------------------------------------------------------------------
create or replace function public.quote_delivery(p_items jsonb, p_address jsonb, p_method text default 'courier')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shipping_settings%rowtype;
  v_subtotal numeric;
  v_install boolean;
  v_province text := nullif(trim(coalesce(p_address ->> 'province', '')), '');
  v_postal text := nullif(trim(coalesce(p_address ->> 'postalCode', '')), '');
  v_shipments jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_pending boolean := false;
  g record;
  r public.shipping_rate_table%rowtype;
  v_price numeric;
begin
  select * into s from public.shipping_settings where id;

  create temporary table if not exists _quote_lines (
    product_id uuid, quantity int, line_total numeric, installation boolean,
    shipping_class public.shipping_class) on commit drop;
  truncate _quote_lines;
  insert into _quote_lines
    select product_id, quantity, line_total, installation, shipping_class from public.price_items(p_items);
  select sum(line_total), bool_or(installation) into v_subtotal, v_install from _quote_lines;

  if p_method = 'collection' then
    if not s.collection_enabled then
      raise exception 'collection_unavailable' using errcode = 'P0001';
    end if;
    return jsonb_build_object('method', 'collection', 'carrier', null, 'total', 0, 'pending', false,
                              'freeReason', 'collection', 'shipments', '[]'::jsonb);
  end if;

  if v_province is null then
    raise exception 'address_required' using errcode = 'P0001';
  end if;
  if v_postal is not null and v_postal !~ '^[0-9]{4}$' then
    raise exception 'invalid_postal_code' using errcode = 'P0001';
  end if;

  for g in
    select l.shipping_class, sum(l.quantity)::int as items,
           coalesce(sum(p.weight_kg * l.quantity), 0) as weight_kg
    from _quote_lines l
    join public.products p on p.id = l.product_id
    group by l.shipping_class
    order by l.shipping_class
  loop
    select * into r
    from public.shipping_rate_table t
    where t.is_active
      and t.shipping_class = g.shipping_class
      and lower(t.province) = lower(v_province)
      and (t.postal_code_from is null
           or (v_postal is not null and v_postal between t.postal_code_from and coalesce(t.postal_code_to, t.postal_code_from)))
    order by (t.postal_code_from is not null) desc, t.base_price_incl_vat
    limit 1;

    if found then
      v_price := round(r.base_price_incl_vat + r.per_item_incl_vat * greatest(g.items - 1, 0)
                       + r.per_kg_incl_vat * g.weight_kg, 2);
      v_total := v_total + v_price;
    else
      v_price := null;
      v_pending := true;
    end if;

    v_shipments := v_shipments || jsonb_build_object(
      'shippingClass', g.shipping_class, 'items', g.items, 'weightKg', g.weight_kg, 'price', v_price,
      'etaDaysMin', case when v_price is not null then r.eta_days_min end,
      'etaDaysMax', case when v_price is not null then r.eta_days_max end);
  end loop;

  -- Our installer brings the stock when installation is booked.
  if v_install and s.free_delivery_with_installation then
    return jsonb_build_object('method', 'installer_delivery', 'carrier', null, 'total', 0, 'pending', false,
                              'freeReason', 'installation', 'shipments', v_shipments);
  end if;

  if v_pending and not s.quote_after_order_when_unavailable then
    raise exception 'delivery_unavailable' using errcode = 'P0001';
  end if;

  if s.free_delivery_threshold_incl_vat is not null and v_subtotal >= s.free_delivery_threshold_incl_vat then
    return jsonb_build_object('method', 'courier', 'carrier', s.carrier_name, 'total', 0, 'pending', false,
                              'freeReason', 'threshold', 'shipments', v_shipments);
  end if;

  return jsonb_build_object('method', 'courier', 'carrier', s.carrier_name, 'total', v_total,
                            'pending', v_pending, 'freeReason', null, 'shipments', v_shipments);
end;
$$;

-- ---------------------------------------------------------------------------
-- Orders now include delivery in the total.
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
  v_delivery jsonb;
  v_shipping numeric;
  v_total numeric;
  v_method public.payment_method := coalesce(p ->> 'paymentMethod', 'payfast')::public.payment_method;
begin
  if coalesce(p ->> 'termsVersion', '') = '' then
    raise exception 'terms_not_accepted' using errcode = 'P0001';
  end if;

  drop table if exists _lines;
  create temporary table _lines on commit drop as
    select * from public.price_items(p -> 'items');

  select sum(line_total), bool_or(installation) into v_subtotal, v_install from _lines;

  v_delivery := public.quote_delivery(p -> 'items', p -> 'shippingAddress', coalesce(p ->> 'deliveryMethod', 'courier'));
  v_shipping := (v_delivery ->> 'total')::numeric;
  v_total := v_subtotal + v_shipping;

  insert into public.orders (
    user_id, email, phone, customer_name, status, subtotal_incl_vat, shipping_incl_vat, total_incl_vat, vat_amount,
    delivery_method, shipping_address, billing_address, customer_notes, terms_version, terms_accepted_at,
    marketing_opt_in, payment_method, installation_requested, delivery_pending, access_token_hash)
  values (
    nullif(p ->> 'userId', '')::uuid,
    p ->> 'email',
    p ->> 'phone',
    p ->> 'customerName',
    'pending_payment',
    v_subtotal,
    v_shipping,
    v_total,
    round(v_total * 0.15 / 1.15, 2),
    (v_delivery ->> 'method')::public.delivery_method,
    p -> 'shippingAddress',
    coalesce(p -> 'billingAddress', p -> 'shippingAddress'),
    nullif(p ->> 'notes', ''),
    p ->> 'termsVersion',
    now(),
    coalesce((p ->> 'marketingOptIn')::boolean, false),
    v_method,
    v_install,
    (v_delivery ->> 'pending')::boolean,
    p ->> 'accessTokenHash')
  returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, sku, name, unit_price_incl_vat, quantity,
                                  line_total_incl_vat, line_vat_amount, shipping_class)
  select v_order_id, product_id, sku, name, unit_price, quantity, line_total, line_vat, shipping_class
  from _lines;

  -- Snapshot of how delivery was priced, per shipment.
  insert into public.shipping_quotes (order_id, provider, service_code, service_name, shipping_class,
                                      price_incl_vat, eta_days_min, eta_days_max, is_fallback, response_payload, expires_at)
  select v_order_id, 'rate_table', v_delivery ->> 'method', coalesce(v_delivery ->> 'carrier', v_delivery ->> 'method'),
         (sh ->> 'shippingClass')::public.shipping_class,
         case when v_delivery ->> 'freeReason' is not null then 0 else (sh ->> 'price')::numeric end,
         (sh ->> 'etaDaysMin')::int, (sh ->> 'etaDaysMax')::int, true, sh, now() + interval '1 day'
  from jsonb_array_elements(v_delivery -> 'shipments') sh
  where sh ->> 'price' is not null or v_delivery ->> 'freeReason' is not null;

  -- PayFast payments complete within minutes; EFT needs time to clear.
  perform public.reserve_order_stock(v_order_id, case when v_method = 'eft' then 60 * 48 else 30 end);

  if p ? 'quoteId' then
    update public.quotes set converted_order_id = v_order_id where id = (p ->> 'quoteId')::uuid;
  end if;

  return jsonb_build_object('orderId', v_order_id, 'orderNumber', v_order_number, 'total', v_total,
                            'shipping', v_shipping, 'deliveryPending', (v_delivery ->> 'pending')::boolean);
end;
$$;

-- ---------------------------------------------------------------------------
-- Quotes include delivery when the customer gives a province.
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
  v_province text := nullif(p ->> 'province', '');
  v_delivery jsonb;
  v_shipping numeric := 0;
  v_pending boolean := true;
  v_total numeric;
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

  if v_province is not null then
    v_delivery := public.quote_delivery(p -> 'items', jsonb_build_object('province', v_province));
    v_shipping := (v_delivery ->> 'total')::numeric;
    v_pending := (v_delivery ->> 'pending')::boolean;
  end if;
  v_total := v_subtotal + v_shipping;

  insert into public.quotes (user_id, customer_name, email, phone, company, items, subtotal_incl_vat,
                             vat_amount, total_incl_vat, installation_requested, marketing_opt_in,
                             valid_until, access_token_hash, delivery_province, shipping_incl_vat, delivery_pending)
  values (nullif(p ->> 'userId', '')::uuid, p ->> 'customerName', p ->> 'email', nullif(p ->> 'phone', ''),
          nullif(p ->> 'company', ''), v_items, v_subtotal, round(v_total * 0.15 / 1.15, 2), v_total,
          v_install, coalesce((p ->> 'marketingOptIn')::boolean, false),
          current_date + coalesce((p ->> 'validDays')::int, 7), p ->> 'accessTokenHash',
          v_province, v_shipping, v_pending)
  returning id, quote_code into v_id, v_code;

  return jsonb_build_object('quoteId', v_id, 'quoteCode', v_code, 'total', v_total);
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff: record a shipment (e.g. a DSV waybill) and update its status.
-- Callable by signed-in users; the functions check the caller is staff.
-- ---------------------------------------------------------------------------
create or replace function public.record_shipment(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_id uuid;
  v_tracking text := nullif(trim(coalesce(p ->> 'trackingNumber', '')), '');
  v_template text;
begin
  if not public.is_staff() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = (p ->> 'orderId')::uuid for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if v_order.status not in ('paid', 'processing', 'shipped') then
    raise exception 'order_not_ready_to_ship' using errcode = 'P0001';
  end if;
  if v_tracking is null then
    raise exception 'tracking_required' using errcode = 'P0001';
  end if;

  select tracking_url_template into v_template from public.shipping_settings where id;

  insert into public.shipments (order_id, provider, service_code, shipping_class, status, waybill_number,
                                tracking_number, tracking_url, cost_incl_vat, parcels, events, booked_at)
  values (v_order.id,
          coalesce(nullif(p ->> 'provider', ''), (select carrier_name from public.shipping_settings where id)),
          nullif(p ->> 'serviceCode', ''),
          nullif(p ->> 'shippingClass', '')::public.shipping_class,
          'booked',
          nullif(trim(coalesce(p ->> 'waybillNumber', '')), ''),
          v_tracking,
          coalesce(nullif(p ->> 'trackingUrl', ''), replace(v_template, '{tracking}', v_tracking)),
          nullif(p ->> 'costInclVat', '')::numeric,
          coalesce(p -> 'parcels', '[]'::jsonb),
          jsonb_build_array(jsonb_build_object('status', 'booked', 'at', now(), 'by', auth.uid(), 'note', nullif(p ->> 'note', ''))),
          now())
  returning id into v_id;

  update public.orders set status = 'shipped' where id = v_order.id and status in ('paid', 'processing');

  insert into public.audit_log (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'shipment_booked', 'shipments', v_id::text,
          jsonb_build_object('order_id', v_order.id, 'tracking', v_tracking));
  return v_id;
end;
$$;

create or replace function public.update_shipment_status(p_shipment_id uuid, p_status public.shipment_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  if not public.is_staff() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.shipments
     set status = p_status,
         delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
         events = events || jsonb_build_object('status', p_status, 'at', now(), 'by', auth.uid(), 'note', p_note)
   where id = p_shipment_id
  returning order_id into v_order_id;
  if not found then
    raise exception 'shipment_not_found' using errcode = 'P0001';
  end if;

  -- The order is delivered once every shipment that isn't cancelled is.
  if not exists (select 1 from public.shipments
                 where order_id = v_order_id and status not in ('delivered', 'cancelled'))
     and exists (select 1 from public.shipments where order_id = v_order_id and status = 'delivered') then
    update public.orders set status = 'delivered' where id = v_order_id and status = 'shipped';
  end if;

  insert into public.audit_log (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'shipment_status', 'shipments', p_shipment_id::text,
          jsonb_build_object('status', p_status, 'note', p_note));
end;
$$;

revoke execute on function public.quote_delivery(jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.quote_delivery(jsonb, jsonb, text) to service_role;
revoke execute on function public.record_shipment(jsonb) from public, anon;
revoke execute on function public.update_shipment_status(uuid, public.shipment_status, text) from public, anon;
grant execute on function public.record_shipment(jsonb) to authenticated, service_role;
grant execute on function public.update_shipment_status(uuid, public.shipment_status, text) to authenticated, service_role;
