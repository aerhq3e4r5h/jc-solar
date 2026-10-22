-- Behaviour tests for RLS, stock reservations, payment confirmation and
-- invoice numbering. Run with scripts/test-db.sh. Each check raises an
-- exception (and stops the run) if behaviour is wrong.

-- ---------------------------------------------------------------------------
-- Fixtures (as table owner)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'bob@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'tech@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'tech2@example.com');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'technician' where id in (
  '00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000e');

insert into public.brands (id, slug, name) values ('10000000-0000-0000-0000-000000000001', 'deye', 'Deye');

insert into public.products (id, sku, name, slug, brand_id, category_id, price_incl_vat, stock_qty, is_dangerous_goods)
select '20000000-0000-0000-0000-000000000001', 'SE-G5.1', 'Deye 5.12kWh battery', 'deye-5-12kwh-battery',
       '10000000-0000-0000-0000-000000000001', id, 13903.50, 3, true
from public.categories where slug = 'batteries';
insert into public.products (id, sku, name, slug, category_id, price_incl_vat, stock_qty, is_active)
select '20000000-0000-0000-0000-000000000002', 'HIDDEN-1', 'Hidden product', 'hidden-product', id, 100, 5, false
from public.categories where slug = 'inverters';
insert into public.product_costs (product_id, cost_price_excl_vat) values ('20000000-0000-0000-0000-000000000001', 9000);

insert into public.technicians (id, profile_id, display_name) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'Tech One'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', 'Tech Two');

insert into public.installation_bookings (id, user_id, technician_id, contact_name, contact_phone, contact_email, address)
values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b',
   '30000000-0000-0000-0000-000000000001', 'Alice', '0820000000', 'alice@example.com', '{}'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c',
   '30000000-0000-0000-0000-000000000002', 'Bob', '0830000000', 'bob@example.com', '{}');

-- ---------------------------------------------------------------------------
-- Catalogue visibility
-- ---------------------------------------------------------------------------
select pg_temp.act_as(null);
do $$ begin
  if (select shipping_class from public.products where sku = 'SE-G5.1') <> 'dangerous_goods' then
    raise exception 'FAIL: lithium battery not forced to dangerous_goods';
  end if;
  if exists (select 1 from public.products where sku = 'HIDDEN-1') then
    raise exception 'FAIL: anon can see inactive product';
  end if;
  if exists (select 1 from public.product_costs) then
    raise exception 'FAIL: anon can read cost prices';
  end if;
end $$;
select pg_temp.expect_error(
  $$insert into public.products (sku, name, slug, category_id, price_incl_vat)
    select 'X', 'X', 'x', id, 1 from public.categories limit 1$$, 'anon inserts product', 'row-level security');

-- ---------------------------------------------------------------------------
-- Customer restrictions
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if exists (select 1 from public.product_costs) then
    raise exception 'FAIL: customer can read cost prices';
  end if;
  update public.products set price_incl_vat = 1 where sku = 'SE-G5.1';
  if (select price_incl_vat from public.products where sku = 'SE-G5.1') = 1 then
    raise exception 'FAIL: customer changed a price';
  end if;
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAIL: customer can see other profiles';
  end if;
end $$;
select pg_temp.expect_error(
  $$update public.profiles set role = 'admin' where id = auth.uid()$$, 'customer promotes self to admin', 'Only an admin');
select pg_temp.expect_error(
  $$insert into public.orders (email, subtotal_incl_vat, total_incl_vat, vat_amount, terms_version, terms_accepted_at)
    values ('a@b.c', 1, 1, 0.13, 'v1', now())$$, 'customer inserts order directly', 'row-level security');
select pg_temp.expect_error(
  $$select public.confirm_order_paid(gen_random_uuid(), gen_random_uuid())$$, 'customer calls confirm_order_paid', 'permission denied');
select pg_temp.expect_error(
  $$select public.reserve_order_stock(gen_random_uuid(), 30)$$, 'customer calls reserve_order_stock', 'permission denied');

-- Customer can manage own profile fields and address
update public.profiles set full_name = 'Alice A' where id = auth.uid();
insert into public.addresses (user_id, recipient_name, line1, city, province, postal_code)
values (auth.uid(), 'Alice', '1 Main Rd', 'Pretoria', 'Gauteng', '0181');
select pg_temp.expect_error(
  $$insert into public.addresses (user_id, recipient_name, line1, city, province, postal_code)
    values ('00000000-0000-0000-0000-00000000000c', 'X', '1', 'X', 'Gauteng', '0181')$$, 'customer writes address for someone else', 'row-level security');
select pg_temp.expect_error(
  $$insert into public.addresses (user_id, recipient_name, line1, city, province, postal_code)
    values (auth.uid(), 'X', '1', 'X', 'Gauteng', '12345')$$, 'invalid SA postal code accepted', 'postal_code_check');

-- ---------------------------------------------------------------------------
-- Checkout: reserve, verify, confirm (as server)
-- ---------------------------------------------------------------------------
select pg_temp.act_as_service();
insert into public.orders (id, user_id, email, subtotal_incl_vat, total_incl_vat, vat_amount, terms_version, terms_accepted_at)
values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'alice@example.com',
        27807.00, 27807.00, 3627.00, 'terms-2026-10', now());
insert into public.order_items (order_id, product_id, sku, name, unit_price_incl_vat, quantity, line_total_incl_vat, line_vat_amount)
values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'SE-G5.1',
        'Deye 5.12kWh battery', 13903.50, 2, 27807.00, 3627.00);
select public.reserve_order_stock('50000000-0000-0000-0000-000000000001', 30);

-- Bob's order wants 2 more but only 1 is unreserved.
insert into public.orders (id, user_id, email, subtotal_incl_vat, total_incl_vat, vat_amount, terms_version, terms_accepted_at)
values ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'bob@example.com',
        27807.00, 27807.00, 3627.00, 'terms-2026-10', now());
insert into public.order_items (order_id, product_id, sku, name, unit_price_incl_vat, quantity, line_total_incl_vat, line_vat_amount)
values ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'SE-G5.1',
        'Deye 5.12kWh battery', 13903.50, 2, 27807.00, 3627.00);
select pg_temp.expect_error(
  $$select public.reserve_order_stock('50000000-0000-0000-0000-000000000002', 30)$$, 'reservation beyond available stock', 'insufficient_stock:SE-G5.1');

do $$ begin
  if (select available from public.available_stock(array['20000000-0000-0000-0000-000000000001'::uuid])) <> 1 then
    raise exception 'FAIL: available stock should be 1 after reserving 2 of 3';
  end if;
  if (select stock_qty from public.products where sku = 'SE-G5.1') <> 3 then
    raise exception 'FAIL: stock decremented before payment';
  end if;
end $$;

-- Unverified payment must not confirm the order.
insert into public.payments (id, order_id, provider, provider_payment_id, amount, status, signature_valid)
values ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'sandbox', 'p-1', 27807.00, 'pending', null);
select pg_temp.expect_error(
  $$select public.confirm_order_paid('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001')$$,
  'confirming with an unverified payment', 'payment_not_verified');

-- Wrong amount must not confirm the order.
insert into public.payments (id, order_id, provider, provider_payment_id, amount, status, signature_valid)
values ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'sandbox', 'p-2', 100.00, 'verified', true);
select pg_temp.expect_error(
  $$select public.confirm_order_paid('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002')$$,
  'confirming with a payment for the wrong amount', 'payment_amount_mismatch');

insert into public.payments (id, order_id, provider, provider_payment_id, amount, status, signature_valid, verified_at)
values ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'sandbox', 'p-3', 27807.00, 'verified', true, now());

do $$
declare v bigint; v2 bigint;
begin
  v := public.confirm_order_paid('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003');
  if v <> 1 then raise exception 'FAIL: first invoice number should be 1, got %', v; end if;
  if (select stock_qty from public.products where sku = 'SE-G5.1') <> 1 then
    raise exception 'FAIL: stock not decremented on payment';
  end if;
  if (select status from public.orders where id = '50000000-0000-0000-0000-000000000001') <> 'paid' then
    raise exception 'FAIL: order not marked paid';
  end if;
  -- A repeated webhook must not decrement again or issue a second invoice.
  v2 := public.confirm_order_paid('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003');
  if v2 <> 1 or (select stock_qty from public.products where sku = 'SE-G5.1') <> 1
     or (select count(*) from public.invoices) <> 1 then
    raise exception 'FAIL: confirm_order_paid is not idempotent';
  end if;
end $$;

select pg_temp.expect_error($$delete from public.invoices$$, 'deleting an invoice', 'cannot be deleted');
select pg_temp.expect_error($$update public.invoices set invoice_number = 99$$, 'renumbering an invoice', 'cannot be changed');

-- Expiry releases held stock.
insert into public.orders (id, email, subtotal_incl_vat, total_incl_vat, vat_amount, terms_version, terms_accepted_at)
values ('50000000-0000-0000-0000-000000000003', 'guest@example.com', 13903.50, 13903.50, 1813.50, 'terms-2026-10', now());
insert into public.order_items (order_id, product_id, sku, name, unit_price_incl_vat, quantity, line_total_incl_vat, line_vat_amount)
values ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'SE-G5.1',
        'Deye 5.12kWh battery', 13903.50, 1, 13903.50, 1813.50);
select public.reserve_order_stock('50000000-0000-0000-0000-000000000003', 30);
update public.stock_reservations set expires_at = now() - interval '1 minute'
  where order_id = '50000000-0000-0000-0000-000000000003';
do $$ begin
  if public.release_expired_reservations() <> 1 then raise exception 'FAIL: expired order not released'; end if;
  if (select status from public.orders where id = '50000000-0000-0000-0000-000000000003') <> 'expired' then
    raise exception 'FAIL: order not marked expired';
  end if;
  if (select available from public.available_stock(array['20000000-0000-0000-0000-000000000001'::uuid])) <> 1 then
    raise exception 'FAIL: released stock not available again';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Customers only see their own orders and invoices
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
do $$ begin
  if exists (select 1 from public.orders where id = '50000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL: Bob can see Alice''s order';
  end if;
  if exists (select 1 from public.invoices) then raise exception 'FAIL: Bob can see Alice''s invoice'; end if;
  if exists (select 1 from public.payments) then raise exception 'FAIL: customer can read payments'; end if;
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.orders) <> 1 then raise exception 'FAIL: Alice should see exactly her order'; end if;
  if (select count(*) from public.invoices) <> 1 then raise exception 'FAIL: Alice should see her invoice'; end if;
  if (select count(*) from public.installation_bookings) <> 1 then raise exception 'FAIL: Alice booking visibility'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- Technicians see and update only their own jobs
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
do $$ begin
  if (select count(*) from public.installation_bookings) <> 1 then
    raise exception 'FAIL: technician should see exactly one job';
  end if;
  if exists (select 1 from public.orders) then raise exception 'FAIL: technician can read orders'; end if;
  update public.installation_bookings set status = 'in_progress' where id = '40000000-0000-0000-0000-000000000001';
  update public.installation_bookings set status = 'completed' where id = '40000000-0000-0000-0000-000000000002';
end $$;
select pg_temp.expect_error(
  $$update public.installation_bookings set technician_id = '30000000-0000-0000-0000-000000000002'
    where id = '40000000-0000-0000-0000-000000000001'$$, 'technician reassigns a job', 'Technicians can only update');
select pg_temp.act_as_service();
do $$ begin
  if (select status from public.installation_bookings where id = '40000000-0000-0000-0000-000000000001') <> 'in_progress' then
    raise exception 'FAIL: technician could not update own job';
  end if;
  if (select status from public.installation_bookings where id = '40000000-0000-0000-0000-000000000002') <> 'requested' then
    raise exception 'FAIL: technician updated someone else''s job';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Admin can manage the catalogue; writes are audited
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.products set price_incl_vat = 14000 where sku = 'SE-G5.1';
do $$ begin
  if (select price_incl_vat from public.products where sku = 'SE-G5.1') <> 14000 then
    raise exception 'FAIL: admin could not change a price';
  end if;
  if (select count(*) from public.product_costs) <> 1 then raise exception 'FAIL: admin cannot read costs'; end if;
  if not exists (select 1 from public.audit_log where table_name = 'products' and action = 'update'
                 and actor_id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'FAIL: price change not audited';
  end if;
end $$;
select pg_temp.expect_error(
  $$insert into public.products (sku, name, slug, category_id, price_incl_vat)
    select 'se-g5.1', 'Dup', 'dup', id, 1 from public.categories limit 1$$, 'duplicate SKU differing only in case', 'products_sku_unique');

reset role;
