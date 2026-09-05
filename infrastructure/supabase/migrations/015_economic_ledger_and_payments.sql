-- 015_economic_ledger_and_payments.sql
-- PHASE 6.1 — Economic Architecture: Sands Ledger & Payment Transactions
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- ─── 1. Sands Ledger (บัญชีแยกประเภทละอองทรายกาลเวลา) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.sands_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- จำนวนเม็ดทราย (+ คือได้รับ, - คือใช้ไป)
    balance_after INTEGER NOT NULL, -- ยอดคงเหลือหลังทำรายการ
    activity_type TEXT NOT NULL CHECK (
        activity_type IN (
            'daily_login',
            'checkin',
            'intention',
            'reflection',
            'referral_signup',
            'ai_report_redeem',
            'wisdom_deep_dive',
            'admin_adjustment'
        )
    ),
    reference_id TEXT, -- e.g. report_id, query_id, referral_id
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.sands_ledger ENABLE ROW LEVEL SECURITY;

-- Policy: ผู้ใช้งานสามารถดูประวัติการได้/ใช้ทรายของตนเองได้เท่านั้น
DROP POLICY IF EXISTS "users_view_own_sands_ledger" ON public.sands_ledger;
CREATE POLICY "users_view_own_sands_ledger"
    ON public.sands_ledger FOR SELECT
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sands_ledger_user_created 
    ON public.sands_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sands_ledger_activity 
    ON public.sands_ledger(user_id, activity_type);


-- ─── 2. Payment Transactions (ประวัติและสถานะการทำธุรกรรมชำระเงิน) ───────────────
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'stripe', 'opn', 'gbprimepay', 'promptpay', 'manual_slip'
    provider_transaction_id TEXT, -- e.g. cs_test_..., ch_...
    plan_id TEXT NOT NULL, -- 'premium', 'pro', 'master', 'basic', 'imperial'
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'THB',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: ผู้ใช้งานดูรายการชำระเงินของตนเอง
DROP POLICY IF EXISTS "users_view_own_payment_transactions" ON public.payment_transactions;
CREATE POLICY "users_view_own_payment_transactions"
    ON public.payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_tx_user 
    ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status 
    ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_provider_id 
    ON public.payment_transactions(provider, provider_transaction_id);
