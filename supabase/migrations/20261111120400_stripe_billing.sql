-- Stripe webhook idempotency + safer credit transaction references

create table public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- No client policies — service_role only.

create unique index credit_transactions_reference_id_uidx
  on public.credit_transactions (reference_id)
  where reference_id is not null;

create index subscriptions_stripe_subscription_id_idx
  on public.subscriptions (stripe_subscription_id);
