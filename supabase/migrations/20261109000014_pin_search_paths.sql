-- Hardening flagged by Supabase's security advisor: pin the search_path of the
-- remaining trigger functions so they can't be steered to other schemas.
alter function public.set_updated_at() set search_path = public;
alter function public.enforce_dangerous_goods() set search_path = public;
alter function public.prevent_invoice_changes() set search_path = public;
