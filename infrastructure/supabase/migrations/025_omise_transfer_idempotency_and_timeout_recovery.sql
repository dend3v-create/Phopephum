-- 025_omise_transfer_idempotency_and_timeout_recovery.sql
-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — STEP 7.2D.1.1: OMISE TRANSFER IDEMPOTENCY & RECONCILING RECOVERY
-- ==============================================================================
-- 1. Database-Enforced Active Transfer Uniqueness (INV-PARTNER-26)
--    Enforces that 1 Payout Request has at most 1 ACTIVE transfer ('pending', 'processing', 'sent', 'paid')
--    while preserving historical audit records for failed/reversed transfers.
-- 2. State Machine Hardening with RECONCILING and MANUAL_REVIEW states.
-- 3. Deterministic Recovery & Escalation Audit Trail.
-- ==============================================================================

-- 1. Update Check Constraint on payout_requests.status to include 'reconciling' and 'manual_review'
ALTER TABLE public.payout_requests DROP CONSTRAINT IF EXISTS payout_requests_status_check;
ALTER TABLE public.payout_requests
    ADD CONSTRAINT payout_requests_status_check
    CHECK (status IN ('pending_review', 'approved', 'processing', 'reconciling', 'manual_review', 'completed', 'failed', 'rejected', 'cancelled'));

-- 2. Enforce Unique Active Transfer per Payout Request on omise_transfers
-- Covers ALL active in-flight and settled statuses: 'pending', 'processing', 'sent', 'paid'
DROP INDEX IF EXISTS public.uq_omise_transfers_payout_active;
CREATE UNIQUE INDEX uq_omise_transfers_payout_active
    ON public.omise_transfers(payout_request_id)
    WHERE status IN ('pending', 'processing', 'sent', 'paid');

-- 3. Enhance admin_process_payout_transition_atomic to handle 'reconciling' and 'manual_review'
CREATE OR REPLACE FUNCTION public.admin_process_payout_transition_atomic(
    p_payout_request_id UUID,
    p_admin_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL,
    p_evidence_url TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request public.payout_requests%ROWTYPE;
    v_partner public.partner_entities%ROWTYPE;
    v_admin public.profiles%ROWTYPE;
    v_old_status TEXT;
    v_new_pending NUMERIC(12, 2);
    v_new_available NUMERIC(12, 2);
    v_new_withdrawn NUMERIC(12, 2);
    v_idem TEXT;
    v_audit_id UUID;
BEGIN
    v_idem := COALESCE(p_idempotency_key, 'admin_transition:' || p_payout_request_id || ':' || p_new_status);

    -- 1. ตรวจสอบสิทธิ์ Admin/Finance (ถ้าไม่ใช่ system service role)
    IF p_admin_id <> '00000000-0000-0000-0000-000000000000'::UUID THEN
        SELECT * INTO v_admin
        FROM public.profiles
        WHERE id = p_admin_id;

        IF NOT FOUND OR v_admin.role NOT IN ('admin', 'finance_officer') THEN
            RAISE EXCEPTION 'UNAUTHORIZED: Only admins and finance officers can transition payouts';
        END IF;
    END IF;

    -- 2. ล็อกแถว Payout Request
    SELECT * INTO v_request
    FROM public.payout_requests
    WHERE id = p_payout_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYOUT_REQUEST_NOT_FOUND: %', p_payout_request_id;
    END IF;

    v_old_status := v_request.status;

    -- Idempotency check: หากสถานะเหมือนเดิม ให้ return ทันที
    IF v_old_status = p_new_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'payout_request_id', p_payout_request_id,
            'status', v_old_status,
            'message', 'Payout request is already in requested state'
        );
    END IF;

    -- ล็อกแถว Partner Entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_request.partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: %', v_request.partner_id;
    END IF;

    -- 3. Strict State Machine Validation
    -- Terminal states: completed, rejected
    IF v_old_status IN ('completed', 'rejected') THEN
        RAISE EXCEPTION 'TERMINAL_STATE: Payout request is already in % state and cannot be modified', v_old_status;
    END IF;

    -- Allowed State Transitions:
    -- pending_review -> approved | rejected
    -- approved       -> processing | rejected
    -- processing     -> completed | failed | reconciling | manual_review
    -- reconciling    -> completed | failed | processing | manual_review | rejected
    -- manual_review  -> processing (force retry) | completed (manually verified) | rejected (cancel & refund)
    -- failed         -> processing (retry) | rejected
    IF v_old_status = 'pending_review' THEN
        IF p_new_status NOT IN ('approved', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From pending_review, only approved or rejected is allowed';
        END IF;

    ELSIF v_old_status = 'approved' THEN
        IF p_new_status NOT IN ('processing', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From approved, only processing or rejected is allowed';
        END IF;

    ELSIF v_old_status = 'processing' THEN
        IF p_new_status NOT IN ('completed', 'failed', 'reconciling', 'manual_review') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From processing, only completed, failed, reconciling, or manual_review is allowed';
        END IF;

    ELSIF v_old_status = 'reconciling' THEN
        IF p_new_status NOT IN ('completed', 'failed', 'processing', 'manual_review', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From reconciling, only completed, failed, processing, manual_review, or rejected is allowed';
        END IF;

    ELSIF v_old_status = 'manual_review' THEN
        IF p_new_status NOT IN ('processing', 'completed', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From manual_review, only processing, completed, or rejected is allowed';
        END IF;

    ELSIF v_old_status = 'failed' THEN
        IF p_new_status NOT IN ('processing', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From failed, only processing (retry) or rejected is allowed';
        END IF;

    ELSE
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Unknown current status %', v_old_status;
    END IF;

    -- 4. Balance & Ledger Mutations based on state transitions
    -- Case A: Transition to REJECTED (Release reserved funds back to Available Balance)
    IF p_new_status = 'rejected' THEN
        IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
            RAISE EXCEPTION 'REASON_REQUIRED: Admin must provide a reason when rejecting a payout';
        END IF;

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
            v_request.id::TEXT,
            v_idem,
            'Payout rejected by Admin: ' || p_reason
        );

        UPDATE public.partner_entities
        SET available_balance = v_new_available,
            payout_pending_balance = v_new_pending,
            updated_at = now()
        WHERE id = v_partner.id;

    -- Case B: Transition to COMPLETED (Settlement Finished -> Deduct pending, Add total_withdrawn)
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
            'payout_settled',
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
            'Payout Settlement completed (Net: ฿' || v_request.net_payout_amount_thb || ', WHT: ฿' || v_request.withholding_tax_amount_thb || ')'
        );

        UPDATE public.partner_entities
        SET payout_pending_balance = v_new_pending,
            total_withdrawn = v_new_withdrawn,
            updated_at = now()
        WHERE id = v_partner.id;
    END IF;

    -- 5. Update payout_requests table
    UPDATE public.payout_requests
    SET status = p_new_status,
        reviewed_by = CASE WHEN p_admin_id <> '00000000-0000-0000-0000-000000000000'::UUID THEN p_admin_id ELSE reviewed_by END,
        reviewed_at = now(),
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_reason ELSE rejection_reason END,
        updated_at = now()
    WHERE id = p_payout_request_id;

    -- 6. Insert Immutable Admin Financial Audit Log
    INSERT INTO public.admin_financial_audit_logs (
        admin_id,
        payout_request_id,
        partner_id,
        action,
        amount_thb,
        previous_status,
        new_status,
        reason,
        evidence_url,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        CASE WHEN p_admin_id <> '00000000-0000-0000-0000-000000000000'::UUID THEN p_admin_id ELSE (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1) END,
        p_payout_request_id,
        v_partner.id,
        'transition_to_' || p_new_status,
        v_request.requested_amount_thb,
        v_old_status,
        p_new_status,
        p_reason,
        p_evidence_url,
        p_ip_address,
        p_user_agent,
        p_metadata
    ) RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
        'success', true,
        'duplicate', false,
        'payout_request_id', p_payout_request_id,
        'partner_id', v_partner.id,
        'previous_status', v_old_status,
        'new_status', p_new_status,
        'requested_amount_thb', v_request.requested_amount_thb,
        'net_payout_thb', v_request.net_payout_amount_thb,
        'wht_amount_thb', v_request.withholding_tax_amount_thb,
        'audit_log_id', v_audit_id,
        'message', 'Transitioned payout request to ' || p_new_status
    );
END;
$$;
