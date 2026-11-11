-- Idempotent credit refunds for failed async jobs (e.g. video generation)

create or replace function public.refund_credits(
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
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be a positive integer';
  end if;

  if p_reference_id is null or length(trim(p_reference_id)) = 0 then
    raise exception 'reference_id is required';
  end if;

  -- Idempotent: if this refund already logged, return current balance.
  if exists (
    select 1
    from public.credit_transactions
    where reference_id = p_reference_id
  ) then
    select *
    into v_balance
    from public.credit_balances
    where user_id = p_user_id;

    if not found then
      raise exception 'credit balance not found for user %', p_user_id;
    end if;

    return v_balance;
  end if;

  select *
  into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'credit balance not found for user %', p_user_id;
  end if;

  update public.credit_balances
  set
    purchased_credits = purchased_credits + p_amount,
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
    p_amount,
    'refund',
    p_feature,
    p_reference_id
  );

  return v_balance;
end;
$$;

revoke all on function public.refund_credits(uuid, integer, text, text) from public;
grant execute on function public.refund_credits(uuid, integer, text, text) to service_role;

comment on function public.refund_credits(uuid, integer, text, text) is
  'Atomically refunds credits to purchased_credits with reference_id idempotency. Backend/service_role only.';

-- Live status updates for dashboard video/image galleries
do $$
begin
  alter publication supabase_realtime add table public.generations;
exception
  when duplicate_object then null;
end $$;
