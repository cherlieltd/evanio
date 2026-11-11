-- Website chat widget: public key, sessions, messages, leads

create table public.chat_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  public_key text not null unique,
  enabled boolean not null default true,
  welcome_message text not null default 'Hi! Ask me anything about our business.',
  primary_color text not null default '#047857',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_widgets_user_id_idx on public.chat_widgets (user_id);
create index chat_widgets_public_key_idx on public.chat_widgets (public_key);

create table public.chat_widget_sessions (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references public.chat_widgets (id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_widget_sessions_widget_id_idx
  on public.chat_widget_sessions (widget_id, created_at desc);

create unique index chat_widget_sessions_widget_visitor_uidx
  on public.chat_widget_sessions (widget_id, visitor_id);

create table public.chat_widget_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_widget_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_widget_messages_session_id_idx
  on public.chat_widget_messages (session_id, created_at);

create table public.chat_widget_leads (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references public.chat_widgets (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.chat_widget_sessions (id) on delete set null,
  name text,
  email text,
  phone text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index chat_widget_leads_user_id_idx
  on public.chat_widget_leads (user_id, created_at desc);
create index chat_widget_leads_business_id_idx
  on public.chat_widget_leads (business_id, created_at desc);

alter table public.chat_widgets enable row level security;
alter table public.chat_widget_sessions enable row level security;
alter table public.chat_widget_messages enable row level security;
alter table public.chat_widget_leads enable row level security;

create policy "chat_widgets_select_own_or_admin"
  on public.chat_widgets for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "chat_widgets_update_own"
  on public.chat_widgets for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "chat_widget_leads_select_own_or_admin"
  on public.chat_widget_leads for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Sessions/messages are written by service_role only; owners can read via backend.
create policy "chat_widget_sessions_select_own"
  on public.chat_widget_sessions for select to authenticated
  using (
    exists (
      select 1 from public.chat_widgets w
      where w.id = widget_id and w.user_id = auth.uid()
    )
  );

create policy "chat_widget_messages_select_own"
  on public.chat_widget_messages for select to authenticated
  using (
    exists (
      select 1
      from public.chat_widget_sessions s
      join public.chat_widgets w on w.id = s.widget_id
      where s.id = session_id and w.user_id = auth.uid()
    )
  );
