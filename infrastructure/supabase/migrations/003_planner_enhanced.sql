-- Add fields for TQM Planner enhancements
alter table public.daily_plans
add column if not exists hora_activities jsonb default '[]',
add column if not exists energy_level integer default 3,
add column if not exists success_notes text,
add column if not exists dharma_teaching text;

comment on column public.daily_plans.hora_activities is 'List of activities mapped to 16 Yam slots';
comment on column public.daily_plans.energy_level is 'Daily energy level (1-5)';
comment on column public.daily_plans.success_notes is 'Daily success reflections';
comment on column public.daily_plans.dharma_teaching is 'Inspirational dharma teaching of the day';
