-- Create profiles table first (if not exists)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: Authenticated users can read profiles
create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Trigger to sync auth.users to profiles
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users (crucial for dev)
insert into public.profiles (id, email, full_name, avatar_url)
select 
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- NOW Create the view using tenant_members and profiles
create or replace view public.tenant_members_with_profiles as
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

-- Grant access
grant select on public.tenant_members_with_profiles to authenticated;

