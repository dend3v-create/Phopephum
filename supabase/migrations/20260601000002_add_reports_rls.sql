-- 1. เปิด RLS สำหรับตารางรายงาน
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

-- 2. นโยบายความปลอดภัย: ผู้ใช้ดูได้เฉพาะรายงานของตนเอง
DROP POLICY IF EXISTS "Users can view own reports" ON public.ai_reports;
CREATE POLICY "Users can view own reports" 
ON public.ai_reports FOR SELECT 
USING (auth.uid() = user_id);

-- 3. นโยบายความปลอดภัย: ผู้ใช้เพิ่มรายงานของตนเองได้
DROP POLICY IF EXISTS "Users can insert own reports" ON public.ai_reports;
CREATE POLICY "Users can insert own reports" 
ON public.ai_reports FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. นโยบายความปลอดภัย: ผู้ใช้ลบรายงานของตนเองได้
DROP POLICY IF EXISTS "Users can delete own reports" ON public.ai_reports;
CREATE POLICY "Users can delete own reports" 
ON public.ai_reports FOR DELETE 
USING (auth.uid() = user_id);
