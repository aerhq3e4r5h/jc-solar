-- Tests for import_catalogue(): permissions, insert, re-import updates
-- (no duplicates), hand-entered data preserved, incomplete flags.
-- Runs after 01_rls_and_stock.sql in the same session.

-- Customers and anonymous visitors cannot import.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error(
  $$select public.import_catalogue('{"products": []}')$$, 'customer imports catalogue', 'Only an admin');
select pg_temp.expect_error(
  $$select public.refresh_incomplete_fields('{}', '{}')$$, 'customer refreshes flags', 'permission denied');
select pg_temp.act_as(null);
select pg_temp.expect_error(
  $$select public.import_catalogue('{"products": []}')$$, 'anon imports catalogue', 'permission denied');

-- First import as admin: one new panel, one update to the existing battery.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$
declare
  r jsonb;
  payload jsonb := $j${
    "fileName": "test.xlsx",
    "rowsTotal": 3, "rowsSkipped": 1, "rowsInvalid": 0,
    "requiredSpecs": {"solar-panels": ["wattage_w", "efficiency_pct"], "batteries": ["capacity_kwh"]},
    "products": [
      {"sku": "JAM72D30-550/MB", "name": "JA Solar 550W Bifacial", "slug": "ja-solar-550w-bifacial",
       "brand": "JA Solar", "category": "solar-panels", "priceInclVat": 1650.00, "stockQty": 40,
       "allowBackorder": false, "shippingClass": "oversized", "isDangerousGoods": false,
       "specs": [{"key": "wattage_w", "label": "Wattage", "valueText": "550 W", "valueNum": 550, "unit": "W"}]},
      {"sku": "se-g5.1", "name": "Deye 5.12kWh battery", "slug": "deye-5-12kwh-battery",
       "brand": "Deye", "category": "batteries", "priceInclVat": 13500.00, "stockQty": 4,
       "allowBackorder": false, "shippingClass": "dangerous_goods", "isDangerousGoods": true,
       "specs": [{"key": "capacity_kwh", "label": "Capacity", "valueText": "5.12 kWh", "valueNum": 5.12, "unit": "kWh"}]}
    ]}$j$;
begin
  r := public.import_catalogue(payload);
  if (r ->> 'inserted')::int <> 1 or (r ->> 'updated')::int <> 1 then
    raise exception 'FAIL: first import should insert 1 and update 1, got %', r;
  end if;
  if (select price_incl_vat from public.products where sku = 'SE-G5.1') <> 13500 then
    raise exception 'FAIL: price not updated by import (matched case-insensitively)';
  end if;
  if (select sku from public.products where lower(sku) = 'se-g5.1') <> 'SE-G5.1' then
    raise exception 'FAIL: import rewrote the existing SKU spelling';
  end if;
  if (select shipping_class from public.products where sku = 'JAM72D30-550/MB') <> 'oversized' then
    raise exception 'FAIL: panel shipping class not set';
  end if;
  if not ('spec:efficiency_pct' = any (select unnest(incomplete_fields) from public.products where sku = 'JAM72D30-550/MB'))
     or 'spec:wattage_w' = any (select unnest(incomplete_fields) from public.products where sku = 'JAM72D30-550/MB') then
    raise exception 'FAIL: spec completeness flags wrong';
  end if;
  if not exists (select 1 from public.inventory_movements m join public.products p on p.id = m.product_id
                 where p.sku = 'SE-G5.1' and m.reason = 'import') then
    raise exception 'FAIL: stock change from import not recorded';
  end if;
end $$;

-- An admin fills in data by hand; a re-import must keep it and not duplicate.
update public.products
  set description = 'Hand-written description', weight_kg = 28.5, shipping_class = 'standard'
  where sku = 'JAM72D30-550/MB';
insert into public.product_specs (product_id, key, label, value_text, value_num, unit)
select id, 'efficiency_pct', 'Efficiency', '21.3 %', 21.3, '%' from public.products where sku = 'JAM72D30-550/MB';

do $$
declare
  r jsonb;
  payload jsonb := $j${
    "fileName": "test-v2.xlsx",
    "requiredSpecs": {"solar-panels": ["wattage_w", "efficiency_pct"]},
    "products": [
      {"sku": "JAM72D30-550/MB", "name": "JA Solar 550W Bifacial", "slug": "ja-solar-550w-bifacial",
       "brand": "JA Solar", "category": "solar-panels", "priceInclVat": 1599.00, "stockQty": 40,
       "allowBackorder": false, "shippingClass": "oversized", "isDangerousGoods": false,
       "specs": [{"key": "wattage_w", "label": "Wattage", "valueText": "550 W", "valueNum": 550, "unit": "W"}]}
    ]}$j$;
begin
  r := public.import_catalogue(payload);
  if (r ->> 'inserted')::int <> 0 or (r ->> 'updated')::int <> 1 then
    raise exception 'FAIL: re-import should update 1 and insert 0, got %', r;
  end if;
  if (select count(*) from public.products where lower(sku) = 'jam72d30-550/mb') <> 1 then
    raise exception 'FAIL: re-import created a duplicate';
  end if;
  if (select description from public.products where sku = 'JAM72D30-550/MB') <> 'Hand-written description'
     or (select shipping_class from public.products where sku = 'JAM72D30-550/MB') <> 'standard' then
    raise exception 'FAIL: re-import overwrote hand-entered data';
  end if;
  if exists (select 1 from public.products where sku = 'JAM72D30-550/MB'
             and ('spec:efficiency_pct' = any (incomplete_fields) or 'description' = any (incomplete_fields)
                  or 'weight_kg' = any (incomplete_fields))) then
    raise exception 'FAIL: incomplete flags not cleared for hand-filled fields';
  end if;
  if (select price_incl_vat from public.products where sku = 'JAM72D30-550/MB') <> 1599 then
    raise exception 'FAIL: re-import did not update price';
  end if;
  -- Unchanged re-import reports unchanged.
  r := public.import_catalogue(payload);
  if (r ->> 'unchanged')::int <> 1 then raise exception 'FAIL: identical re-import not unchanged: %', r; end if;
  if (select count(*) from public.import_logs) <> 3 then raise exception 'FAIL: import runs not logged'; end if;
end $$;

-- A failing row rolls back the whole import.
select pg_temp.expect_error(
  $$select public.import_catalogue('{"products": [
      {"sku": "NEW-1", "name": "New", "slug": "new-1", "brand": null, "category": "inverters", "priceInclVat": 1,
       "stockQty": 0, "allowBackorder": false, "shippingClass": "standard", "isDangerousGoods": false, "specs": []},
      {"sku": "NEW-2", "name": "Bad", "slug": "new-2", "brand": null, "category": "toasters", "priceInclVat": 1,
       "stockQty": 0, "allowBackorder": false, "shippingClass": "standard", "isDangerousGoods": false, "specs": []}]}')$$,
  'import with an unknown category', 'Unknown category');
do $$ begin
  if exists (select 1 from public.products where sku = 'NEW-1') then
    raise exception 'FAIL: partial import was not rolled back';
  end if;
end $$;

reset role;
