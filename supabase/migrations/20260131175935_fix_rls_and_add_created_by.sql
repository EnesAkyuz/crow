-- Add created_by column to organizations
alter table public.organizations 
add column created_by uuid references auth.users not null default auth.uid();

-- Update organizations SELECT policy to include created_by check
drop policy "Org members can view their organizations" on public.organizations;
create policy "Org members can view their organizations"
  on public.organizations for select
  using ( is_org_member(id) or created_by = auth.uid() );

-- Fix potential recursion in organization_members policy by using the security definer function
drop policy "Members can view other members of their orgs" on public.organization_members;
create policy "Members can view other members of their orgs"
  on public.organization_members for select
  using ( is_org_member(organization_id) );

-- Add INSERT policy for organization_members so owners can add people (optional but good)
create policy "Owners can add members"
  on public.organization_members for insert
  with check ( 
    is_org_member(organization_id) 
    and exists (
      select 1 from public.organization_members 
      where organization_id = organization_members.organization_id 
      and user_id = auth.uid() 
      and role = 'owner'
    )
  );

-- Ensure organizations INSERT policy enforces created_by
drop policy "Users can create organizations" on public.organizations;
create policy "Users can create organizations"
  on public.organizations for insert
  with check ( created_by = auth.uid() );
