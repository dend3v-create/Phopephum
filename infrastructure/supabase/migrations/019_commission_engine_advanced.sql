-- 019_commission_engine_advanced.sql
-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — PHASE 6.5.4: ADVANCED COMMISSION ENGINE & CLAWMACK
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

-- 1. RPC: ประมวลผลและคำนวณคอมมิชชันจากบิลชำระเงิน Subscription แบบครบวงจร
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
    -- 1. ตรวจสอบ Idempotency ป้องกันการเบิ้ลยอดคอมมิชชัน
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object(
            'success', true, 
            'duplicate', true, 
            'message', 'Commission already recorded for this transaction'
        );
    END IF;

    -- 2. ค้นหา Winning Attribution จาก referral_attributions
    -- ต้องมีสถานะ 'converted' และ referred_user_id ตรงกับผู้จ่ายเงิน
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

    -- 3. ตรวจสอบสถานะ Partner Entity
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

    -- 4. ตรวจจับ Anti-Self-Referral ป้องกันบัญชีตนเอง
    IF v_partner.user_id = p_payer_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'awarded', false,
            'reason', 'SELF_REFERRAL_BLOCKED',
            'message', 'Self-referral cannot earn commission'
        );
    END IF;

    -- 5. ค้นหา Commission Plan ตามลำดับความสำคัญ (Plan Priority Hierarchy)
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

    -- Priority 50: Campaign-Specific (ถ้ามี campaign_code ใน attribution)
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

    -- ดึงข้อมูลแผนที่เลือกได้
    IF FOUND THEN
        SELECT * INTO v_plan FROM public.commission_plans WHERE id = v_assignment.plan_id;
    ELSE
        -- Fallback ฉุกเฉิน: แผน Affiliate มาตรฐาน
        SELECT * INTO v_plan FROM public.commission_plans WHERE plan_code = 'PLAN_DEFAULT_AFFILIATE' LIMIT 1;
    END IF;

    v_holding_days := COALESCE(v_plan.holding_period_days, 14);

    -- 6. ตรวจสอบ Commission Term & Recurring Policy
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

    -- 7. คำนวณ Commission Rate จาก commission_rate_rules
    SELECT * INTO v_rate_rule
    FROM public.commission_rate_rules
    WHERE plan_id = v_plan.id
      AND (subscription_plan_code = p_subscription_plan_code OR subscription_plan_code = 'all')
    ORDER BY CASE WHEN subscription_plan_code = p_subscription_plan_code THEN 1 ELSE 2 END
    LIMIT 1;

    IF FOUND THEN
        v_commission_rate := v_rate_rule.rate_percentage;
    ELSE
        -- Default ตามระดับหากไม่มีกฎเฉพาะ
        v_commission_rate := CASE 
            WHEN v_partner.tier_code = 'master' THEN 0.2500
            WHEN v_partner.tier_code = 'creator' THEN 0.1500
            ELSE 0.0700
        END;
    END IF;

    -- 8. แยก VAT และคิด Commissionable Base แบบไดนามิก
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

    -- 9. บันทึก commission_events
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

    -- 10. บันทึก partner_ledger (Immutable Financial Source of Truth)
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

    -- 11. อัปเดต partner_entities (Materialized Cache)
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

-- 2. RPC: ดำเนินการยึดยอดคอมมิชชันคืนเมื่อเกิดการคืนเงิน/ชาร์จแบ็ก (Refund Clawback)
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

    -- ค้นหา commission_event ของบิลนี้ที่สถานะ holding หรือ cleared
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

    -- ล็อก Partner Entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_event.partner_id
    FOR UPDATE;

    IF v_event.status = 'holding' THEN
        -- เคสที่ 1: คืนเงินก่อนพ้นกำหนด 14 วัน (Refund BEFORE clearance)
        -- ดึงยอดออกจาก holding_balance ทันที
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
        -- เคสที่ 2: คืนเงินหลังพ้นกำหนด 14 วัน (Refund AFTER clearance)
        -- เงินเข้า Available หรือถูกถอนไปแล้ว
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
                   CASE WHEN v_add_to_pending_clawback > 0 THEN ' (฿' || v_add_to_pending_clawback || ' added to clawback_pending)' ELSE '' END;

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

