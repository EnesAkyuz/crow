-- Tenant Invites
create table public.tenant_invites (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  email text not null,
  role text default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  invited_by uuid references auth.users(id),
  unique(tenant_id, email)
);

alter table public.tenant_invites enable row level security;

-- Policies for Tenant Invites
-- Allow Org Members (owners of the tenant) to view/manage invites
create policy "Org members can view invites"
  on public.tenant_invites for select
  using ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can insert invites"
  on public.tenant_invites for insert
  with check ( is_org_member_of_tenant(tenant_id) );

create policy "Org members can delete invites"
  on public.tenant_invites for delete
  using ( is_org_member_of_tenant(tenant_id) );

-- Update handle_new_user to process invites
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- 1. Create Profile
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Check for pending invites and add to tenant_members
  insert into public.tenant_members (tenant_id, user_id, role)
  select tenant_id, new.id, role
  from public.tenant_invites
  where email = new.email;

  -- 3. Cleanup invites (Optional: You might want to keep them for history, but deleting is cleaner for state)
  delete from public.tenant_invites
  where email = new.email;

  return new;
end;
$$;
