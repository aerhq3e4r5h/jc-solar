-- The business is now GridAnchor: new orders are numbered GA-100123 instead of JC-100123.
-- Existing orders keep their numbers, and the sequence carries on, so no number is reused.
alter table public.orders alter column order_number set default ('GA-' || nextval('public.order_number_seq'));
