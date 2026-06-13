-- 011_daily_ritual_extensions.sql
-- Description: เพิ่มคอลัมน์ระบบ Login Reward, ระบบภารกิจ Gamification และการเก็บข้อมูลไพ่ประจำวัน

-- 1. เพิ่มฟิลด์ใน Profiles สำหรับตรวจเช็ควันรับรางวัลล็อกอินล่าสุด
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login_reward_at DATE DEFAULT NULL;

COMMENT ON COLUMN public.profiles.last_login_reward_at IS 'วันที่ล็อกอินล่าสุดที่ผู้ใช้ได้รับเหรียญรางวัล Login Reward';

-- 2. เพิ่มฟิลด์ใน Daily Plans สำหรับตรวจภารกิจรายวันและการเก็บข้อมูลไพ่ประจำวัน
ALTER TABLE public.daily_plans
ADD COLUMN IF NOT EXISTS checkin_reward_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS intention_reward_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reflection_reward_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_card INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS daily_card_reading TEXT DEFAULT NULL;

COMMENT ON COLUMN public.daily_plans.checkin_reward_claimed IS 'เคลมรางวัลจากการสุ่มไพ่ประจำวัน (+1 Soul Ink)';
COMMENT ON COLUMN public.daily_plans.intention_reward_claimed IS 'เคลมรางวัลจากความตั้งใจยามเช้า (+3 Soul Ink)';
COMMENT ON COLUMN public.daily_plans.reflection_reward_claimed IS 'เคลมรางวัลสะท้อนสติยามเย็น (+5 Soul Ink)';
COMMENT ON COLUMN public.daily_plans.daily_card IS 'ลำดับหมายเลขไพ่ทาโรต์ประจำวันที่ผู้ใช้จับได้';
COMMENT ON COLUMN public.daily_plans.daily_card_reading IS 'คำแนะนำหรือคำพยากรณ์จากไพ่ที่จับได้ประจำวัน';
