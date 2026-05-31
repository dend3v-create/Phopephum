-- 1. เพิ่มฟิลด์สำหรับ Override ค่าจันทรคติ ในตาราง Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS thai_month_override INTEGER,
ADD COLUMN IF NOT EXISTS zodiac_override TEXT;

-- 2. สร้างตาราง Calculations สำหรับเก็บประวัติและ Cache การคำนวณแบบละเอียด
CREATE TABLE IF NOT EXISTS public.calculations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  calc_type   TEXT NOT NULL DEFAULT 'phopephum_v2', -- 'phopephum_v2', 'nine_base', etc.
  input_data  JSONB NOT NULL, -- เก็บ birthDate, birthTime, etc.
  result_data JSONB NOT NULL, -- เก็บ PhopephumResult ทั้งหมด
  is_pinned   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ตั้งค่า RLS (Row Level Security)
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calculations" 
ON public.calculations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculations" 
ON public.calculations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calculations" 
ON public.calculations FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Index สำหรับการค้นหา
CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON public.calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON public.calculations(created_at DESC);
