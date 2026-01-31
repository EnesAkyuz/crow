-- Tenant Members (User <-> Tenant)
create table public.tenant_members (
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  primary key (tenant_id, user_id)
);

alter table public.tenant_members enable row level security;

-- Add tenant_id to Workflows to ownership
alter table public.workflows 
add column tenant_id uuid references public.tenants(id) on delete cascade;

-- Helper function to check tenant membership
create or replace function public.is_tenant_member(_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.tenant_members
    where tenant_id = _tenant_id
    and user_id = auth.uid()
  );
end;
$$;

-- Helper function to check if user is member of the organization that owns the tenant
-- This allows SaaS owners to access their tenants' data
create or replace function public.is_org_member_of_tenant(_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 
    from public.tenants t
    join public.organization_members om on t.organization_id = om.organization_id
    where t.id = _tenant_id
    and om.user_id = auth.uid()
  );
end;
$$;

-- RLS Policies for Tenant Members

create policy "Tenant members can view their membership"
  on public.tenant_members for select
  using ( is_tenant_member(tenant_id) );

create policy "Org members can view/manage all tenant memberships"
  on public.tenant_members for all
  using ( is_org_member_of_tenant(tenant_id) );

-- Update Workflows RLS
-- Assuming workflows can belong to a tenant. 
-- If tenant_id is set, check tenant membership OR org membership.
-- If tenant_id is NULL (org-level workflow), existing org check applies.

drop policy "Org members can view workflows" on public.workflows;
drop policy "Org members can insert workflows" on public.workflows;
drop policy "Org members can update workflows" on public.workflows;
drop policy "Org members can delete workflows" on public.workflows;

create policy "Access workflows"
  on public.workflows for all
  using (
    (tenant_id is not null and (is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id)))
    or
    (tenant_id is null and is_org_member(organization_id))
  )
  with check (
    (tenant_id is not null and (is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id)))
    or
    (tenant_id is null and is_org_member(organization_id))
  );

-- Update Vault Sessions RLS
drop policy "Org members can view vault sessions" on public.vault_sessions;
drop policy "Org members can insert vault sessions" on public.vault_sessions;
drop policy "Org members can update vault sessions" on public.vault_sessions;
drop policy "Org members can delete vault sessions" on public.vault_sessions;

create policy "Access vault sessions"
   on public.vault_sessions for all
   using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );

-- Update Extractions RLS
drop policy "Org members can view extractions" on public.extractions;
drop policy "Org members can insert extractions" on public.extractions;

create policy "Access extractions"
   on public.extractions for all
   using ( is_tenant_member(tenant_id) or is_org_member_of_tenant(tenant_id) );
