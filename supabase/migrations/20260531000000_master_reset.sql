-- 1. ลบของเก่าทิ้งทั้งหมดเพื่อความสะอาด
drop table if exists public.subscription_requests cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.events cascade;
drop table if exists public.ai_reports cascade;
drop table if exists public.profiles cascade;

-- 2. สร้างตาราง Profiles (รวมข้อมูลดวงชะตา + สิทธิ์แอดมิน)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  full_name text,
  birth_date date,
  birth_time time,
  birth_place text,
  gender text,
  role text not null default 'user' check (role in ('user', 'admin', 'operator')),
  subscription text not null default 'free' check (subscription in ('free', 'basic', 'premium', 'lifetime')),
  plan text not null default 'free' check (plan in ('free', 'basic', 'pro', 'imperial')),
  membership_status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. สร้างตารางอื่นๆ ที่จำเป็น
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_type text not null,
  content text not null,
  tokens_used integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  plan text not null,
  status text not null default 'pending',
  note text,
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid
);

-- 4. ตั้งค่าความปลอดภัย (RLS)
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

alter table public.subscription_requests enable row level security;
create policy "Users can view own requests" on public.subscription_requests for select using (auth.uid() = user_id);
create policy "Admins can view all requests" on public.subscription_requests for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 5. ฟังก์ชันอัปเดตเวลาอัตโนมัติ
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function update_updated_at();
