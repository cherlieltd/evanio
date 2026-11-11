-- Evanio core schema
-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  website text,
  industry text,
  description text,
  target_audience text,
  tone text,
  created_at timestamptz not null default now()
);

create index businesses_user_id_idx on public.businesses (user_id);

-- ---------------------------------------------------------------------------
-- brand_kits
-- ---------------------------------------------------------------------------
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  logo_url text,
  colors jsonb not null default '{}'::jsonb,
  fonts jsonb not null default '{}'::jsonb,
  style_notes text,
  created_at timestamptz not null default now()
);

create index brand_kits_business_id_idx on public.brand_kits (business_id);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);

-- ---------------------------------------------------------------------------
-- credit_balances
-- ---------------------------------------------------------------------------
create table public.credit_balances (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan_credits integer not null default 0 check (plan_credits >= 0),
  purchased_credits integer not null default 0 check (purchased_credits >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- credit_transactions
-- ---------------------------------------------------------------------------
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  type text not null,
  feature text,
  reference_id text,
  created_at timestamptz not null default now()
);

create index credit_transactions_user_id_idx on public.credit_transactions (user_id);
create index credit_transactions_created_at_idx on public.credit_transactions (created_at desc);

-- ---------------------------------------------------------------------------
-- generations
-- ---------------------------------------------------------------------------
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('image', 'video', 'copy')),
  prompt text not null,
  result_url text,
  status text not null default 'pending',
  credits_used integer not null default 0 check (credits_used >= 0),
  created_at timestamptz not null default now()
);

create index generations_user_id_idx on public.generations (user_id);
create index generations_created_at_idx on public.generations (created_at desc);

-- ---------------------------------------------------------------------------
-- Evi chat
-- ---------------------------------------------------------------------------
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_conversations_user_id_idx on public.chat_conversations (user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_conversation_id_idx on public.chat_messages (conversation_id);
create index chat_messages_created_at_idx on public.chat_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Social (stub for later)
-- ---------------------------------------------------------------------------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  platform text not null,
  account_name text,
  external_account_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index social_accounts_user_id_idx on public.social_accounts (user_id);
create index social_accounts_business_id_idx on public.social_accounts (business_id);

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  social_account_id uuid references public.social_accounts (id) on delete set null,
  content text not null default '',
  media_urls jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create index scheduled_posts_user_id_idx on public.scheduled_posts (user_id);
create index scheduled_posts_scheduled_at_idx on public.scheduled_posts (scheduled_at);
