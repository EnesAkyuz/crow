-- Secure vault_sessions_with_stats view with security_invoker
-- This makes the view respect RLS policies of the underlying tables

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

-- Re-grant access
grant select on public.vault_sessions_with_stats to authenticated;
