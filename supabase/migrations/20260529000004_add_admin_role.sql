-- Add role column to profiles
alter table profiles add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- Helper function to check admin status without triggering RLS recursion
create or replace function public.is_admin()
returns boolean as $$
declare
  is_admin_flag boolean;
begin
  select (role = 'admin') into is_admin_flag from profiles where id = auth.uid();
  return coalesce(is_admin_flag, false);
end;
$$ language plpgsql security definer set search_path = public;

-- Drop previous recursive policies if they exist
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Admins can update all profiles" on profiles;
drop policy if exists "Admins can view all events" on events;

-- Update RLS policies for admins to be able to view and update all profiles
create policy "Admins can view all profiles"
  on profiles for select using (
    public.is_admin()
  );

create policy "Admins can update all profiles"
  on profiles for update using (
    public.is_admin()
  );

-- Admins can view all events
create policy "Admins can view all events"
  on events for select using (
    public.is_admin()
  );
