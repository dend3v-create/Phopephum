-- 005_subscription_requests.sql
-- ระบบคำขออนุมัติสมาชิก/แพ็กเกจ (Manual approval phase)

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type          text NOT NULL CHECK (type IN ('registration', 'package_upgrade')),
  plan          text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'imperial')),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note          text,                        -- admin note
  approved_by   uuid REFERENCES public.profiles(id),
  approved_at   timestamptz,
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "users_view_own_requests"
  ON public.subscription_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "users_insert_own_requests"
  ON public.subscription_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view/update all
CREATE POLICY "admins_all_requests"
  ON public.subscription_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_sub_requests_status ON public.subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_sub_requests_user   ON public.subscription_requests(user_id);

-- Add plan column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'basic'
  CHECK (plan IN ('basic', 'pro', 'imperial'));
