-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — STEP 6.5.6: PARTNER PAYOUT & ADMIN OPERATIONS PATCH
-- ==============================================================================

-- 1. Ensure Tax Rules Exist
INSERT INTO public.tax_rules (rule_code, description, entity_type, withholding_rate, min_threshold_thb, is_active)
VALUES 
    ('TH_INDIVIDUAL_COMMISSION', 'Thai Individual Withholding Tax 3%', 'individual', 0.0300, 1000.00, true),
    ('TH_CORPORATE_SERVICE', 'Thai Corporation Withholding Tax 3%', 'corporate', 0.0300, 1000.00, true)
ON CONFLICT (rule_code) DO UPDATE 
SET withholding_rate = EXCLUDED.withholding_rate,
    is_active = true;


-- 2. Financial Job Telemetry & Monitoring Table
CREATE TABLE IF NOT EXISTS public.financial_job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL, -- 'holding_clearance' | 'payout_settlement' | 'reconciliation_audit' | 'failed_recovery'
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'partial' | 'failed'
    processed_count INT NOT NULL DEFAULT 0,
    skipped_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    duplicate_count INT NOT NULL DEFAULT 0,
    total_amount_thb NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    failure_details JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_jobs_type ON public.financial_job_logs(job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_jobs_status ON public.financial_job_logs(status, created_at DESC);

-- 3. Immutable Admin Financial Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    payout_request_id UUID REFERENCES public.payout_requests(id) ON DELETE SET NULL,
    partner_id UUID REFERENCES public.partner_entities(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    amount_thb NUMERIC(12, 2),
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    evidence_url TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_fin_audit_payout ON public.admin_financial_audit_logs(payout_request_id);
CREATE INDEX IF NOT EXISTS idx_admin_fin_audit_partner ON public.admin_financial_audit_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_admin_fin_audit_admin ON public.admin_financial_audit_logs(admin_id, created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.financial_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_financial_audit_admin_only" ON public.admin_financial_audit_logs;
CREATE POLICY "admin_financial_audit_admin_only" ON public.admin_financial_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'finance_officer')
        )
    );

DROP POLICY IF EXISTS "financial_job_logs_admin_only" ON public.financial_job_logs;
CREATE POLICY "financial_job_logs_admin_only" ON public.financial_job_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'finance_officer')
        )
    );

-- 5. Monitored Holding Clearance Atomic RPC
CREATE OR REPLACE FUNCTION public.clear_holding_commissions_monitored_atomic(p_limit INT DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_started_at TIMESTAMPTZ := now();
    v_event RECORD;
    v_partner public.partner_entities%ROWTYPE;
    
    v_processed_count INT := 0;
    v_skipped_count INT := 0;
    v_failed_count INT := 0;
    v_duplicate_count INT := 0;
    
    v_total_cleared_amount NUMERIC(12, 2) := 0.00;
    v_total_offset_amount NUMERIC(12, 2) := 0.00;
    v_total_net_added NUMERIC(12, 2) := 0.00;
    
    v_offset NUMERIC(12, 2) := 0.00;
    v_avail_to_add NUMERIC(12, 2) := 0.00;
    v_new_holding NUMERIC(12, 2);
    v_new_available NUMERIC(12, 2);
    v_new_clawback NUMERIC(12, 2);
    v_idem TEXT;
    
    v_failure_details JSONB := '[]'::jsonb;
    v_job_status TEXT := 'completed';
    v_job_log_id UUID;
BEGIN
    FOR v_event IN
        SELECT * FROM public.commission_events
        WHERE status = 'holding' AND holding_until <= now()
        ORDER BY holding_until ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            v_idem := 'clear:' || v_event.id;

            IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = v_idem) THEN
                UPDATE public.commission_events SET status = 'cleared', updated_at = now() WHERE id = v_event.id;
                v_duplicate_count := v_duplicate_count + 1;
                CONTINUE;
            END IF;

            SELECT * INTO v_partner
            FROM public.partner_entities
            WHERE id = v_event.partner_id
            FOR UPDATE;

            IF NOT FOUND THEN
                v_failed_count := v_failed_count + 1;
                v_failure_details := v_failure_details || jsonb_build_object(
                    'event_id', v_event.id,
                    'partner_id', v_event.partner_id,
                    'amount_thb', v_event.commission_amount_thb,
                    'error', 'PARTNER_NOT_FOUND'
                );
                CONTINUE;
            END IF;

            IF COALESCE(v_partner.clawback_pending_balance, 0.00) > 0.00 THEN
                v_offset := LEAST(v_partner.clawback_pending_balance, v_event.commission_amount_thb);
                v_new_clawback := v_partner.clawback_pending_balance - v_offset;
                v_avail_to_add := v_event.commission_amount_thb - v_offset;
            ELSE
                v_offset := 0.00;
                v_new_clawback := 0.00;
                v_avail_to_add := v_event.commission_amount_thb;
            END IF;

            v_new_holding := GREATEST(0.00, v_partner.holding_balance - v_event.commission_amount_thb);
            v_new_available := v_partner.available_balance + v_avail_to_add;

            UPDATE public.partner_entities
            SET holding_balance = v_new_holding,
                available_balance = v_new_available,
                clawback_pending_balance = v_new_clawback,
                updated_at = now()
            WHERE id = v_event.partner_id;

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
                v_new_holding,
                v_partner.available_balance,
                v_new_available,
                v_partner.payout_pending_balance,
                v_partner.payout_pending_balance,
                'commission_event',
                v_event.id::TEXT,
                v_idem,
                CASE 
                    WHEN v_offset > 0.00 THEN 
                        '14-day holding cleared ฿' || v_event.commission_amount_thb || ' (฿' || v_offset || ' offset clawback debt, ฿' || v_avail_to_add || ' added to available)'
                    ELSE 
                        '14-day holding cleared to available balance'
                END
            );

            IF v_offset > 0.00 THEN
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
                    'clawback_recovered',
                    v_offset,
                    v_new_holding,
                    v_new_holding,
                    v_new_available,
                    v_new_available,
                    v_partner.payout_pending_balance,
                    v_partner.payout_pending_balance,
                    'commission_event',
                    v_event.id::TEXT,
                    'offset:' || v_event.id,
                    'Debt recovery: ฿' || v_offset || ' clawback offset against cleared commission'
                );
            END IF;

            UPDATE public.commission_events
            SET status = 'cleared',
                updated_at = now()
            WHERE id = v_event.id;

            v_processed_count := v_processed_count + 1;
            v_total_cleared_amount := v_total_cleared_amount + v_event.commission_amount_thb;
            v_total_offset_amount := v_total_offset_amount + v_offset;
            v_total_net_added := v_total_net_added + v_avail_to_add;

        EXCEPTION WHEN OTHERS THEN
            v_failed_count := v_failed_count + 1;
            v_failure_details := v_failure_details || jsonb_build_object(
                'event_id', v_event.id,
                'partner_id', v_event.partner_id,
                'amount_thb', v_event.commission_amount_thb,
                'error', SQLERRM
            );
        END;
    END LOOP;

    IF v_failed_count > 0 AND v_processed_count > 0 THEN
        v_job_status := 'partial';
    ELSIF v_failed_count > 0 AND v_processed_count = 0 THEN
        v_job_status := 'failed';
    ELSE
        v_job_status := 'completed';
    END IF;

    INSERT INTO public.financial_job_logs (
        job_type,
        status,
        processed_count,
        skipped_count,
        failed_count,
        duplicate_count,
        total_amount_thb,
        failure_details,
        metadata,
        started_at,
        finished_at
    ) VALUES (
        'holding_clearance',
        v_job_status,
        v_processed_count,
        v_skipped_count,
        v_failed_count,
        v_duplicate_count,
        v_total_cleared_amount,
        v_failure_details,
        jsonb_build_object(
            'limit', p_limit,
            'total_offset_thb', v_total_offset_amount,
            'total_net_added_thb', v_total_net_added
        ),
        v_started_at,
        now()
    ) RETURNING id INTO v_job_log_id;

    RETURN jsonb_build_object(
        'success', true,
        'job_log_id', v_job_log_id,
        'job_status', v_job_status,
        'processed_count', v_processed_count,
        'skipped_count', v_skipped_count,
        'failed_count', v_failed_count,
        'duplicate_count', v_duplicate_count,
        'total_cleared_thb', v_total_cleared_amount,
        'total_offset_thb', v_total_offset_amount,
        'total_net_added_thb', v_total_net_added,
        'failure_details', v_failure_details,
        'started_at', v_started_at,
        'finished_at', now()
    );
END;
$$;

-- 6. Strict Admin Payout State Machine Atomic RPC
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

    -- 1. Check Admin / Finance Role
    SELECT * INTO v_admin
    FROM public.profiles
    WHERE id = p_admin_id;

    IF NOT FOUND OR v_admin.role NOT IN ('admin', 'finance_officer') THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only admins and finance officers can transition payouts';
    END IF;

    -- 2. Lock Payout Request Row
    SELECT * INTO v_request
    FROM public.payout_requests
    WHERE id = p_payout_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PAYOUT_REQUEST_NOT_FOUND: %', p_payout_request_id;
    END IF;

    v_old_status := v_request.status;

    IF v_old_status = p_new_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'payout_request_id', p_payout_request_id,
            'status', v_old_status,
            'message', 'Payout request is already in requested state'
        );
    END IF;

    -- Lock Partner Row
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_request.partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: %', v_request.partner_id;
    END IF;

    -- 3. Strict State Machine Validations
    IF v_old_status IN ('completed', 'rejected') THEN
        RAISE EXCEPTION 'TERMINAL_STATE: Payout request is already in % state and cannot be modified', v_old_status;
    END IF;

    IF v_old_status = 'pending_review' THEN
        IF p_new_status NOT IN ('approved', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From pending_review, only approved or rejected is allowed';
        END IF;

    ELSIF v_old_status = 'approved' THEN
        IF p_new_status NOT IN ('processing', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From approved, only processing or rejected is allowed';
        END IF;

    ELSIF v_old_status = 'processing' THEN
        IF p_new_status NOT IN ('completed', 'failed') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From processing, only completed or failed is allowed';
        END IF;

    ELSIF v_old_status = 'failed' THEN
        IF p_new_status NOT IN ('processing', 'rejected') THEN
            RAISE EXCEPTION 'ILLEGAL_TRANSITION: From failed, only processing (retry) or rejected is allowed';
        END IF;

    ELSE
        RAISE EXCEPTION 'ILLEGAL_TRANSITION: Unknown current status %', v_old_status;
    END IF;

    -- 4. Balance & Ledger Mutations
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
            'Payout rejected by Admin (' || v_admin.display_name || '): ' || p_reason
        );

        UPDATE public.partner_entities
        SET available_balance = v_new_available,
            payout_pending_balance = v_new_pending,
            updated_at = now()
        WHERE id = v_partner.id;

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
            'Payout Settlement completed (Net: ฿' || v_request.net_payout_amount_thb || ', WHT 3%: ฿' || v_request.withholding_tax_amount_thb || ')'
        );

        UPDATE public.partner_entities
        SET payout_pending_balance = v_new_pending,
            total_withdrawn = v_new_withdrawn,
            updated_at = now()
        WHERE id = v_partner.id;
    END IF;

    -- 5. Update payout request row
    UPDATE public.payout_requests
    SET status = p_new_status,
        reviewed_by = p_admin_id,
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
        p_admin_id,
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
        'payout_request_id', p_payout_request_id,
        'partner_id', v_partner.id,
        'previous_status', v_old_status,
        'new_status', p_new_status,
        'requested_amount_thb', v_request.requested_amount_thb,
        'net_payout_thb', v_request.net_payout_amount_thb,
        'wht_amount_thb', v_request.withholding_tax_amount_thb,
        'audit_log_id', v_audit_id,
        'timestamp', now()
    );
END;
$$;

-- 7. Zero-Trust Security Grants
REVOKE EXECUTE ON FUNCTION public.clear_holding_commissions_monitored_atomic(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_holding_commissions_monitored_atomic(INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_process_payout_transition_atomic(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_payout_transition_atomic(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
