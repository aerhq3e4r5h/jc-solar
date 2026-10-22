-- Catalogue import: one atomic call that inserts or updates products by SKU.
--
-- The importer (scripts/import-catalogue.ts and the admin Import page) cleans
-- and validates every row in TypeScript, then sends the whole batch here.
-- Re-importing an updated spreadsheet updates existing products (matched on
-- SKU, case-insensitive) and never creates duplicates.
--
-- On update the import only touches the fields the spreadsheet owns: name,
-- brand, category, price, stock and backorder, plus specs read from the
-- name. Anything an admin filled in by hand (descriptions, weights, images,
-- warranty, extra specs, shipping class) is left alone.

-- Recompute the "incomplete" flags from what is actually stored.
-- p_required maps category slug -> array of required spec keys.
create or replace function public.refresh_incomplete_fields(p_product_ids uuid[], p_required jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set incomplete_fields = array(
    select f from unnest(array[
      case when p.description is null or btrim(p.description) = '' then 'description' end,
      case when not exists (select 1 from public.product_images i where i.product_id = p.id) then 'images' end,
      case when p.weight_kg is null then 'weight_kg' end,
      case when p.length_mm is null or p.width_mm is null or p.height_mm is null then 'dimensions' end,
      case when p.warranty_months is null then 'warranty_months' end,
      case when p.datasheet_path is null then 'datasheet' end,
      case when p.brand_id is null then 'brand' end,
      case when c.slug = 'inverters' and p.nrs_097_2_1_approved is null then 'nrs_097_2_1_approved' end
    ]) as f where f is not null
    union all
    select 'spec:' || req.key
    from jsonb_array_elements_text(coalesce(p_required -> c.slug, '[]'::jsonb)) as req(key)
    where not exists (select 1 from public.product_specs s where s.product_id = p.id and s.key = req.key)
  )
  from public.categories c
  where c.id = p.category_id and p.id = any (p_product_ids);
end;
$$;

create or replace function public.import_catalogue(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role');
  v_log_id bigint;
  v_item jsonb;
  v_spec jsonb;
  v_brand_id uuid;
  v_category_id uuid;
  v_existing public.products%rowtype;
  v_product_id uuid;
  v_inserted int := 0;
  v_updated int := 0;
  v_unchanged int := 0;
  v_touched uuid[] := '{}';
  v_slug text;
begin
  -- Allowed for admins, the service role, and direct database connections
  -- (e.g. seeding with psql), which carry no API JWT at all.
  if not (public.is_admin() or v_jwt_role = 'service_role' or (v_jwt_role is null and auth.uid() is null)) then
    raise exception 'Only an admin can import the catalogue';
  end if;

  insert into public.import_logs (file_name, file_sha256, run_by, dry_run, rows_total, rows_skipped, rows_invalid, report)
  values (
    coalesce(p_payload ->> 'fileName', 'unknown'),
    p_payload ->> 'fileSha256',
    auth.uid(),
    false,
    coalesce((p_payload ->> 'rowsTotal')::int, 0),
    coalesce((p_payload ->> 'rowsSkipped')::int, 0),
    coalesce((p_payload ->> 'rowsInvalid')::int, 0),
    coalesce(p_payload -> 'report', '{}'::jsonb)
  )
  returning id into v_log_id;

  for v_item in select * from jsonb_array_elements(p_payload -> 'products')
  loop
    select id into v_category_id from public.categories where slug = v_item ->> 'category';
    if v_category_id is null then
      raise exception 'Unknown category % for SKU %', v_item ->> 'category', v_item ->> 'sku';
    end if;

    v_brand_id := null;
    if nullif(v_item ->> 'brand', '') is not null then
      insert into public.brands (slug, name)
      values (
        trim(both '-' from regexp_replace(lower(v_item ->> 'brand'), '[^a-z0-9]+', '-', 'g')),
        v_item ->> 'brand')
      on conflict (name) do nothing;
      select id into v_brand_id from public.brands where name = v_item ->> 'brand';
    end if;

    select * into v_existing from public.products where lower(sku) = lower(v_item ->> 'sku') for update;

    if not found then
      v_slug := v_item ->> 'slug';
      if exists (select 1 from public.products where slug = v_slug) then
        v_slug := left(v_slug || '-' || substr(md5(v_item ->> 'sku'), 1, 6), 120);
      end if;
      insert into public.products (
        sku, name, slug, brand_id, category_id, price_incl_vat, stock_qty, allow_backorder,
        shipping_class, is_dangerous_goods, installation_eligible, source_import_id)
      values (
        v_item ->> 'sku', v_item ->> 'name', v_slug, v_brand_id, v_category_id,
        (v_item ->> 'priceInclVat')::numeric, (v_item ->> 'stockQty')::int,
        (v_item ->> 'allowBackorder')::boolean,
        (v_item ->> 'shippingClass')::public.shipping_class,
        (v_item ->> 'isDangerousGoods')::boolean, true, v_log_id)
      returning id into v_product_id;
      if (v_item ->> 'stockQty')::int <> 0 then
        insert into public.inventory_movements (product_id, delta, reason, reference, created_by)
        values (v_product_id, (v_item ->> 'stockQty')::int, 'import', 'import #' || v_log_id, auth.uid());
      end if;
      v_inserted := v_inserted + 1;
    else
      v_product_id := v_existing.id;
      if v_existing.name is distinct from v_item ->> 'name'
         or v_existing.brand_id is distinct from v_brand_id
         or v_existing.category_id is distinct from v_category_id
         or v_existing.price_incl_vat is distinct from (v_item ->> 'priceInclVat')::numeric
         or v_existing.stock_qty is distinct from (v_item ->> 'stockQty')::int
         or v_existing.allow_backorder is distinct from (v_item ->> 'allowBackorder')::boolean
         or v_existing.deleted_at is not null then
        update public.products set
          name = v_item ->> 'name',
          brand_id = v_brand_id,
          category_id = v_category_id,
          price_incl_vat = (v_item ->> 'priceInclVat')::numeric,
          stock_qty = (v_item ->> 'stockQty')::int,
          allow_backorder = (v_item ->> 'allowBackorder')::boolean,
          deleted_at = null,
          source_import_id = v_log_id
        where id = v_product_id;
        if v_existing.stock_qty <> (v_item ->> 'stockQty')::int then
          insert into public.inventory_movements (product_id, delta, reason, reference, created_by)
          values (v_product_id, (v_item ->> 'stockQty')::int - v_existing.stock_qty, 'import',
                  'import #' || v_log_id, auth.uid());
        end if;
        v_updated := v_updated + 1;
      else
        v_unchanged := v_unchanged + 1;
      end if;
    end if;

    -- Upsert specs read from the name; specs added by hand are kept.
    for v_spec in select * from jsonb_array_elements(coalesce(v_item -> 'specs', '[]'::jsonb))
    loop
      insert into public.product_specs (product_id, key, label, value_text, value_num, unit, sort_order)
      values (
        v_product_id, v_spec ->> 'key', v_spec ->> 'label', v_spec ->> 'valueText',
        (v_spec ->> 'valueNum')::numeric, nullif(v_spec ->> 'unit', ''), 0)
      on conflict (product_id, key) do update
        set label = excluded.label, value_text = excluded.value_text,
            value_num = excluded.value_num, unit = excluded.unit;
    end loop;

    v_touched := v_touched || v_product_id;
  end loop;

  perform public.refresh_incomplete_fields(v_touched, coalesce(p_payload -> 'requiredSpecs', '{}'::jsonb));

  update public.import_logs
    set rows_inserted = v_inserted, rows_updated = v_updated
    where id = v_log_id;

  return jsonb_build_object(
    'importId', v_log_id, 'inserted', v_inserted, 'updated', v_updated, 'unchanged', v_unchanged);
end;
$$;

revoke execute on function public.import_catalogue(jsonb) from public, anon;
revoke execute on function public.refresh_incomplete_fields(uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.import_catalogue(jsonb) to authenticated, service_role;
grant execute on function public.refresh_incomplete_fields(uuid[], jsonb) to service_role;
