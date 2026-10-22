-- Delivery pricing from the rate table, orders and quotes that include
-- delivery, and staff recording shipments.

reset role;
insert into public.products (id, sku, name, slug, category_id, price_incl_vat, stock_qty, shipping_class)
select '90000000-0000-0000-0000-000000000001', 'SHP-INV', 'Ship inverter', 'ship-inverter', id, 10000.00, 50, 'standard'
from public.categories where slug = 'inverters';
insert into public.products (id, sku, name, slug, category_id, price_incl_vat, stock_qty, shipping_class, installation_eligible)
select '90000000-0000-0000-0000-000000000002', 'SHP-PNL', 'Ship panel', 'ship-panel', id, 2000.00, 100, 'oversized', false
from public.categories where slug = 'solar-panels';
insert into public.products (id, sku, name, slug, category_id, price_incl_vat, stock_qty, is_dangerous_goods)
select '90000000-0000-0000-0000-000000000003', 'SHP-BAT', 'Ship battery', 'ship-battery', id, 15000.00, 20, true
from public.categories where slug = 'batteries';

-- Only server code prices delivery.
select pg_temp.act_as(null);
select pg_temp.expect_error($$select public.quote_delivery('[]', '{}')$$, 'visitor quotes delivery directly', 'permission denied');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select public.record_shipment('{}')$$, 'customer records a shipment', 'not_allowed');

select pg_temp.act_as_service();

do $$
declare
  mixed constant jsonb := '[
    {"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1},
    {"productId": "90000000-0000-0000-0000-000000000002", "quantity": 8},
    {"productId": "90000000-0000-0000-0000-000000000003", "quantity": 2}]';
  q jsonb;
begin
  -- Gauteng starter rates: parcel 250, panels 950 + 7 × 25, batteries 450 + 1 × 150.
  q := public.quote_delivery(mixed, '{"province": "Gauteng", "postalCode": "0181"}');
  if (q ->> 'total')::numeric <> 250 + 1125 + 600 then raise exception 'FAIL: Gauteng total %', q ->> 'total'; end if;
  if (q ->> 'pending')::boolean then raise exception 'FAIL: Gauteng should be fully priced'; end if;
  if jsonb_array_length(q -> 'shipments') <> 3 then raise exception 'FAIL: expected one shipment per class'; end if;
  if q ->> 'carrier' <> 'DSV' or q ->> 'method' <> 'courier' then raise exception 'FAIL: carrier/method %', q; end if;

  -- Province names are matched case-insensitively; further provinces cost more.
  q := public.quote_delivery(mixed, '{"province": "western cape", "postalCode": "8001"}');
  if (q ->> 'total')::numeric <> 450 + (2200 + 7 * 45) + (1100 + 250) then raise exception 'FAIL: Western Cape total %', q ->> 'total'; end if;
end;
$$;

-- A postal-code range beats the province-wide rate.
reset role;
insert into public.shipping_rate_table (shipping_class, province, postal_code_from, postal_code_to, base_price_incl_vat, eta_days_min, eta_days_max)
values ('oversized', 'Western Cape', '7000', '7999', 1800, 2, 3);
select pg_temp.act_as_service();
do $$
declare
  q jsonb;
begin
  q := public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000002", "quantity": 8}]', '{"province": "Western Cape", "postalCode": "7700"}');
  if (q ->> 'total')::numeric <> 1800 then raise exception 'FAIL: postal range not used: %', q ->> 'total'; end if;
  if (q -> 'shipments' -> 0 ->> 'etaDaysMax')::int <> 3 then raise exception 'FAIL: postal range ETA'; end if;
  q := public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000002", "quantity": 8}]', '{"province": "Western Cape", "postalCode": "8001"}');
  if (q ->> 'total')::numeric <> 2515 then raise exception 'FAIL: outside the range should use the province rate'; end if;
end;
$$;

select pg_temp.expect_error($$select public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1}]', '{}')$$,
  'quote without an address', 'address_required');
select pg_temp.expect_error($$select public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1}]', '{"province": "Gauteng", "postalCode": "12"}')$$,
  'bad postal code', 'invalid_postal_code');

-- No rate for a class: that part is quoted after the order, or refused if the admin says so.
reset role;
update public.shipping_rate_table set is_active = false where province = 'Limpopo' and shipping_class = 'dangerous_goods';
select pg_temp.act_as_service();
do $$
declare
  q jsonb;
begin
  q := public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1},
                               {"productId": "90000000-0000-0000-0000-000000000003", "quantity": 1}]', '{"province": "Limpopo"}');
  if not (q ->> 'pending')::boolean then raise exception 'FAIL: missing rate should be pending'; end if;
  if (q ->> 'total')::numeric <> 350 then raise exception 'FAIL: priced part should still count: %', q ->> 'total'; end if;
  if q -> 'shipments' -> 0 ->> 'price' is not null and q -> 'shipments' -> 1 ->> 'price' is not null then
    raise exception 'FAIL: unpriced shipment should have a null price';
  end if;
end;
$$;
reset role;
update public.shipping_settings set quote_after_order_when_unavailable = false;
select pg_temp.act_as_service();
select pg_temp.expect_error($$select public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000003", "quantity": 1}]', '{"province": "Limpopo"}')$$,
  'unpriced delivery refused', 'delivery_unavailable');
reset role;
update public.shipping_settings set quote_after_order_when_unavailable = true;
update public.shipping_rate_table set is_active = true where province = 'Limpopo';

-- Free delivery: with installation (installer brings it), over a threshold, or collection.
select pg_temp.act_as_service();
do $$
declare
  q jsonb;
begin
  q := public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1, "installation": true}]', '{"province": "Gauteng"}');
  if (q ->> 'total')::numeric <> 0 or q ->> 'method' <> 'installer_delivery' or q ->> 'freeReason' <> 'installation' then
    raise exception 'FAIL: installation should make delivery free: %', q;
  end if;
end;
$$;
select pg_temp.expect_error($$select public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1}]', '{}', 'collection')$$,
  'collection while switched off', 'collection_unavailable');
reset role;
update public.shipping_settings set free_delivery_threshold_incl_vat = 20000, collection_enabled = true;
select pg_temp.act_as_service();
do $$
declare
  q jsonb;
begin
  q := public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 2}]', '{"province": "Gauteng"}');
  if (q ->> 'total')::numeric <> 0 or q ->> 'freeReason' <> 'threshold' then raise exception 'FAIL: threshold %', q; end if;
  q := public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1}]', '{"province": "Gauteng"}');
  if (q ->> 'total')::numeric <> 250 then raise exception 'FAIL: under the threshold should pay'; end if;
  q := public.quote_delivery('[{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1}]', '{}', 'collection');
  if (q ->> 'total')::numeric <> 0 or q ->> 'method' <> 'collection' then raise exception 'FAIL: collection %', q; end if;
end;
$$;
reset role;
update public.shipping_settings set free_delivery_threshold_incl_vat = null, collection_enabled = false;

-- Orders and quotes include delivery in the total and VAT.
select pg_temp.act_as_service();
do $$
declare
  r jsonb;
  o public.orders%rowtype;
  qt public.quotes%rowtype;
  v_shipment uuid;
begin
  r := public.create_checkout_order($j${
    "termsVersion": "v1", "email": "ship@example.com", "customerName": "Sipho Ship", "paymentMethod": "eft",
    "accessTokenHash": "x",
    "shippingAddress": {"line1": "2 Long St", "city": "Durban", "province": "KwaZulu-Natal", "postalCode": "4001"},
    "items": [{"productId": "90000000-0000-0000-0000-000000000001", "quantity": 1},
              {"productId": "90000000-0000-0000-0000-000000000003", "quantity": 1}]}$j$);
  select * into o from public.orders where id = (r ->> 'orderId')::uuid;
  if o.shipping_incl_vat <> 450 + 1100 then raise exception 'FAIL: order shipping %', o.shipping_incl_vat; end if;
  if o.total_incl_vat <> 25000 + 1550 then raise exception 'FAIL: order total %', o.total_incl_vat; end if;
  if o.vat_amount <> round(o.total_incl_vat * 0.15 / 1.15, 2) then raise exception 'FAIL: VAT must include delivery'; end if;
  if o.delivery_pending or o.delivery_method <> 'courier' then raise exception 'FAIL: delivery flags'; end if;
  if (select count(*) from public.shipping_quotes where order_id = o.id) <> 2 then raise exception 'FAIL: delivery snapshot not saved'; end if;

  r := public.create_quote($j${"customerName": "Q", "email": "q@example.com", "accessTokenHash": "y", "province": "Gauteng",
    "items": [{"productId": "90000000-0000-0000-0000-000000000002", "quantity": 10}]}$j$);
  select * into qt from public.quotes where id = (r ->> 'quoteId')::uuid;
  if qt.shipping_incl_vat <> 950 + 9 * 25 or qt.total_incl_vat <> 20000 + 1175 or qt.delivery_pending then
    raise exception 'FAIL: quote delivery % %', qt.shipping_incl_vat, qt.total_incl_vat;
  end if;
  r := public.create_quote($j${"customerName": "Q", "email": "q@example.com", "accessTokenHash": "z",
    "items": [{"productId": "90000000-0000-0000-0000-000000000002", "quantity": 1}]}$j$);
  select * into qt from public.quotes where id = (r ->> 'quoteId')::uuid;
  if qt.shipping_incl_vat <> 0 or not qt.delivery_pending then raise exception 'FAIL: quote without province should leave delivery pending'; end if;

  perform set_config('test.ship_order', o.id::text, false);
end;
$$;

-- Staff record the DSV waybill once the order is paid; tracking follows to "delivered".
reset role;
update public.shipping_settings set tracking_url_template = 'https://track.example.com/?ref={tracking}';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error(format($$select public.record_shipment('{"orderId": "%s", "trackingNumber": "DSV1"}')$$, current_setting('test.ship_order')),
  'shipping an unpaid order', 'order_not_ready_to_ship');
reset role;
update public.orders set status = 'paid', paid_at = now() where id = current_setting('test.ship_order')::uuid;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error(format($$select public.record_shipment('{"orderId": "%s"}')$$, current_setting('test.ship_order')),
  'shipment without a tracking number', 'tracking_required');
do $$
declare
  v_id uuid;
  sh public.shipments%rowtype;
begin
  v_id := public.record_shipment(jsonb_build_object('orderId', current_setting('test.ship_order'), 'trackingNumber', 'DSV12345', 'waybillNumber', 'WB-1'));
  select * into sh from public.shipments where id = v_id;
  if sh.provider <> 'DSV' or sh.status <> 'booked' or sh.tracking_url <> 'https://track.example.com/?ref=DSV12345' then
    raise exception 'FAIL: shipment %', row_to_json(sh);
  end if;
  if (select status from public.orders where id = sh.order_id) <> 'shipped' then raise exception 'FAIL: order should be shipped'; end if;
  perform public.update_shipment_status(v_id, 'in_transit', 'Left Johannesburg hub');
  if (select status from public.orders where id = sh.order_id) <> 'shipped' then raise exception 'FAIL: in transit is still shipped'; end if;
  perform public.update_shipment_status(v_id, 'delivered');
  if (select status from public.orders where id = sh.order_id) <> 'delivered' then raise exception 'FAIL: order should be delivered'; end if;
  if (select jsonb_array_length(events) from public.shipments where id = v_id) <> 3 then raise exception 'FAIL: events not kept'; end if;
end;
$$;

-- The customer who owns the order can read its shipments; others can't.
reset role;
update public.orders set user_id = '00000000-0000-0000-0000-00000000000b' where id = current_setting('test.ship_order')::uuid;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$
begin
  if (select count(*) from public.shipments where order_id = current_setting('test.ship_order')::uuid) <> 1 then
    raise exception 'FAIL: owner cannot see their shipment';
  end if;
end;
$$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
do $$
begin
  if exists (select 1 from public.shipments where order_id = current_setting('test.ship_order')::uuid) then
    raise exception 'FAIL: another customer can see the shipment';
  end if;
end;
$$;

reset role;
update public.shipping_settings set tracking_url_template = null;
