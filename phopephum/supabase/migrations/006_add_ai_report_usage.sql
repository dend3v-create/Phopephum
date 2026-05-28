-- supabase/migrations/add_ai_report_usage.sql
CREATE TABLE ai_report_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  tier text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_report_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can insert own usage" ON ai_report_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can read own usage" ON ai_report_usage
  FOR SELECT USING (auth.uid() = user_id);
