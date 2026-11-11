-- Meta / social inbox + encrypted page tokens

alter table public.social_accounts
  add column if not exists access_token_encrypted text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists auto_reply_enabled boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists social_accounts_user_platform_external_uidx
  on public.social_accounts (user_id, platform, external_account_id);

alter table public.scheduled_posts
  add column if not exists published_at timestamptz,
  add column if not exists external_post_id text,
  add column if not exists error text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists scheduled_posts_status_scheduled_at_idx
  on public.scheduled_posts (status, scheduled_at);

create table if not exists public.social_inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  social_account_id uuid references public.social_accounts (id) on delete set null,
  platform text not null check (platform in ('facebook', 'instagram')),
  thread_type text not null check (thread_type in ('message', 'comment')),
  external_thread_id text,
  external_item_id text not null,
  sender_id text,
  sender_name text,
  content text not null default '',
  status text not null default 'new'
    check (status in ('new', 'replied', 'handed_off', 'ignored', 'failed')),
  ai_reply text,
  confidence text,
  handoff_reason text,
  replied_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists social_inbox_items_external_item_uidx
  on public.social_inbox_items (external_item_id);

create index if not exists social_inbox_items_user_id_idx
  on public.social_inbox_items (user_id, created_at desc);

create index if not exists social_inbox_items_status_idx
  on public.social_inbox_items (user_id, status);

alter table public.social_inbox_items enable row level security;

drop policy if exists "social_inbox_items_select_own_or_admin" on public.social_inbox_items;
create policy "social_inbox_items_select_own_or_admin"
  on public.social_inbox_items
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "social_inbox_items_update_own" on public.social_inbox_items;
create policy "social_inbox_items_update_own"
  on public.social_inbox_items
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
