-- Create notifications table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  message text not null,
  type text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

-- Only system/triggers (security definer) is expected to insert usually, 
-- but if we want server actions to insert, we might need an insert policy.
-- For now, let's allow authenticated users to insert notifications ONLY for themselves (if needed) 
-- OR rely on Security Definer functions.
-- Let's stick to Security Definer trigger for now.

-- Trigger function to notify user when added to a tenant
create or replace function public.notify_new_tenant_member()
returns trigger
security definer
set search_path = ''
as $$
declare
  t_name text;
begin
  select name into t_name from public.tenants where id = new.tenant_id;
  
  insert into public.notifications (user_id, title, message, type)
  values (
    new.user_id,
    'Access Granted',
    'You have been added to client workspace: ' || coalesce(t_name, 'Unknown'),
    'access_granted'
  );
  return new;
end;
$$ language plpgsql;

-- Create trigger
drop trigger if exists on_tenant_member_added on public.tenant_members;
create trigger on_tenant_member_added
  after insert on public.tenant_members
  for each row execute procedure public.notify_new_tenant_member();
