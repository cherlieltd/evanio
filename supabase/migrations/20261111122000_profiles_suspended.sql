-- Allow admins to suspend user accounts without deleting them.
alter table public.profiles
  add column if not exists suspended boolean not null default false;

create index if not exists profiles_suspended_idx
  on public.profiles (suspended)
  where suspended = true;
