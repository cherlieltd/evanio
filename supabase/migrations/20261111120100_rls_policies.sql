-- Row Level Security: users see/manage their own rows; admins can read everything.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.brand_kits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.generations enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.social_accounts enable row level security;
alter table public.scheduled_posts enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Inserts come from the signup trigger (security definer), not clients.
-- Role changes are blocked in 20261111120300_signup_trigger.sql.

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create policy "businesses_select_own_or_admin"
  on public.businesses
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "businesses_insert_own"
  on public.businesses
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "businesses_update_own"
  on public.businesses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "businesses_delete_own"
  on public.businesses
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- brand_kits (via business ownership)
-- ---------------------------------------------------------------------------
create policy "brand_kits_select_own_or_admin"
  on public.brand_kits
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.businesses b
      where b.id = brand_kits.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "brand_kits_insert_own"
  on public.brand_kits
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = brand_kits.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "brand_kits_update_own"
  on public.brand_kits
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = brand_kits.business_id
        and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = brand_kits.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "brand_kits_delete_own"
  on public.brand_kits
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = brand_kits.business_id
        and b.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- subscriptions (read own; writes via service role / backend)
-- ---------------------------------------------------------------------------
create policy "subscriptions_select_own_or_admin"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- credit_balances (read own; mutations via service role / deduct_credits)
-- ---------------------------------------------------------------------------
create policy "credit_balances_select_own_or_admin"
  on public.credit_balances
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- credit_transactions (read own; inserts via service role / deduct_credits)
-- ---------------------------------------------------------------------------
create policy "credit_transactions_select_own_or_admin"
  on public.credit_transactions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- generations
-- ---------------------------------------------------------------------------
create policy "generations_select_own_or_admin"
  on public.generations
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "generations_insert_own"
  on public.generations
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "generations_update_own"
  on public.generations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "generations_delete_own"
  on public.generations
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- chat_conversations
-- ---------------------------------------------------------------------------
create policy "chat_conversations_select_own_or_admin"
  on public.chat_conversations
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "chat_conversations_insert_own"
  on public.chat_conversations
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "chat_conversations_update_own"
  on public.chat_conversations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "chat_conversations_delete_own"
  on public.chat_conversations
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- chat_messages (via conversation ownership)
-- ---------------------------------------------------------------------------
create policy "chat_messages_select_own_or_admin"
  on public.chat_messages
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "chat_messages_insert_own"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "chat_messages_update_own"
  on public.chat_messages
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "chat_messages_delete_own"
  on public.chat_messages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- social_accounts
-- ---------------------------------------------------------------------------
create policy "social_accounts_select_own_or_admin"
  on public.social_accounts
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "social_accounts_insert_own"
  on public.social_accounts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "social_accounts_update_own"
  on public.social_accounts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "social_accounts_delete_own"
  on public.social_accounts
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- scheduled_posts
-- ---------------------------------------------------------------------------
create policy "scheduled_posts_select_own_or_admin"
  on public.scheduled_posts
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "scheduled_posts_insert_own"
  on public.scheduled_posts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "scheduled_posts_update_own"
  on public.scheduled_posts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "scheduled_posts_delete_own"
  on public.scheduled_posts
  for delete
  to authenticated
  using (user_id = auth.uid());
