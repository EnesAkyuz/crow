-- Add expiry notification settings to vault_sessions
-- Allows users to receive email warnings before cookies expire

-- Add notification columns to vault_sessions
alter table public.vault_sessions 
  add column if not exists notification_email text,
  add column if not exists expiry_warning_minutes integer default 1440, -- default 24 hours
  add column if not exists last_warning_sent_at timestamptz;

-- Common warning intervals (in minutes):
-- 5 = 5 minutes before
-- 10 = 10 minutes before
-- 30 = 30 minutes before
-- 60 = 1 hour before
-- 1440 = 24 hours before
-- 4320 = 3 days before
-- 10080 = 1 week before

-- Create a table to track sent notifications (for audit and preventing duplicates)
create table if not exists public.vault_notification_logs (
  id uuid primary key default gen_random_uuid(),
  vault_session_id uuid not null references public.vault_sessions(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  notification_type text not null default 'expiry_warning',
  sent_to text not null,
  sent_at timestamptz not null default now(),
  warning_minutes integer not null,
  session_expires_at timestamptz,
  resend_message_id text
);

-- Index for finding sessions that need notifications
create index if not exists idx_vault_sessions_notification_due 
  on public.vault_sessions(expires_at, expiry_warning_minutes, last_warning_sent_at)
  where notification_email is not null and expires_at is not null;

-- Index for notification logs
create index if not exists idx_vault_notification_logs_session 
  on public.vault_notification_logs(vault_session_id);

-- RLS for notification logs
alter table public.vault_notification_logs enable row level security;

create policy "Org members can view notification logs"
  on public.vault_notification_logs for select
  using ( is_org_member_of_tenant(tenant_id) );

-- Function to get sessions that need warning notifications
create or replace function public.get_sessions_needing_notification()
returns table (
  session_id uuid,
  session_name text,
  tenant_id uuid,
  tenant_name text,
  notification_email text,
  expires_at timestamptz,
  warning_minutes integer
)
language sql
security definer
set search_path = ''
as $$
  select 
    vs.id as session_id,
    vs.name as session_name,
    vs.tenant_id,
    t.name as tenant_name,
    vs.notification_email,
    vs.expires_at,
    vs.expiry_warning_minutes as warning_minutes
  from public.vault_sessions vs
  join public.tenants t on vs.tenant_id = t.id
  where 
    vs.notification_email is not null
    and vs.expires_at is not null
    and vs.is_active = true
    -- Session expires within the warning window
    and vs.expires_at <= now() + (vs.expiry_warning_minutes || ' minutes')::interval
    -- Haven't sent a warning yet, or last warning was for a different expiry time
    and (
      vs.last_warning_sent_at is null 
      or vs.last_warning_sent_at < now() - interval '1 hour'
    )
    -- Not already expired
    and vs.expires_at > now();
$$;

-- Update the secure view to include notification fields
drop view if exists public.vault_sessions_with_stats;

create view public.vault_sessions_with_stats
with (security_invoker = true)
as
select 
  vs.*,
  coalesce(hourly.request_count, 0) as hourly_requests,
  coalesce(daily.request_count, 0) as daily_requests,
  (
    select count(*) 
    from public.vault_error_logs vel 
    where vel.vault_session_id = vs.id 
    and vel.created_at > now() - interval '24 hours'
  ) as errors_last_24h,
  case 
    when vs.expires_at is null then 'no_expiry'
    when vs.expires_at < now() then 'expired'
    when vs.expires_at < now() + interval '3 days' then 'expiring_soon'
    else 'active'
  end as expiry_status
from public.vault_sessions vs
left join public.vault_rate_limits hourly 
  on hourly.vault_session_id = vs.id 
  and hourly.window_type = 'hourly' 
  and hourly.window_start = date_trunc('hour', now())
left join public.vault_rate_limits daily 
  on daily.vault_session_id = vs.id 
  and daily.window_type = 'daily' 
  and daily.window_start = date_trunc('day', now());

grant select on public.vault_sessions_with_stats to authenticated;
