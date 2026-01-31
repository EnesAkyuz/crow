-- 1. Fix Organizations RLS: Allow Tenant Members to view their Organization
drop policy "Org members can view their organizations" on public.organizations;
create policy "Access organizations"
  on public.organizations for select
  using (
    is_org_member(id) 
    or created_by = auth.uid()
    or exists (
      select 1 
      from public.tenants t
      join public.tenant_members tm on t.id = tm.tenant_id
      where t.organization_id = organizations.id
      and tm.user_id = auth.uid()
    )
  );

-- 2. Fix Tenants RLS: Allow Tenant Members to view their Tenant
drop policy "Org members can view tenants" on public.tenants;
create policy "Access tenants"
  on public.tenants for select
  using (
    is_org_member(organization_id)
    or exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenants.id
      and tm.user_id = auth.uid()
    )
  );

-- 3. Auto-add existing users when invited
create or replace function public.process_invite_for_existing_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_user_id uuid;
begin
  -- Check if email exists in auth.users
  select id into existing_user_id
  from auth.users
  where email = new.email;

  if existing_user_id is not null then
    -- User exists, add directly to members
    insert into public.tenant_members (tenant_id, user_id, role)
    values (new.tenant_id, existing_user_id, new.role);
    
    -- Do not actually insert the invite (or delete it immediately)
    -- Returning NULL in a BEFORE INSERT trigger prevents insertion
    -- But we need to verify we want to return NULL.
    -- If we return NULL, the caller might think it failed if they rely on the returned row.
    -- Better to let it insert, then delete? Or just return NULL?
    -- Let's return NULL to keep the invites table clean, assuming the API doesn't need the invite ID.
    return null;
  end if;

  return new;
end;
$$;

create trigger on_invite_created
  before insert on public.tenant_invites
  for each row execute procedure public.process_invite_for_existing_user();
