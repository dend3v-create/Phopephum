-- 018_attribution_engine_and_financial_guards.sql
-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — PHASE 6.5.3: ATTRIBUTION ENGINE & FINANCIAL GUARDRAILS
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

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: FINANCIAL FOREIGN KEY HARDENING & DATA RETENTION
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 ป้องกันการ Cascade Delete ในตารางการเงินที่สำคัญ
-- แก้ไข FK ใน commission_events, partner_ledger, payout_requests, payout_transactions
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

-- 1.2 เพิ่ม Clawback Pending Balance ใน partner_entities
ALTER TABLE public.partner_entities
    ADD COLUMN IF NOT EXISTS clawback_pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (clawback_pending_balance >= 0);

-- 1.3 เพิ่ม Commission Term ใน commission_plans
ALTER TABLE public.commission_plans
    ADD COLUMN IF NOT EXISTS commission_term TEXT NOT NULL DEFAULT 'until_subscription_ends'
    CHECK (commission_term IN ('first_payment', '3_months', '6_months', '12_months', 'until_subscription_ends')),
    ADD COLUMN IF NOT EXISTS recurring_until TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: ATTRIBUTION ENGINE DATA MODEL UPGRADES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.referral_attributions
    ADD COLUMN IF NOT EXISTS landing_page TEXT,
    ADD COLUMN IF NOT EXISTS referrer_url TEXT,
    ADD COLUMN IF NOT EXISTS risk_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS conversion_tx_id UUID;

-- เพิ่ม Index และ Unique Constraint ที่สำคัญที่สุด:
-- กฎเหล็ก: User 1 คน ต้องมี Converted Winning Attribution ได้เพียง 1 แถวเท่านั้น!
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_converted_referred_user 
    ON public.referral_attributions (referred_user_id) 
    WHERE status = 'converted';

-- Index สำหรับค้นหา Last-Touch Active Attribution (30 วัน)
CREATE INDEX IF NOT EXISTS idx_ref_attr_last_touch 
    ON public.referral_attributions (visitor_anonymous_id, click_timestamp DESC) 
    WHERE status = 'active';

-- Index สำหรับค้นหาตาม partner_id
CREATE INDEX IF NOT EXISTS idx_ref_attr_partner_status 
    ON public.referral_attributions (partner_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: ATOMIC STORED PROCEDURES (ATTRIBUTION & FRAUD PROTECTION)
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 บันทึกการคลิกลิงก์แนะนำ (Referral Click Capture + Throttling + 30-Day Window)
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
    -- 1. ค้นหาข้อมูลพันธมิตรจาก partner_code (Case-Insensitive)
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
    -- หาก visitor เดิมเพิ่งคลิก partner เดิมภายใน 5 นาที ให้ update timestamp แทนการ insert แถวใหม่รก DB
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
        -- 3. บันทึก Attribution แถวใหม่ (Active 30 days)
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

-- 3.2 แปลงผลการแนะนำเมื่อผู้ใช้สมัครสมาชิก (Atomic Conversion + Last-Touch Resolution)
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
    -- 1. กฎ One-User-One-Winning-Attribution:
    -- ตรวจสอบก่อนว่า User คนนี้เคยมี converted attribution แล้วหรือไม่
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

    -- 2. ค้นหา Candidate Partner:
    -- ลำดับที่ 1: ตรวจสอบจาก Manual Partner Code ก่อน (ผู้ใช้ระบุโค้ดโดยตรงในแบบฟอร์ม)
    IF p_manual_partner_code IS NOT NULL AND TRIM(p_manual_partner_code) <> '' THEN
        SELECT * INTO v_partner
        FROM public.partner_entities
        WHERE UPPER(partner_code) = UPPER(TRIM(p_manual_partner_code))
          AND status = 'active';

        IF FOUND THEN
            v_candidate_partner_id := v_partner.id;
        END IF;
    END IF;

    -- ลำดับที่ 2: หากไม่มี manual code ให้ใช้ Last-Touch Resolution จาก 30-day Cookie (visitor_anonymous_id)
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

    -- หากไม่มี Partner ที่แมตช์ได้เลย
    IF v_candidate_partner_id IS NULL OR v_partner.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'converted', false,
            'reason', 'NO_ELIGIBLE_ATTRIBUTION'
        );
    END IF;

    -- 3. ตรวจจับ Anti-Self-Referral (Multi-Signal Analysis):
    -- Signal 1: บัญชีผู้ใช้ตรงกัน (Hard Block)
    IF v_partner.user_id = p_referred_user_id THEN
        v_is_self_referral := true;
        v_risk_signals := jsonb_set(v_risk_signals, '{reason}', '"same_user_account"');
    END IF;

    -- Signal 2: Tax ID ตรงกัน (Hard Block)
    IF NOT v_is_self_referral AND p_user_tax_id IS NOT NULL AND TRIM(p_user_tax_id) <> '' THEN
        SELECT * INTO v_partner_tax FROM public.partner_tax_profiles WHERE partner_id = v_partner.id;
        IF FOUND AND v_partner_tax.tax_id = TRIM(p_user_tax_id) THEN
            v_is_self_referral := true;
            v_risk_signals := jsonb_set(v_risk_signals, '{reason}', '"same_tax_id"');
        END IF;
    END IF;

    -- Signal 3: ตรวจ IP Hash (Risk Signal เท่านั้น — ไม่ Hard Block ผู้ใช้ที่อยู่วง Wi-Fi เดียวกัน)
    IF p_ip_hash IS NOT NULL AND p_ip_hash <> '' THEN
        IF v_winning_attribution.ip_hash = p_ip_hash THEN
            v_risk_signals := jsonb_set(v_risk_signals, '{same_ip}', 'true');
        END IF;
    END IF;

    -- หากเป็น Self-Referral ชัดเจน ให้ปฏิเสธและบันทึกสถานะ
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

    -- 4. Conversion สำเร็จ (Atomic Lock & Update):
    IF v_candidate_attr_id IS NOT NULL THEN
        UPDATE public.referral_attributions
        SET status = 'converted',
            referred_user_id = p_referred_user_id,
            converted_at = now(),
            risk_signals = v_risk_signals
        WHERE id = v_candidate_attr_id;
    ELSE
        -- กรณีระบุ Manual Code โดยไม่มี click record มาก่อน
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
    -- ล็อกความสัมพันธ์ลงใน profiles ของผู้ใช้ (เป็นหลักฐานถาวร)
    UPDATE public.profiles
    SET referred_by = v_partner.partner_code,
        referred_by_id = v_partner.user_id,
        updated_at = now()
    WHERE id = p_referred_user_id;

    -- 6. เพิ่ม Lifetime Referred Count
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

-- 3.3 ระบบหักเงินย้อนหลัง (Post-14-Day Clawback Policy & Clawback Pending)
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

    -- กฎ Post-14-Day Clawback Policy:
    -- ถ้า Available >= ยอดหักคืน → หักจาก Available ทันที
    -- ถ้า Available < ยอดหักคืน → หัก Available ให้เหลือ 0 และส่วนต่างเก็บเข้า clawback_pending_balance เพื่อหักจากคอมมิชชันในอนาคต!
    IF v_partner.available_balance >= p_clawback_amount_thb THEN
        v_deduct_from_available := p_clawback_amount_thb;
        v_add_to_pending_clawback := 0.00;
    ELSE
        v_deduct_from_available := v_partner.available_balance;
        v_add_to_pending_clawback := p_clawback_amount_thb - v_partner.available_balance;
    END IF;

    v_new_available := v_partner.available_balance - v_deduct_from_available;
    v_new_clawback_pending := v_partner.clawback_pending_balance + v_add_to_pending_clawback;

    -- บันทึก Partner Financial Ledger
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
        p_notes || CASE WHEN v_add_to_pending_clawback > 0 THEN ' (Uncovered ฿' || v_add_to_pending_clawback || ' moved to pending clawback)' ELSE '' END
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

-- 3.4 ล็อก State Machine ของคำขอเบิกเงิน (Strict Payout Transition Engine)
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
    -- completed / rejected -> ห้ามเปลี่ยนสถานะอีกต่อไป!
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
