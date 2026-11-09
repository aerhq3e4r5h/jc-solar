-- Customer accounts: when someone signs in with a confirmed email address, orders
-- and quotes they placed as a guest with that same address move into their account.
--
-- Passwords never touch these tables: Supabase Auth stores them (hashed with bcrypt)
-- in auth.users. Only a CONFIRMED email can claim anything, so signing up with
-- somebody else's address cannot reveal their orders.

create or replace function public.claim_guest_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_orders int;
  v_quotes int;
begin
  select u.email into v_email
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;

  if v_email is null then
    return 0;
  end if;

  update public.orders
     set user_id = auth.uid()
   where user_id is null and deleted_at is null and lower(email) = lower(v_email);
  get diagnostics v_orders = row_count;

  update public.quotes
     set user_id = auth.uid()
   where user_id is null and lower(email) = lower(v_email);
  get diagnostics v_quotes = row_count;

  return v_orders + v_quotes;
end;
$$;

revoke all on function public.claim_guest_orders() from public, anon;
grant execute on function public.claim_guest_orders() to authenticated;
