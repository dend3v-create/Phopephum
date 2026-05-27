-- 1. profiles (extend Supabase Auth)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name     TEXT NOT NULL,
  birth_date    DATE NOT NULL,           -- วันเกิด
  birth_time    TIME,                    -- เวลาเกิด
  birth_province TEXT,                  -- จังหวัดเกิด
  gender        TEXT CHECK (gender IN ('male','female','other')),
  plan          TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','premium')),
  plan_expires_at TIMESTAMPTZ,
  ai_tokens_used INTEGER DEFAULT 0,     -- quota tracking
  ai_tokens_limit INTEGER DEFAULT 5,    -- free=5, pro=50, premium=unlimited
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. calculations (history)
CREATE TABLE calculations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  calc_type     TEXT CHECK (calc_type IN ('hora','chart','transit')),
  input_data    JSONB NOT NULL,          -- วัน/เวลาที่คำนวณ
  result_data   JSONB NOT NULL,          -- ผลลัพธ์เต็ม
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ai_reports
CREATE TABLE ai_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_type   TEXT DEFAULT 'life_report',
  content       JSONB NOT NULL,          -- report sections
  pdf_url       TEXT,                    -- R2 URL
  tokens_used   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. subscriptions
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_sub_id TEXT UNIQUE,
  plan          TEXT NOT NULL,
  status        TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. behavior_logs (User Behavior Tracking)
CREATE TABLE behavior_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,           -- 'page_view','calc_run','ai_ask','report_gen'
  event_data    JSONB,                   -- { page, feature, question, duration }
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_logs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own data" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users own calculations" ON calculations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own reports" ON ai_reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own subs" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users own logs" ON behavior_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
