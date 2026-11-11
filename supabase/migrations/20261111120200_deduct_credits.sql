-- Atomically deduct credits: plan_credits first, then purchased_credits.
-- Logs a credit_transactions row. Fails if balance is insufficient.
-- Intended for backend (service_role) only.

create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_feature text
)
returns public.credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.credit_balances;
  v_from_plan integer;
  v_from_purchased integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be a positive integer';
  end if;

  select *
  into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'credit balance not found for user %', p_user_id;
  end if;

  if (v_balance.plan_credits + v_balance.purchased_credits) < p_amount then
    raise exception 'insufficient credits'
      using errcode = 'P0001';
  end if;

  v_from_plan := least(v_balance.plan_credits, p_amount);
  v_from_purchased := p_amount - v_from_plan;

  update public.credit_balances
  set
    plan_credits = plan_credits - v_from_plan,
    purchased_credits = purchased_credits - v_from_purchased,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_balance;

  insert into public.credit_transactions (
    user_id,
    amount,
    type,
    feature,
    reference_id
  )
  values (
    p_user_id,
    -p_amount,
    'deduct',
    p_feature,
    null
  );

  return v_balance;
end;
$$;

revoke all on function public.deduct_credits(uuid, integer, text) from public;
grant execute on function public.deduct_credits(uuid, integer, text) to service_role;

comment on function public.deduct_credits(uuid, integer, text) is
  'Atomically deducts credits (plan first, then purchased), logs credit_transactions, raises on insufficient balance. Backend/service_role only.';
