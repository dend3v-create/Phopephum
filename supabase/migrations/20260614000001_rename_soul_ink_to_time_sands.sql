-- Migration: Rename Soul Ink to Time Sands
-- Description: เปลี่ยนชื่อคอลัมน์ soul_ink -> time_sands ในตาราง Profiles

ALTER TABLE public.profiles RENAME COLUMN soul_ink TO time_sands;
COMMENT ON COLUMN public.profiles.time_sands IS 'ทรายกาลเวลาคงเหลือสำหรับการคำนวณและรายงานวิเคราะห์วิถีดวงดาว ( Hourglass Concept )';
