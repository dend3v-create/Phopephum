-- Migration: Add Soul Ink system
-- Description: เพิ่มระบบเหรียญ/หมึกวิญญาณสำหรับ AI Report

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS soul_ink INTEGER DEFAULT 0;

COMMENT ON COLUMN public.profiles.soul_ink IS 'Soul Ink tokens remaining for AI analysis';
