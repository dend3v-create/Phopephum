-- 012_create_horanu_chats.sql
-- Description: เพิ่มตารางสำหรับเก็บประวัติการถามตอบโหรพรายกระซิบ (HoraNu) ของผู้ใช้แต่ละคน

create table if not exists public.horanu_chats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  question    text not null,
  answer      text not null,
  locked_time timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.horanu_chats enable row level security;

create policy "Users can manage their own horanu chats"
  on public.horanu_chats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast per-user queries by time
create index if not exists horanu_chats_user_time_idx
  on public.horanu_chats (user_id, created_at desc);
