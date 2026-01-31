-- Enhanced Vault Sessions Schema
-- Adds: session name/label, expiration tracking, rate limits, and error logs

-- Add new columns to vault_sessions
alter table public.vault_sessions
  add column if not exists name text not null default 'Default Session',
  add column if not exists description text,
  add column if not exists expires_at timestamptz,
  add column if not exists expiry_warning_sent boolean default false,
  add column if not exists is_active boolean default true,
  add column if not exists last_used_at timestamptz,
  add column if not exists use_count integer default 0,
  add column if not exists rate_limit_per_hour integer default 60,
  add column if not exists rate_limit_per_day integer default 500,
  add column if not exists created_by uuid references public.profiles(id);

-- Vault session error logs
create table public.vault_error_logs (
  id uuid default gen_random_uuid() primary key,
  vault_session_id uuid references public.vault_sessions(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  error_type text not null check (error_type in ('auth_failed', 'rate_limited', 'timeout', 'network', 'parse_error', 'unknown')),
  error_message text,
  status_code integer,
  request_url text,
  created_at timestamptz default now()
);

alter table public.vault_error_logs enable row level security;

-- Rate limit tracking for vault sessions
create table public.vault_rate_limits (
  id uuid default gen_random_uuid() primary key,
  vault_session_id uuid references public.vault_sessions(id) on delete cascade not null,
  window_start timestamptz not null,
  window_type text not null check (window_type in ('hourly', 'daily')),
  request_count integer default 0,
  created_at timestamptz default now(),
  unique (vault_session_id, window_start, window_type)
);

alter table public.vault_rate_limits enable row level security;

-- Helper function to check if user is member of the org that owns the tenant
-- Note: Function already exists from previous migration, skipping recreation
-- If you need to modify, use: drop function ... cascade; then recreate all dependent policies

-- RLS Policies for vault_sessions (update existing)
drop policy if exists "Org members can view vault sessions" on public.vault_sessions;
drop policy if exists "Org members can create vault sessions" on public.vault_sessions;
drop policy if exists "Org members can update vault sessions" on public.vault_sessions;
drop policy if exists "Org members can delete vault sessions" on public.vault_sessions;

create policy "Org members can view vault sessions"
  on public.vault_sessions for select
  using ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can create vault sessions"
  on public.vault_sessions for insert
  with check ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can update vault sessions"
  on public.vault_sessions for update
  using ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can delete vault sessions"
  on public.vault_sessions for delete
  using ( is_org_member_of_tenant(tenant_id) );

-- RLS Policies for vault_error_logs
create policy "Org members can view vault error logs"
  on public.vault_error_logs for select
  using ( is_org_member_of_tenant(tenant_id) );

create policy "System can insert error logs"
  on public.vault_error_logs for insert
  with check ( is_org_member_of_tenant(tenant_id) );

-- RLS Policies for vault_rate_limits
create policy "Org members can view rate limits"
  on public.vault_rate_limits for select
  using ( 
    exists (
      select 1 from public.vault_sessions vs
      where vs.id = vault_session_id
      and is_org_member_of_tenant(vs.tenant_id)
    )
  );

create policy "System can manage rate limits"
  on public.vault_rate_limits for all
  using ( 
    exists (
      select 1 from public.vault_sessions vs
      where vs.id = vault_session_id
      and is_org_member_of_tenant(vs.tenant_id)
    )
  );

-- Function to increment vault session usage and check rate limits
create or replace function public.use_vault_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session record;
  v_hourly_count integer;
  v_daily_count integer;
  v_hour_start timestamptz;
  v_day_start timestamptz;
begin
  -- Get session details
  select * into v_session from public.vault_sessions where id = p_session_id;
  
  if not found then
    return jsonb_build_object('success', false, 'error', 'Session not found');
  end if;
  
  if not v_session.is_active then
    return jsonb_build_object('success', false, 'error', 'Session is inactive');
  end if;
  
  if v_session.expires_at is not null and v_session.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'Session has expired');
  end if;
  
  -- Calculate window starts
  v_hour_start := date_trunc('hour', now());
  v_day_start := date_trunc('day', now());
  
  -- Upsert hourly rate limit
  insert into public.vault_rate_limits (vault_session_id, window_start, window_type, request_count)
  values (p_session_id, v_hour_start, 'hourly', 1)
  on conflict (vault_session_id, window_start, window_type) 
  do update set request_count = public.vault_rate_limits.request_count + 1
  returning request_count into v_hourly_count;
  
  -- Upsert daily rate limit
  insert into public.vault_rate_limits (vault_session_id, window_start, window_type, request_count)
  values (p_session_id, v_day_start, 'daily', 1)
  on conflict (vault_session_id, window_start, window_type) 
  do update set request_count = public.vault_rate_limits.request_count + 1
  returning request_count into v_daily_count;
  
  -- Check rate limits
  if v_hourly_count > v_session.rate_limit_per_hour then
    -- Log the rate limit error
    insert into public.vault_error_logs (vault_session_id, tenant_id, error_type, error_message)
    values (p_session_id, v_session.tenant_id, 'rate_limited', 'Hourly rate limit exceeded');
    
    return jsonb_build_object('success', false, 'error', 'Hourly rate limit exceeded', 'limit', v_session.rate_limit_per_hour);
  end if;
  
  if v_daily_count > v_session.rate_limit_per_day then
    insert into public.vault_error_logs (vault_session_id, tenant_id, error_type, error_message)
    values (p_session_id, v_session.tenant_id, 'rate_limited', 'Daily rate limit exceeded');
    
    return jsonb_build_object('success', false, 'error', 'Daily rate limit exceeded', 'limit', v_session.rate_limit_per_day);
  end if;
  
  -- Update usage stats
  update public.vault_sessions 
  set last_used_at = now(), use_count = use_count + 1
  where id = p_session_id;
  
  return jsonb_build_object(
    'success', true, 
    'encrypted_data', v_session.encrypted_data,
    'hourly_remaining', v_session.rate_limit_per_hour - v_hourly_count,
    'daily_remaining', v_session.rate_limit_per_day - v_daily_count
  );
end;
$$;

-- Function to log vault errors
create or replace function public.log_vault_error(
  p_session_id uuid,
  p_error_type text,
  p_error_message text default null,
  p_status_code integer default null,
  p_request_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.vault_sessions where id = p_session_id;
  
  if found then
    insert into public.vault_error_logs (vault_session_id, tenant_id, error_type, error_message, status_code, request_url)
    values (p_session_id, v_tenant_id, p_error_type, p_error_message, p_status_code, p_request_url);
  end if;
end;
$$;

-- View for vault sessions with recent error count
create or replace view public.vault_sessions_with_stats as
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

-- Create indexes for performance
create index if not exists idx_vault_sessions_tenant_id on public.vault_sessions(tenant_id);
create index if not exists idx_vault_sessions_expires_at on public.vault_sessions(expires_at) where expires_at is not null;
create index if not exists idx_vault_error_logs_session_id on public.vault_error_logs(vault_session_id);
create index if not exists idx_vault_error_logs_created_at on public.vault_error_logs(created_at);
create index if not exists idx_vault_rate_limits_session_window on public.vault_rate_limits(vault_session_id, window_start, window_type);
