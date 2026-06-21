
drop policy if exists "branding_auth_read" on storage.objects;
create policy "branding_auth_read" on storage.objects for select to authenticated
using (bucket_id = 'branding');

drop policy if exists "branding_auth_write" on storage.objects;
create policy "branding_auth_write" on storage.objects for insert to authenticated
with check (bucket_id = 'branding');

drop policy if exists "branding_auth_update" on storage.objects;
create policy "branding_auth_update" on storage.objects for update to authenticated
using (bucket_id = 'branding');

drop policy if exists "branding_auth_delete" on storage.objects;
create policy "branding_auth_delete" on storage.objects for delete to authenticated
using (bucket_id = 'branding');

drop policy if exists "receipts_owner_read" on storage.objects;
create policy "receipts_owner_read" on storage.objects for select to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_owner_write" on storage.objects;
create policy "receipts_owner_write" on storage.objects for insert to authenticated
with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipts_owner_delete" on storage.objects;
create policy "receipts_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.expenses add column if not exists receipt_url text;
