-- 1. Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Create knowledge_base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT CHECK (category IN ('phopephum_meaning', 'definition', 'prediction_guideline', 'reading_logic')) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create mobile_features_config table
CREATE TABLE IF NOT EXISTS mobile_features_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key  TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled   BOOLEAN DEFAULT TRUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_features_config ENABLE ROW LEVEL SECURITY;

-- Select policies (allow select for authenticated users)
CREATE POLICY "Allow authenticated to view knowledge" ON knowledge_base
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to view config" ON mobile_features_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin policies (allow all for admin role in profiles)
CREATE POLICY "Allow admin to manage knowledge" ON knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admin to manage config" ON mobile_features_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Seed default configs
INSERT INTO mobile_features_config (feature_key, feature_name, is_enabled)
VALUES 
  ('live_widget', 'ยามสดปัจจุบัน (Live Widget)', true),
  ('planet_orbit', 'วงโคจรดาวครองยาม (Planet Orbit)', true),
  ('birth_details', 'พื้นดวงชะตากำเนิด (Birth Details)', true),
  ('subscription_card', 'แพ็กเกจสมาชิก (Subscription Card)', true)
ON CONFLICT (feature_key) DO NOTHING;
