-- Brand kit extras + public storage for logos

alter table public.brand_kits
  add column if not exists tagline text,
  add column if not exists logo_options jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for brand assets; writes go through service_role backend only.
drop policy if exists "brand_assets_public_read" on storage.objects;
create policy "brand_assets_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'brand-assets');
