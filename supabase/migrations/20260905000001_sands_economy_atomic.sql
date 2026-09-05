-- 20260905000001_sands_economy_atomic.sql
-- PHASE 6.4 — Sands of Time Economy: Atomic Functions, Idempotency, and Reward Classes
-- Mirror of infrastructure/supabase/migrations/016_sands_economy_atomic.sql

-- ─── 1. อัปเกรดตาราง sands_ledger ให้รองรับ Single Source of Truth ──────────────
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

-- ปลดล็อก CHECK constraint เดิมเพื่อรองรับ activity_type และ reward_class แบบเต็มระบบ
ALTER TABLE public.sands_ledger DROP CONSTRAINT IF EXISTS sands_ledger_activity_type_check;
ALTER TABLE public.sands_ledger DROP CONSTRAINT IF EXISTS sands_ledger_reward_class_check;

ALTER TABLE public.sands_ledger ADD CONSTRAINT sands_ledger_reward_class_check CHECK (
    reward_class IN ('daily_ritual', 'wisdom', 'community', 'spend', 'adjustment')
);

-- ─── 2. Idempotency Constraint & Indexes ───────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_sands_ledger_idempotency
    ON public.sands_ledger (user_id, activity_type, reference_id)
    WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sands_ledger_user_class_created
    ON public.sands_ledger (user_id, reward_class, created_at DESC);

-- ─── 3. Atomic Debit Function (หักทรายกาลเวลาแบบ Thread-Safe) ─────────────────
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

    -- ล็อกแถวผู้ใช้งานเพื่อป้องกัน Race Condition (SELECT ... FOR UPDATE)
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
            'error', 'ละอองทรายกาลเวลาไม่เพียงพอ',
            'current_balance', v_current_balance,
            'required', p_amount
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- อัปเดตยอดคงเหลือใน Profile Cache
    UPDATE public.profiles
    SET time_sands = v_new_balance,
        updated_at = now()
    WHERE id = p_user_id;

    -- บันทึก Audit Trail ลงใน sands_ledger (Audit Source of Truth)
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

-- ─── 4. Atomic Credit Function (เพิ่มทราย พร้อมคุม Daily Cap & Idempotency) ────
CREATE OR REPLACE FUNCTION public.credit_sands(
    p_user_id UUID,
    p_amount INTEGER,
    p_reward_class TEXT,
    p_activity_type TEXT,
    p_reference_id TEXT, -- บังคับระบุเพื่อรับประกัน Idempotency
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

    -- ตรวจสอบ Idempotency ทันที
    IF EXISTS (
        SELECT 1 FROM public.sands_ledger
        WHERE user_id = p_user_id 
          AND activity_type = p_activity_type 
          AND reference_id = p_reference_id
    ) THEN
        -- ดึง balance ปัจจุบันส่งกลับอย่างปลอดภัย
        SELECT COALESCE(time_sands, 0) INTO v_current_balance
        FROM public.profiles WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'success', false,
            'code', 'DUPLICATE_EVENT',
            'error', 'ท่านได้รับละอองทรายจากกิจกรรมนี้ไปแล้ว (Duplicate Event)',
            'current_balance', v_current_balance
        );
    END IF;

    -- ตรวจสอบ Daily Ritual Cap (15 ทราย/วัน) เฉพาะ reward_class = 'daily_ritual'
    IF p_reward_class = 'daily_ritual' THEN
        -- คำนวณจุดเริ่มต้นของวันปัจจุบันตามเวลาประเทศไทย (Asia/Bangkok)
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
                'error', 'ท่านสะสมละอองทรายประจำวันครบตามเพดานแล้ว (15 ทราย/วัน)',
                'cap_reached', true,
                'today_earned', v_today_ritual_sum,
                'current_balance', v_current_balance
            );
        ELSIF (v_today_ritual_sum + p_amount) > 15 THEN
            v_allowed_amount := 15 - v_today_ritual_sum; -- เครดิตเฉพาะส่วนที่ยังไม่ชนเพดาน 15
        END IF;
    END IF;

    -- ล็อกแถวผู้ใช้งานเพื่อความปลอดภัย (Row-level lock)
    SELECT COALESCE(time_sands, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    v_new_balance := v_current_balance + v_allowed_amount;

    -- อัปเดต Profile Cache
    UPDATE public.profiles
    SET time_sands = v_new_balance,
        updated_at = now()
    WHERE id = p_user_id;

    -- บันทึก Audit Trail ลง Ledger
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
