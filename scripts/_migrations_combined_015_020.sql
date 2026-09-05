-- ============================================================
-- PHOPEPHUM V3: MIGRATIONS 015-020 (Combined Apply - Exact Signatures)
-- Apply in ONE run via Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 015_economic_ledger_and_payments.sql
-- ============================================================
-- 015_economic_ledger_and_payments.sql
-- PHASE 6.1 â€” Economic Architecture: Sands Ledger & Payment Transactions
-- Run in: Supabase Dashboard â†’ SQL Editor â†’ New Query

-- â”€â”€â”€ 1. Sands Ledger (à¸šà¸±à¸à¸Šà¸µà¹à¸¢à¸à¸›à¸£à¸°à¹€à¸ à¸—à¸¥à¸°à¸­à¸­à¸‡à¸—à¸£à¸²à¸¢à¸à¸²à¸¥à¹€à¸§à¸¥à¸²) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.sands_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- à¸ˆà¸³à¸™à¸§à¸™à¹€à¸¡à¹‡à¸”à¸—à¸£à¸²à¸¢ (+ à¸„à¸·à¸­à¹„à¸”à¹‰à¸£à¸±à¸š, - à¸„à¸·à¸­à¹ƒà¸Šà¹‰à¹„à¸›)
    balance_after INTEGER NOT NULL, -- à¸¢à¸­à¸”à¸„à¸‡à¹€à¸«à¸¥à¸·à¸­à¸«à¸¥à¸±à¸‡à¸—à¸³à¸£à¸²à¸¢à¸à¸²à¸£
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

-- Policy: à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸ªà¸²à¸¡à¸²à¸£à¸–à¸”à¸¹à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸à¸²à¸£à¹„à¸”à¹‰/à¹ƒà¸Šà¹‰à¸—à¸£à¸²à¸¢à¸‚à¸­à¸‡à¸•à¸™à¹€à¸­à¸‡à¹„à¸”à¹‰à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™
DROP POLICY IF EXISTS "users_view_own_sands_ledger" ON public.sands_ledger;
CREATE POLICY "users_view_own_sands_ledger"
    ON public.sands_ledger FOR SELECT
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sands_ledger_user_created 
    ON public.sands_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sands_ledger_activity 
    ON public.sands_ledger(user_id, activity_type);


-- â”€â”€â”€ 2. Payment Transactions (à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¹à¸¥à¸°à¸ªà¸–à¸²à¸™à¸°à¸à¸²à¸£à¸—à¸³à¸˜à¸¸à¸£à¸à¸£à¸£à¸¡à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- Policy: à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸”à¸¹à¸£à¸²à¸¢à¸à¸²à¸£à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™à¸‚à¸­à¸‡à¸•à¸™à¹€à¸­à¸‡
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


-- ============================================================
-- 016_sands_economy_atomic.sql
-- ============================================================
-- 016_sands_economy_atomic.sql
-- PHASE 6.4 â€” Sands of Time Economy: Atomic Functions, Idempotency, and Reward Classes
-- Run in: Supabase Dashboard â†’ SQL Editor â†’ New Query

-- â”€â”€â”€ 1. à¸­à¸±à¸›à¹€à¸à¸£à¸”à¸•à¸²à¸£à¸²à¸‡ sands_ledger à¹ƒà¸«à¹‰à¸£à¸­à¸‡à¸£à¸±à¸š Single Source of Truth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- à¹€à¸žà¸´à¹ˆà¸¡ balance_before, reward_class, metadata à¸«à¸²à¸à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sands_ledger' 
          AND column_name = 'balance_before'
    ) THEN
        ALTER TABLE public.sands_ledger ADD COLUMN balance_before INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sands_ledger' 
          AND column_name = 'reward_class'
    ) THEN
        ALTER TABLE public.sands_ledger ADD COLUMN reward_class TEXT NOT NULL DEFAULT 'daily_ritual';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sands_ledger' 
          AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.sands_ledger ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- à¸›à¸¥à¸”à¸¥à¹‡à¸­à¸ CHECK constraint à¹€à¸”à¸´à¸¡à¹€à¸žà¸·à¹ˆà¸­à¸£à¸­à¸‡à¸£à¸±à¸š activity_type à¹à¸¥à¸° reward_class à¹à¸šà¸šà¹€à¸•à¹‡à¸¡à¸£à¸°à¸šà¸š
ALTER TABLE public.sands_ledger DROP CONSTRAINT IF EXISTS sands_ledger_activity_type_check;
ALTER TABLE public.sands_ledger DROP CONSTRAINT IF EXISTS sands_ledger_reward_class_check;

ALTER TABLE public.sands_ledger ADD CONSTRAINT sands_ledger_reward_class_check CHECK (
    reward_class IN ('daily_ritual', 'wisdom', 'community', 'spend', 'adjustment')
);

-- â”€â”€â”€ 2. Idempotency Constraint & Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- à¸›à¹‰à¸­à¸‡à¸à¸±à¸™ Double-crediting à¸ˆà¸²à¸ reference_id à¹€à¸”à¸´à¸¡à¸­à¸¢à¹ˆà¸²à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸ˆà¸²à¸ NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_sands_ledger_idempotency
    ON public.sands_ledger (user_id, activity_type, reference_id)
    WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sands_ledger_user_class_created
    ON public.sands_ledger (user_id, reward_class, created_at DESC);

-- â”€â”€â”€ 3. Atomic Debit Function (à¸«à¸±à¸à¸—à¸£à¸²à¸¢à¸à¸²à¸¥à¹€à¸§à¸¥à¸²à¹à¸šà¸š Thread-Safe) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.debit_sands(
    p_user_id UUID,
    p_amount INTEGER,
    p_activity_type TEXT,
    p_reference_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_ledger_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
    END IF;

    -- à¸¥à¹‡à¸­à¸à¹à¸–à¸§à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹€à¸žà¸·à¹ˆà¸­à¸›à¹‰à¸­à¸‡à¸à¸±à¸™ Race Condition (SELECT ... FOR UPDATE)
    SELECT COALESCE(time_sands, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'à¸¥à¸°à¸­à¸­à¸‡à¸—à¸£à¸²à¸¢à¸à¸²à¸¥à¹€à¸§à¸¥à¸²à¹„à¸¡à¹ˆà¹€à¸žà¸µà¸¢à¸‡à¸žà¸­',
            'current_balance', v_current_balance,
            'required', p_amount
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- à¸­à¸±à¸›à¹€à¸”à¸•à¸¢à¸­à¸”à¸„à¸‡à¹€à¸«à¸¥à¸·à¸­à¹ƒà¸™ Profile Cache
    UPDATE public.profiles
    SET time_sands = v_new_balance,
        updated_at = now()
    WHERE id = p_user_id;

    -- à¸šà¸±à¸™à¸—à¸¶à¸ Audit Trail à¸¥à¸‡à¹ƒà¸™ sands_ledger (Audit Source of Truth)
    INSERT INTO public.sands_ledger (
        user_id,
        amount,
        balance_before,
        balance_after,
        reward_class,
        activity_type,
        reference_id,
        description,
        metadata
    ) VALUES (
        p_user_id,
        -p_amount,
        v_current_balance,
        v_new_balance,
        'spend',
        p_activity_type,
        p_reference_id,
        p_description,
        p_metadata
    ) RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object(
        'success', true,
        'ledger_id', v_ledger_id,
        'balance_before', v_current_balance,
        'new_balance', v_new_balance,
        'amount_debited', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- â”€â”€â”€ 4. Atomic Credit Function (à¹€à¸žà¸´à¹ˆà¸¡à¸—à¸£à¸²à¸¢ à¸žà¸£à¹‰à¸­à¸¡à¸„à¸¸à¸¡ Daily Cap & Idempotency) â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.credit_sands(
    p_user_id UUID,
    p_amount INTEGER,
    p_reward_class TEXT,
    p_activity_type TEXT,
    p_reference_id TEXT, -- à¸šà¸±à¸‡à¸„à¸±à¸šà¸£à¸°à¸šà¸¸à¹€à¸žà¸·à¹ˆà¸­à¸£à¸±à¸šà¸›à¸£à¸°à¸à¸±à¸™ Idempotency
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_today_ritual_sum INTEGER := 0;
    v_allowed_amount INTEGER := p_amount;
    v_ledger_id UUID;
    v_start_of_today TIMESTAMPTZ;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
    END IF;

    IF p_reference_id IS NULL OR length(trim(p_reference_id)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reference ID is required for idempotency');
    END IF;

    -- à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Idempotency à¸—à¸±à¸™à¸—à¸µ
    IF EXISTS (
        SELECT 1 FROM public.sands_ledger
        WHERE user_id = p_user_id 
          AND activity_type = p_activity_type 
          AND reference_id = p_reference_id
    ) THEN
        -- à¸”à¸¶à¸‡ balance à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™à¸ªà¹ˆà¸‡à¸à¸¥à¸±à¸šà¸­à¸¢à¹ˆà¸²à¸‡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢
        SELECT COALESCE(time_sands, 0) INTO v_current_balance
        FROM public.profiles WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'success', false,
            'code', 'DUPLICATE_EVENT',
            'error', 'à¸—à¹ˆà¸²à¸™à¹„à¸”à¹‰à¸£à¸±à¸šà¸¥à¸°à¸­à¸­à¸‡à¸—à¸£à¸²à¸¢à¸ˆà¸²à¸à¸à¸´à¸ˆà¸à¸£à¸£à¸¡à¸™à¸µà¹‰à¹„à¸›à¹à¸¥à¹‰à¸§ (Duplicate Event)',
            'current_balance', v_current_balance
        );
    END IF;

    -- à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Daily Ritual Cap (15 à¸—à¸£à¸²à¸¢/à¸§à¸±à¸™) à¹€à¸‰à¸žà¸²à¸° reward_class = 'daily_ritual'
    IF p_reward_class = 'daily_ritual' THEN
        -- à¸„à¸³à¸™à¸§à¸“à¸ˆà¸¸à¸”à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸‚à¸­à¸‡à¸§à¸±à¸™à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™à¸•à¸²à¸¡à¹€à¸§à¸¥à¸²à¸›à¸£à¸°à¹€à¸—à¸¨à¹„à¸—à¸¢ (Asia/Bangkok)
        v_start_of_today := date_trunc('day', timezone('Asia/Bangkok', now())) AT TIME ZONE 'Asia/Bangkok';

        SELECT COALESCE(SUM(amount), 0) INTO v_today_ritual_sum
        FROM public.sands_ledger
        WHERE user_id = p_user_id
          AND reward_class = 'daily_ritual'
          AND amount > 0
          AND created_at >= v_start_of_today;

        IF v_today_ritual_sum >= 15 THEN
            SELECT COALESCE(time_sands, 0) INTO v_current_balance
            FROM public.profiles WHERE id = p_user_id;

            RETURN jsonb_build_object(
                'success', false,
                'code', 'DAILY_CAP_REACHED',
                'error', 'à¸—à¹ˆà¸²à¸™à¸ªà¸°à¸ªà¸¡à¸¥à¸°à¸­à¸­à¸‡à¸—à¸£à¸²à¸¢à¸›à¸£à¸°à¸ˆà¸³à¸§à¸±à¸™à¸„à¸£à¸šà¸•à¸²à¸¡à¹€à¸žà¸”à¸²à¸™à¹à¸¥à¹‰à¸§ (15 à¸—à¸£à¸²à¸¢/à¸§à¸±à¸™)',
                'cap_reached', true,
                'today_earned', v_today_ritual_sum,
                'current_balance', v_current_balance
            );
        ELSIF (v_today_ritual_sum + p_amount) > 15 THEN
            v_allowed_amount := 15 - v_today_ritual_sum; -- à¹€à¸„à¸£à¸”à¸´à¸•à¹€à¸‰à¸žà¸²à¸°à¸ªà¹ˆà¸§à¸™à¸—à¸µà¹ˆà¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸Šà¸™à¹€à¸žà¸”à¸²à¸™ 15
        END IF;
    END IF;

    -- à¸¥à¹‡à¸­à¸à¹à¸–à¸§à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢ (Row-level lock)
    SELECT COALESCE(time_sands, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    v_new_balance := v_current_balance + v_allowed_amount;

    -- à¸­à¸±à¸›à¹€à¸”à¸• Profile Cache
    UPDATE public.profiles
    SET time_sands = v_new_balance,
        updated_at = now()
    WHERE id = p_user_id;

    -- à¸šà¸±à¸™à¸—à¸¶à¸ Audit Trail à¸¥à¸‡ Ledger
    INSERT INTO public.sands_ledger (
        user_id,
        amount,
        balance_before,
        balance_after,
        reward_class,
        activity_type,
        reference_id,
        description,
        metadata
    ) VALUES (
        p_user_id,
        v_allowed_amount,
        v_current_balance,
        v_new_balance,
        p_reward_class,
        p_activity_type,
        p_reference_id,
        p_description,
        p_metadata
    ) RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object(
        'success', true,
        'ledger_id', v_ledger_id,
        'balance_before', v_current_balance,
        'new_balance', v_new_balance,
        'amount_credited', v_allowed_amount,
        'daily_ritual_sum', CASE WHEN p_reward_class = 'daily_ritual' THEN v_today_ritual_sum + v_allowed_amount ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 017_partner_economy_ledger.sql
-- ============================================================
-- 017_partner_economy_ledger.sql
-- ==============================================================================
-- ðŸ›ï¸ PHOPEPHUM V3 â€” PHASE 6.5.2: DATABASE ARCHITECTURE & MIGRATION
-- à¸£à¸°à¸šà¸šà¸žà¸±à¸™à¸˜à¸¡à¸´à¸•à¸£à¹à¸¥à¸°à¹€à¸„à¸£à¸·à¸­à¸‚à¹ˆà¸²à¸¢à¸„à¸§à¸²à¸¡à¸£à¹ˆà¸§à¸¡à¸¡à¸·à¸­ (Partner & Affiliate Economy)
-- 
-- 6 Implementation Guardrails:
-- 1. Dynamic Tax Rule Resolution (à¸«à¹‰à¸²à¸¡ hard-code 3% â€” à¹ƒà¸Šà¹‰ tax_rules table)
-- 2. Dynamic VAT Rate Calculation (à¸«à¹‰à¸²à¸¡ hard-code 7% â€” à¸„à¸³à¸™à¸§à¸“à¸ˆà¸²à¸ vat_rate input)
-- 3. Configurable Data Retention (retention_policy, retention_until, archived_at)
-- 4. Double-Entry Immutable Partner Ledger (Source of Truth) + 3-Balance Model
-- 5. Atomic Payout Reservation with SELECT ... FOR UPDATE (à¸›à¹‰à¸­à¸‡à¸à¸±à¸™ Double Withdrawal)
-- 6. Closed-Loop Sands of Time Non-Monetary Bridge (benefit_reference_value_thb)
-- 7. Dual-Read & Non-Destructive Legacy Backfill (à¸«à¹‰à¸²à¸¡à¸¥à¸š legacy tables)
-- ==============================================================================

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 1: IDENTITY, COMPLIANCE & FINANCIAL PII (Boundary Isolation)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 1.1 à¸•à¸²à¸£à¸²à¸‡à¸žà¸±à¸™à¸˜à¸¡à¸´à¸•à¸£à¸ªà¸²à¸˜à¸²à¸£à¸“à¸° (Public Partner Entities)
CREATE TABLE IF NOT EXISTS public.partner_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    partner_code TEXT NOT NULL UNIQUE,
    tier_code TEXT NOT NULL DEFAULT 'affiliate' CHECK (tier_code IN ('affiliate', 'creator', 'master', 'institutional')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_kyc')),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected')),
    
    -- 3-Balance Model (Materialized Cache from partner_ledger)
    holding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (holding_balance >= 0),
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    payout_pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (payout_pending_balance >= 0),
    
    total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_earned >= 0),
    total_withdrawn NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_withdrawn >= 0),
    lifetime_referred_count INT NOT NULL DEFAULT 0 CHECK (lifetime_referred_count >= 0),
    
    -- Configurable Data Retention Policy
    retention_policy TEXT NOT NULL DEFAULT 'standard_accounting_policy',
    retention_until TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_entities_user ON public.partner_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_entities_code ON public.partner_entities(partner_code);
CREATE INDEX IF NOT EXISTS idx_partner_entities_status_tier ON public.partner_entities(status, tier_code);

-- 1.2 à¸•à¸²à¸£à¸²à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ à¸²à¸©à¸µà¸žà¸±à¸™à¸˜à¸¡à¸´à¸•à¸£ (Private Tax & Compliance PII â€” Server-Only / Admin)
CREATE TABLE IF NOT EXISTS public.partner_tax_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL UNIQUE REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL DEFAULT 'individual' CHECK (entity_type IN ('individual', 'corporate')),
    tax_id TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    registered_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_vat_registered BOOLEAN NOT NULL DEFAULT false,
    withholding_tax_exempt BOOLEAN NOT NULL DEFAULT false,
    tax_document_url TEXT,
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_tax_profiles_partner ON public.partner_tax_profiles(partner_id);

-- 1.3 à¸•à¸²à¸£à¸²à¸‡à¸šà¸±à¸à¸Šà¸µà¸£à¸±à¸šà¹€à¸‡à¸´à¸™ (Private Payout Destinations)
CREATE TABLE IF NOT EXISTS public.partner_payout_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    payout_method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'promptpay')),
    bank_code TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    promptpay_id TEXT,
    is_default BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_payout_dest_partner ON public.partner_payout_destinations(partner_id);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 2: DYNAMIC RULES & COMMISSION ENGINE (Configurable)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 2.1 à¸•à¸²à¸£à¸²à¸‡à¸à¸Žà¸ à¸²à¸©à¸µà¸«à¸±à¸ à¸“ à¸—à¸µà¹ˆà¸ˆà¹ˆà¸²à¸¢ (Tax Rules)
CREATE TABLE IF NOT EXISTS public.tax_rules (
    rule_code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('individual', 'corporate', 'any')),
    withholding_rate NUMERIC(5, 4) NOT NULL CHECK (withholding_rate >= 0 AND withholding_rate <= 0.30),
    min_threshold_thb NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
    requires_tax_certificate BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Dynamic Tax Rules (à¸à¸£à¸¡à¸ªà¸£à¸£à¸žà¸²à¸à¸£: à¸„à¸³à¸™à¸§à¸“à¸•à¸²à¸¡à¸›à¸£à¸°à¹€à¸ à¸—à¹€à¸‡à¸´à¸™à¹„à¸”à¹‰à¹à¸¥à¸°à¸™à¸´à¸•à¸´à¸šà¸¸à¸„à¸„à¸¥/à¸šà¸¸à¸„à¸„à¸¥à¸˜à¸£à¸£à¸¡à¸”à¸²)
INSERT INTO public.tax_rules (rule_code, description, entity_type, withholding_rate, min_threshold_thb, requires_tax_certificate, is_active)
VALUES 
    ('TH_INDIVIDUAL_COMMISSION', 'à¸„à¹ˆà¸²à¸™à¸²à¸¢à¸«à¸™à¹‰à¸²à¸šà¸¸à¸„à¸„à¸¥à¸˜à¸£à¸£à¸¡à¸”à¸² (3%)', 'individual', 0.0300, 1000.00, true, true),
    ('TH_CORPORATE_SERVICE', 'à¸„à¹ˆà¸²à¸šà¸£à¸´à¸à¸²à¸£à¸™à¸´à¸•à¸´à¸šà¸¸à¸„à¸„à¸¥ (3%)', 'corporate', 0.0300, 1000.00, true, true),
    ('TH_EXEMPT_ZERO', 'à¹„à¸”à¹‰à¸£à¸±à¸šà¸¢à¸à¹€à¸§à¹‰à¸™à¸ à¸²à¸©à¸µà¸«à¸±à¸ à¸“ à¸—à¸µà¹ˆà¸ˆà¹ˆà¸²à¸¢ (0%)', 'any', 0.0000, 0.00, false, true),
    ('TH_BELOW_THRESHOLD', 'à¸¢à¸­à¸”à¸ˆà¹ˆà¸²à¸¢à¹„à¸¡à¹ˆà¸–à¸¶à¸‡à¹€à¸à¸“à¸‘à¹Œà¸‚à¸±à¹‰à¸™à¸•à¹ˆà¸³ 1,000 à¸šà¸²à¸— (0%)', 'any', 0.0000, 0.00, false, true)
ON CONFLICT (rule_code) DO UPDATE 
SET description = EXCLUDED.description,
    withholding_rate = EXCLUDED.withholding_rate,
    min_threshold_thb = EXCLUDED.min_threshold_thb;

-- 2.2 à¸•à¸²à¸£à¸²à¸‡à¹à¸œà¸™à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™ (Commission Plans)
CREATE TABLE IF NOT EXISTS public.commission_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code TEXT NOT NULL UNIQUE,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'recurring' CHECK (plan_type IN ('recurring', 'first_month_only', 'campaign_promotional')),
    holding_period_days INT NOT NULL DEFAULT 14 CHECK (holding_period_days >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 à¸•à¸²à¸£à¸²à¸‡à¸à¸²à¸£à¸à¸³à¸«à¸™à¸”à¸ªà¸´à¸—à¸˜à¸´à¹Œà¹à¸œà¸™ (Plan Assignments: Tier / Partner-Specific / Campaign)
CREATE TABLE IF NOT EXISTS public.commission_plan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_scope TEXT NOT NULL CHECK (assignment_scope IN ('tier', 'partner', 'campaign')),
    tier_code TEXT CHECK (tier_code IN ('affiliate', 'creator', 'master', 'institutional')),
    partner_id UUID REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    campaign_code TEXT,
    plan_id UUID NOT NULL REFERENCES public.commission_plans(id) ON DELETE RESTRICT,
    priority INT NOT NULL DEFAULT 0, -- Partner specific (100) > Campaign (50) > Tier (10)
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpa_lookup ON public.commission_plan_assignments(assignment_scope, tier_code, partner_id, campaign_code, priority DESC);

-- 2.4 à¸•à¸²à¸£à¸²à¸‡à¸­à¸±à¸•à¸£à¸²à¸œà¸¥à¸•à¸­à¸šà¹à¸—à¸™à¸•à¹ˆà¸­à¹à¸žà¹‡à¸à¹€à¸à¸ˆ (Commission Rate Rules)
CREATE TABLE IF NOT EXISTS public.commission_rate_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.commission_plans(id) ON DELETE CASCADE,
    subscription_plan_code TEXT NOT NULL,
    rate_percentage NUMERIC(5, 4) NOT NULL CHECK (rate_percentage >= 0 AND rate_percentage <= 1.00),
    fixed_bonus_thb NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(plan_id, subscription_plan_code)
);

-- Seed Baseline Commission Plans & Rate Rules
DO $$
DECLARE
    v_affiliate_plan_id UUID;
    v_creator_plan_id UUID;
    v_master_plan_id UUID;
BEGIN
    -- Affiliate Plan (7%)
    INSERT INTO public.commission_plans (plan_code, plan_name, plan_type, holding_period_days, is_active)
    VALUES ('PLAN_DEFAULT_AFFILIATE', 'à¹à¸œà¸™à¸ªà¸¡à¸²à¸Šà¸´à¸à¸—à¸±à¹ˆà¸§à¹„à¸› (7%)', 'recurring', 14, true)
    ON CONFLICT (plan_code) DO UPDATE SET plan_name = EXCLUDED.plan_name
    RETURNING id INTO v_affiliate_plan_id;

    INSERT INTO public.commission_rate_rules (plan_id, subscription_plan_code, rate_percentage)
    VALUES (v_affiliate_plan_id, 'all', 0.0700)
    ON CONFLICT (plan_id, subscription_plan_code) DO UPDATE SET rate_percentage = 0.0700;

    INSERT INTO public.commission_plan_assignments (assignment_scope, tier_code, plan_id, priority)
    VALUES ('tier', 'affiliate', v_affiliate_plan_id, 10)
    ON CONFLICT DO NOTHING;

    -- Creator Plan (15%)
    INSERT INTO public.commission_plans (plan_code, plan_name, plan_type, holding_period_days, is_active)
    VALUES ('PLAN_DEFAULT_CREATOR', 'à¹à¸œà¸™à¸„à¸£à¸µà¹€à¸­à¹€à¸•à¸­à¸£à¹Œ (15%)', 'recurring', 14, true)
    ON CONFLICT (plan_code) DO UPDATE SET plan_name = EXCLUDED.plan_name
    RETURNING id INTO v_creator_plan_id;

    INSERT INTO public.commission_rate_rules (plan_id, subscription_plan_code, rate_percentage)
    VALUES (v_creator_plan_id, 'all', 0.1500)
    ON CONFLICT (plan_id, subscription_plan_code) DO UPDATE SET rate_percentage = 0.1500;

    INSERT INTO public.commission_plan_assignments (assignment_scope, tier_code, plan_id, priority)
    VALUES ('tier', 'creator', v_creator_plan_id, 10)
    ON CONFLICT DO NOTHING;

    -- Master Plan (25%)
    INSERT INTO public.commission_plans (plan_code, plan_name, plan_type, holding_period_days, is_active)
    VALUES ('PLAN_DEFAULT_MASTER', 'à¹à¸œà¸™à¸¡à¸²à¸ªà¹€à¸•à¸­à¸£à¹Œ/à¸ªà¸–à¸²à¸šà¸±à¸™ (25%)', 'recurring', 14, true)
    ON CONFLICT (plan_code) DO UPDATE SET plan_name = EXCLUDED.plan_name
    RETURNING id INTO v_master_plan_id;

    INSERT INTO public.commission_rate_rules (plan_id, subscription_plan_code, rate_percentage)
    VALUES (v_master_plan_id, 'all', 0.2500)
    ON CONFLICT (plan_id, subscription_plan_code) DO UPDATE SET rate_percentage = 0.2500;

    INSERT INTO public.commission_plan_assignments (assignment_scope, tier_code, plan_id, priority)
    VALUES ('tier', 'master', v_master_plan_id, 10)
    ON CONFLICT DO NOTHING;
END $$;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 3: ATTRIBUTION, LEDGER & PAYOUT SETTLEMENT
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 3.1 à¸•à¸²à¸£à¸²à¸‡à¸à¸²à¸£à¸•à¸´à¸”à¸•à¸²à¸¡à¸œà¸¥à¹à¸™à¸°à¸™à¸³ (Attribution Engine)
CREATE TABLE IF NOT EXISTS public.referral_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    visitor_anonymous_id TEXT NOT NULL,
    campaign_code TEXT,
    ip_hash TEXT NOT NULL,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'blocked_self_referral')),
    referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    click_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    converted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ref_attr_visitor ON public.referral_attributions(visitor_anonymous_id, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ref_attr_user ON public.referral_attributions(referred_user_id);

-- 3.2 à¸•à¸²à¸£à¸²à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œà¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™ (Commission Events)
CREATE TABLE IF NOT EXISTS public.commission_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_payment_id UUID NOT NULL,
    subscription_plan_code TEXT NOT NULL,
    
    -- Dynamic VAT & Commission Base
    gross_amount_thb NUMERIC(12, 2) NOT NULL,
    vat_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    vat_amount_thb NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    commissionable_amount_thb NUMERIC(12, 2) NOT NULL,
    
    plan_id_applied UUID NOT NULL REFERENCES public.commission_plans(id),
    commission_rate_applied NUMERIC(5, 4) NOT NULL,
    commission_amount_thb NUMERIC(12, 2) NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'cleared', 'clawback_refunded', 'void')),
    holding_until TIMESTAMPTZ NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_events_partner_status ON public.commission_events(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_comm_events_holding_until ON public.commission_events(holding_until) WHERE status = 'holding';

-- 3.3 à¸ªà¸¡à¸¸à¸”à¸šà¸±à¸à¸Šà¸µà¹à¸¢à¸à¸›à¸£à¸°à¹€à¸ à¸—à¸„à¸¹à¹ˆà¸žà¸±à¸™à¸˜à¸¡à¸´à¸•à¸£ (Partner Ledger â€” Source of Truth)
CREATE TABLE IF NOT EXISTS public.partner_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (
        entry_type IN (
            'commission_holding_in',
            'commission_cleared',
            'commission_clawback',
            'payout_reserved',
            'payout_settled',
            'payout_rejected',
            'manual_adjustment'
        )
    ),
    amount NUMERIC(12, 2) NOT NULL,
    
    -- 3-Balance Snapshots
    holding_balance_before NUMERIC(12, 2) NOT NULL,
    holding_balance_after NUMERIC(12, 2) NOT NULL,
    available_balance_before NUMERIC(12, 2) NOT NULL,
    available_balance_after NUMERIC(12, 2) NOT NULL,
    payout_pending_before NUMERIC(12, 2) NOT NULL,
    payout_pending_after NUMERIC(12, 2) NOT NULL,
    
    reference_type TEXT NOT NULL CHECK (reference_type IN ('commission_event', 'payout_request', 'refund_event', 'admin_adjustment', 'legacy_backfill')),
    reference_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_ledger_history ON public.partner_ledger(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_ref ON public.partner_ledger(reference_type, reference_id);

-- 3.4 à¸•à¸²à¸£à¸²à¸‡à¸„à¸³à¸‚à¸­à¹€à¸šà¸´à¸à¹€à¸‡à¸´à¸™ (Payout Requests)
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT NOT NULL UNIQUE,
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    requested_amount_thb NUMERIC(12, 2) NOT NULL CHECK (requested_amount_thb >= 500.00),
    
    tax_rule_code_applied TEXT NOT NULL REFERENCES public.tax_rules(rule_code),
    withholding_rate_applied NUMERIC(5, 4) NOT NULL,
    withholding_tax_amount_thb NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payout_amount_thb NUMERIC(12, 2) NOT NULL,
    
    destination_snapshot JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_partner ON public.payout_requests(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status, created_at ASC);

-- 3.5 à¸•à¸²à¸£à¸²à¸‡à¸˜à¸¸à¸£à¸à¸£à¸£à¸¡à¸à¸²à¸£à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸ˆà¸£à¸´à¸‡ (Payout Transactions)
CREATE TABLE IF NOT EXISTS public.payout_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_request_id UUID NOT NULL UNIQUE REFERENCES public.payout_requests(id) ON DELETE RESTRICT,
    actual_transferred_amount_thb NUMERIC(12, 2) NOT NULL,
    transfer_bank_ref TEXT NOT NULL,
    transfer_proof_file_url TEXT NOT NULL,
    wht_certificate_number TEXT,
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    settled_by UUID NOT NULL REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 4: SANDS OF TIME CLOSED-LOOP BENEFIT BRIDGE (Non-Monetary)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS public.partner_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    benefit_type TEXT NOT NULL CHECK (benefit_type IN ('consultation_discount', 'report_unlock_subsidy', 'workshop_access')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sands_redeem_cost INT NOT NULL CHECK (sands_redeem_cost > 0),
    benefit_reference_value_thb NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- à¸¡à¸¹à¸¥à¸„à¹ˆà¸²à¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡à¸‚à¸­à¸‡ Benefit à¹„à¸¡à¹ˆà¹ƒà¸Šà¹ˆ Exchange Rate à¸‚à¸­à¸‡à¸—à¸£à¸²à¸¢
    partner_subsidy_budget_thb NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_voucher_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benefit_id UUID NOT NULL REFERENCES public.partner_benefits(id) ON DELETE RESTRICT,
    redeemed_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    voucher_code TEXT NOT NULL UNIQUE,
    sands_deducted INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used', 'expired')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at TIMESTAMPTZ
);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 5: ROW-LEVEL SECURITY (RLS) POLICIES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE public.partner_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payout_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- 5.1 Partner Entities: User view own profile
DROP POLICY IF EXISTS "partner_entities_view_own" ON public.partner_entities;
CREATE POLICY "partner_entities_view_own" ON public.partner_entities
    FOR SELECT USING (auth.uid() = user_id);

-- 5.2 Partner Tax Profiles: Strict private access (Owner can view masked, Service Role full)
DROP POLICY IF EXISTS "partner_tax_profiles_view_own" ON public.partner_tax_profiles;
CREATE POLICY "partner_tax_profiles_view_own" ON public.partner_tax_profiles
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.partner_entities WHERE id = partner_id));

-- 5.3 Partner Destinations: Owner view and manage
DROP POLICY IF EXISTS "partner_payout_dest_view_own" ON public.partner_payout_destinations;
CREATE POLICY "partner_payout_dest_view_own" ON public.partner_payout_destinations
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.partner_entities WHERE id = partner_id));

-- 5.4 Partner Ledger: Owner view own entries
DROP POLICY IF EXISTS "partner_ledger_view_own" ON public.partner_ledger;
CREATE POLICY "partner_ledger_view_own" ON public.partner_ledger
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.partner_entities WHERE id = partner_id));

-- 5.5 Payout Requests: Owner view and create
DROP POLICY IF EXISTS "payout_requests_view_own" ON public.payout_requests;
CREATE POLICY "payout_requests_view_own" ON public.payout_requests
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.partner_entities WHERE id = partner_id));

-- 5.6 Rules & Plans: Authenticated users can view active rules
DROP POLICY IF EXISTS "tax_rules_read_all" ON public.tax_rules;
CREATE POLICY "tax_rules_read_all" ON public.tax_rules FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "commission_plans_read_all" ON public.commission_plans;
CREATE POLICY "commission_plans_read_all" ON public.commission_plans FOR SELECT USING (is_active = true);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 6: ATOMIC STORED PROCEDURES (RPCs)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 6.1 RPC: à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¹ˆà¸²à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™à¹à¸šà¸šà¹„à¸”à¸™à¸²à¸¡à¸´à¸ (à¸„à¸³à¸™à¸§à¸“ VAT + à¸à¸±à¸ 14 à¸§à¸±à¸™ + à¸›à¹‰à¸­à¸‡à¸à¸±à¸™ Idempotency)
CREATE OR REPLACE FUNCTION public.record_partner_commission_atomic(
    p_partner_id UUID,
    p_referred_user_id UUID,
    p_subscription_payment_id UUID,
    p_subscription_plan_code TEXT,
    p_gross_amount_thb NUMERIC,
    p_vat_rate NUMERIC,
    p_plan_id UUID,
    p_commission_rate NUMERIC,
    p_holding_days INT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner public.partner_entities%ROWTYPE;
    v_vat_amount NUMERIC(12, 2);
    v_commissionable_base NUMERIC(12, 2);
    v_commission_amount NUMERIC(12, 2);
    v_holding_until TIMESTAMPTZ;
    v_new_holding NUMERIC(12, 2);
    v_new_total_earned NUMERIC(12, 2);
    v_event_id UUID;
    v_ledger_id UUID;
BEGIN
    -- 1. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Idempotency
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Transaction already processed');
    END IF;

    -- 2. à¸¥à¹‡à¸­à¸à¹à¸–à¸§ Partner Entity à¹€à¸žà¸·à¹ˆà¸­à¸„à¸§à¸²à¸¡à¸›à¸¥à¸­à¸”à¸ à¸±à¸¢à¸ªà¸¹à¸‡à¸ªà¸¸à¸” (FOR UPDATE)
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: %', p_partner_id;
    END IF;

    -- 3. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Anti-Self-Referral
    IF v_partner.user_id = p_referred_user_id THEN
        RAISE EXCEPTION 'SELF_REFERRAL_BLOCKED: Partner cannot refer themselves';
    END IF;

    -- 4. à¸„à¸³à¸™à¸§à¸“ VAT à¹à¸¥à¸°à¸à¸²à¸™à¸„à¸´à¸”à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™à¹à¸šà¸šà¹„à¸”à¸™à¸²à¸¡à¸´à¸
    IF p_vat_rate > 0 THEN
        v_vat_amount := ROUND(p_gross_amount_thb * p_vat_rate / (1.0 + p_vat_rate), 2);
    ELSE
        v_vat_amount := 0.00;
    END IF;

    v_commissionable_base := ROUND(p_gross_amount_thb - v_vat_amount, 2);
    v_commission_amount := ROUND(v_commissionable_base * p_commission_rate, 2);
    v_holding_until := now() + (COALESCE(p_holding_days, 14) || ' days')::INTERVAL;

    -- 5. à¸„à¸³à¸™à¸§à¸“à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™à¹ƒà¸«à¸¡à¹ˆ
    v_new_holding := v_partner.holding_balance + v_commission_amount;
    v_new_total_earned := v_partner.total_earned + v_commission_amount;

    -- 6. INSERT à¸¥à¸‡ commission_events
    INSERT INTO public.commission_events (
        partner_id,
        referred_user_id,
        subscription_payment_id,
        subscription_plan_code,
        gross_amount_thb,
        vat_rate,
        vat_amount_thb,
        commissionable_amount_thb,
        plan_id_applied,
        commission_rate_applied,
        commission_amount_thb,
        status,
        holding_until,
        idempotency_key
    ) VALUES (
        p_partner_id,
        p_referred_user_id,
        p_subscription_payment_id,
        p_subscription_plan_code,
        p_gross_amount_thb,
        p_vat_rate,
        v_vat_amount,
        v_commissionable_base,
        p_plan_id,
        p_commission_rate,
        v_commission_amount,
        'holding',
        v_holding_until,
        p_idempotency_key
    ) RETURNING id INTO v_event_id;

    -- 7. INSERT à¸¥à¸‡ partner_ledger (Double-Entry Source of Truth)
    INSERT INTO public.partner_ledger (
        partner_id,
        entry_type,
        amount,
        holding_balance_before,
        holding_balance_after,
        available_balance_before,
        available_balance_after,
        payout_pending_before,
        payout_pending_after,
        reference_type,
        reference_id,
        idempotency_key,
        notes
    ) VALUES (
        p_partner_id,
        'commission_holding_in',
        v_commission_amount,
        v_partner.holding_balance,
        v_new_holding,
        v_partner.available_balance,
        v_partner.available_balance,
        v_partner.payout_pending_balance,
        v_partner.payout_pending_balance,
        'commission_event',
        v_event_id::TEXT,
        p_idempotency_key,
        'Commission received and placed in ' || COALESCE(p_holding_days, 14) || '-day holding'
    ) RETURNING id INTO v_ledger_id;

    -- 8. UPDATE partner_entities (Materialized Cache)
    UPDATE public.partner_entities
    SET holding_balance = v_new_holding,
        total_earned = v_new_total_earned,
        updated_at = now()
    WHERE id = p_partner_id;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', v_event_id,
        'ledger_id', v_ledger_id,
        'commission_amount', v_commission_amount,
        'holding_until', v_holding_until,
        'new_holding_balance', v_new_holding
    );
END;
$$;

-- 6.2 RPC: à¸›à¸¥à¸”à¸¥à¹‡à¸­à¸à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™à¸—à¸µà¹ˆà¸„à¸£à¸šà¸à¸³à¸«à¸™à¸” 14 à¸§à¸±à¸™ (Holding -> Available)
CREATE OR REPLACE FUNCTION public.clear_holding_commissions_atomic(p_limit INT DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_partner public.partner_entities%ROWTYPE;
    v_cleared_count INT := 0;
    v_total_cleared_amount NUMERIC(12, 2) := 0.00;
    v_idem TEXT;
BEGIN
    FOR v_event IN
        SELECT * FROM public.commission_events
        WHERE status = 'holding' AND holding_until <= now()
        ORDER BY holding_until ASC
        LIMIT p_limit
    LOOP
        v_idem := 'clear:' || v_event.id;

        -- à¸¥à¹‡à¸­à¸à¹à¸–à¸§ Partner
        SELECT * INTO v_partner
        FROM public.partner_entities
        WHERE id = v_event.partner_id
        FOR UPDATE;

        IF FOUND THEN
            -- à¸¢à¹‰à¸²à¸¢à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™: holding -= amount, available += amount
            UPDATE public.partner_entities
            SET holding_balance = GREATEST(0.00, holding_balance - v_event.commission_amount_thb),
                available_balance = available_balance + v_event.commission_amount_thb,
                updated_at = now()
            WHERE id = v_event.partner_id;

            -- à¸šà¸±à¸™à¸—à¸¶à¸ Ledger
            INSERT INTO public.partner_ledger (
                partner_id,
                entry_type,
                amount,
                holding_balance_before,
                holding_balance_after,
                available_balance_before,
                available_balance_after,
                payout_pending_before,
                payout_pending_after,
                reference_type,
                reference_id,
                idempotency_key,
                notes
            ) VALUES (
                v_event.partner_id,
                'commission_cleared',
                v_event.commission_amount_thb,
                v_partner.holding_balance,
                GREATEST(0.00, v_partner.holding_balance - v_event.commission_amount_thb),
                v_partner.available_balance,
                v_partner.available_balance + v_event.commission_amount_thb,
                v_partner.payout_pending_balance,
                v_partner.payout_pending_balance,
                'commission_event',
                v_event.id::TEXT,
                v_idem,
                '14-day holding cleared to available balance'
            );

            -- à¸­à¸±à¸›à¹€à¸”à¸•à¸ªà¸–à¸²à¸™à¸° Event
            UPDATE public.commission_events
            SET status = 'cleared'
            WHERE id = v_event.id;

            v_cleared_count := v_cleared_count + 1;
            v_total_cleared_amount := v_total_cleared_amount + v_event.commission_amount_thb;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'cleared_count', v_cleared_count,
        'total_cleared_amount', v_total_cleared_amount
    );
END;
$$;

-- 6.3 RPC: à¸¢à¸·à¹ˆà¸™à¸‚à¸­à¹€à¸šà¸´à¸à¹€à¸‡à¸´à¸™à¹à¸šà¸š Atomic Reserve (Available -> Payout Pending à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸–à¸­à¸™à¸‹à¹‰à¸³)
CREATE OR REPLACE FUNCTION public.reserve_payout_atomic(
    p_partner_id UUID,
    p_requested_amount_thb NUMERIC,
    p_tax_rule_code TEXT,
    p_destination_snapshot JSONB,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner public.partner_entities%ROWTYPE;
    v_tax_rule public.tax_rules%ROWTYPE;
    v_wht_amount NUMERIC(12, 2);
    v_net_amount NUMERIC(12, 2);
    v_new_available NUMERIC(12, 2);
    v_new_pending NUMERIC(12, 2);
    v_request_number TEXT;
    v_request_id UUID;
    v_ledger_id UUID;
BEGIN
    -- 1. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Idempotency
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Payout request already processed');
    END IF;

    -- 2. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸¢à¸­à¸”à¸‚à¸±à¹‰à¸™à¸•à¹ˆà¸³ 500 à¸šà¸²à¸—
    IF p_requested_amount_thb < 500.00 THEN
        RAISE EXCEPTION 'MINIMUM_PAYOUT_THRESHOLD_500: Minimum payout is à¸¿500.00';
    END IF;

    -- 3. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Tax Rule à¹à¸šà¸š Dynamic (à¸«à¹‰à¸²à¸¡ hard-code 3%)
    SELECT * INTO v_tax_rule
    FROM public.tax_rules
    WHERE rule_code = p_tax_rule_code AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TAX_RULE_NOT_FOUND: Tax rule % not found or inactive', p_tax_rule_code;
    END IF;

    -- 4. à¸¥à¹‡à¸­à¸à¹à¸–à¸§ Partner Entity à¸›à¹‰à¸­à¸‡à¸à¸±à¸™ Concurrent Withdrawal
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: %', p_partner_id;
    END IF;

    -- 5. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸¢à¸­à¸”à¹€à¸‡à¸´à¸™ Available
    IF v_partner.available_balance < p_requested_amount_thb THEN
        RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE: Available balance is à¸¿%, requested à¸¿%',
            v_partner.available_balance, p_requested_amount_thb;
    END IF;

    -- 6. à¸„à¸³à¸™à¸§à¸“à¸ à¸²à¸©à¸µà¸«à¸±à¸ à¸“ à¸—à¸µà¹ˆà¸ˆà¹ˆà¸²à¸¢à¸•à¸²à¸¡ Tax Rule
    IF p_requested_amount_thb >= v_tax_rule.min_threshold_thb THEN
        v_wht_amount := ROUND(p_requested_amount_thb * v_tax_rule.withholding_rate, 2);
    ELSE
        v_wht_amount := 0.00;
    END IF;

    v_net_amount := ROUND(p_requested_amount_thb - v_wht_amount, 2);

    -- 7. à¸•à¸±à¸”à¸¢à¸­à¸” Atomic: Available à¸¥à¸”à¸¥à¸‡, Payout Pending à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¸¶à¹‰à¸™
    v_new_available := v_partner.available_balance - p_requested_amount_thb;
    v_new_pending := v_partner.payout_pending_balance + p_requested_amount_thb;

    v_request_number := 'PO-' || to_char(now(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0');

    -- 8. INSERT à¸¥à¸‡ payout_requests
    INSERT INTO public.payout_requests (
        request_number,
        partner_id,
        requested_amount_thb,
        tax_rule_code_applied,
        withholding_rate_applied,
        withholding_tax_amount_thb,
        net_payout_amount_thb,
        destination_snapshot,
        status
    ) VALUES (
        v_request_number,
        p_partner_id,
        p_requested_amount_thb,
        v_tax_rule.rule_code,
        v_tax_rule.withholding_rate,
        v_wht_amount,
        v_net_amount,
        p_destination_snapshot,
        'pending_review'
    ) RETURNING id INTO v_request_id;

    -- 9. INSERT à¸¥à¸‡ partner_ledger (Double-Entry Source of Truth)
    INSERT INTO public.partner_ledger (
        partner_id,
        entry_type,
        amount,
        holding_balance_before,
        holding_balance_after,
        available_balance_before,
        available_balance_after,
        payout_pending_before,
        payout_pending_after,
        reference_type,
        reference_id,
        idempotency_key,
        notes
    ) VALUES (
        p_partner_id,
        'payout_reserved',
        p_requested_amount_thb,
        v_partner.holding_balance,
        v_partner.holding_balance,
        v_partner.available_balance,
        v_new_available,
        v_partner.payout_pending_balance,
        v_new_pending,
        'payout_request',
        v_request_id::TEXT,
        p_idempotency_key,
        'Payout reserved for review: ' || v_request_number
    ) RETURNING id INTO v_ledger_id;

    -- 10. UPDATE partner_entities (Materialized Cache)
    UPDATE public.partner_entities
    SET available_balance = v_new_available,
        payout_pending_balance = v_new_pending,
        updated_at = now()
    WHERE id = p_partner_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'request_number', v_request_number,
        'requested_amount', p_requested_amount_thb,
        'withholding_tax', v_wht_amount,
        'net_amount', v_net_amount,
        'new_available_balance', v_new_available,
        'new_payout_pending_balance', v_new_pending
    );
END;
$$;

-- 6.4 RPC: à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆà¹‚à¸”à¸¢ Admin (Payout Pending -> Total Withdrawn)
CREATE OR REPLACE FUNCTION public.settle_payout_atomic(
    p_payout_request_id UUID,
    p_settled_by UUID,
    p_actual_transferred_amount_thb NUMERIC,
    p_transfer_bank_ref TEXT,
    p_transfer_proof_file_url TEXT,
    p_wht_certificate_number TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request public.payout_requests%ROWTYPE;
    v_partner public.partner_entities%ROWTYPE;
    v_new_pending NUMERIC(12, 2);
    v_new_withdrawn NUMERIC(12, 2);
BEGIN
    -- 1. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Idempotency
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Settlement already processed');
    END IF;

    -- 2. à¸¥à¹‡à¸­à¸à¸„à¸³à¸‚à¸­à¹€à¸šà¸´à¸à¹€à¸‡à¸´à¸™
    SELECT * INTO v_request
    FROM public.payout_requests
    WHERE id = p_payout_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYOUT_REQUEST_NOT_FOUND: %', p_payout_request_id;
    END IF;

    IF v_request.status NOT IN ('pending_review', 'approved', 'processing') THEN
        RAISE EXCEPTION 'INVALID_PAYOUT_STATUS: Cannot settle payout in status %', v_request.status;
    END IF;

    -- 3. à¸¥à¹‡à¸­à¸ Partner Entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_request.partner_id
    FOR UPDATE;

    -- 4. à¸¢à¹‰à¸²à¸¢à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™: payout_pending à¸¥à¸”à¸¥à¸‡, total_withdrawn à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¸¶à¹‰à¸™
    v_new_pending := GREATEST(0.00, v_partner.payout_pending_balance - v_request.requested_amount_thb);
    v_new_withdrawn := v_partner.total_withdrawn + v_request.requested_amount_thb;

    -- 5. INSERT à¸¥à¸‡ payout_transactions
    INSERT INTO public.payout_transactions (
        payout_request_id,
        actual_transferred_amount_thb,
        transfer_bank_ref,
        transfer_proof_file_url,
        wht_certificate_number,
        settled_by
    ) VALUES (
        p_payout_request_id,
        p_actual_transferred_amount_thb,
        p_transfer_bank_ref,
        p_transfer_proof_file_url,
        p_wht_certificate_number,
        p_settled_by
    );

    -- 6. INSERT à¸¥à¸‡ partner_ledger
    INSERT INTO public.partner_ledger (
        partner_id,
        entry_type,
        amount,
        holding_balance_before,
        holding_balance_after,
        available_balance_before,
        available_balance_after,
        payout_pending_before,
        payout_pending_after,
        reference_type,
        reference_id,
        idempotency_key,
        notes
    ) VALUES (
        v_partner.id,
        'payout_settled',
        v_request.requested_amount_thb,
        v_partner.holding_balance,
        v_partner.holding_balance,
        v_partner.available_balance,
        v_partner.available_balance,
        v_partner.payout_pending_balance,
        v_new_pending,
        'payout_request',
        p_payout_request_id::TEXT,
        p_idempotency_key,
        'Payout settled with bank ref: ' || p_transfer_bank_ref
    );

    -- 7. UPDATE à¸ªà¸–à¸²à¸™à¸° Payout Request
    UPDATE public.payout_requests
    SET status = 'completed',
        reviewed_by = p_settled_by,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_payout_request_id;

    -- 8. UPDATE partner_entities (Materialized Cache)
    UPDATE public.partner_entities
    SET payout_pending_balance = v_new_pending,
        total_withdrawn = v_new_withdrawn,
        updated_at = now()
    WHERE id = v_partner.id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_payout_request_id,
        'new_payout_pending_balance', v_new_pending,
        'new_total_withdrawn', v_new_withdrawn
    );
END;
$$;

-- 6.5 RPC: à¸›à¸à¸´à¹€à¸ªà¸˜à¸„à¸³à¸‚à¸­à¹€à¸šà¸´à¸à¹€à¸‡à¸´à¸™à¹à¸¥à¸°à¸„à¸·à¸™à¸¢à¸­à¸” (Payout Pending -> Available)
CREATE OR REPLACE FUNCTION public.reject_payout_atomic(
    p_payout_request_id UUID,
    p_reviewed_by UUID,
    p_rejection_reason TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request public.payout_requests%ROWTYPE;
    v_partner public.partner_entities%ROWTYPE;
    v_new_available NUMERIC(12, 2);
    v_new_pending NUMERIC(12, 2);
BEGIN
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Rejection already processed');
    END IF;

    SELECT * INTO v_request
    FROM public.payout_requests
    WHERE id = p_payout_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYOUT_REQUEST_NOT_FOUND: %', p_payout_request_id;
    END IF;

    IF v_request.status NOT IN ('pending_review', 'processing') THEN
        RAISE EXCEPTION 'INVALID_PAYOUT_STATUS: Cannot reject payout in status %', v_request.status;
    END IF;

    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_request.partner_id
    FOR UPDATE;

    -- à¸„à¸·à¸™à¸¢à¸­à¸”à¹€à¸‡à¸´à¸™: payout_pending à¸¥à¸”à¸¥à¸‡, available à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¸¶à¹‰à¸™
    v_new_pending := GREATEST(0.00, v_partner.payout_pending_balance - v_request.requested_amount_thb);
    v_new_available := v_partner.available_balance + v_request.requested_amount_thb;

    INSERT INTO public.partner_ledger (
        partner_id,
        entry_type,
        amount,
        holding_balance_before,
        holding_balance_after,
        available_balance_before,
        available_balance_after,
        payout_pending_before,
        payout_pending_after,
        reference_type,
        reference_id,
        idempotency_key,
        notes
    ) VALUES (
        v_partner.id,
        'payout_rejected',
        v_request.requested_amount_thb,
        v_partner.holding_balance,
        v_partner.holding_balance,
        v_partner.available_balance,
        v_new_available,
        v_partner.payout_pending_balance,
        v_new_pending,
        'payout_request',
        p_payout_request_id::TEXT,
        p_idempotency_key,
        'Payout rejected and refunded to available: ' || COALESCE(p_rejection_reason, 'No reason provided')
    );

    UPDATE public.payout_requests
    SET status = 'rejected',
        rejection_reason = p_rejection_reason,
        reviewed_by = p_reviewed_by,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_payout_request_id;

    UPDATE public.partner_entities
    SET available_balance = v_new_available,
        payout_pending_balance = v_new_pending,
        updated_at = now()
    WHERE id = v_partner.id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_payout_request_id,
        'refunded_available_balance', v_new_available,
        'remaining_pending_balance', v_new_pending
    );
END;
$$;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 7: NON-DESTRUCTIVE LEGACY BACKFILL PROCEDURE
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.backfill_legacy_affiliate_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ref RECORD;
    v_partner_id UUID;
    v_migrated_partners INT := 0;
    v_migrated_earnings INT := 0;
BEGIN
    -- 1. à¸ªà¸£à¹‰à¸²à¸‡ Partner Entity à¹ƒà¸«à¹‰à¸à¸±à¸šà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸—à¸¸à¸à¸„à¸™à¸—à¸µà¹ˆà¸¡à¸µ referral_code à¸«à¸£à¸·à¸­à¹€à¸„à¸¢à¸¡à¸µà¸›à¸£à¸°à¸§à¸±à¸•à¸´à¹à¸™à¸°à¸™à¸³
    FOR v_ref IN
        SELECT DISTINCT id, referral_code, created_at
        FROM public.profiles
        WHERE referral_code IS NOT NULL
    LOOP
        INSERT INTO public.partner_entities (
            user_id,
            partner_code,
            tier_code,
            status,
            verification_status,
            holding_balance,
            available_balance,
            payout_pending_balance,
            total_earned,
            total_withdrawn,
            created_at
        ) VALUES (
            v_ref.id,
            v_ref.referral_code,
            'affiliate',
            'active',
            'unverified',
            0.00,
            0.00,
            0.00,
            0.00,
            0.00,
            v_ref.created_at
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        v_migrated_partners := v_migrated_partners + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'migrated_partners', v_migrated_partners,
        'migrated_earnings', v_migrated_earnings
    );
END;
$$;


-- ============================================================
-- 018_attribution_engine_and_financial_guards.sql
-- ============================================================
-- 018_attribution_engine_and_financial_guards.sql
-- ==============================================================================
-- ðŸ›ï¸ PHOPEPHUM V3 â€” PHASE 6.5.3: ATTRIBUTION ENGINE & FINANCIAL GUARDRAILS
-- 
-- Key Enhancements:
-- 1. Financial FK Protection: RESTRICT on delete (no cascade delete of financial ledger)
-- 2. One-User-One-Winning-Attribution: UNIQUE (referred_user_id) WHERE status = 'converted'
-- 3. Last-Touch 30-Day Attribution Engine with Click Deduplication
-- 4. Multi-Signal Anti-Self-Referral (IP Hash as risk signal, not sole decider)
-- 5. Commission Term & Recurring Policy (first_payment, 3_months, 6_months, 12_months, until_subscription_ends)
-- 6. Post-14-Day Clawback Policy (Clawback Pending Balance)
-- 7. Strict Payout State Machine (No arbitrary status jumps)
-- ==============================================================================

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 1: FINANCIAL FOREIGN KEY HARDENING & DATA RETENTION
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 1.1 à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸à¸²à¸£ Cascade Delete à¹ƒà¸™à¸•à¸²à¸£à¸²à¸‡à¸à¸²à¸£à¹€à¸‡à¸´à¸™à¸—à¸µà¹ˆà¸ªà¸³à¸„à¸±à¸
-- à¹à¸à¹‰à¹„à¸‚ FK à¹ƒà¸™ commission_events, partner_ledger, payout_requests, payout_transactions
DO $$
BEGIN
    -- 1. commission_events
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'commission_events_partner_id_fkey' AND table_name = 'commission_events'
    ) THEN
        ALTER TABLE public.commission_events DROP CONSTRAINT commission_events_partner_id_fkey;
        ALTER TABLE public.commission_events 
            ADD CONSTRAINT commission_events_partner_id_fkey 
            FOREIGN KEY (partner_id) REFERENCES public.partner_entities(id) ON DELETE RESTRICT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'commission_events_referred_user_id_fkey' AND table_name = 'commission_events'
    ) THEN
        ALTER TABLE public.commission_events DROP CONSTRAINT commission_events_referred_user_id_fkey;
        ALTER TABLE public.commission_events 
            ADD CONSTRAINT commission_events_referred_user_id_fkey 
            FOREIGN KEY (referred_user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
    END IF;

    -- 2. partner_ledger
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'partner_ledger_partner_id_fkey' AND table_name = 'partner_ledger'
    ) THEN
        ALTER TABLE public.partner_ledger DROP CONSTRAINT partner_ledger_partner_id_fkey;
        ALTER TABLE public.partner_ledger 
            ADD CONSTRAINT partner_ledger_partner_id_fkey 
            FOREIGN KEY (partner_id) REFERENCES public.partner_entities(id) ON DELETE RESTRICT;
    END IF;

    -- 3. payout_requests
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payout_requests_partner_id_fkey' AND table_name = 'payout_requests'
    ) THEN
        ALTER TABLE public.payout_requests DROP CONSTRAINT payout_requests_partner_id_fkey;
        ALTER TABLE public.payout_requests 
            ADD CONSTRAINT payout_requests_partner_id_fkey 
            FOREIGN KEY (partner_id) REFERENCES public.partner_entities(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 1.2 à¹€à¸žà¸´à¹ˆà¸¡ Clawback Pending Balance à¹ƒà¸™ partner_entities
ALTER TABLE public.partner_entities
    ADD COLUMN IF NOT EXISTS clawback_pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (clawback_pending_balance >= 0);

-- 1.3 à¹€à¸žà¸´à¹ˆà¸¡ Commission Term à¹ƒà¸™ commission_plans
ALTER TABLE public.commission_plans
    ADD COLUMN IF NOT EXISTS commission_term TEXT NOT NULL DEFAULT 'until_subscription_ends'
    CHECK (commission_term IN ('first_payment', '3_months', '6_months', '12_months', 'until_subscription_ends')),
    ADD COLUMN IF NOT EXISTS recurring_until TIMESTAMPTZ;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 2: ATTRIBUTION ENGINE DATA MODEL UPGRADES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE public.referral_attributions
    ADD COLUMN IF NOT EXISTS landing_page TEXT,
    ADD COLUMN IF NOT EXISTS referrer_url TEXT,
    ADD COLUMN IF NOT EXISTS risk_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS conversion_tx_id UUID;

-- à¹€à¸žà¸´à¹ˆà¸¡ Index à¹à¸¥à¸° Unique Constraint à¸—à¸µà¹ˆà¸ªà¸³à¸„à¸±à¸à¸—à¸µà¹ˆà¸ªà¸¸à¸”:
-- à¸à¸Žà¹€à¸«à¸¥à¹‡à¸: User 1 à¸„à¸™ à¸•à¹‰à¸­à¸‡à¸¡à¸µ Converted Winning Attribution à¹„à¸”à¹‰à¹€à¸žà¸µà¸¢à¸‡ 1 à¹à¸–à¸§à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™!
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_converted_referred_user 
    ON public.referral_attributions (referred_user_id) 
    WHERE status = 'converted';

-- Index à¸ªà¸³à¸«à¸£à¸±à¸šà¸„à¹‰à¸™à¸«à¸² Last-Touch Active Attribution (30 à¸§à¸±à¸™)
CREATE INDEX IF NOT EXISTS idx_ref_attr_last_touch 
    ON public.referral_attributions (visitor_anonymous_id, click_timestamp DESC) 
    WHERE status = 'active';

-- Index à¸ªà¸³à¸«à¸£à¸±à¸šà¸„à¹‰à¸™à¸«à¸²à¸•à¸²à¸¡ partner_id
CREATE INDEX IF NOT EXISTS idx_ref_attr_partner_status 
    ON public.referral_attributions (partner_id, status);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SECTION 3: ATOMIC STORED PROCEDURES (ATTRIBUTION & FRAUD PROTECTION)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 3.1 à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸„à¸¥à¸´à¸à¸¥à¸´à¸‡à¸à¹Œà¹à¸™à¸°à¸™à¸³ (Referral Click Capture + Throttling + 30-Day Window)
CREATE OR REPLACE FUNCTION public.capture_referral_click_atomic(
    p_partner_code TEXT,
    p_visitor_anonymous_id TEXT,
    p_campaign_code TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT '',
    p_user_agent TEXT DEFAULT '',
    p_landing_page TEXT DEFAULT '/',
    p_referrer_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner public.partner_entities%ROWTYPE;
    v_attribution_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_existing_id UUID;
BEGIN
    -- 1. à¸„à¹‰à¸™à¸«à¸²à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸žà¸±à¸™à¸˜à¸¡à¸´à¸•à¸£à¸ˆà¸²à¸ partner_code (Case-Insensitive)
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE UPPER(partner_code) = UPPER(TRIM(p_partner_code))
      AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_PARTNER_CODE',
            'message', 'Partner code not found or inactive'
        );
    END IF;

    v_expires_at := now() + INTERVAL '30 days';

    -- 2. Throttling / Deduplication:
    -- à¸«à¸²à¸ visitor à¹€à¸”à¸´à¸¡à¹€à¸žà¸´à¹ˆà¸‡à¸„à¸¥à¸´à¸ partner à¹€à¸”à¸´à¸¡à¸ à¸²à¸¢à¹ƒà¸™ 5 à¸™à¸²à¸—à¸µ à¹ƒà¸«à¹‰ update timestamp à¹à¸—à¸™à¸à¸²à¸£ insert à¹à¸–à¸§à¹ƒà¸«à¸¡à¹ˆà¸£à¸ DB
    SELECT id INTO v_existing_id
    FROM public.referral_attributions
    WHERE partner_id = v_partner.id
      AND visitor_anonymous_id = p_visitor_anonymous_id
      AND status = 'active'
      AND click_timestamp >= (now() - INTERVAL '5 minutes')
    ORDER BY click_timestamp DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.referral_attributions
        SET click_timestamp = now(),
            expires_at = v_expires_at,
            campaign_code = COALESCE(p_campaign_code, campaign_code),
            ip_hash = COALESCE(NULLIF(p_ip_hash, ''), ip_hash),
            landing_page = COALESCE(p_landing_page, landing_page),
            referrer_url = COALESCE(p_referrer_url, referrer_url)
        WHERE id = v_existing_id;

        v_attribution_id := v_existing_id;
    ELSE
        -- 3. à¸šà¸±à¸™à¸—à¸¶à¸ Attribution à¹à¸–à¸§à¹ƒà¸«à¸¡à¹ˆ (Active 30 days)
        INSERT INTO public.referral_attributions (
            partner_id,
            visitor_anonymous_id,
            campaign_code,
            ip_hash,
            user_agent,
            landing_page,
            referrer_url,
            status,
            click_timestamp,
            expires_at
        ) VALUES (
            v_partner.id,
            p_visitor_anonymous_id,
            p_campaign_code,
            COALESCE(p_ip_hash, ''),
            p_user_agent,
            p_landing_page,
            p_referrer_url,
            'active',
            now(),
            v_expires_at
        ) RETURNING id INTO v_attribution_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'attribution_id', v_attribution_id,
        'partner_id', v_partner.id,
        'partner_code', v_partner.partner_code,
        'tier_code', v_partner.tier_code,
        'expires_at', v_expires_at
    );
END;
$$;

-- 3.2 à¹à¸›à¸¥à¸‡à¸œà¸¥à¸à¸²à¸£à¹à¸™à¸°à¸™à¸³à¹€à¸¡à¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸ªà¸¡à¸±à¸„à¸£à¸ªà¸¡à¸²à¸Šà¸´à¸ (Atomic Conversion + Last-Touch Resolution)
CREATE OR REPLACE FUNCTION public.convert_referral_attribution_atomic(
    p_referred_user_id UUID,
    p_visitor_anonymous_id TEXT DEFAULT NULL,
    p_manual_partner_code TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT '',
    p_user_agent TEXT DEFAULT '',
    p_user_tax_id TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_converted public.referral_attributions%ROWTYPE;
    v_winning_attribution public.referral_attributions%ROWTYPE;
    v_partner public.partner_entities%ROWTYPE;
    v_partner_tax public.partner_tax_profiles%ROWTYPE;
    v_is_self_referral BOOLEAN := false;
    v_risk_signals JSONB := '{}'::jsonb;
    v_candidate_partner_id UUID;
    v_candidate_attr_id UUID;
BEGIN
    -- 1. à¸à¸Ž One-User-One-Winning-Attribution:
    -- à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸à¹ˆà¸­à¸™à¸§à¹ˆà¸² User à¸„à¸™à¸™à¸µà¹‰à¹€à¸„à¸¢à¸¡à¸µ converted attribution à¹à¸¥à¹‰à¸§à¸«à¸£à¸·à¸­à¹„à¸¡à¹ˆ
    SELECT * INTO v_existing_converted
    FROM public.referral_attributions
    WHERE referred_user_id = p_referred_user_id
      AND status = 'converted'
    LIMIT 1;

    IF FOUND THEN
        SELECT * INTO v_partner FROM public.partner_entities WHERE id = v_existing_converted.partner_id;
        RETURN jsonb_build_object(
            'success', true,
            'already_converted', true,
            'attribution_id', v_existing_converted.id,
            'partner_id', v_existing_converted.partner_id,
            'partner_code', v_partner.partner_code,
            'message', 'User already converted with winning partner'
        );
    END IF;

    -- 2. à¸„à¹‰à¸™à¸«à¸² Candidate Partner:
    -- à¸¥à¸³à¸”à¸±à¸šà¸—à¸µà¹ˆ 1: à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ˆà¸²à¸ Manual Partner Code à¸à¹ˆà¸­à¸™ (à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸£à¸°à¸šà¸¸à¹‚à¸„à¹‰à¸”à¹‚à¸”à¸¢à¸•à¸£à¸‡à¹ƒà¸™à¹à¸šà¸šà¸Ÿà¸­à¸£à¹Œà¸¡)
    IF p_manual_partner_code IS NOT NULL AND TRIM(p_manual_partner_code) <> '' THEN
        SELECT * INTO v_partner
        FROM public.partner_entities
        WHERE UPPER(partner_code) = UPPER(TRIM(p_manual_partner_code))
          AND status = 'active';

        IF FOUND THEN
            v_candidate_partner_id := v_partner.id;
        END IF;
    END IF;

    -- à¸¥à¸³à¸”à¸±à¸šà¸—à¸µà¹ˆ 2: à¸«à¸²à¸à¹„à¸¡à¹ˆà¸¡à¸µ manual code à¹ƒà¸«à¹‰à¹ƒà¸Šà¹‰ Last-Touch Resolution à¸ˆà¸²à¸ 30-day Cookie (visitor_anonymous_id)
    IF v_candidate_partner_id IS NULL AND p_visitor_anonymous_id IS NOT NULL AND TRIM(p_visitor_anonymous_id) <> '' THEN
        SELECT * INTO v_winning_attribution
        FROM public.referral_attributions
        WHERE visitor_anonymous_id = p_visitor_anonymous_id
          AND status = 'active'
          AND expires_at > now()
        ORDER BY click_timestamp DESC
        LIMIT 1;

        IF FOUND THEN
            v_candidate_attr_id := v_winning_attribution.id;
            v_candidate_partner_id := v_winning_attribution.partner_id;
            SELECT * INTO v_partner FROM public.partner_entities WHERE id = v_candidate_partner_id;
        END IF;
    END IF;

    -- à¸«à¸²à¸à¹„à¸¡à¹ˆà¸¡à¸µ Partner à¸—à¸µà¹ˆà¹à¸¡à¸•à¸Šà¹Œà¹„à¸”à¹‰à¹€à¸¥à¸¢
    IF v_candidate_partner_id IS NULL OR v_partner.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'converted', false,
            'reason', 'NO_ELIGIBLE_ATTRIBUTION'
        );
    END IF;

    -- 3. à¸•à¸£à¸§à¸ˆà¸ˆà¸±à¸š Anti-Self-Referral (Multi-Signal Analysis):
    -- Signal 1: à¸šà¸±à¸à¸Šà¸µà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸•à¸£à¸‡à¸à¸±à¸™ (Hard Block)
    IF v_partner.user_id = p_referred_user_id THEN
        v_is_self_referral := true;
        v_risk_signals := jsonb_set(v_risk_signals, '{reason}', '"same_user_account"');
    END IF;

    -- Signal 2: Tax ID à¸•à¸£à¸‡à¸à¸±à¸™ (Hard Block)
    IF NOT v_is_self_referral AND p_user_tax_id IS NOT NULL AND TRIM(p_user_tax_id) <> '' THEN
        SELECT * INTO v_partner_tax FROM public.partner_tax_profiles WHERE partner_id = v_partner.id;
        IF FOUND AND v_partner_tax.tax_id = TRIM(p_user_tax_id) THEN
            v_is_self_referral := true;
            v_risk_signals := jsonb_set(v_risk_signals, '{reason}', '"same_tax_id"');
        END IF;
    END IF;

    -- Signal 3: à¸•à¸£à¸§à¸ˆ IP Hash (Risk Signal à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ â€” à¹„à¸¡à¹ˆ Hard Block à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸—à¸µà¹ˆà¸­à¸¢à¸¹à¹ˆà¸§à¸‡ Wi-Fi à¹€à¸”à¸µà¸¢à¸§à¸à¸±à¸™)
    IF p_ip_hash IS NOT NULL AND p_ip_hash <> '' THEN
        IF v_winning_attribution.ip_hash = p_ip_hash THEN
            v_risk_signals := jsonb_set(v_risk_signals, '{same_ip}', 'true');
        END IF;
    END IF;

    -- à¸«à¸²à¸à¹€à¸›à¹‡à¸™ Self-Referral à¸Šà¸±à¸”à¹€à¸ˆà¸™ à¹ƒà¸«à¹‰à¸›à¸à¸´à¹€à¸ªà¸˜à¹à¸¥à¸°à¸šà¸±à¸™à¸—à¸¶à¸à¸ªà¸–à¸²à¸™à¸°
    IF v_is_self_referral THEN
        IF v_candidate_attr_id IS NOT NULL THEN
            UPDATE public.referral_attributions
            SET status = 'blocked_self_referral',
                referred_user_id = p_referred_user_id,
                risk_signals = v_risk_signals
            WHERE id = v_candidate_attr_id;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'blocked', true,
            'reason', 'SELF_REFERRAL_BLOCKED',
            'signals', v_risk_signals
        );
    END IF;

    -- 4. Conversion à¸ªà¸³à¹€à¸£à¹‡à¸ˆ (Atomic Lock & Update):
    IF v_candidate_attr_id IS NOT NULL THEN
        UPDATE public.referral_attributions
        SET status = 'converted',
            referred_user_id = p_referred_user_id,
            converted_at = now(),
            risk_signals = v_risk_signals
        WHERE id = v_candidate_attr_id;
    ELSE
        -- à¸à¸£à¸“à¸µà¸£à¸°à¸šà¸¸ Manual Code à¹‚à¸”à¸¢à¹„à¸¡à¹ˆà¸¡à¸µ click record à¸¡à¸²à¸à¹ˆà¸­à¸™
        INSERT INTO public.referral_attributions (
            partner_id,
            visitor_anonymous_id,
            referred_user_id,
            status,
            click_timestamp,
            expires_at,
            converted_at,
            risk_signals
        ) VALUES (
            v_partner.id,
            COALESCE(p_visitor_anonymous_id, 'manual_input'),
            p_referred_user_id,
            'converted',
            now(),
            now() + INTERVAL '30 days',
            now(),
            v_risk_signals
        ) RETURNING id INTO v_candidate_attr_id;
    END IF;

    -- 5. Persistent User Attribution:
    -- à¸¥à¹‡à¸­à¸à¸„à¸§à¸²à¸¡à¸ªà¸±à¸¡à¸žà¸±à¸™à¸˜à¹Œà¸¥à¸‡à¹ƒà¸™ profiles à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰ (à¹€à¸›à¹‡à¸™à¸«à¸¥à¸±à¸à¸à¸²à¸™à¸–à¸²à¸§à¸£)
    UPDATE public.profiles
    SET referred_by = v_partner.partner_code,
        referred_by_id = v_partner.user_id,
        updated_at = now()
    WHERE id = p_referred_user_id;

    -- 6. à¹€à¸žà¸´à¹ˆà¸¡ Lifetime Referred Count
    UPDATE public.partner_entities
    SET lifetime_referred_count = lifetime_referred_count + 1,
        updated_at = now()
    WHERE id = v_partner.id;

    RETURN jsonb_build_object(
        'success', true,
        'converted', true,
        'attribution_id', v_candidate_attr_id,
        'partner_id', v_partner.id,
        'partner_code', v_partner.partner_code,
        'tier_code', v_partner.tier_code,
        'risk_signals', v_risk_signals
    );
END;
$$;

-- 3.3 à¸£à¸°à¸šà¸šà¸«à¸±à¸à¹€à¸‡à¸´à¸™à¸¢à¹‰à¸­à¸™à¸«à¸¥à¸±à¸‡ (Post-14-Day Clawback Policy & Clawback Pending)
CREATE OR REPLACE FUNCTION public.clawback_commission_atomic(
    p_partner_id UUID,
    p_clawback_amount_thb NUMERIC,
    p_reference_id TEXT,
    p_notes TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner public.partner_entities%ROWTYPE;
    v_deduct_from_available NUMERIC(12, 2) := 0.00;
    v_add_to_pending_clawback NUMERIC(12, 2) := 0.00;
    v_new_available NUMERIC(12, 2);
    v_new_clawback_pending NUMERIC(12, 2);
BEGIN
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Clawback already processed');
    END IF;

    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: %', p_partner_id;
    END IF;

    -- à¸à¸Ž Post-14-Day Clawback Policy:
    -- à¸–à¹‰à¸² Available >= à¸¢à¸­à¸”à¸«à¸±à¸à¸„à¸·à¸™ â†’ à¸«à¸±à¸à¸ˆà¸²à¸ Available à¸—à¸±à¸™à¸—à¸µ
    -- à¸–à¹‰à¸² Available < à¸¢à¸­à¸”à¸«à¸±à¸à¸„à¸·à¸™ â†’ à¸«à¸±à¸ Available à¹ƒà¸«à¹‰à¹€à¸«à¸¥à¸·à¸­ 0 à¹à¸¥à¸°à¸ªà¹ˆà¸§à¸™à¸•à¹ˆà¸²à¸‡à¹€à¸à¹‡à¸šà¹€à¸‚à¹‰à¸² clawback_pending_balance à¹€à¸žà¸·à¹ˆà¸­à¸«à¸±à¸à¸ˆà¸²à¸à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™à¹ƒà¸™à¸­à¸™à¸²à¸„à¸•!
    IF v_partner.available_balance >= p_clawback_amount_thb THEN
        v_deduct_from_available := p_clawback_amount_thb;
        v_add_to_pending_clawback := 0.00;
    ELSE
        v_deduct_from_available := v_partner.available_balance;
        v_add_to_pending_clawback := p_clawback_amount_thb - v_partner.available_balance;
    END IF;

    v_new_available := v_partner.available_balance - v_deduct_from_available;
    v_new_clawback_pending := v_partner.clawback_pending_balance + v_add_to_pending_clawback;

    -- à¸šà¸±à¸™à¸—à¸¶à¸ Partner Financial Ledger
    INSERT INTO public.partner_ledger (
        partner_id,
        entry_type,
        amount,
        holding_balance_before,
        holding_balance_after,
        available_balance_before,
        available_balance_after,
        payout_pending_before,
        payout_pending_after,
        reference_type,
        reference_id,
        idempotency_key,
        notes
    ) VALUES (
        p_partner_id,
        'commission_clawback',
        p_clawback_amount_thb,
        v_partner.holding_balance,
        v_partner.holding_balance,
        v_partner.available_balance,
        v_new_available,
        v_partner.payout_pending_balance,
        v_partner.payout_pending_balance,
        'refund_event',
        p_reference_id,
        p_idempotency_key,
        p_notes || CASE WHEN v_add_to_pending_clawback > 0 THEN ' (Uncovered à¸¿' || v_add_to_pending_clawback || ' moved to pending clawback)' ELSE '' END
    );

    UPDATE public.partner_entities
    SET available_balance = v_new_available,
        clawback_pending_balance = v_new_clawback_pending,
        updated_at = now()
    WHERE id = p_partner_id;

    RETURN jsonb_build_object(
        'success', true,
        'deducted_from_available', v_deduct_from_available,
        'added_to_clawback_pending', v_add_to_pending_clawback,
        'new_available_balance', v_new_available,
        'new_clawback_pending_balance', v_new_clawback_pending
    );
END;
$$;

-- 3.4 à¸¥à¹‡à¸­à¸ State Machine à¸‚à¸­à¸‡à¸„à¸³à¸‚à¸­à¹€à¸šà¸´à¸à¹€à¸‡à¸´à¸™ (Strict Payout Transition Engine)
CREATE OR REPLACE FUNCTION public.transition_payout_status_atomic(
    p_payout_request_id UUID,
    p_new_status TEXT,
    p_reviewed_by UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request public.payout_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_request
    FROM public.payout_requests
    WHERE id = p_payout_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYOUT_REQUEST_NOT_FOUND: %', p_payout_request_id;
    END IF;

    -- Strict State Machine Rules:
    -- pending_review -> approved | rejected | cancelled
    -- approved -> processing | rejected
    -- processing -> completed | rejected
    -- completed / rejected -> à¸«à¹‰à¸²à¸¡à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸ªà¸–à¸²à¸™à¸°à¸­à¸µà¸à¸•à¹ˆà¸­à¹„à¸›!
    IF v_request.status = 'completed' OR v_request.status = 'rejected' THEN
        RAISE EXCEPTION 'TERMINAL_STATE: Payout request is already in % state', v_request.status;
    END IF;

    IF p_new_status = 'approved' AND v_request.status <> 'pending_review' THEN
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Cannot approve payout from %', v_request.status;
    END IF;

    IF p_new_status = 'processing' AND v_request.status NOT IN ('pending_review', 'approved') THEN
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Cannot start processing from %', v_request.status;
    END IF;

    IF p_new_status = 'completed' AND v_request.status NOT IN ('approved', 'processing') THEN
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Cannot complete payout without prior approval';
    END IF;

    UPDATE public.payout_requests
    SET status = p_new_status,
        reviewed_by = p_reviewed_by,
        reviewed_at = now(),
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_reason ELSE rejection_reason END,
        updated_at = now()
    WHERE id = p_payout_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_request_id', p_payout_request_id,
        'old_status', v_request.status,
        'new_status', p_new_status
    );
END;
$$;


-- ============================================================
-- 019_commission_engine_advanced.sql
-- ============================================================
-- 019_commission_engine_advanced.sql
-- ==============================================================================
-- ðŸ›ï¸ PHOPEPHUM V3 â€” PHASE 6.5.4: ADVANCED COMMISSION ENGINE & CLAWMACK
-- 
-- Key Functions:
-- 1. process_subscription_commission_atomic:
--    Payment -> Winning Converted Attribution -> Plan Priority (Partner 100 > Campaign 50 > Tier 10)
--    -> Commission Term (first_payment, 3_months, 6_months, 12_months, until_subscription_ends)
--    -> Dynamic VAT Separation -> 14-Day Holding -> Partner Financial Ledger
-- 2. process_refund_clawback_atomic:
--    Detects original commission_event
--    - If status = 'holding': Reverses holding balance immediately
--    - If status = 'cleared': Deducts available balance; if insufficient, adds to clawback_pending_balance
-- ==============================================================================

-- 1. RPC: à¸›à¸£à¸°à¸¡à¸§à¸¥à¸œà¸¥à¹à¸¥à¸°à¸„à¸³à¸™à¸§à¸“à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™à¸ˆà¸²à¸à¸šà¸´à¸¥à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™ Subscription à¹à¸šà¸šà¸„à¸£à¸šà¸§à¸‡à¸ˆà¸£
CREATE OR REPLACE FUNCTION public.process_subscription_commission_atomic(
    p_subscription_payment_id UUID,
    p_payer_user_id UUID,
    p_subscription_plan_code TEXT,
    p_gross_amount_thb NUMERIC,
    p_vat_rate NUMERIC,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attr public.referral_attributions%ROWTYPE;
    v_partner public.partner_entities%ROWTYPE;
    v_plan public.commission_plans%ROWTYPE;
    v_assignment public.commission_plan_assignments%ROWTYPE;
    v_rate_rule public.commission_rate_rules%ROWTYPE;
    v_previous_commissions_count INT := 0;
    v_first_commission_at TIMESTAMPTZ;
    v_vat_amount NUMERIC(12, 2) := 0.00;
    v_commissionable_base NUMERIC(12, 2);
    v_commission_amount NUMERIC(12, 2);
    v_holding_days INT := 14;
    v_holding_until TIMESTAMPTZ;
    v_new_holding NUMERIC(12, 2);
    v_new_total_earned NUMERIC(12, 2);
    v_event_id UUID;
    v_ledger_id UUID;
    v_commission_rate NUMERIC(5, 4);
BEGIN
    -- 1. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Idempotency à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸à¸²à¸£à¹€à¸šà¸´à¹‰à¸¥à¸¢à¸­à¸”à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object(
            'success', true, 
            'duplicate', true, 
            'message', 'Commission already recorded for this transaction'
        );
    END IF;

    -- 2. à¸„à¹‰à¸™à¸«à¸² Winning Attribution à¸ˆà¸²à¸ referral_attributions
    -- à¸•à¹‰à¸­à¸‡à¸¡à¸µà¸ªà¸–à¸²à¸™à¸° 'converted' à¹à¸¥à¸° referred_user_id à¸•à¸£à¸‡à¸à¸±à¸šà¸œà¸¹à¹‰à¸ˆà¹ˆà¸²à¸¢à¹€à¸‡à¸´à¸™
    SELECT * INTO v_attr
    FROM public.referral_attributions
    WHERE referred_user_id = p_payer_user_id
      AND status = 'converted'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'awarded', false,
            'reason', 'NO_CONVERTED_ATTRIBUTION',
            'message', 'Payer does not have an active winning referral attribution'
        );
    END IF;

    -- 3. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸–à¸²à¸™à¸° Partner Entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_attr.partner_id
      AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'awarded', false,
            'reason', 'PARTNER_NOT_ACTIVE',
            'message', 'Partner entity is suspended, inactive, or not found'
        );
    END IF;

    -- 4. à¸•à¸£à¸§à¸ˆà¸ˆà¸±à¸š Anti-Self-Referral à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸šà¸±à¸à¸Šà¸µà¸•à¸™à¹€à¸­à¸‡
    IF v_partner.user_id = p_payer_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'awarded', false,
            'reason', 'SELF_REFERRAL_BLOCKED',
            'message', 'Self-referral cannot earn commission'
        );
    END IF;

    -- 5. à¸„à¹‰à¸™à¸«à¸² Commission Plan à¸•à¸²à¸¡à¸¥à¸³à¸”à¸±à¸šà¸„à¸§à¸²à¸¡à¸ªà¸³à¸„à¸±à¸ (Plan Priority Hierarchy)
    -- Priority 100: Partner-Specific
    SELECT cpa.* INTO v_assignment
    FROM public.commission_plan_assignments cpa
    JOIN public.commission_plans cp ON cp.id = cpa.plan_id
    WHERE cpa.assignment_scope = 'partner'
      AND cpa.partner_id = v_partner.id
      AND cp.is_active = true
      AND cpa.effective_from <= now()
      AND (cpa.effective_to IS NULL OR cpa.effective_to >= now())
    ORDER BY cpa.priority DESC
    LIMIT 1;

    -- Priority 50: Campaign-Specific (à¸–à¹‰à¸²à¸¡à¸µ campaign_code à¹ƒà¸™ attribution)
    IF NOT FOUND AND v_attr.campaign_code IS NOT NULL THEN
        SELECT cpa.* INTO v_assignment
        FROM public.commission_plan_assignments cpa
        JOIN public.commission_plans cp ON cp.id = cpa.plan_id
        WHERE cpa.assignment_scope = 'campaign'
          AND cpa.campaign_code = v_attr.campaign_code
          AND cp.is_active = true
          AND cpa.effective_from <= now()
          AND (cpa.effective_to IS NULL OR cpa.effective_to >= now())
        ORDER BY cpa.priority DESC
        LIMIT 1;
    END IF;

    -- Priority 10: Tier Default
    IF NOT FOUND THEN
        SELECT cpa.* INTO v_assignment
        FROM public.commission_plan_assignments cpa
        JOIN public.commission_plans cp ON cp.id = cpa.plan_id
        WHERE cpa.assignment_scope = 'tier'
          AND cpa.tier_code = v_partner.tier_code
          AND cp.is_active = true
          AND cpa.effective_from <= now()
          AND (cpa.effective_to IS NULL OR cpa.effective_to >= now())
        ORDER BY cpa.priority DESC
        LIMIT 1;
    END IF;

    -- à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸œà¸™à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸à¹„à¸”à¹‰
    IF FOUND THEN
        SELECT * INTO v_plan FROM public.commission_plans WHERE id = v_assignment.plan_id;
    ELSE
        -- Fallback à¸‰à¸¸à¸à¹€à¸‰à¸´à¸™: à¹à¸œà¸™ Affiliate à¸¡à¸²à¸•à¸£à¸à¸²à¸™
        SELECT * INTO v_plan FROM public.commission_plans WHERE plan_code = 'PLAN_DEFAULT_AFFILIATE' LIMIT 1;
    END IF;

    v_holding_days := COALESCE(v_plan.holding_period_days, 14);

    -- 6. à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š Commission Term & Recurring Policy
    SELECT COUNT(*), MIN(created_at) INTO v_previous_commissions_count, v_first_commission_at
    FROM public.commission_events
    WHERE referred_user_id = p_payer_user_id
      AND partner_id = v_partner.id
      AND status IN ('holding', 'cleared');

    IF v_plan.commission_term = 'first_payment' AND v_previous_commissions_count >= 1 THEN
        RETURN jsonb_build_object(
            'success', true,
            'awarded', false,
            'reason', 'COMMISSION_TERM_EXPIRED_FIRST_PAYMENT_ONLY',
            'message', 'Plan only awards commission on the initial payment'
        );
    ELSIF v_plan.commission_term = '3_months' AND v_first_commission_at IS NOT NULL AND now() > (v_first_commission_at + INTERVAL '3 months') THEN
        RETURN jsonb_build_object(
            'success', true,
            'awarded', false,
            'reason', 'COMMISSION_TERM_EXPIRED_3_MONTHS',
            'message', 'Plan commission term expired after 3 months'
        );
    ELSIF v_plan.commission_term = '6_months' AND v_first_commission_at IS NOT NULL AND now() > (v_first_commission_at + INTERVAL '6 months') THEN
        RETURN jsonb_build_object(
            'success', true,
            'awarded', false,
            'reason', 'COMMISSION_TERM_EXPIRED_6_MONTHS',
            'message', 'Plan commission term expired after 6 months'
        );
    ELSIF v_plan.commission_term = '12_months' AND v_first_commission_at IS NOT NULL AND now() > (v_first_commission_at + INTERVAL '12 months') THEN
        RETURN jsonb_build_object(
            'success', true,
            'awarded', false,
            'reason', 'COMMISSION_TERM_EXPIRED_12_MONTHS',
            'message', 'Plan commission term expired after 12 months'
        );
    END IF;

    -- 7. à¸„à¸³à¸™à¸§à¸“ Commission Rate à¸ˆà¸²à¸ commission_rate_rules
    SELECT * INTO v_rate_rule
    FROM public.commission_rate_rules
    WHERE plan_id = v_plan.id
      AND (subscription_plan_code = p_subscription_plan_code OR subscription_plan_code = 'all')
    ORDER BY CASE WHEN subscription_plan_code = p_subscription_plan_code THEN 1 ELSE 2 END
    LIMIT 1;

    IF FOUND THEN
        v_commission_rate := v_rate_rule.rate_percentage;
    ELSE
        -- Default à¸•à¸²à¸¡à¸£à¸°à¸”à¸±à¸šà¸«à¸²à¸à¹„à¸¡à¹ˆà¸¡à¸µà¸à¸Žà¹€à¸‰à¸žà¸²à¸°
        v_commission_rate := CASE 
            WHEN v_partner.tier_code = 'master' THEN 0.2500
            WHEN v_partner.tier_code = 'creator' THEN 0.1500
            ELSE 0.0700
        END;
    END IF;

    -- 8. à¹à¸¢à¸ VAT à¹à¸¥à¸°à¸„à¸´à¸” Commissionable Base à¹à¸šà¸šà¹„à¸”à¸™à¸²à¸¡à¸´à¸
    IF p_vat_rate > 0 THEN
        v_vat_amount := ROUND(p_gross_amount_thb * p_vat_rate / (1.0 + p_vat_rate), 2);
    ELSE
        v_vat_amount := 0.00;
    END IF;

    v_commissionable_base := ROUND(p_gross_amount_thb - v_vat_amount, 2);
    v_commission_amount := ROUND(v_commissionable_base * v_commission_rate, 2);
    v_holding_until := now() + (v_holding_days || ' days')::INTERVAL;

    v_new_holding := v_partner.holding_balance + v_commission_amount;
    v_new_total_earned := v_partner.total_earned + v_commission_amount;

    -- 9. à¸šà¸±à¸™à¸—à¸¶à¸ commission_events
    INSERT INTO public.commission_events (
        partner_id,
        referred_user_id,
        subscription_payment_id,
        subscription_plan_code,
        gross_amount_thb,
        vat_rate,
        vat_amount_thb,
        commissionable_amount_thb,
        plan_id_applied,
        commission_rate_applied,
        commission_amount_thb,
        status,
        holding_until,
        idempotency_key
    ) VALUES (
        v_partner.id,
        p_payer_user_id,
        p_subscription_payment_id,
        p_subscription_plan_code,
        p_gross_amount_thb,
        p_vat_rate,
        v_vat_amount,
        v_commissionable_base,
        v_plan.id,
        v_commission_rate,
        v_commission_amount,
        'holding',
        v_holding_until,
        p_idempotency_key
    ) RETURNING id INTO v_event_id;

    -- 10. à¸šà¸±à¸™à¸—à¸¶à¸ partner_ledger (Immutable Financial Source of Truth)
    INSERT INTO public.partner_ledger (
        partner_id,
        entry_type,
        amount,
        holding_balance_before,
        holding_balance_after,
        available_balance_before,
        available_balance_after,
        payout_pending_before,
        payout_pending_after,
        reference_type,
        reference_id,
        idempotency_key,
        notes
    ) VALUES (
        v_partner.id,
        'commission_holding_in',
        v_commission_amount,
        v_partner.holding_balance,
        v_new_holding,
        v_partner.available_balance,
        v_partner.available_balance,
        v_partner.payout_pending_balance,
        v_partner.payout_pending_balance,
        'commission_event',
        v_event_id::TEXT,
        p_idempotency_key,
        'Subscription commission awarded under ' || v_plan.plan_name || ' (' || (v_commission_rate * 100) || '%) in ' || v_holding_days || '-day holding'
    ) RETURNING id INTO v_ledger_id;

    -- 11. à¸­à¸±à¸›à¹€à¸”à¸• partner_entities (Materialized Cache)
    UPDATE public.partner_entities
    SET holding_balance = v_new_holding,
        total_earned = v_new_total_earned,
        updated_at = now()
    WHERE id = v_partner.id;

    RETURN jsonb_build_object(
        'success', true,
        'awarded', true,
        'partner_id', v_partner.id,
        'partner_code', v_partner.partner_code,
        'plan_id', v_plan.id,
        'plan_name', v_plan.plan_name,
        'commission_rate', v_commission_rate,
        'gross_amount', p_gross_amount_thb,
        'vat_amount', v_vat_amount,
        'commissionable_base', v_commissionable_base,
        'commission_amount', v_commission_amount,
        'holding_until', v_holding_until,
        'new_holding_balance', v_new_holding
    );
END;
$$;

-- 2. RPC: à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£à¸¢à¸¶à¸”à¸¢à¸­à¸”à¸„à¸­à¸¡à¸¡à¸´à¸Šà¸Šà¸±à¸™à¸„à¸·à¸™à¹€à¸¡à¸·à¹ˆà¸­à¹€à¸à¸´à¸”à¸à¸²à¸£à¸„à¸·à¸™à¹€à¸‡à¸´à¸™/à¸Šà¸²à¸£à¹Œà¸ˆà¹à¸šà¹‡à¸ (Refund Clawback)
CREATE OR REPLACE FUNCTION public.process_refund_clawback_atomic(
    p_subscription_payment_id UUID,
    p_refund_reason TEXT DEFAULT 'Customer refund / cancellation',
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event public.commission_events%ROWTYPE;
    v_partner public.partner_entities%ROWTYPE;
    v_idem TEXT;
    v_deduct_from_available NUMERIC(12, 2) := 0.00;
    v_add_to_pending_clawback NUMERIC(12, 2) := 0.00;
    v_new_holding NUMERIC(12, 2);
    v_new_available NUMERIC(12, 2);
    v_new_clawback_pending NUMERIC(12, 2);
    v_notes TEXT;
BEGIN
    v_idem := COALESCE(p_idempotency_key, 'refund:' || p_subscription_payment_id);

    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = v_idem) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Refund clawback already processed');
    END IF;

    -- à¸„à¹‰à¸™à¸«à¸² commission_event à¸‚à¸­à¸‡à¸šà¸´à¸¥à¸™à¸µà¹‰à¸—à¸µà¹ˆà¸ªà¸–à¸²à¸™à¸° holding à¸«à¸£à¸·à¸­ cleared
    SELECT * INTO v_event
    FROM public.commission_events
    WHERE subscription_payment_id = p_subscription_payment_id
      AND status IN ('holding', 'cleared')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'clawed_back', false,
            'reason', 'NO_COMMISSION_FOUND',
            'message', 'No eligible commission event found for this payment'
        );
    END IF;

    -- à¸¥à¹‡à¸­à¸ Partner Entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_event.partner_id
    FOR UPDATE;

    IF v_event.status = 'holding' THEN
        -- à¹€à¸„à¸ªà¸—à¸µà¹ˆ 1: à¸„à¸·à¸™à¹€à¸‡à¸´à¸™à¸à¹ˆà¸­à¸™à¸žà¹‰à¸™à¸à¸³à¸«à¸™à¸” 14 à¸§à¸±à¸™ (Refund BEFORE clearance)
        -- à¸”à¸¶à¸‡à¸¢à¸­à¸”à¸­à¸­à¸à¸ˆà¸²à¸ holding_balance à¸—à¸±à¸™à¸—à¸µ
        v_new_holding := GREATEST(0.00, v_partner.holding_balance - v_event.commission_amount_thb);
        v_notes := 'Holding commission cancelled due to refund: ' || COALESCE(p_refund_reason, '');

        INSERT INTO public.partner_ledger (
            partner_id,
            entry_type,
            amount,
            holding_balance_before,
            holding_balance_after,
            available_balance_before,
            available_balance_after,
            payout_pending_before,
            payout_pending_after,
            reference_type,
            reference_id,
            idempotency_key,
            notes
        ) VALUES (
            v_partner.id,
            'commission_clawback',
            v_event.commission_amount_thb,
            v_partner.holding_balance,
            v_new_holding,
            v_partner.available_balance,
            v_partner.available_balance,
            v_partner.payout_pending_balance,
            v_partner.payout_pending_balance,
            'refund_event',
            v_event.id::TEXT,
            v_idem,
            v_notes
        );

        UPDATE public.commission_events
        SET status = 'clawback_refunded'
        WHERE id = v_event.id;

        UPDATE public.partner_entities
        SET holding_balance = v_new_holding,
            updated_at = now()
        WHERE id = v_partner.id;

        RETURN jsonb_build_object(
            'success', true,
            'clawed_back', true,
            'type', 'holding_reversed',
            'amount', v_event.commission_amount_thb,
            'new_holding_balance', v_new_holding
        );

    ELSE
        -- à¹€à¸„à¸ªà¸—à¸µà¹ˆ 2: à¸„à¸·à¸™à¹€à¸‡à¸´à¸™à¸«à¸¥à¸±à¸‡à¸žà¹‰à¸™à¸à¸³à¸«à¸™à¸” 14 à¸§à¸±à¸™ (Refund AFTER clearance)
        -- à¹€à¸‡à¸´à¸™à¹€à¸‚à¹‰à¸² Available à¸«à¸£à¸·à¸­à¸–à¸¹à¸à¸–à¸­à¸™à¹„à¸›à¹à¸¥à¹‰à¸§
        IF v_partner.available_balance >= v_event.commission_amount_thb THEN
            v_deduct_from_available := v_event.commission_amount_thb;
            v_add_to_pending_clawback := 0.00;
        ELSE
            v_deduct_from_available := v_partner.available_balance;
            v_add_to_pending_clawback := v_event.commission_amount_thb - v_partner.available_balance;
        END IF;

        v_new_available := v_partner.available_balance - v_deduct_from_available;
        v_new_clawback_pending := v_partner.clawback_pending_balance + v_add_to_pending_clawback;
        v_notes := 'Cleared commission clawback: ' || COALESCE(p_refund_reason, '') || 
                   CASE WHEN v_add_to_pending_clawback > 0 THEN ' (à¸¿' || v_add_to_pending_clawback || ' added to clawback_pending)' ELSE '' END;

        INSERT INTO public.partner_ledger (
            partner_id,
            entry_type,
            amount,
            holding_balance_before,
            holding_balance_after,
            available_balance_before,
            available_balance_after,
            payout_pending_before,
            payout_pending_after,
            reference_type,
            reference_id,
            idempotency_key,
            notes
        ) VALUES (
            v_partner.id,
            'commission_clawback',
            v_event.commission_amount_thb,
            v_partner.holding_balance,
            v_partner.holding_balance,
            v_partner.available_balance,
            v_new_available,
            v_partner.payout_pending_balance,
            v_partner.payout_pending_balance,
            'refund_event',
            v_event.id::TEXT,
            v_idem,
            v_notes
        );

        UPDATE public.commission_events
        SET status = 'clawback_refunded'
        WHERE id = v_event.id;

        UPDATE public.partner_entities
        SET available_balance = v_new_available,
            clawback_pending_balance = v_new_clawback_pending,
            updated_at = now()
        WHERE id = v_partner.id;

        RETURN jsonb_build_object(
            'success', true,
            'clawed_back', true,
            'type', 'available_clawback',
            'amount', v_event.commission_amount_thb,
            'deducted_from_available', v_deduct_from_available,
            'added_to_clawback_pending', v_add_to_pending_clawback,
            'new_available_balance', v_new_available,
            'new_clawback_pending_balance', v_new_clawback_pending
        );
    END IF;
END;
$$;

-- 3. RPC: Strict Payout State Machine Transition with Financial Ledger Sync
DROP FUNCTION IF EXISTS public.transition_payout_status_atomic(UUID, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.transition_payout_status_atomic(
    p_payout_request_id UUID,
    p_new_status TEXT,
    p_reviewed_by UUID,
    p_reason TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request public.payout_requests%ROWTYPE;
    v_partner public.partner_entities%ROWTYPE;
    v_new_pending NUMERIC(12, 2);
    v_new_available NUMERIC(12, 2);
    v_new_withdrawn NUMERIC(12, 2);
    v_idem TEXT;
BEGIN
    v_idem := COALESCE(p_idempotency_key, 'transition:' || p_payout_request_id || ':' || p_new_status);

    -- 1. Lock payout request
    SELECT * INTO v_request
    FROM public.payout_requests
    WHERE id = p_payout_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYOUT_REQUEST_NOT_FOUND: %', p_payout_request_id;
    END IF;

    -- If already in requested status, return idempotent success
    IF v_request.status = p_new_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'payout_request_id', p_payout_request_id,
            'status', v_request.status
        );
    END IF;

    -- Lock partner entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_request.partner_id
    FOR UPDATE;

    -- Strict State Machine Rules:
    -- Terminal states: completed, rejected
    IF v_request.status IN ('completed', 'rejected') THEN
        RAISE EXCEPTION 'TERMINAL_STATE: Payout request is already in % state', v_request.status;
    END IF;

    -- Disallowed transitions:
    -- pending_review -> completed
    -- approved -> completed
    -- processing -> rejected
    IF v_request.status = 'pending_review' AND p_new_status = 'completed' THEN
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Cannot transition directly from pending_review to completed';
    END IF;

    IF v_request.status = 'approved' AND p_new_status = 'completed' THEN
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Cannot transition directly from approved to completed (must be processing first)';
    END IF;

    IF v_request.status = 'processing' AND p_new_status = 'rejected' THEN
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Cannot reject payout while processing (transfer already in flight)';
    END IF;

    -- Allowed transitions:
    -- pending_review -> approved
    -- pending_review -> rejected
    -- approved -> processing
    -- processing -> completed
    IF v_request.status = 'pending_review' THEN
        IF p_new_status NOT IN ('approved', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: Invalid transition from pending_review to %', p_new_status;
        END IF;

    ELSIF v_request.status = 'approved' THEN
        IF p_new_status <> 'processing' THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: Invalid transition from approved to %', p_new_status;
        END IF;

    ELSIF v_request.status = 'processing' THEN
        IF p_new_status <> 'completed' THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: Invalid transition from processing to %', p_new_status;
        END IF;

    ELSE
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Unknown current status %', v_request.status;
    END IF;

    -- Handle Balance & Ledger Mutations on state transitions:
    -- Case A: pending_review -> rejected (Release reserved funds back to available)
    IF p_new_status = 'rejected' THEN
        v_new_pending := GREATEST(0.00, v_partner.payout_pending_balance - v_request.requested_amount_thb);
        v_new_available := v_partner.available_balance + v_request.requested_amount_thb;

        INSERT INTO public.partner_ledger (
            partner_id,
            entry_type,
            amount,
            holding_balance_before,
            holding_balance_after,
            available_balance_before,
            available_balance_after,
            payout_pending_before,
            payout_pending_after,
            reference_type,
            reference_id,
            idempotency_key,
            notes
        ) VALUES (
            v_partner.id,
            'payout_refunded',
            v_request.requested_amount_thb,
            v_partner.holding_balance,
            v_partner.holding_balance,
            v_partner.available_balance,
            v_new_available,
            v_partner.payout_pending_balance,
            v_new_pending,
            'payout_request',
            v_request.id::TEXT,
            v_idem,
            'Payout rejected: ' || COALESCE(p_reason, 'Admin rejection')
        );

        UPDATE public.partner_entities
        SET available_balance = v_new_available,
            payout_pending_balance = v_new_pending,
            updated_at = now()
        WHERE id = v_partner.id;

    -- Case B: processing -> completed (Deduct from payout_pending, add to total_withdrawn)
    ELSIF p_new_status = 'completed' THEN
        v_new_pending := GREATEST(0.00, v_partner.payout_pending_balance - v_request.requested_amount_thb);
        v_new_withdrawn := v_partner.total_withdrawn + v_request.requested_amount_thb;

        INSERT INTO public.partner_ledger (
            partner_id,
            entry_type,
            amount,
            holding_balance_before,
            holding_balance_after,
            available_balance_before,
            available_balance_after,
            payout_pending_before,
            payout_pending_after,
            reference_type,
            reference_id,
            idempotency_key,
            notes
        ) VALUES (
            v_partner.id,
            'payout_paid',
            v_request.requested_amount_thb,
            v_partner.holding_balance,
            v_partner.holding_balance,
            v_partner.available_balance,
            v_partner.available_balance,
            v_partner.payout_pending_balance,
            v_new_pending,
            'payout_request',
            v_request.id::TEXT,
            v_idem,
            'Payout successfully disbursed to destination: ' || COALESCE(p_reason, '')
        );

        UPDATE public.partner_entities
        SET payout_pending_balance = v_new_pending,
            total_withdrawn = v_new_withdrawn,
            updated_at = now()
        WHERE id = v_partner.id;
    END IF;

    -- Update payout_requests table
    UPDATE public.payout_requests
    SET status = p_new_status,
        reviewed_by = p_reviewed_by,
        reviewed_at = now(),
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_reason ELSE rejection_reason END,
        updated_at = now()
    WHERE id = p_payout_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_request_id', p_payout_request_id,
        'old_status', v_request.status,
        'new_status', p_new_status
    );
END;
$$;



-- ============================================================
-- 020_omise_payment_and_transfer_schema.sql
-- ============================================================
-- 020_omise_payment_and_transfer_schema.sql
-- ==============================================================================
-- ðŸ›ï¸ PHOPEPHUM V3 â€” STEP 6.5.4.1: OMISE INTEGRATION & FINANCIAL HARDENING
-- ==============================================================================

-- 1. à¸•à¸²à¸£à¸²à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸˜à¸¸à¸£à¸à¸£à¸£à¸¡à¸à¸²à¸£à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™à¸‚à¸²à¹€à¸‚à¹‰à¸² (Inbound Payment Transactions)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    provider TEXT NOT NULL DEFAULT 'omise', -- 'omise' | 'stripe_legacy'
    provider_transaction_id TEXT NOT NULL UNIQUE, -- Omise Charge ID (chrg_...)
    payment_method TEXT NOT NULL, -- 'promptpay' | 'card' | 'mobile_banking' | 'truemoney' | 'shopeepay'
    gross_amount_thb NUMERIC(12, 2) NOT NULL,
    gateway_fee_thb NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gateway_vat_thb NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_received_thb NUMERIC(12, 2) NOT NULL,
    vat_rate_applied NUMERIC(5, 4) NOT NULL DEFAULT 0.0700,
    vat_amount_thb NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subscription_plan_code TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending' | 'successful' | 'failed' | 'refunded' | 'disputed'
    metadata JSONB DEFAULT '{}'::jsonb,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Payment Transactions
CREATE INDEX IF NOT EXISTS idx_pay_tx_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pay_tx_provider_id ON public.payment_transactions(provider_transaction_id);

-- 2. à¸•à¸²à¸£à¸²à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¹‚à¸­à¸™à¹€à¸‡à¸´à¸™à¸­à¸­à¸à¹ƒà¸«à¹‰à¸žà¸±à¸™à¸˜à¸¡à¸´à¸•à¸£à¸œà¹ˆà¸²à¸™ Omise Transfer (Outbound Transfers)
CREATE TABLE IF NOT EXISTS public.omise_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_request_id UUID NOT NULL REFERENCES public.payout_requests(id) ON DELETE RESTRICT,
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE RESTRICT,
    omise_transfer_id TEXT NOT NULL UNIQUE, -- trsf_...
    omise_recipient_id TEXT NOT NULL, -- recp_...
    amount_thb NUMERIC(12, 2) NOT NULL,
    fee_thb NUMERIC(12, 2) NOT NULL DEFAULT 20.00,
    fee_vat_thb NUMERIC(12, 2) NOT NULL DEFAULT 1.40,
    net_transferred_thb NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'failed'
    failure_code TEXT,
    failure_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omise_transfers_payout ON public.omise_transfers(payout_request_id);
CREATE INDEX IF NOT EXISTS idx_omise_transfers_partner ON public.omise_transfers(partner_id);

-- 3. Atomic RPC: à¸šà¸±à¸™à¸—à¸¶à¸à¸à¸²à¸£à¸Šà¸³à¸£à¸°à¹€à¸‡à¸´à¸™ Omise à¸ªà¸³à¹€à¸£à¹‡à¸ˆ + à¹€à¸›à¸´à¸”à¹ƒà¸Šà¹‰à¸‡à¸²à¸™ Subscription à¸ªà¸¡à¸²à¸Šà¸´à¸
CREATE OR REPLACE FUNCTION public.record_omise_payment_and_activate_atomic(
    p_user_id UUID,
    p_omise_charge_id TEXT,
    p_payment_method TEXT,
    p_gross_amount_thb NUMERIC,
    p_gateway_fee_thb NUMERIC,
    p_gateway_vat_thb NUMERIC,
    p_net_received_thb NUMERIC,
    p_subscription_plan_code TEXT,
    p_vat_rate NUMERIC,
    p_idempotency_key TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx public.payment_transactions%ROWTYPE;
    v_vat_amount NUMERIC(12, 2) := 0.00;
    v_duration_days INT := 30;
    v_sub_tier TEXT := 'basic';
    v_new_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Idempotency Check
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE idempotency_key = p_idempotency_key OR provider_transaction_id = p_omise_charge_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'payment_transaction_id', v_tx.id,
            'message', 'Payment transaction already recorded'
        );
    END IF;

    -- 2. à¸„à¸³à¸™à¸§à¸“ VAT à¸•à¸²à¸¡à¹„à¸”à¸™à¸²à¸¡à¸´à¸à¹€à¸£à¸•
    IF p_vat_rate > 0 THEN
        v_vat_amount := ROUND(p_gross_amount_thb * p_vat_rate / (1.0 + p_vat_rate), 2);
    ELSE
        v_vat_amount := 0.00;
    END IF;

    -- 3. à¸à¸³à¸«à¸™à¸”à¸£à¸°à¸”à¸±à¸šà¹à¸¥à¸°à¸­à¸²à¸¢à¸¸à¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸•à¸²à¸¡à¹à¸œà¸™
    IF p_subscription_plan_code IN ('pro', 'pro_monthly', 'premium') THEN
        v_sub_tier := 'premium';
        v_duration_days := 30;
    ELSIF p_subscription_plan_code IN ('pro_annual', 'annual') THEN
        v_sub_tier := 'premium';
        v_duration_days := 365;
    ELSIF p_subscription_plan_code IN ('imperial', 'lifetime') THEN
        v_sub_tier := 'lifetime';
        v_duration_days := 36500; -- ~100 years
    ELSE
        v_sub_tier := 'basic';
        v_duration_days := 30;
    END IF;

    v_new_expires_at := now() + (v_duration_days || ' days')::INTERVAL;

    -- 4. à¸šà¸±à¸™à¸—à¸¶à¸ Transaction
    INSERT INTO public.payment_transactions (
        user_id,
        provider,
        provider_transaction_id,
        payment_method,
        gross_amount_thb,
        gateway_fee_thb,
        gateway_vat_thb,
        net_received_thb,
        vat_rate_applied,
        vat_amount_thb,
        subscription_plan_code,
        status,
        metadata,
        idempotency_key
    ) VALUES (
        p_user_id,
        'omise',
        p_omise_charge_id,
        p_payment_method,
        p_gross_amount_thb,
        p_gateway_fee_thb,
        p_gateway_vat_thb,
        p_net_received_thb,
        p_vat_rate,
        v_vat_amount,
        p_subscription_plan_code,
        'successful',
        p_metadata,
        p_idempotency_key
    ) RETURNING * INTO v_tx;

    -- 5. à¸­à¸±à¸›à¹€à¸”à¸• Profile à¸ªà¸¡à¸²à¸Šà¸´à¸
    UPDATE public.profiles
    SET plan = p_subscription_plan_code,
        subscription = v_sub_tier,
        membership_status = 'active',
        membership_expires_at = v_new_expires_at,
        updated_at = now()
    WHERE id = p_user_id;

    -- 6. à¸›à¸´à¸” Pending Subscription Request (à¸–à¹‰à¸²à¸¡à¸µ)
    UPDATE public.subscription_requests
    SET status = 'approved',
        approved_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND plan = p_subscription_plan_code;

    RETURN jsonb_build_object(
        'success', true,
        'duplicate', false,
        'payment_transaction_id', v_tx.id,
        'subscription_tier', v_sub_tier,
        'membership_expires_at', v_new_expires_at
    );
END;
$$;

-- 4. Hardening RLS & Privilege Guards
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omise_transfers ENABLE ROW LEVEL SECURITY;

-- Service Role à¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹€à¸•à¹‡à¸¡à¸—à¸µà¹ˆ
GRANT ALL ON public.payment_transactions TO service_role;
GRANT ALL ON public.omise_transfers TO service_role;

-- User à¸”à¸¹à¹€à¸‰à¸žà¸²à¸°à¸‚à¸­à¸‡à¸•à¸™à¹€à¸­à¸‡
DROP POLICY IF EXISTS "Users can view own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view own payment transactions"
    ON public.payment_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Partners can view own transfers" ON public.omise_transfers;
CREATE POLICY "Partners can view own transfers"
    ON public.omise_transfers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.partner_entities pe
            WHERE pe.id = omise_transfers.partner_id
              AND pe.user_id = auth.uid()
        )
    );

-- à¸¥à¸´à¸”à¸£à¸­à¸™à¸ªà¸´à¸—à¸˜à¸´à¹Œ EXECUTE à¸ˆà¸²à¸ public / anon / authenticated à¹€à¸žà¸·à¹ˆà¸­à¸šà¸±à¸‡à¸„à¸±à¸šà¸œà¹ˆà¸²à¸™ Service Role
REVOKE EXECUTE ON FUNCTION public.record_omise_payment_and_activate_atomic(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_omise_payment_and_activate_atomic(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_subscription_commission_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_subscription_commission_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_refund_clawback_atomic(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_refund_clawback_atomic(UUID, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transition_payout_status_atomic(UUID, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_payout_status_atomic(UUID, TEXT, UUID, TEXT, TEXT) TO service_role;

