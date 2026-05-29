-- Phopephum v2 — Safe Migration (idempotent)
-- ใช้ IF NOT EXISTS ทุกจุด — รันซ้ำได้ปลอดภัย
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  birth_date date,
  birth_time time,
  birth_place text,
  subscription text not null default 'free'
    check (subscription in ('free', 'basic', 'premium', 'lifetime')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add missing columns if upgrading from old schema
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='birth_time') then
    alter table profiles add column birth_time time;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='birth_place') then
    alter table profiles add column birth_place text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_name='profiles' and column_name='subscription') then
    alter table profiles add column subscription text not null default 'free'
      check (subscription in ('free', 'basic', 'premium', 'lifetime'));
  end if;
end $$;

alter table profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can view own profile') then
    create policy "Users can view own profile"
      on profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can update own profile') then
    create policy "Users can update own profile"
      on profiles for update using (auth.uid() = id);
  end if;
end $$;

-- ─── AI Reports ───────────────────────────────────────────────────────────────
create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  report_type text not null,
  content text not null,
  tokens_used integer default 0,
  cached boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ai_reports enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='ai_reports' and policyname='Users can view own reports') then
    create policy "Users can view own reports"
      on ai_reports for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='ai_reports' and policyname='Users can insert own reports') then
    create policy "Users can insert own reports"
      on ai_reports for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── Events (Analytics) ───────────────────────────────────────────────────────
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  event text not null,
  properties jsonb default '{}',
  url text,
  created_at timestamptz default now()
);

alter table events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='events' and policyname='Users can insert own events') then
    create policy "Users can insert own events"
      on events for insert with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

-- ─── Subscriptions ────────────────────────────────────────────────────────────
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='subscriptions' and policyname='Users can view own subscription') then
    create policy "Users can view own subscription"
      on subscriptions for select using (auth.uid() = user_id);
  end if;
end $$;

-- ─── Auto-updated timestamps ──────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='profiles_updated_at') then
    create trigger profiles_updated_at before update on profiles
      for each row execute function update_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='ai_reports_updated_at') then
    create trigger ai_reports_updated_at before update on ai_reports
      for each row execute function update_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='subscriptions_updated_at') then
    create trigger subscriptions_updated_at before update on subscriptions
      for each row execute function update_updated_at();
  end if;
end $$;

-- ─── Verify ───────────────────────────────────────────────────────────────────
select
  table_name,
  (select count(*) from information_schema.columns c where c.table_name = t.table_name and c.table_schema = 'public') as column_count
from information_schema.tables t
where table_schema = 'public'
  and table_name in ('profiles', 'ai_reports', 'events', 'subscriptions')
order by table_name;
