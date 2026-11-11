-- Public storage for AI generation outputs (images, videos)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generations',
  'generations',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "generations_public_read" on storage.objects;
create policy "generations_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'generations');
