-- 026_partner_onboarding_state_guard.sql
-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — STEP 7.2D.2: PARTNER ONBOARDING STATE GUARD & FINANCIAL ELIGIBILITY
-- ==============================================================================
-- 1. Canonical State Machine Enforcement:
--    applied -> profile_complete -> tax_profile_complete -> payout_destination_complete -> terms_accepted -> active
--    Administrative transitions: active <-> suspended, applied -> rejected
-- 2. Atomic RPC State Evaluator (evaluate_and_update_partner_onboarding_state)
-- 3. Canonical Server-side Financial Eligibility Guard (assert_partner_eligibility_atomic)
-- 4. Hardened RPCs for Payout, Attribution, and Commission
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: SCHEMA HARDENING (partner_entities Status & Onboarding Steps)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 ปรับ CHECK constraint บน status ให้ครอบคลุมทุก State ใน Canonical State Machine
ALTER TABLE public.partner_entities 
    DROP CONSTRAINT IF EXISTS partner_entities_status_check;

ALTER TABLE public.partner_entities 
    ADD CONSTRAINT partner_entities_status_check 
    CHECK (status IN (
        'applied',
        'profile_complete',
        'tax_profile_complete',
        'payout_destination_complete',
        'terms_accepted',
        'active',
        'suspended',
        'rejected'
    ));

-- 1.2 เพิ่มคอลัมน์ onboarding_step เพื่อ track progress แยกจากการควบคุม active/suspended
ALTER TABLE public.partner_entities
    ADD COLUMN IF NOT EXISTS onboarding_step TEXT NOT NULL DEFAULT 'applied'
    CHECK (onboarding_step IN (
        'applied',
        'profile_complete',
        'tax_profile_complete',
        'payout_destination_complete',
        'terms_accepted',
        'active'
    ));

-- 1.3 ปรับ default status สำหรับ entity ใหม่ให้เป็น 'applied' (ไม่ใช่ 'active' ทันที)
ALTER TABLE public.partner_entities
    ALTER COLUMN status SET DEFAULT 'applied';

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: ATOMIC ONBOARDING STATE EVALUATION RPC
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.evaluate_and_update_partner_onboarding_state(
    p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_partner public.partner_entities%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_tax public.partner_tax_profiles%ROWTYPE;
    v_payout public.partner_payout_destinations%ROWTYPE;
    v_active_terms public.partner_terms_versions%ROWTYPE;
    v_has_terms_accepted BOOLEAN := false;
    v_new_step TEXT := 'applied';
    v_new_status TEXT;
    v_tax_valid BOOLEAN := false;
    v_payout_valid BOOLEAN := false;
BEGIN
    -- 1. ดึงและล็อกข้อมูล Partner Entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PARTNER_NOT_FOUND');
    END IF;

    -- หากถูก SUSPENDED หรือ REJECTED จาก Admin ให้คงสถานะเดิมไว้
    IF v_partner.status IN ('suspended', 'rejected') THEN
        RETURN jsonb_build_object(
            'success', true,
            'partner_id', p_partner_id,
            'status', v_partner.status,
            'onboarding_step', v_partner.onboarding_step,
            'message', 'Partner is under administrative status lock'
        );
    END IF;

    -- 2. ตรวจสอบ Profile พื้นฐาน (User profile)
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_partner.user_id;

    IF FOUND AND v_partner.partner_code IS NOT NULL AND TRIM(v_partner.partner_code) <> '' THEN
        v_new_step := 'profile_complete';
    END IF;

    -- 3. ตรวจสอบ Tax Profile
    SELECT * INTO v_tax
    FROM public.partner_tax_profiles
    WHERE partner_id = p_partner_id;

    IF FOUND AND v_tax.tax_id IS NOT NULL AND TRIM(v_tax.tax_id) <> ''
       AND v_tax.legal_name IS NOT NULL AND TRIM(v_tax.legal_name) <> '' THEN
        v_tax_valid := true;
        IF v_new_step = 'profile_complete' THEN
            v_new_step := 'tax_profile_complete';
        END IF;
    END IF;

    -- 4. ตรวจสอบ Payout Destination (Bank / PromptPay)
    SELECT * INTO v_payout
    FROM public.partner_payout_destinations
    WHERE partner_id = p_partner_id;

    IF FOUND AND v_payout.bank_code IS NOT NULL AND TRIM(v_payout.bank_code) <> ''
       AND v_payout.account_number IS NOT NULL AND TRIM(v_payout.account_number) <> ''
       AND v_payout.account_name IS NOT NULL AND TRIM(v_payout.account_name) <> '' THEN
        v_payout_valid := true;
        IF v_new_step = 'tax_profile_complete' THEN
            v_new_step := 'payout_destination_complete';
        END IF;
    END IF;

    -- 5. ตรวจสอบการยอมรับ Active Terms ล่าสุด
    SELECT * INTO v_active_terms
    FROM public.partner_terms_versions
    WHERE is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;

    IF v_active_terms.version IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.partner_terms_acceptances
            WHERE partner_id = p_partner_id
              AND terms_version = v_active_terms.version
        ) INTO v_has_terms_accepted;
    ELSE
        v_has_terms_accepted := true; -- Fallback if no active terms defined
    END IF;

    IF v_has_terms_accepted AND v_new_step = 'payout_destination_complete' THEN
        v_new_step := 'terms_accepted';
    END IF;

    -- 6. กำหนด Canonical Status
    -- เมื่อผ่านครบทุกขั้นตอน (profile + tax + payout destination + terms) -> เลื่อนเป็น 'active'
    IF v_new_step = 'terms_accepted' AND v_tax_valid AND v_payout_valid AND v_has_terms_accepted THEN
        v_new_step := 'active';
        v_new_status := 'active';
    ELSE
        v_new_status := v_new_step;
    END IF;

    -- 7. อัปเดตข้อมูลลงฐานข้อมูล
    UPDATE public.partner_entities
    SET status = v_new_status,
        onboarding_step = v_new_step,
        updated_at = now()
    WHERE id = p_partner_id;

    RETURN jsonb_build_object(
        'success', true,
        'partner_id', p_partner_id,
        'previous_status', v_partner.status,
        'new_status', v_new_status,
        'onboarding_step', v_new_step,
        'tax_profile_valid', v_tax_valid,
        'payout_destination_valid', v_payout_valid,
        'terms_accepted', v_has_terms_accepted
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: CANONICAL FINANCIAL ELIGIBILITY GUARD RPC
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.assert_partner_eligibility_atomic(
    p_partner_id UUID,
    p_operation TEXT -- 'referral', 'commission', 'payout'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_partner public.partner_entities%ROWTYPE;
    v_active_terms public.partner_terms_versions%ROWTYPE;
    v_terms_accepted BOOLEAN := false;
    v_tax_exists BOOLEAN := false;
    v_payout_dest_exists BOOLEAN := false;
    v_eligible BOOLEAN := false;
    v_reason TEXT := NULL;
BEGIN
    -- 1. ตรวจสอบ Partner Entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'PARTNER_NOT_FOUND',
            'message', 'Partner entity does not exist'
        );
    END IF;

    -- 2. ตรวจสอบสถานะการระงับหรือปฏิเสธ
    IF v_partner.status = 'suspended' THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'partner_id', p_partner_id,
            'status', 'suspended',
            'reason', 'PARTNER_SUSPENDED',
            'message', 'Partner is currently suspended by administration'
        );
    END IF;

    IF v_partner.status = 'rejected' THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'partner_id', p_partner_id,
            'status', 'rejected',
            'reason', 'PARTNER_REJECTED',
            'message', 'Partner application was rejected'
        );
    END IF;

    -- 3. ตรวจสอบว่า Partner ถึงสถานะ 'active' หรือยัง
    IF v_partner.status <> 'active' THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'partner_id', p_partner_id,
            'status', v_partner.status,
            'reason', 'ONBOARDING_INCOMPLETE',
            'message', 'Partner onboarding is incomplete (status is ' || v_partner.status || ')'
        );
    END IF;

    -- 4. สำหรับการขอเบิกเงิน (Payout Request) ต้องตรวจเงื่อนไขเข้มงวดเพิ่มเติม
    IF p_operation = 'payout' THEN
        -- 4.1 ตรวจสอบ Tax Profile
        SELECT EXISTS (
            SELECT 1 FROM public.partner_tax_profiles
            WHERE partner_id = p_partner_id
              AND tax_id IS NOT NULL AND TRIM(tax_id) <> ''
              AND legal_name IS NOT NULL AND TRIM(legal_name) <> ''
        ) INTO v_tax_exists;

        IF NOT v_tax_exists THEN
            RETURN jsonb_build_object(
                'eligible', false,
                'partner_id', p_partner_id,
                'status', v_partner.status,
                'reason', 'TAX_PROFILE_REQUIRED',
                'message', 'Valid tax profile is required before requesting payout'
            );
        END IF;

        -- 4.2 ตรวจสอบ Payout Destination
        SELECT EXISTS (
            SELECT 1 FROM public.partner_payout_destinations
            WHERE partner_id = p_partner_id
              AND bank_code IS NOT NULL AND TRIM(bank_code) <> ''
              AND account_number IS NOT NULL AND TRIM(account_number) <> ''
              AND account_name IS NOT NULL AND TRIM(account_name) <> ''
        ) INTO v_payout_dest_exists;

        IF NOT v_payout_dest_exists THEN
            RETURN jsonb_build_object(
                'eligible', false,
                'partner_id', p_partner_id,
                'status', v_partner.status,
                'reason', 'PAYOUT_DESTINATION_REQUIRED',
                'message', 'Valid payout destination is required before requesting payout'
            );
        END IF;

        -- 4.3 ตรวจสอบ Latest Terms Acceptance
        SELECT * INTO v_active_terms
        FROM public.partner_terms_versions
        WHERE is_active = true
        ORDER BY effective_from DESC
        LIMIT 1;

        IF v_active_terms.version IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.partner_terms_acceptances
                WHERE partner_id = p_partner_id
                  AND terms_version = v_active_terms.version
            ) INTO v_terms_accepted;

            IF NOT v_terms_accepted THEN
                RETURN jsonb_build_object(
                    'eligible', false,
                    'partner_id', p_partner_id,
                    'status', v_partner.status,
                    'reason', 'LATEST_TERMS_NOT_ACCEPTED',
                    'active_terms_version', v_active_terms.version,
                    'message', 'Must accept the latest Partner Terms (' || v_active_terms.version || ') before requesting payout'
                );
            END IF;
        END IF;
    END IF;

    -- ผ่านทุกเงื่อนไข
    RETURN jsonb_build_object(
        'eligible', true,
        'partner_id', p_partner_id,
        'status', v_partner.status,
        'operation', p_operation,
        'message', 'Partner is fully eligible for ' || p_operation
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: HARDEN EXISTING PAYOUT RPC (reserve_payout_atomic)
-- ─────────────────────────────────────────────────────────────────────────────

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
SET search_path = public
AS $$
DECLARE
    v_partner public.partner_entities%ROWTYPE;
    v_tax_rule public.tax_rules%ROWTYPE;
    v_eligibility JSONB;
    v_wht_amount NUMERIC(12, 2);
    v_net_amount NUMERIC(12, 2);
    v_new_available NUMERIC(12, 2);
    v_new_pending NUMERIC(12, 2);
    v_request_number TEXT;
    v_request_id UUID;
    v_ledger_id UUID;
BEGIN
    -- 1. ตรวจสอบ Idempotency
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Payout request already processed');
    END IF;

    -- 2. ตรวจสอบยอดขั้นต่ำ 500 บาท
    IF p_requested_amount_thb < 500.00 THEN
        RAISE EXCEPTION 'MINIMUM_PAYOUT_THRESHOLD_500: Minimum payout is ฿500.00';
    END IF;

    -- 3. ตรวจสอบ Financial Eligibility ผ่าน Canonical Server-side Guard
    v_eligibility := public.assert_partner_eligibility_atomic(p_partner_id, 'payout');
    IF (v_eligibility->>'eligible')::BOOLEAN IS NOT TRUE THEN
        RAISE EXCEPTION 'FINANCIAL_ELIGIBILITY_BLOCKED: % (%)', 
            v_eligibility->>'reason', v_eligibility->>'message';
    END IF;

    -- 4. ตรวจสอบ Tax Rule แบบ Dynamic (ห้าม hard-code 3%)
    SELECT * INTO v_tax_rule
    FROM public.tax_rules
    WHERE rule_code = p_tax_rule_code AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TAX_RULE_NOT_FOUND: Tax rule % not found or inactive', p_tax_rule_code;
    END IF;

    -- 5. ล็อกแถว Partner Entity ป้องกัน Concurrent Withdrawal
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: %', p_partner_id;
    END IF;

    -- 6. ตรวจสอบยอดเงิน Available
    IF v_partner.available_balance < p_requested_amount_thb THEN
        RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE: Available balance is ฿%, requested ฿%',
            v_partner.available_balance, p_requested_amount_thb;
    END IF;

    -- 7. คำนวณภาษีหัก ณ ที่จ่ายตาม Tax Rule
    IF p_requested_amount_thb >= v_tax_rule.min_threshold_thb THEN
        v_wht_amount := ROUND(p_requested_amount_thb * v_tax_rule.withholding_rate, 2);
    ELSE
        v_wht_amount := 0.00;
    END IF;

    v_net_amount := ROUND(p_requested_amount_thb - v_wht_amount, 2);

    -- 8. ตัดยอด Atomic: Available ลดลง, Payout Pending เพิ่มขึ้น
    v_new_available := v_partner.available_balance - p_requested_amount_thb;
    v_new_pending := v_partner.payout_pending_balance + p_requested_amount_thb;

    UPDATE public.partner_entities
    SET available_balance = v_new_available,
        payout_pending_balance = v_new_pending,
        updated_at = now()
    WHERE id = p_partner_id;

    -- 9. สร้างหมายเลขคำขอ PR-YYYYMMDD-XXXXXX
    v_request_number := 'PR-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));

    -- 10. บันทึกแถวลงใน payout_requests (status = pending_review)
    INSERT INTO public.payout_requests (
        partner_id,
        request_number,
        requested_amount_thb,
        tax_rule_code_applied,
        withholding_rate_applied,
        withholding_tax_amount_thb,
        net_payout_amount_thb,
        destination_snapshot,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_partner_id,
        v_request_number,
        p_requested_amount_thb,
        v_tax_rule.rule_code,
        v_tax_rule.withholding_rate,
        v_wht_amount,
        v_net_amount,
        p_destination_snapshot,
        'pending_review',
        now(),
        now()
    )
    RETURNING id INTO v_request_id;

    -- 11. บันทึก Double-Entry ใน partner_ledger (payout_reserved)
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
        notes,
        created_at
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
        v_request_id,
        p_idempotency_key,
        'Reserved ฿' || p_requested_amount_thb || ' for payout request ' || v_request_number,
        now()
    )
    RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_request_id', v_request_id,
        'request_number', v_request_number,
        'requested_amount', p_requested_amount_thb,
        'withholding_tax', v_wht_amount,
        'net_amount', v_net_amount,
        'new_available_balance', v_new_available,
        'new_payout_pending_balance', v_new_pending
    );
END;
$$;
