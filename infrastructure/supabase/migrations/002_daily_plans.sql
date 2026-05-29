-- 002_daily_plans.sql
-- TQM Planner: daily intention, priorities, and evening reflection

create table if not exists public.daily_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  intention   text,
  priorities  jsonb not null default '[]',
  reflection  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, date)
);

-- RLS
alter table public.daily_plans enable row level security;

create policy "Users can manage their own daily plans"
  on public.daily_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast per-user queries
create index if not exists daily_plans_user_date_idx
  on public.daily_plans (user_id, date desc);
