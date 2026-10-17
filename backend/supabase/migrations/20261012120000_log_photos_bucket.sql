-- Public-read bucket for logbook photos. Files live under "<auth user id>/<file>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('log-photos', 'log-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Signed-in users may upload into their own folder only.
drop policy if exists "log-photos upload own folder" on storage.objects;
create policy "log-photos upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ...and may delete their own files.
drop policy if exists "log-photos delete own" on storage.objects;
create policy "log-photos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone with the link can view (the bucket is public, so no select policy is needed for URLs).
