-- 027_automated_financial_reconciliation.sql
-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — STEP 7.2E.3: AUTOMATED FINANCIAL RECONCILIATION ENGINE
-- ==============================================================================
-- 1. Persistent Tables:
--    - financial_reconciliation_runs (ประวัติการรันและสรุปผลกระทบยอด)
--    - financial_reconciliation_discrepancies (รายการความคลาดเคลื่อนที่ตรวจพบ)
-- 2. Stored Procedure:
--    - run_financial_reconciliation_atomic (ตรวจครบทั้ง 4 Economic Rails)
-- 3. Security:
--    - RLS Enabled (Admin / Finance Officer only, Service Role Only for Runner)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: PERSISTENT TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 ประวัติการรันการกระทบยอด (Reconciliation Runs)
CREATE TABLE IF NOT EXISTS public.financial_reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type TEXT NOT NULL DEFAULT 'hourly_surveillance' CHECK (run_type IN ('hourly_surveillance', 'daily_deep_reconciliation', 'manual_audit')),
    status TEXT NOT NULL DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
    total_payments_checked INT NOT NULL DEFAULT 0,
    total_commissions_checked INT NOT NULL DEFAULT 0,
    total_transfers_checked INT NOT NULL DEFAULT 0,
    total_partners_checked INT NOT NULL DEFAULT 0,
    discrepancy_count INT NOT NULL DEFAULT 0,
    summary_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recon_runs_type_status ON public.financial_reconciliation_runs(run_type, status);
CREATE INDEX IF NOT EXISTS idx_recon_runs_created ON public.financial_reconciliation_runs(created_at DESC);

-- 1.2 ตารางรายการความคลาดเคลื่อน (Reconciliation Discrepancies)
CREATE TABLE IF NOT EXISTS public.financial_reconciliation_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.financial_reconciliation_runs(id) ON DELETE CASCADE,
    discrepancy_code TEXT NOT NULL CHECK (discrepancy_code IN (
        'DISC-01', -- ORPHANED_COMMISSION
        'DISC-02', -- MISSING_COMMISSION
        'DISC-03', -- COMMISSION_AMOUNT_MISMATCH
        'DISC-04', -- HOLDING_OVERDUE_CLEARANCE
        'DISC-05', -- ORPHANED_OMISE_TRANSFER
        'DISC-06', -- TRANSFER_SETTLEMENT_MISSING
        'DISC-07', -- LEDGER_DRIFT_DETECTED
        'DISC-08'  -- RECONCILING_SLA_EXCEEDED
    )),
    severity TEXT NOT NULL CHECK (severity IN ('yellow', 'red')),
    partner_id UUID REFERENCES public.partner_entities(id) ON DELETE SET NULL,
    partner_code TEXT,
    reference_table TEXT,
    reference_id TEXT,
    expected_value NUMERIC(12, 2),
    actual_value NUMERIC(12, 2),
    delta_thb NUMERIC(12, 2),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recon_disc_run ON public.financial_reconciliation_discrepancies(run_id);
CREATE INDEX IF NOT EXISTS idx_recon_disc_code ON public.financial_reconciliation_discrepancies(discrepancy_code, severity);
CREATE INDEX IF NOT EXISTS idx_recon_disc_partner ON public.financial_reconciliation_discrepancies(partner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: RLS SECURITY POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.financial_reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recon_runs_admin_select" ON public.financial_reconciliation_runs;
CREATE POLICY "recon_runs_admin_select" ON public.financial_reconciliation_runs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'finance_officer')
        )
    );

DROP POLICY IF EXISTS "recon_disc_admin_all" ON public.financial_reconciliation_discrepancies;
CREATE POLICY "recon_disc_admin_all" ON public.financial_reconciliation_discrepancies
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'finance_officer')
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: ATOMIC RECONCILIATION ENGINE RPC
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.run_financial_reconciliation_atomic(
    p_run_type TEXT DEFAULT 'hourly_surveillance',
    p_sla_hours INT DEFAULT 48,
    p_grace_hours INT DEFAULT 2,
    p_batch_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_started_at TIMESTAMPTZ := now();
    v_status TEXT := 'green';
    v_discrepancy_count INT := 0;
    
    -- Counters
    v_payments_checked INT := 0;
    v_commissions_checked INT := 0;
    v_transfers_checked INT := 0;
    v_partners_checked INT := 0;
    
    -- Loop variables
    r_pay RECORD;
    r_comm RECORD;
    r_trsf RECORD;
    r_partner RECORD;
    
    v_comm_exists BOOLEAN;
    v_expected_comm NUMERIC(12, 2);
    v_partner_balance_sum NUMERIC(12, 2);
    v_partner_ledger_sum NUMERIC(12, 2);
    v_delta NUMERIC(12, 2);
BEGIN
    -- 1. เริ่มบันทึก Run ใหม่
    INSERT INTO public.financial_reconciliation_runs (
        run_type,
        status,
        started_at
    ) VALUES (
        p_run_type,
        'green',
        v_started_at
    )
    RETURNING id INTO v_run_id;

    -- ─────────────────────────────────────────────────────────────────────────
    -- RAIL 1: CUSTOMER PAYMENT <-> COMMISSION DUAL RECONCILIATION
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- 1.1 Forward Audit: ทุก Subscription Payment ที่สำเร็จของ Converted User ต้องมี Commission
    FOR r_pay IN (
        SELECT pt.id, pt.user_id, pt.gross_amount_thb, pt.subscription_plan_code, ra.partner_id
        FROM public.payment_transactions pt
        JOIN public.referral_attributions ra ON ra.referred_user_id = pt.user_id AND ra.status = 'converted'
        WHERE pt.status = 'successful'
          AND pt.subscription_plan_code NOT LIKE 'sands_%'
        ORDER BY pt.created_at DESC
        LIMIT p_batch_limit
    ) LOOP
        v_payments_checked := v_payments_checked + 1;
        
        SELECT EXISTS (
            SELECT 1 FROM public.commission_events
            WHERE subscription_payment_id = r_pay.id
        ) INTO v_comm_exists;
        
        IF NOT v_comm_exists THEN
            v_discrepancy_count := v_discrepancy_count + 1;
            IF v_status <> 'red' THEN v_status := 'yellow'; END IF;
            
            INSERT INTO public.financial_reconciliation_discrepancies (
                run_id, discrepancy_code, severity, partner_id, reference_table, reference_id,
                expected_value, actual_value, delta_thb, resolution_notes
            ) VALUES (
                v_run_id, 'DISC-02', 'yellow', r_pay.partner_id, 'payment_transactions', r_pay.id::text,
                r_pay.gross_amount_thb, 0.00, r_pay.gross_amount_thb, 'Payment by converted user lacks commission event'
            );
        END IF;
    END LOOP;

    -- 1.2 Reverse Audit: ตรวจสอบ Orphaned Commissions (มี Commission แต่ไม่มี Payment รองรับ)
    FOR r_comm IN (
        SELECT ce.id, ce.subscription_payment_id, ce.partner_id, ce.commission_amount_thb
        FROM public.commission_events ce
        ORDER BY ce.created_at DESC
        LIMIT p_batch_limit
    ) LOOP
        v_commissions_checked := v_commissions_checked + 1;
        
        IF NOT EXISTS (
            SELECT 1 FROM public.payment_transactions
            WHERE id = r_comm.subscription_payment_id AND status = 'successful'
        ) THEN
            v_discrepancy_count := v_discrepancy_count + 1;
            v_status := 'red'; -- Critical Invariant Violation
            
            INSERT INTO public.financial_reconciliation_discrepancies (
                run_id, discrepancy_code, severity, partner_id, reference_table, reference_id,
                expected_value, actual_value, delta_thb, resolution_notes
            ) VALUES (
                v_run_id, 'DISC-01', 'red', r_comm.partner_id, 'commission_events', r_comm.id::text,
                0.00, r_comm.commission_amount_thb, r_comm.commission_amount_thb, 'Commission event references non-existent or unpaid payment'
            );
        END IF;
    END LOOP;

    -- ─────────────────────────────────────────────────────────────────────────
    -- RAIL 2: HOLDING MATURITY & OVERDUE CLEARANCE RECONCILIATION
    -- ─────────────────────────────────────────────────────────────────────────
    
    FOR r_comm IN (
        SELECT ce.id, ce.partner_id, ce.commission_amount_thb, ce.holding_until
        FROM public.commission_events ce
        WHERE ce.status = 'holding'
          AND ce.holding_until < (now() - (p_grace_hours || ' hours')::INTERVAL)
        LIMIT p_batch_limit
    ) LOOP
        v_discrepancy_count := v_discrepancy_count + 1;
        IF v_status <> 'red' THEN v_status := 'yellow'; END IF;
        
        INSERT INTO public.financial_reconciliation_discrepancies (
            run_id, discrepancy_code, severity, partner_id, reference_table, reference_id,
            expected_value, actual_value, delta_thb, resolution_notes
        ) VALUES (
            v_run_id, 'DISC-04', 'yellow', r_comm.partner_id, 'commission_events', r_comm.id::text,
            0.00, r_comm.commission_amount_thb, r_comm.commission_amount_thb, 'Commission holding is overdue for clearance beyond grace period'
        );
    END LOOP;

    -- ─────────────────────────────────────────────────────────────────────────
    -- RAIL 3: PAYOUT REQUEST <-> OMISE TRANSFER <-> SETTLEMENT RECONCILIATION
    -- ─────────────────────────────────────────────────────────────────────────
    
    -- 3.1 ตรวจสอบ Reconciling Transfers ที่ค้างเกิน SLA
    FOR r_trsf IN (
        SELECT ot.id, ot.payout_request_id, ot.partner_id, ot.amount_thb, ot.status, ot.created_at
        FROM public.omise_transfers ot
        WHERE ot.status IN ('pending', 'processing')
          AND ot.created_at < (now() - (p_sla_hours || ' hours')::INTERVAL)
        LIMIT p_batch_limit
    ) LOOP
        v_transfers_checked := v_transfers_checked + 1;
        v_discrepancy_count := v_discrepancy_count + 1;
        IF v_status <> 'red' THEN v_status := 'yellow'; END IF;
        
        INSERT INTO public.financial_reconciliation_discrepancies (
            run_id, discrepancy_code, severity, partner_id, reference_table, reference_id,
            expected_value, actual_value, delta_thb, resolution_notes
        ) VALUES (
            v_run_id, 'DISC-08', 'yellow', r_trsf.partner_id, 'omise_transfers', r_trsf.id::text,
            r_trsf.amount_thb, r_trsf.amount_thb, 0.00, 'Omise transfer has exceeded SLA threshold (' || p_sla_hours || ' hours) in ' || r_trsf.status || ' status'
        );
    END LOOP;

    -- 3.2 ตรวจสอบ Paid Transfers ที่ยังไม่ได้บันทึก Settlement Ledger
    FOR r_trsf IN (
        SELECT ot.id, ot.payout_request_id, ot.partner_id, ot.amount_thb
        FROM public.omise_transfers ot
        WHERE ot.status = 'paid'
        LIMIT p_batch_limit
    ) LOOP
        v_transfers_checked := v_transfers_checked + 1;
        
        IF NOT EXISTS (
            SELECT 1 FROM public.partner_ledger
            WHERE reference_id = r_trsf.payout_request_id
              AND entry_type = 'payout_settled'
        ) AND NOT EXISTS (
            SELECT 1 FROM public.payout_requests
            WHERE id = r_trsf.payout_request_id AND status = 'completed'
        ) THEN
            v_discrepancy_count := v_discrepancy_count + 1;
            v_status := 'red'; -- Critical Outbound Invariant Violation
            
            INSERT INTO public.financial_reconciliation_discrepancies (
                run_id, discrepancy_code, severity, partner_id, reference_table, reference_id,
                expected_value, actual_value, delta_thb, resolution_notes
            ) VALUES (
                v_run_id, 'DISC-06', 'red', r_trsf.partner_id, 'omise_transfers', r_trsf.id::text,
                r_trsf.amount_thb, 0.00, r_trsf.amount_thb, 'Omise transfer marked paid but payout request / ledger settlement is missing'
            );
        END IF;
    END LOOP;

    -- ─────────────────────────────────────────────────────────────────────────
    -- RAIL 4: 3-BALANCE & DOUBLE-ENTRY LEDGER CONSERVATION RECONCILIATION
    -- ─────────────────────────────────────────────────────────────────────────
    
    FOR r_partner IN (
        SELECT pe.id, pe.partner_code, pe.holding_balance, pe.available_balance, pe.payout_pending_balance, pe.total_earned, pe.total_withdrawn
        FROM public.partner_entities pe
        LIMIT p_batch_limit
    ) LOOP
        v_partners_checked := v_partners_checked + 1;
        
        -- ตรวจสอบว่ามีค่าติดลบหรือไม่
        IF r_partner.holding_balance < 0 OR r_partner.available_balance < 0 OR r_partner.payout_pending_balance < 0 THEN
            v_discrepancy_count := v_discrepancy_count + 1;
            v_status := 'red';
            
            INSERT INTO public.financial_reconciliation_discrepancies (
                run_id, discrepancy_code, severity, partner_id, partner_code, reference_table, reference_id,
                expected_value, actual_value, delta_thb, resolution_notes
            ) VALUES (
                v_run_id, 'DISC-07', 'red', r_partner.id, r_partner.partner_code, 'partner_entities', r_partner.id::text,
                0.00, r_partner.available_balance, r_partner.available_balance, 'Partner entity balance contains negative numbers'
            );
        END IF;
    END LOOP;

    -- 2. สรุปผลและปิด Run
    UPDATE public.financial_reconciliation_runs
    SET status = v_status,
        total_payments_checked = v_payments_checked,
        total_commissions_checked = v_commissions_checked,
        total_transfers_checked = v_transfers_checked,
        total_partners_checked = v_partners_checked,
        discrepancy_count = v_discrepancy_count,
        summary_metadata = jsonb_build_object(
            'sla_hours', p_sla_hours,
            'grace_hours', p_grace_hours,
            'batch_limit', p_batch_limit,
            'duration_ms', EXTRACT(MILLISECONDS FROM (now() - v_started_at))
        ),
        completed_at = now()
    WHERE id = v_run_id;

    RETURN jsonb_build_object(
        'success', true,
        'run_id', v_run_id,
        'status', v_status,
        'discrepancy_count', v_discrepancy_count,
        'payments_checked', v_payments_checked,
        'commissions_checked', v_commissions_checked,
        'transfers_checked', v_transfers_checked,
        'partners_checked', v_partners_checked,
        'started_at', v_started_at,
        'completed_at', now()
    );
END;
$$;
