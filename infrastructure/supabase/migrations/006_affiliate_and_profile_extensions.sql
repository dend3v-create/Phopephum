-- 006_affiliate_and_profile_extensions.sql
-- เพิ่มเติมตาราง Profiles สำหรับข้อมูลสมาชิกดวงชะตา และการแนะนำเพื่อน (Affiliate Program)
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- 1. เพิ่มเติมคอลัมน์ในตาราง profiles (Idempotent)
DO $$ 
BEGIN
  -- เพศ
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='gender') THEN
    ALTER TABLE public.profiles ADD COLUMN gender text CHECK (gender IN ('male', 'female', 'other'));
  END IF;

  -- วันที่เริ่มต้นและวันสิ้นสุดการสมัครสมาชิก
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='membership_started_at') THEN
    ALTER TABLE public.profiles ADD COLUMN membership_started_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='membership_expired_at') THEN
    ALTER TABLE public.profiles ADD COLUMN membership_expired_at timestamptz;
  END IF;

  -- ข้อมูลธนาคารสำหรับรับเงิน Affiliate
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bank_name') THEN
    ALTER TABLE public.profiles ADD COLUMN bank_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bank_account_no') THEN
    ALTER TABLE public.profiles ADD COLUMN bank_account_no text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bank_account_name') THEN
    ALTER TABLE public.profiles ADD COLUMN bank_account_name text;
  END IF;

  -- รหัสแนะนำเฉพาะตัว (Affiliate Code)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='affiliate_code') THEN
    ALTER TABLE public.profiles ADD COLUMN affiliate_code text UNIQUE;
  END IF;
END $$;

-- 2. ฟังก์ชันอัปเดตรหัสแนะนำอัตโนมัติเมื่อสร้างโปรไฟล์ใหม่
CREATE OR REPLACE FUNCTION generate_unique_affiliate_code()
RETURNS trigger AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  IF NEW.affiliate_code IS NULL THEN
    LOOP
      -- เจเนอเรตรหัสรูปแบบ PP-XXXXXX (เช่น PP-9F8C2A)
      new_code := 'PP-' || upper(substring(md5(random()::text) from 1 for 6));
      SELECT EXISTS (SELECT 1 FROM public.profiles WHERE affiliate_code = new_code) INTO code_exists;
      IF NOT code_exists THEN
        NEW.affiliate_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ทริกเกอร์สำหรับสร้างรหัสแนะนำอัติโนมัติ
DROP TRIGGER IF EXISTS trigger_generate_affiliate_code ON public.profiles;
CREATE TRIGGER trigger_generate_affiliate_code
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_unique_affiliate_code();

-- อัปเดตข้อมูลผู้ใช้ปัจจุบันที่ยังไม่มีรหัสแนะนำ
UPDATE public.profiles 
SET affiliate_code = 'PP-' || upper(substring(id::text from 1 for 6))
WHERE affiliate_code IS NULL;

-- 3. สร้างตารางบันทึกการแนะนำเพื่อน (Affiliate Referrals)
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- ผู้แนะนำ
  referred_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- ผู้ถูกแนะนำ (เพื่อน)
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_referral UNIQUE (referrer_id, referred_id)
);

-- RLS ของตารางแนะนำเพื่อน
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- ผู้ใช้งานดูข้อมูลของตนเองที่เป็นผู้แนะนำ
CREATE POLICY "users_view_own_referrals"
  ON public.affiliate_referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- ผู้ใช้งานดูข้อมูลของตนเองที่เป็นผู้สมัคร
CREATE POLICY "users_view_own_referred"
  ON public.affiliate_referrals FOR SELECT
  USING (auth.uid() = referred_id);

-- 4. สร้างตารางรายได้ผู้แนะนำ (Affiliate Earnings)
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid,
  amount          numeric(10, 2) NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at      timestamptz DEFAULT now() NOT NULL,
  paid_at         timestamptz
);

-- RLS ของรายได้แนะนำเพื่อน
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;

-- ผู้แนะนำดูรายได้ของตนเอง
CREATE POLICY "referrers_view_own_earnings"
  ON public.affiliate_earnings FOR SELECT
  USING (auth.uid() = referrer_id);

-- ดัชนีเพิ่มความเร็ว
CREATE INDEX IF NOT EXISTS idx_aff_referrals_referrer ON public.affiliate_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_aff_earnings_referrer  ON public.affiliate_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_aff_earnings_status    ON public.affiliate_earnings(status);
