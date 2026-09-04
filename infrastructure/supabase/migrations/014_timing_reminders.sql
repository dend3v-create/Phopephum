-- 014_timing_reminders.sql
-- Phopephum V3 — STEP 5.2 Personal Timing Reminder & Smart Notification

-- 1. Create timing_reminders table
CREATE TABLE IF NOT EXISTS public.timing_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('daily_brief', 'golden_window', 'appointment')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_time TEXT,
    window_score INTEGER,
    action_url TEXT,
    action_label TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add reminder_settings to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '{
        "enableDailyBrief": true,
        "dailyBriefTime": "07:30",
        "enableGoldenWindowAlert": true,
        "goldenWindowLeadMinutes": 30,
        "enableAppointmentReminder": true,
        "appointmentLeadMinutes": 30,
        "enableLineNotify": false
    }'::jsonb;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_timing_reminders_user_read 
    ON public.timing_reminders(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timing_reminders_created 
    ON public.timing_reminders(created_at DESC);

-- 4. Row Level Security (RLS)
ALTER TABLE public.timing_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own timing reminders"
    ON public.timing_reminders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timing reminders"
    ON public.timing_reminders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timing reminders"
    ON public.timing_reminders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timing reminders"
    ON public.timing_reminders FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Comments
COMMENT ON TABLE public.timing_reminders IS 'Phopephum V3 Personal Timing Reminders (Step 5.2)';
COMMENT ON COLUMN public.timing_reminders.type IS 'daily_brief | golden_window | appointment';
