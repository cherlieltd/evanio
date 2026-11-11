-- Structured generation payloads (ad copy, campaign plans, etc.)

alter table public.generations
  add column if not exists result_json jsonb;
