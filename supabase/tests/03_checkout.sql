-- Checkout functions: order creation priced from the database, stock
-- reservation, quotes, PayFast notifications and cancelling.

reset role;
insert into public.products (id, sku, name, slug, category_id, price_incl_vat, stock_qty)
select '70000000-0000-0000-0000-000000000001', 'CHK-INV', 'Checkout inverter', 'checkout-inverter', id, 14835.00, 5
from public.categories where slug = 'inverters';
insert into public.products (id, sku, name, slug, category_id, price_incl_vat, stock_qty, installation_eligible)
select '70000000-0000-0000-0000-000000000002', 'CHK-PNL', 'Checkout panel', 'checkout-panel', id, 1628.40, 20, false
from public.categories where slug = 'solar-panels';

-- Customers cannot call the checkout functions.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select public.create_checkout_order('{}')$$, 'customer creates order directly', 'permission denied');
select pg_temp.expect_error($$select public.apply_payfast_itn('{}')$$, 'customer posts a payment', 'permission denied');
select pg_temp.expect_error($$select public.create_quote('{}')$$, 'customer creates quote directly', 'permission denied');
select pg_temp.expect_error($$select public.cancel_pending_order(gen_random_uuid())$$, 'customer cancels order directly', 'permission denied');

select pg_temp.act_as_service();

-- Bad input is rejected before anything is written.
select pg_temp.expect_error($$select public.create_checkout_order('{"termsVersion": "v1", "items": []}')$$, 'empty cart', 'empty_cart');
select pg_temp.expect_error(
  $$select public.create_checkout_order('{"email": "a@b.co", "items": [{"productId": "70000000-0000-0000-0000-000000000001", "quantity": 1}]}')$$,
  'order without accepted terms', 'terms_not_accepted');
select pg_temp.expect_error(
  $$select public.create_checkout_order('{"termsVersion": "v1", "email": "a@b.co", "items": [{"productId": "70000000-0000-0000-0000-000000000001", "quantity": 0}]}')$$,
  'zero quantity', 'invalid_quantity');
select pg_temp.expect_error(
  $$select public.create_checkout_order('{"termsVersion": "v1", "email": "a@b.co", "items": [{"productId": "20000000-0000-0000-0000-000000000002", "quantity": 1}]}')$$,
  'inactive product', 'product_unavailable');
select pg_temp.expect_error(
  $$select public.create_checkout_order('{"termsVersion": "v1", "email": "a@b.co", "items": [{"productId": "70000000-0000-0000-0000-000000000001", "quantity": 6}]}')$$,
  'more than in stock', 'insufficient_stock:CHK-INV');

do $$
declare
  r jsonb;
  o public.orders%rowtype;
  itn jsonb;
begin
  -- Prices come from the database: the payload carries no prices at all.
  r := public.create_checkout_order($j${
    "termsVersion": "terms-2026-10", "email": "guest@example.com", "phone": "0821234567",
    "customerName": "Thandi Guest", "paymentMethod": "payfast", "accessTokenHash": "abc",
    "shippingAddress": {"line1": "1 Main Rd", "city": "Pretoria", "province": "Gauteng", "postalCode": "0181"},
    "items": [
      {"productId": "70000000-0000-0000-0000-000000000001", "quantity": 1, "installation": true},
      {"productId": "70000000-0000-0000-0000-000000000002", "quantity": 8, "installation": true}
    ]}$j$);
  select * into o from public.orders where id = (r ->> 'orderId')::uuid;
  if o.total_incl_vat <> 14835.00 + 8 * 1628.40 then raise exception 'FAIL: wrong order total %', o.total_incl_vat; end if;
  if o.vat_amount <> round(o.total_incl_vat * 0.15 / 1.15, 2) then raise exception 'FAIL: wrong VAT'; end if;
  if not o.installation_requested then raise exception 'FAIL: installation not recorded'; end if;
  if (select installation from public.price_items('[{"productId": "70000000-0000-0000-0000-000000000002", "quantity": 1, "installation": true}]')) then
    raise exception 'FAIL: installation allowed on an ineligible product';
  end if;
  if (select count(*) from public.order_items where order_id = o.id) <> 2 then raise exception 'FAIL: items not saved'; end if;
  if (select available from public.available_stock(array['70000000-0000-0000-0000-000000000001'::uuid])) <> 4 then
    raise exception 'FAIL: stock not reserved';
  end if;
  if (select expires_at from public.stock_reservations where order_id = o.id limit 1) > now() + interval '31 minutes' then
    raise exception 'FAIL: PayFast reservation should be 30 minutes';
  end if;

  -- A verified notification for the wrong amount is recorded, not accepted.
  itn := jsonb_build_object('orderId', o.id, 'pfPaymentId', 'PF-1', 'amountGross', 100, 'paymentStatus', 'COMPLETE', 'raw', '{}'::jsonb);
  r := public.apply_payfast_itn(itn);
  if r ->> 'result' <> 'problem' then raise exception 'FAIL: wrong amount accepted: %', r; end if;
  if (select status from public.orders where id = o.id) <> 'pending_payment' then raise exception 'FAIL: order paid on wrong amount'; end if;
  if not exists (select 1 from public.payments where provider_payment_id = 'PF-1') then raise exception 'FAIL: problem payment not kept'; end if;
  if not exists (select 1 from public.audit_log where action = 'payment_problem' and record_id = o.id::text) then
    raise exception 'FAIL: payment problem not flagged';
  end if;

  -- A failed payment changes nothing.
  r := public.apply_payfast_itn(itn || jsonb_build_object('pfPaymentId', 'PF-2', 'amountGross', o.total_incl_vat, 'paymentStatus', 'FAILED'));
  if r ->> 'result' <> 'recorded' or (select status from public.orders where id = o.id) <> 'pending_payment' then
    raise exception 'FAIL: failed payment handled wrongly: %', r;
  end if;

  -- The right amount marks it paid, takes stock and issues the next invoice.
  r := public.apply_payfast_itn(itn || jsonb_build_object('pfPaymentId', 'PF-3', 'amountGross', o.total_incl_vat));
  if r ->> 'result' <> 'paid' then raise exception 'FAIL: payment not applied: %', r; end if;
  if (select status from public.orders where id = o.id) <> 'paid' then raise exception 'FAIL: order not paid'; end if;
  if (select stock_qty from public.products where sku = 'CHK-INV') <> 4 then raise exception 'FAIL: stock not taken'; end if;
  if (r ->> 'invoiceNumber')::int <> 2 then raise exception 'FAIL: expected invoice 2, got %', r ->> 'invoiceNumber'; end if;

  -- PayFast resends notifications; a repeat must not double-count.
  r := public.apply_payfast_itn(itn || jsonb_build_object('pfPaymentId', 'PF-3', 'amountGross', o.total_incl_vat));
  if (select stock_qty from public.products where sku = 'CHK-INV') <> 4 or (select count(*) from public.invoices) <> 2 then
    raise exception 'FAIL: repeated notification counted twice';
  end if;
end $$;

-- EFT orders hold stock for 48 hours and can be cancelled to edit the cart.
do $$
declare
  r jsonb;
  v_items jsonb;
begin
  r := public.create_checkout_order($j${
    "termsVersion": "terms-2026-10", "email": "eft@example.com", "customerName": "Sipho EFT", "paymentMethod": "eft",
    "items": [{"productId": "70000000-0000-0000-0000-000000000001", "quantity": 2}]}$j$);
  if (select expires_at from public.stock_reservations where order_id = (r ->> 'orderId')::uuid) < now() + interval '47 hours' then
    raise exception 'FAIL: EFT reservation should be 48 hours';
  end if;
  v_items := public.cancel_pending_order((r ->> 'orderId')::uuid);
  if v_items -> 0 ->> 'quantity' <> '2' then raise exception 'FAIL: cancelled items not returned: %', v_items; end if;
  if (select status from public.orders where id = (r ->> 'orderId')::uuid) <> 'cancelled' then raise exception 'FAIL: not cancelled'; end if;
  if (select available from public.available_stock(array['70000000-0000-0000-0000-000000000001'::uuid])) <> 4 then
    raise exception 'FAIL: cancelled order still holds stock';
  end if;
end $$;
select pg_temp.expect_error(
  $$select public.cancel_pending_order((select id from public.orders where customer_name = 'Thandi Guest'))$$,
  'cancelling a paid order', 'order_not_cancellable');

-- Quotes are priced from the database and numbered in sequence.
do $$
declare
  q1 jsonb;
  q2 jsonb;
begin
  q1 := public.create_quote($j${"customerName": "Lerato", "email": "l@example.com", "accessTokenHash": "h",
    "items": [{"productId": "70000000-0000-0000-0000-000000000002", "quantity": 10}]}$j$);
  q2 := public.create_quote($j${"customerName": "Lerato", "email": "l@example.com", "accessTokenHash": "h",
    "items": [{"productId": "70000000-0000-0000-0000-000000000001", "quantity": 1}]}$j$);
  if q1 ->> 'quoteCode' <> 'Q-000001' or q2 ->> 'quoteCode' <> 'Q-000002' then raise exception 'FAIL: quote numbering %, %', q1, q2; end if;
  if (q1 ->> 'total')::numeric <> 16284.00 then raise exception 'FAIL: quote total %', q1 ->> 'total'; end if;
  if (select valid_until from public.quotes where id = (q1 ->> 'quoteId')::uuid) <> current_date + 7 then
    raise exception 'FAIL: quote should be valid for 7 days';
  end if;
end $$;

-- Customers see their own quotes only.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if exists (select 1 from public.quotes) then raise exception 'FAIL: customer sees other people''s quotes'; end if;
end $$;

reset role;
