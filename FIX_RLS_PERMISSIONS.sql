-- ============================================================
-- 🛠️ PHOPEPHUM V2 - RLS PERMISSION FIX
-- ============================================================
-- วิธีใช้: ก๊อปปี้โค้ดทั้งหมดในไฟล์นี้ ไปวางและรันใน Supabase SQL Editor
-- เพื่ออนุญาตให้ผู้ใช้ทั่วไปกดสมัครสมาชิก (Upgrade) ได้
-- ============================================================

-- 1. สร้างสิทธิ์ในการกดสมัครสมาชิก (INSERT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subscription_requests' 
        AND policyname = 'Users can insert own subscription requests'
    ) THEN
        CREATE POLICY "Users can insert own subscription requests" 
        ON public.subscription_requests FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- 2. สร้างสิทธิ์ในการอัปเดตข้อมูลคำขอ (UPDATE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subscription_requests' 
        AND policyname = 'Users can update own subscription requests'
    ) THEN
        CREATE POLICY "Users can update own subscription requests" 
        ON public.subscription_requests FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 3. ตรวจสอบว่าเปิดใช้งานระบบความปลอดภัย (RLS) เรียบร้อยแล้ว
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ✅ สิ้นสุดการแก้ไข - ลองทดสอบกดปุ่มสมัครสมาชิกใหม่ได้เลยครับ
-- ============================================================
