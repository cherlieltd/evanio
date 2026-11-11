-- On auth signup: create profiles + credit_balances rows.
-- Also block clients from escalating their own profile role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    'user'
  );

  insert into public.credit_balances (user_id, plan_credits, purchased_credits)
  values (new.id, 0, 0);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow service_role / SQL editor (no JWT) to promote admins.
  -- Authenticated users cannot change role, including their own.
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'changing profile role is not allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_change();

revoke all on function public.prevent_profile_role_change() from public;
