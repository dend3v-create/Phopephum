-- 1. planner_tasks (TQM Planner)
CREATE TABLE planner_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_title    TEXT NOT NULL,
  hora_slot_index INTEGER CHECK (hora_slot_index BETWEEN 1 AND 8), -- ช่วงยามอัฐกาล (1-8)
  is_completed  BOOLEAN DEFAULT FALSE,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_journals (Reflection Journal)
CREATE TABLE user_journals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  journal_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5), -- ระดับพลังงานประจำวัน (1-5)
  journal_content TEXT,
  affirmation_received TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Security Enabled
ALTER TABLE planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (ความปลอดภัยระดับ Row)
CREATE POLICY "Users manage own planner tasks" ON planner_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own journals" ON user_journals
  FOR ALL USING (auth.uid() = user_id);
