-- Add API keys to tenants for agent authentication
-- The key_hash is stored, not the actual key (zero-knowledge)
-- The key_prefix is for identification (first 8 chars)

alter table tenants add column if not exists api_key_hash text;
alter table tenants add column if not exists api_key_prefix text;
alter table tenants add column if not exists api_key_created_at timestamptz;

-- Index for fast lookups by prefix
create index if not exists idx_tenants_api_key_prefix on tenants(api_key_prefix);

-- Track API usage
create table if not exists api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  endpoint text not null,
  extraction_id uuid references document_extractions(id) on delete set null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- RLS for api_usage_logs
alter table api_usage_logs enable row level security;

create policy "Org members can view API usage logs"
  on api_usage_logs for select
  using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

-- Index for faster queries
create index if not exists idx_api_usage_logs_tenant on api_usage_logs(tenant_id);
create index if not exists idx_api_usage_logs_created on api_usage_logs(created_at);
