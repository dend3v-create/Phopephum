-- 1. สร้างตาราง AI Report Usage สำหรับติดตามการใช้งาน
CREATE TABLE IF NOT EXISTS public.ai_report_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  tier        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตั้งค่า RLS
ALTER TABLE public.ai_report_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" 
ON public.ai_report_usage FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Function สำหรับนับจำนวนการใช้งาน AI ในเดือนปัจจุบัน (สำหรับ Free Tier)
CREATE OR REPLACE FUNCTION public.get_ai_usage_month(p_user uuid) 
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM public.ai_report_usage
  WHERE user_id = p_user
    AND tier = 'free'
    AND created_at >= date_trunc('month', now());
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_report_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_report_usage(created_at DESC);
