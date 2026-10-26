-- Two new shop categories: Lemoen voltage stabilizers and Jetman inverter aircons.
insert into public.categories (slug, name, sku_prefix, sort_order) values
  ('voltage-stabilizers', 'Voltage Stabilizers', 'STB', 5),
  ('air-conditioners', 'Air Conditioners', 'AC', 6)
on conflict (slug) do nothing;
