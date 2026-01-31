-- Secure views by recreating them with security_invoker = true
-- This makes the view respect RLS policies of the underlying tables

-- Drop and recreate tenant_members_with_profiles with security_invoker
drop view if exists public.tenant_members_with_profiles;

create view public.tenant_members_with_profiles
with (security_invoker = true)
as
select 
  tm.tenant_id,
  tm.user_id,
  tm.role,
  tm.created_at,
  t.name as tenant_name,
  t.organization_id,
  p.email,
  p.full_name,
  p.avatar_url
from public.tenant_members tm
join public.tenants t on tm.tenant_id = t.id
left join public.profiles p on tm.user_id = p.id;

-- Re-grant access
grant select on public.tenant_members_with_profiles to authenticated;

-- Note: vault_sessions table itself has RLS enabled via is_org_member_of_tenant
-- The warning may be about the table being accessed via security definer functions
-- which is intentional for RLS helper functions
