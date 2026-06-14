-- Create appointments table to store auspicious events
create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  event_type  text,
  event_date  date not null,
  event_time  time not null,
  score       integer,
  verdict     text,
  advice      text,
  yam_name    text,
  bhop        text,
  status      text default 'scheduled', -- scheduled, completed, cancelled
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table public.appointments enable row level security;

create policy "Users can manage their own appointments"
  on public.appointments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for user queries
create index if not exists appointments_user_date_idx
  on public.appointments (user_id, event_date desc);
