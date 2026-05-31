-- 007_notifications_setup.sql
-- เพิ่ม line_user_id ให้ profiles สำหรับส่ง LINE notification ถึง user
-- และ index เพิ่มเติมสำหรับ subscription_requests

-- เพิ่ม column line_user_id ใน profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS line_user_id text DEFAULT NULL;

-- เพิ่ม column resend_email_sent ใน subscription_requests
-- เพื่อ track ว่าส่ง email แล้วหรือยัง (idempotency)
ALTER TABLE public.subscription_requests
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;

-- Index เพิ่มเติมสำหรับ query performance
CREATE INDEX IF NOT EXISTS idx_sub_requests_user_status 
  ON public.subscription_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_sub_requests_created 
  ON public.subscription_requests(created_at DESC);

-- Comment
COMMENT ON COLUMN public.profiles.line_user_id IS 
  'LINE User ID (Uxxxxxxxx) สำหรับส่ง Push Message แจ้งผลอนุมัติ';

COMMENT ON COLUMN public.subscription_requests.email_sent IS
  'true เมื่อส่ง Resend email แจ้งผลการอนุมัติแล้ว';
