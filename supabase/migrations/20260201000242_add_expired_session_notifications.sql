-- Add column to track if expired notification was sent
alter table public.vault_sessions 
  add column if not exists expired_notification_sent boolean default false;

-- Function to get already-expired sessions that need notification
create or replace function public.get_expired_sessions_needing_notification()
returns table (
  session_id uuid,
  session_name text,
  tenant_id uuid,
  tenant_name text,
  notification_email text,
  expires_at timestamptz
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
    vs.expires_at
  from public.vault_sessions vs
  join public.tenants t on vs.tenant_id = t.id
  where 
    vs.notification_email is not null
    and vs.expires_at is not null
    and vs.is_active = true
    -- Session has already expired
    and vs.expires_at <= now()
    -- Haven't sent expired notification yet
    and vs.expired_notification_sent = false;
$$;
