-- Foundation: extensions, roles, profiles, shared helpers and the audit log.
-- Every table in this project has Row Level Security enabled. The service role
-- bypasses RLS and is only ever used from server code.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin', 'sales', 'technician');
create type public.trade_status as enum ('none', 'pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  phone text,
  company_name text,
  trade_status public.trade_status not null default 'none',
  marketing_email_opt_in boolean not null default false,
  marketing_whatsapp_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers. SECURITY DEFINER so policies can read the caller's role
-- without recursing into the profiles policies.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

-- Admin or sales staff (back-office access to orders, quotes and leads).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'sales'), false)
$$;

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Customers may edit their own profile, but never their role or trade status.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.trade_status is distinct from old.trade_status)
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change role or trade status';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileges before update on public.profiles
  for each row execute function public.protect_profile_privileges();

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: staff read all" on public.profiles
  for select to authenticated using (public.is_staff());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Audit log (POPIA: record admin access to and changes of personal data)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  table_name text,
  record_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_table_record_idx on public.audit_log (table_name, record_id);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_log: admin read" on public.audit_log
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policies: rows are written by the trigger below
-- (security definer) or by server code using the service role.

-- Generic write-audit trigger. Attach to any table whose changes must be traceable.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec_id text;
begin
  rec_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id');
  insert into public.audit_log (actor_id, action, table_name, record_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    rec_id,
    case tg_op
      when 'DELETE' then jsonb_build_object('old', to_jsonb(old))
      when 'INSERT' then jsonb_build_object('new', to_jsonb(new))
      else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
    end
  );
  return coalesce(new, old);
end;
$$;

create trigger profiles_audit after update or delete on public.profiles
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Addresses (soft-deletable)
-- ---------------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text,
  line1 text not null,
  line2 text,
  suburb text,
  city text not null,
  province text not null check (province in (
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  )),
  postal_code text not null check (postal_code ~ '^[0-9]{4}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index addresses_user_idx on public.addresses (user_id) where deleted_at is null;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

alter table public.addresses enable row level security;

create policy "addresses: owner read" on public.addresses
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy "addresses: owner insert" on public.addresses
  for insert to authenticated with check (user_id = auth.uid());
create policy "addresses: owner update" on public.addresses
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses: staff read" on public.addresses
  for select to authenticated using (public.is_staff());
