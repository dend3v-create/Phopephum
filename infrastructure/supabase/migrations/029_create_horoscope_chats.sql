-- 029_create_horoscope_chats.sql
-- Description: ตารางสำหรับเก็บประวัติการสนทนากับ AI Chat ใต้ผังดวงชะตา แยกตามเจ้าชะตาแต่ละคน
-- เพื่อให้สามารถกลับมาทบทวนได้ หรือถามต่อเนื่องได้

create table if not exists public.horoscope_chats (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  subject_name text not null default 'เจ้าชะตา',
  birth_date   text,
  question     text not null,
  answer       text not null,
  filter_type  text,
  filter_value text,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Enable RLS
alter table public.horoscope_chats enable row level security;

create policy "Users can manage their own horoscope chats"
  on public.horoscope_chats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for querying chat history by user, subject name, and time
create index if not exists horoscope_chats_user_subject_idx
  on public.horoscope_chats (user_id, subject_name, created_at desc);
