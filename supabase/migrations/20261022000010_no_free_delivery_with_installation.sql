-- Installation does not include free delivery: delivery is charged like any
-- other order. The admin can still switch it on in /admin/delivery.
alter table public.shipping_settings alter column free_delivery_with_installation set default false;
update public.shipping_settings set free_delivery_with_installation = false;
