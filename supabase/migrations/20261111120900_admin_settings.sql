-- App settings for admin-editable config (billing catalog, etc.)

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.app_settings enable row level security;

-- No client policies — service_role / backend only.

create or replace function public.admin_adjust_credits(
  p_user_id uuid,
  p_amount integer,
  p_feature text,
  p_reference_id text
)
returns public.credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.credit_balances;
  v_need integer;
  v_from_plan integer;
  v_from_purchased integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_amount is null or p_amount = 0 then
    raise exception 'amount must be a non-zero integer';
  end if;

  if p_reference_id is null or length(trim(p_reference_id)) = 0 then
    raise exception 'reference_id is required';
  end if;

  if exists (
    select 1 from public.credit_transactions where reference_id = p_reference_id
  ) then
    select * into v_balance from public.credit_balances where user_id = p_user_id;
    if not found then
      raise exception 'credit balance not found for user %', p_user_id;
    end if;
    return v_balance;
  end if;

  select * into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'credit balance not found for user %', p_user_id;
  end if;

  if p_amount < 0 and (v_balance.plan_credits + v_balance.purchased_credits) < abs(p_amount) then
    raise exception 'insufficient credits'
      using errcode = 'P0001';
  end if;

  if p_amount > 0 then
    update public.credit_balances
    set
      purchased_credits = purchased_credits + p_amount,
      updated_at = now()
    where user_id = p_user_id
    returning * into v_balance;
  else
    v_need := abs(p_amount);
    v_from_plan := least(v_balance.plan_credits, v_need);
    v_from_purchased := v_need - v_from_plan;

    update public.credit_balances
    set
      plan_credits = plan_credits - v_from_plan,
      purchased_credits = purchased_credits - v_from_purchased,
      updated_at = now()
    where user_id = p_user_id
    returning * into v_balance;
  end if;

  insert into public.credit_transactions (
    user_id,
    amount,
    type,
    feature,
    reference_id
  )
  values (
    p_user_id,
    p_amount,
    'admin_adjust',
    p_feature,
    p_reference_id
  );

  return v_balance;
end;
$$;

revoke all on function public.admin_adjust_credits(uuid, integer, text, text) from public;
grant execute on function public.admin_adjust_credits(uuid, integer, text, text) to service_role;
