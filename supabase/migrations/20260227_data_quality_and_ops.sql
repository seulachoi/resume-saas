-- ResumeUp: data quality + operations observability baseline
-- Safe to run multiple times where possible.

-- 1) checkout_sessions hardening for KPI tracking
alter table if exists public.checkout_sessions
  add column if not exists variant_id text,
  add column if not exists topup_only boolean not null default false,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists generation_error text;

create index if not exists idx_checkout_sessions_status_created_at
  on public.checkout_sessions(status, created_at);

create index if not exists idx_checkout_sessions_user_created_at
  on public.checkout_sessions(user_id, created_at desc);

create index if not exists idx_checkout_sessions_variant_id
  on public.checkout_sessions(variant_id);

-- 2) webhook events (idempotency + processing log)
create table if not exists public.webhook_events (
  event_id text primary key,
  event_name text,
  sid text,
  order_id text,
  process_status text not null default 'received',
  error_text text,
  payload jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_webhook_events_received_at
  on public.webhook_events(received_at desc);

create index if not exists idx_webhook_events_process_status
  on public.webhook_events(process_status, received_at desc);

-- Backfill columns in case table existed before
alter table if exists public.webhook_events
  add column if not exists event_name text,
  add column if not exists sid text,
  add column if not exists order_id text,
  add column if not exists process_status text not null default 'received',
  add column if not exists error_text text,
  add column if not exists processed_at timestamptz;

-- 3) generation events (for failure-rate / latency)
create table if not exists public.generation_events (
  id bigserial primary key,
  sid text not null,
  user_id uuid,
  event_type text not null, -- started | success | failed
  duration_ms integer,
  error_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_generation_events_sid_created_at
  on public.generation_events(sid, created_at desc);

create index if not exists idx_generation_events_type_created_at
  on public.generation_events(event_type, created_at desc);

-- 4) Views for ops checks / alerts
create or replace view public.ops_paid_stalled as
select
  id,
  user_id,
  created_at,
  now() - created_at as age,
  variant_id,
  topup_only
from public.checkout_sessions
where status = 'paid'
  and coalesce(topup_only, false) = false
  and created_at < now() - interval '10 minutes';

create or replace view public.ops_credit_added_no_report as
select
  id,
  user_id,
  created_at,
  variant_id,
  credits,
  topup_only,
  status
from public.checkout_sessions
where credits > 0
  and coalesce(topup_only, false) = false
  and status in ('paid');

create or replace view public.ops_webhook_failure_rate_1d as
select
  now() as measured_at,
  count(*) filter (where process_status = 'failed')::float / nullif(count(*), 0) as failure_rate,
  count(*) filter (where process_status = 'failed') as failed_events,
  count(*) as total_events
from public.webhook_events
where received_at >= now() - interval '1 day';

create or replace view public.ops_generate_failure_rate_1d as
select
  now() as measured_at,
  count(*) filter (where event_type = 'failed')::float / nullif(count(*), 0) as failure_rate,
  count(*) filter (where event_type = 'failed') as failed_events,
  count(*) as total_events
from public.generation_events
where created_at >= now() - interval '1 day';
