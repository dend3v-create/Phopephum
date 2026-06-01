-- Migration: Affiliate & E-Wallet System
-- Description: เพิ่มระบบแนะนำเพื่อน, กระเป๋าเงินอิเล็กทรอนิกส์ และการถอนเงิน

-- 1. เพิ่มคอลัมน์ในตาราง Profiles สำหรับระบบ Affiliate
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) DEFAULT 0;

-- 2. สร้างตาราง Wallet Transactions สำหรับเก็บประวัติรายได้และการถอน
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('commission', 'withdrawal')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. สร้างตาราง Withdrawal Requests สำหรับคำขอถอนเงิน
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    bank_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ตั้งค่า RLS (Row Level Security)
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- 4.1 สิทธิ์สำหรับตาราง wallet_transactions (ดูได้เฉพาะของตัวเอง)
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions" 
ON public.wallet_transactions FOR SELECT 
USING (auth.uid() = user_id);

-- 4.2 สิทธิ์สำหรับตาราง withdrawal_requests (ดูและสร้างได้เฉพาะของตัวเอง)
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users can view own withdrawal requests" 
ON public.withdrawal_requests FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users can create own withdrawal requests" 
ON public.withdrawal_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. ฟังก์ชันสำหรับเจนรหัสแนะนำเพื่อนอัตโนมัติ (สุ่ม 6 หลัก)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(md5(random()::text) from 1 for 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger สำหรับเจนรหัสแนะนำตอนสร้าง Profile ใหม่
DROP TRIGGER IF EXISTS tr_generate_referral_code ON public.profiles;
CREATE TRIGGER tr_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- 7. อัปเดตข้อมูลเก่า (ถ้ามี) ให้มีรหัสแนะนำ
UPDATE public.profiles SET referral_code = upper(substring(md5(id::text || random()::text) from 1 for 6)) WHERE referral_code IS NULL;
