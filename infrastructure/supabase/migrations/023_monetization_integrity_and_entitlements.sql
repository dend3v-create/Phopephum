-- ============================================================================
-- 023_monetization_integrity_and_entitlements.sql
-- 🏛️ PHOPEPHUM V3 — STEP 6.6.1: MONETIZATION INTEGRITY & ENTITLEMENT HARDENING
-- ============================================================================

-- ─── 1. Profile Security Guard (Zero-Trust Client Mutation Prevention) ────────
-- ไม่อนุญาตให้ Authenticated User อัปเดตฟิลด์อ่อนไหว (plan, subscription, 
-- membership_status, membership_expires_at, time_sands, role) ได้โดยตรงผ่าน Client API

CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- ตรวจสอบหากรันในบริบทของ client authentication (anon หรือ authenticated)
    IF (auth.role() = 'authenticated' OR auth.role() = 'anon') THEN
        IF (NEW.plan IS DISTINCT FROM OLD.plan) OR
           (NEW.subscription IS DISTINCT FROM OLD.subscription) OR
           (NEW.membership_status IS DISTINCT FROM OLD.membership_status) OR
           (NEW.membership_expires_at IS DISTINCT FROM OLD.membership_expires_at) OR
           (NEW.time_sands IS DISTINCT FROM OLD.time_sands) OR
           (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'Unauthorized: Protected profile fields cannot be modified directly by client'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_sensitive_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_profile_sensitive_columns();


-- ─── 2. Hardened credit_sands & debit_sands (Atomic, Safe Search Path, RBAC) ─

-- Credit Sands Atomic
CREATE OR REPLACE FUNCTION public.credit_sands(
    p_user_id UUID,
    p_amount INTEGER,
    p_reward_class TEXT,
    p_activity_type TEXT,
    p_reference_id TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

    -- 1. ตรวจสอบ Idempotency ทันที
    IF EXISTS (
        SELECT 1 FROM public.sands_ledger
        WHERE user_id = p_user_id 
          AND activity_type = p_activity_type 
          AND reference_id = p_reference_id
    ) THEN
        SELECT COALESCE(time_sands, 0) INTO v_current_balance
        FROM public.profiles WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'success', false,
            'code', 'DUPLICATE_EVENT',
            'error', 'ท่านได้รับละอองทรายจากกิจกรรมนี้ไปแล้ว (Duplicate Event)',
            'current_balance', v_current_balance
        );
    END IF;

    -- 2. ตรวจสอบ Daily Ritual Cap (15 ทราย/วัน) เฉพาะ reward_class = 'daily_ritual'
    -- Purchased Sands (reward_class = 'adjustment') และ wisdom/community อยู่นอก Cap
    IF p_reward_class = 'daily_ritual' THEN
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
            v_allowed_amount := 15 - v_today_ritual_sum;
        END IF;
    END IF;

    -- 3. ล็อกแถวผู้ใช้งานเพื่อป้องกัน Race Condition (SELECT ... FOR UPDATE)
    SELECT COALESCE(time_sands, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    v_new_balance := v_current_balance + v_allowed_amount;

    -- 4. อัปเดต Profile Cache
    UPDATE public.profiles
    SET time_sands = v_new_balance,
        updated_at = now()
    WHERE id = p_user_id;

    -- 5. บันทึก Audit Trail ลง sands_ledger
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
$$;

-- Debit Sands Atomic (Non-negative Guarantee, Row-lock, Idempotency)
CREATE OR REPLACE FUNCTION public.debit_sands(
    p_user_id UUID,
    p_amount INTEGER,
    p_activity_type TEXT,
    p_reference_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_ledger_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
    END IF;

    -- 1. ตรวจสอบ Idempotency หากมีการระบุ reference_id
    IF p_reference_id IS NOT NULL AND length(trim(p_reference_id)) > 0 THEN
        IF EXISTS (
            SELECT 1 FROM public.sands_ledger
            WHERE user_id = p_user_id
              AND activity_type = p_activity_type
              AND reference_id = p_reference_id
        ) THEN
            SELECT COALESCE(time_sands, 0) INTO v_current_balance
            FROM public.profiles WHERE id = p_user_id;

            RETURN jsonb_build_object(
                'success', true,
                'duplicate', true,
                'message', 'Redemption transaction already processed',
                'current_balance', v_current_balance
            );
        END IF;
    END IF;

    -- 2. ล็อกแถวผู้ใช้งานเพื่อป้องกัน Double Spend (SELECT ... FOR UPDATE)
    SELECT COALESCE(time_sands, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    -- ป้องกันยอดติดลบ (ECON-05: Non-negative Balance Invariant)
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ละอองทรายกาลเวลาไม่เพียงพอ',
            'current_balance', v_current_balance,
            'required', p_amount
        );
    END IF;

    v_new_balance := v_current_balance - p_amount;

    -- 3. อัปเดต Profile Cache
    UPDATE public.profiles
    SET time_sands = v_new_balance,
        updated_at = now()
    WHERE id = p_user_id;

    -- 4. บันทึก Audit Trail ลง sands_ledger
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
        'duplicate', false,
        'ledger_id', v_ledger_id,
        'balance_before', v_current_balance,
        'new_balance', v_new_balance,
        'amount_debited', p_amount
    );
END;
$$;

-- ลิดรอนสิทธิ์ EXECUTE RPC จาก Client ตรงๆ (บังคับผ่าน Service Role เท่านั้น)
REVOKE EXECUTE ON FUNCTION public.credit_sands(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_sands(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.debit_sands(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_sands(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO service_role;


-- ─── 3. Hardened record_omise_payment_and_activate_atomic ─────────────────────
-- รองรับการแยกแยะ Sands Refill Pack (ไม่แตะต้อง Membership Plan) และ Membership Duration

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
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx public.payment_transactions%ROWTYPE;
    v_vat_amount NUMERIC(12, 2) := 0.00;
    v_duration_days INT := 30;
    v_sub_tier TEXT := 'basic';
    v_new_expires_at TIMESTAMPTZ;
    v_current_expires_at TIMESTAMPTZ;
    v_is_sands_purchase BOOLEAN := false;
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

    -- 2. คำนวณ Invoice VAT ตามไดนามิกเรต
    IF p_vat_rate > 0 THEN
        v_vat_amount := ROUND(p_gross_amount_thb * p_vat_rate / (1.0 + p_vat_rate), 2);
    ELSE
        v_vat_amount := 0.00;
    END IF;

    -- 3. ตรวจสอบประเภทรายการ (Sands Refill vs Membership Subscription)
    IF p_subscription_plan_code LIKE 'sands_%' OR p_subscription_plan_code = 'sands_refill' THEN
        v_is_sands_purchase := true;
    ELSE
        v_is_sands_purchase := false;
        
        -- ดึงวันหมดอายุเดิม
        SELECT membership_expires_at INTO v_current_expires_at
        FROM public.profiles
        WHERE id = p_user_id;

        -- กำหนดระดับและอายุการใช้งานตามแผน
        IF p_subscription_plan_code IN ('master_lifetime', 'imperial', 'lifetime') THEN
            v_sub_tier := 'lifetime';
            v_duration_days := 36500; -- ~100 years
        ELSIF p_subscription_plan_code IN ('master_annual') THEN
            v_sub_tier := 'master';
            v_duration_days := 365;
        ELSIF p_subscription_plan_code IN ('master', 'master_monthly') THEN
            v_sub_tier := 'master';
            v_duration_days := 30;
        ELSIF p_subscription_plan_code IN ('pro_annual', 'annual') THEN
            v_sub_tier := 'pro';
            v_duration_days := 365;
        ELSIF p_subscription_plan_code IN ('pro', 'pro_monthly') THEN
            v_sub_tier := 'pro';
            v_duration_days := 30;
        ELSIF p_subscription_plan_code IN ('premium_annual', 'basic_annual') THEN
            v_sub_tier := 'premium';
            v_duration_days := 365;
        ELSIF p_subscription_plan_code IN ('premium', 'premium_monthly', 'basic', 'basic_monthly') THEN
            v_sub_tier := 'premium';
            v_duration_days := 30;
        ELSE
            v_sub_tier := 'premium';
            v_duration_days := 30;
        END IF;

        IF v_sub_tier = 'lifetime' THEN
            v_new_expires_at := now() + INTERVAL '100 years';
        ELSE
            -- หากยังมีอายุเหลืออยู่ ให้ต่อยอดจากวันหมดอายุเดิม
            IF v_current_expires_at IS NOT NULL AND v_current_expires_at > now() THEN
                v_new_expires_at := v_current_expires_at + (v_duration_days || ' days')::INTERVAL;
            ELSE
                v_new_expires_at := now() + (v_duration_days || ' days')::INTERVAL;
            END IF;
        END IF;
    END IF;

    -- 4. บันทึก Payment Transaction (Single Source of Truth)
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

    -- 5. อัปเดต Profile สมาชิกเฉพาะเมื่อเป็นการสมัครสมาชิก
    IF NOT v_is_sands_purchase THEN
        UPDATE public.profiles
        SET plan = p_subscription_plan_code,
            subscription = v_sub_tier,
            membership_status = 'active',
            membership_expires_at = v_new_expires_at,
            updated_at = now()
        WHERE id = p_user_id;

        -- ปิด Pending Subscription Request สำหรับสมาชิก
        UPDATE public.subscription_requests
        SET status = 'approved',
            approved_at = now(),
            updated_at = now()
        WHERE user_id = p_user_id
          AND status = 'pending'
          AND plan = p_subscription_plan_code;
    ELSE
        -- ปิด Pending Subscription Request สำหรับ Sands Refill
        UPDATE public.subscription_requests
        SET status = 'approved',
            approved_at = now(),
            updated_at = now()
        WHERE user_id = p_user_id
          AND status = 'pending'
          AND type = 'sands_refill'
          AND plan = p_subscription_plan_code;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'duplicate', false,
        'payment_transaction_id', v_tx.id,
        'is_sands_purchase', v_is_sands_purchase,
        'subscription_tier', CASE WHEN v_is_sands_purchase THEN NULL ELSE v_sub_tier END,
        'membership_expires_at', CASE WHEN v_is_sands_purchase THEN NULL ELSE v_new_expires_at END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_omise_payment_and_activate_atomic(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_omise_payment_and_activate_atomic(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, JSONB) TO service_role;
