-- Organizations
create table public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organizations enable row level security;

-- Organization Members (User <-> Org)
create table public.organization_members (
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  primary key (organization_id, user_id)
);

alter table public.organization_members enable row level security;

-- Tenants (Clients of the Org)
create table public.tenants (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tenants enable row level security;

-- Vault Sessions (Encrypted secrets for Tenants)
create table public.vault_sessions (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  encrypted_data text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.vault_sessions enable row level security;

-- Workflows
create table public.workflows (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  definition jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.workflows enable row level security;

-- Extractions
create table public.extractions (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  workflow_id uuid references public.workflows(id) on delete set null,
  status text default 'pending',
  data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.extractions enable row level security;

-- Helper function to check membership
create or replace function public.is_org_member(org_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.organization_members
    where organization_id = org_id
    and user_id = auth.uid()
  );
end;
$$;

-- RLS Policies

-- Organizations
create policy "Org members can view their organizations"
  on public.organizations for select
  using ( is_org_member(id) );

create policy "Org members can update their organizations"
  on public.organizations for update
  using ( is_org_member(id) );

create policy "Users can create organizations"
  on public.organizations for insert
  with check ( true ); 

-- Organization Members
create policy "Members can view other members of their orgs"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
    )
  );

-- Trigger to automatically add creator as owner
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute procedure public.handle_new_organization();

-- Tenants
create policy "Org members can view tenants"
  on public.tenants for select
  using ( is_org_member(organization_id) );

create policy "Org members can insert tenants"
  on public.tenants for insert
  with check ( is_org_member(organization_id) );

create policy "Org members can update tenants"
  on public.tenants for update
  using ( is_org_member(organization_id) );

create policy "Org members can delete tenants"
  on public.tenants for delete
  using ( is_org_member(organization_id) );

-- Workflows
create policy "Org members can view workflows"
  on public.workflows for select
  using ( is_org_member(organization_id) );

create policy "Org members can insert workflows"
  on public.workflows for insert
  with check ( is_org_member(organization_id) );

create policy "Org members can update workflows"
  on public.workflows for update
  using ( is_org_member(organization_id) );

create policy "Org members can delete workflows"
  on public.workflows for delete
  using ( is_org_member(organization_id) );

-- Vault Sessions
create policy "Org members can view vault sessions"
   on public.vault_sessions for select
   using ( exists (select 1 from public.tenants t where t.id = vault_sessions.tenant_id and is_org_member(t.organization_id)) );

create policy "Org members can insert vault sessions"
   on public.vault_sessions for insert
   with check ( exists (select 1 from public.tenants t where t.id = vault_sessions.tenant_id and is_org_member(t.organization_id)) );

create policy "Org members can update vault sessions"
   on public.vault_sessions for update
   using ( exists (select 1 from public.tenants t where t.id = vault_sessions.tenant_id and is_org_member(t.organization_id)) );

create policy "Org members can delete vault sessions"
   on public.vault_sessions for delete
   using ( exists (select 1 from public.tenants t where t.id = vault_sessions.tenant_id and is_org_member(t.organization_id)) );

-- Extractions
create policy "Org members can view extractions"
   on public.extractions for select
   using ( exists (select 1 from public.tenants t where t.id = extractions.tenant_id and is_org_member(t.organization_id)) );

create policy "Org members can insert extractions"
   on public.extractions for insert
   with check ( exists (select 1 from public.tenants t where t.id = extractions.tenant_id and is_org_member(t.organization_id)) );
