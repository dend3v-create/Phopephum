-- Migration: Fix Subscription RLS
-- Description: เพิ่มสิทธิ์ให้ผู้ใช้งานสามารถสร้าง (INSERT) และอัปเดต (UPDATE) คำขอสมัครสมาชิกของตัวเองได้
-- เพื่อรองรับระบบชำระเงินอัตโนมัติ

-- 1. ตรวจสอบและสร้าง Policy สำหรับการ INSERT (สำหรับตอนกดสมัครสมาชิก)
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

-- 2. ตรวจสอบและสร้าง Policy สำหรับการ UPDATE (สำหรับกรณีต้องการแก้ไขข้อมูล)
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

-- 3. ตรวจสอบให้มั่นใจว่าเปิดใช้งาน RLS แล้ว
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
