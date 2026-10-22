-- Storage buckets and access rules.
--
-- Path conventions (enforced by the policies below):
--   product-images/<product_id>/<file>        public
--   datasheets/<product_id>/<file>            public
--   installation-photos/<user_id>/<file>      customer uploads (DB board, roof)
--   coc-documents/<booking_id>/<file>         CoC and completion photos
--   invoices/<order_id>/<file>.pdf            written by the server only
--   imports/<file>                            admin catalogue uploads

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('datasheets', 'datasheets', true, 15728640, array['application/pdf']),
  ('installation-photos', 'installation-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('coc-documents', 'coc-documents', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('invoices', 'invoices', false, 5242880, array['application/pdf']),
  ('imports', 'imports', false, 20971520, array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'])
on conflict (id) do nothing;

-- Public catalogue files: anyone reads, admins write.
create policy "catalogue files: public read" on storage.objects
  for select using (bucket_id in ('product-images', 'datasheets'));
create policy "catalogue files: admin write" on storage.objects
  for all to authenticated
  using (bucket_id in ('product-images', 'datasheets', 'imports') and public.is_admin())
  with check (bucket_id in ('product-images', 'datasheets', 'imports') and public.is_admin());

-- Installation photos: customers upload into their own folder.
create policy "installation photos: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'installation-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "installation photos: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'installation-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "installation photos: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'installation-photos' and public.is_staff());
create policy "installation photos: technician read own jobs" on storage.objects
  for select to authenticated
  using (bucket_id = 'installation-photos' and exists (
    select 1 from public.installation_bookings b
    where b.technician_id = public.current_technician_id()
      and (name = any (b.db_board_photo_paths) or name = any (b.roof_photo_paths))));

-- CoC documents: staff and the assigned technician write; the customer reads.
create policy "coc: staff all" on storage.objects
  for all to authenticated
  using (bucket_id = 'coc-documents' and public.is_staff())
  with check (bucket_id = 'coc-documents' and public.is_staff());
create policy "coc: technician write own jobs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'coc-documents' and exists (
    select 1 from public.installation_bookings b
    where b.id::text = (storage.foldername(name))[1]
      and b.technician_id = public.current_technician_id()));
create policy "coc: technician read own jobs" on storage.objects
  for select to authenticated
  using (bucket_id = 'coc-documents' and exists (
    select 1 from public.installation_bookings b
    where b.id::text = (storage.foldername(name))[1]
      and b.technician_id = public.current_technician_id()));
create policy "coc: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'coc-documents' and exists (
    select 1 from public.installation_bookings b
    where b.id::text = (storage.foldername(name))[1] and b.user_id = auth.uid()));

-- Invoices: customers read their own; only the server writes.
create policy "invoices: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices' and exists (
    select 1 from public.orders o
    where o.id::text = (storage.foldername(name))[1] and o.user_id = auth.uid()));
create policy "invoices: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices' and public.is_staff());
