-- Engagement and compliance: reviews, quote requests, AI advisor
-- conversations, consent records, POPIA data requests, returns (ECT s44),
-- warranty claims (CPA s56), back-in-stock alerts and versioned legal texts.

create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.quote_status as enum ('new', 'contacted', 'quoted', 'won', 'lost');
create type public.consent_type as enum (
  'cookies_analytics', 'cookies_marketing', 'marketing_email', 'marketing_whatsapp',
  'ai_conversation_storage', 'terms'
);
create type public.data_request_type as enum ('access', 'export', 'correction', 'deletion');
create type public.data_request_status as enum ('received', 'in_progress', 'completed', 'rejected');
create type public.return_reason as enum ('cooling_off', 'defective', 'wrong_item', 'damaged_in_transit', 'other');
create type public.return_status as enum ('requested', 'approved', 'received', 'refunded', 'rejected');
create type public.warranty_status as enum ('submitted', 'assessing', 'repair', 'replace', 'refund', 'manufacturer_claim', 'rejected', 'closed');

-- ---------------------------------------------------------------------------
-- Reviews (moderated)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null check (char_length(body) between 10 and 4000),
  author_display_name text not null,
  is_verified_purchase boolean not null default false,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  deleted_at timestamptz,
  unique (product_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Quote requests (commercial / large jobs) — written by server code after
-- CAPTCHA and rate-limit checks.
-- ---------------------------------------------------------------------------
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  company text,
  province text,
  details text not null,
  monthly_bill_rand numeric(12, 2),
  attachment_paths text[] not null default '{}',
  source text not null default 'quote_form',
  ai_conversation_id uuid,
  status public.quote_status not null default 'new',
  assigned_to uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger quote_requests_updated_at before update on public.quote_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AI advisor conversations (stored only with consent)
-- ---------------------------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  anonymous_id text,
  consent_given boolean not null default false,
  mode text not null default 'quick' check (mode in ('quick', 'detailed')),
  messages jsonb not null default '[]'::jsonb,
  sizing_result jsonb,
  recommended_skus text[] not null default '{}',
  lead_email text,
  lead_phone text,
  converted_order_id uuid references public.orders (id) on delete set null,
  token_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (consent_given or (lead_email is null and lead_phone is null))
);

alter table public.quote_requests
  add constraint quote_requests_ai_conversation_fk foreign key (ai_conversation_id)
  references public.ai_conversations (id) on delete set null;

create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Consent records (POPIA). Append-only: a withdrawal is a new row.
-- ---------------------------------------------------------------------------
create table public.consent_records (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  anonymous_id text,
  consent_type public.consent_type not null,
  granted boolean not null,
  document_version text,
  source text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  check (user_id is not null or anonymous_id is not null)
);

create index consent_records_subject_idx on public.consent_records (user_id, consent_type, created_at desc);

-- ---------------------------------------------------------------------------
-- POPIA data subject requests
-- ---------------------------------------------------------------------------
create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  type public.data_request_type not null,
  details text,
  status public.data_request_status not null default 'received',
  export_path text,
  handled_by uuid references auth.users (id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create trigger data_requests_audit after insert or update on public.data_requests
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Returns (ECT Act s44 cooling-off and CPA returns) and warranty claims
-- ---------------------------------------------------------------------------
create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  reason public.return_reason not null,
  details text,
  items jsonb not null,
  goods_received_at timestamptz,
  -- true when requested within 7 days of receiving the goods
  within_cooling_off boolean not null default false,
  status public.return_status not null default 'requested',
  refund_id uuid references public.refunds (id),
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger return_requests_updated_at before update on public.return_requests
  for each row execute function public.set_updated_at();

create table public.warranty_claims (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete restrict,
  order_item_id uuid references public.order_items (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  serial_number text,
  fault_description text not null,
  -- true while inside the CPA s56 six-month implied warranty
  within_cpa_six_months boolean not null default false,
  status public.warranty_status not null default 'submitted',
  resolution_notes text,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger warranty_claims_updated_at before update on public.warranty_claims
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Back-in-stock alerts
-- ---------------------------------------------------------------------------
create table public.back_in_stock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  email text not null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, email)
);

-- ---------------------------------------------------------------------------
-- Versioned legal documents (terms, privacy, returns). Orders store the
-- terms version the customer accepted.
-- ---------------------------------------------------------------------------
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug in ('terms', 'privacy', 'returns', 'delivery', 'paia', 'cookies')),
  version text not null,
  title text not null,
  body_markdown text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.reviews enable row level security;
alter table public.quote_requests enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.consent_records enable row level security;
alter table public.data_requests enable row level security;
alter table public.return_requests enable row level security;
alter table public.warranty_claims enable row level security;
alter table public.back_in_stock_requests enable row level security;
alter table public.legal_documents enable row level security;

create policy "reviews: public read approved" on public.reviews
  for select using (status = 'approved' and deleted_at is null);
create policy "reviews: owner read" on public.reviews
  for select to authenticated using (user_id = auth.uid());
create policy "reviews: owner insert" on public.reviews
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'pending' and not is_verified_purchase);
create policy "reviews: staff all" on public.reviews
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "quote_requests: owner read" on public.quote_requests
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy "quote_requests: staff all" on public.quote_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "ai_conversations: owner read" on public.ai_conversations
  for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy "ai_conversations: staff read consented" on public.ai_conversations
  for select to authenticated using (public.is_staff() and consent_given);

create policy "consent_records: owner read" on public.consent_records
  for select to authenticated using (user_id = auth.uid());
create policy "consent_records: owner insert" on public.consent_records
  for insert to authenticated with check (user_id = auth.uid());
create policy "consent_records: admin read" on public.consent_records
  for select to authenticated using (public.is_admin());

create policy "data_requests: owner read" on public.data_requests
  for select to authenticated using (user_id = auth.uid());
create policy "data_requests: owner insert" on public.data_requests
  for insert to authenticated with check (user_id = auth.uid() and status = 'received');
create policy "data_requests: admin all" on public.data_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "return_requests: owner read" on public.return_requests
  for select to authenticated using (user_id = auth.uid());
create policy "return_requests: owner insert" on public.return_requests
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'requested'
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "return_requests: staff all" on public.return_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "warranty_claims: owner read" on public.warranty_claims
  for select to authenticated using (user_id = auth.uid());
create policy "warranty_claims: owner insert" on public.warranty_claims
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'submitted'
    and (order_id is null or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())));
create policy "warranty_claims: staff all" on public.warranty_claims
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "back_in_stock_requests: owner all" on public.back_in_stock_requests
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "back_in_stock_requests: staff read" on public.back_in_stock_requests
  for select to authenticated using (public.is_staff());

create policy "legal_documents: public read published" on public.legal_documents
  for select using (published_at is not null and published_at <= now());
create policy "legal_documents: admin all" on public.legal_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
