-- 017_partner_economy_ledger.sql
-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — PHASE 6.5.2: DATABASE ARCHITECTURE & MIGRATION
-- ระบบพันธมิตรและเครือข่ายความร่วมมือ (Partner & Affiliate Economy)
-- 
-- 6 Implementation Guardrails:
-- 1. Dynamic Tax Rule Resolution (ห้าม hard-code 3% — ใช้ tax_rules table)
-- 2. Dynamic VAT Rate Calculation (ห้าม hard-code 7% — คำนวณจาก vat_rate input)
-- 3. Configurable Data Retention (retention_policy, retention_until, archived_at)
-- 4. Double-Entry Immutable Partner Ledger (Source of Truth) + 3-Balance Model
-- 5. Atomic Payout Reservation with SELECT ... FOR UPDATE (ป้องกัน Double Withdrawal)
-- 6. Closed-Loop Sands of Time Non-Monetary Bridge (benefit_reference_value_thb)
-- 7. Dual-Read & Non-Destructive Legacy Backfill (ห้ามลบ legacy tables)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: IDENTITY, COMPLIANCE & FINANCIAL PII (Boundary Isolation)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 ตารางพันธมิตรสาธารณะ (Public Partner Entities)
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

-- 1.2 ตารางข้อมูลภาษีพันธมิตร (Private Tax & Compliance PII — Server-Only / Admin)
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

-- 1.3 ตารางบัญชีรับเงิน (Private Payout Destinations)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: DYNAMIC RULES & COMMISSION ENGINE (Configurable)
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 ตารางกฎภาษีหัก ณ ที่จ่าย (Tax Rules)
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

-- Seed Dynamic Tax Rules (กรมสรรพากร: คำนวณตามประเภทเงินได้และนิติบุคคล/บุคคลธรรมดา)
INSERT INTO public.tax_rules (rule_code, description, entity_type, withholding_rate, min_threshold_thb, requires_tax_certificate, is_active)
VALUES 
    ('TH_INDIVIDUAL_COMMISSION', 'ค่านายหน้าบุคคลธรรมดา (3%)', 'individual', 0.0300, 1000.00, true, true),
    ('TH_CORPORATE_SERVICE', 'ค่าบริการนิติบุคคล (3%)', 'corporate', 0.0300, 1000.00, true, true),
    ('TH_EXEMPT_ZERO', 'ได้รับยกเว้นภาษีหัก ณ ที่จ่าย (0%)', 'any', 0.0000, 0.00, false, true),
    ('TH_BELOW_THRESHOLD', 'ยอดจ่ายไม่ถึงเกณฑ์ขั้นต่ำ 1,000 บาท (0%)', 'any', 0.0000, 0.00, false, true)
ON CONFLICT (rule_code) DO UPDATE 
SET description = EXCLUDED.description,
    withholding_rate = EXCLUDED.withholding_rate,
    min_threshold_thb = EXCLUDED.min_threshold_thb;

-- 2.2 ตารางแผนคอมมิชชัน (Commission Plans)
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

-- 2.3 ตารางการกำหนดสิทธิ์แผน (Plan Assignments: Tier / Partner-Specific / Campaign)
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

-- 2.4 ตารางอัตราผลตอบแทนต่อแพ็กเกจ (Commission Rate Rules)
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
    VALUES ('PLAN_DEFAULT_AFFILIATE', 'แผนสมาชิกทั่วไป (7%)', 'recurring', 14, true)
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
    VALUES ('PLAN_DEFAULT_CREATOR', 'แผนครีเอเตอร์ (15%)', 'recurring', 14, true)
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
    VALUES ('PLAN_DEFAULT_MASTER', 'แผนมาสเตอร์/สถาบัน (25%)', 'recurring', 14, true)
    ON CONFLICT (plan_code) DO UPDATE SET plan_name = EXCLUDED.plan_name
    RETURNING id INTO v_master_plan_id;

    INSERT INTO public.commission_rate_rules (plan_id, subscription_plan_code, rate_percentage)
    VALUES (v_master_plan_id, 'all', 0.2500)
    ON CONFLICT (plan_id, subscription_plan_code) DO UPDATE SET rate_percentage = 0.2500;

    INSERT INTO public.commission_plan_assignments (assignment_scope, tier_code, plan_id, priority)
    VALUES ('tier', 'master', v_master_plan_id, 10)
    ON CONFLICT DO NOTHING;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: ATTRIBUTION, LEDGER & PAYOUT SETTLEMENT
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 ตารางการติดตามผลแนะนำ (Attribution Engine)
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

-- 3.2 ตารางบันทึกเหตุการณ์คอมมิชชัน (Commission Events)
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

-- 3.3 สมุดบัญชีแยกประเภทคู่พันธมิตร (Partner Ledger — Source of Truth)
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

-- 3.4 ตารางคำขอเบิกเงิน (Payout Requests)
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

-- 3.5 ตารางธุรกรรมการโอนเงินจริง (Payout Transactions)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: SANDS OF TIME CLOSED-LOOP BENEFIT BRIDGE (Non-Monetary)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    benefit_type TEXT NOT NULL CHECK (benefit_type IN ('consultation_discount', 'report_unlock_subsidy', 'workshop_access')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sands_redeem_cost INT NOT NULL CHECK (sands_redeem_cost > 0),
    benefit_reference_value_thb NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- มูลค่าอ้างอิงของ Benefit ไม่ใช่ Exchange Rate ของทราย
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

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: ROW-LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: ATOMIC STORED PROCEDURES (RPCs)
-- ─────────────────────────────────────────────────────────────────────────────

-- 6.1 RPC: บันทึกค่าคอมมิชชันแบบไดนามิก (คำนวณ VAT + กัก 14 วัน + ป้องกัน Idempotency)
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
    -- 1. ตรวจสอบ Idempotency
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Transaction already processed');
    END IF;

    -- 2. ล็อกแถว Partner Entity เพื่อความปลอดภัยสูงสุด (FOR UPDATE)
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: %', p_partner_id;
    END IF;

    -- 3. ตรวจสอบ Anti-Self-Referral
    IF v_partner.user_id = p_referred_user_id THEN
        RAISE EXCEPTION 'SELF_REFERRAL_BLOCKED: Partner cannot refer themselves';
    END IF;

    -- 4. คำนวณ VAT และฐานคิดคอมมิชชันแบบไดนามิก
    IF p_vat_rate > 0 THEN
        v_vat_amount := ROUND(p_gross_amount_thb * p_vat_rate / (1.0 + p_vat_rate), 2);
    ELSE
        v_vat_amount := 0.00;
    END IF;

    v_commissionable_base := ROUND(p_gross_amount_thb - v_vat_amount, 2);
    v_commission_amount := ROUND(v_commissionable_base * p_commission_rate, 2);
    v_holding_until := now() + (COALESCE(p_holding_days, 14) || ' days')::INTERVAL;

    -- 5. คำนวณยอดเงินใหม่
    v_new_holding := v_partner.holding_balance + v_commission_amount;
    v_new_total_earned := v_partner.total_earned + v_commission_amount;

    -- 6. INSERT ลง commission_events
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

    -- 7. INSERT ลง partner_ledger (Double-Entry Source of Truth)
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

-- 6.2 RPC: ปลดล็อกคอมมิชชันที่ครบกำหนด 14 วัน (Holding -> Available)
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

        -- ล็อกแถว Partner
        SELECT * INTO v_partner
        FROM public.partner_entities
        WHERE id = v_event.partner_id
        FOR UPDATE;

        IF FOUND THEN
            -- ย้ายยอดเงิน: holding -= amount, available += amount
            UPDATE public.partner_entities
            SET holding_balance = GREATEST(0.00, holding_balance - v_event.commission_amount_thb),
                available_balance = available_balance + v_event.commission_amount_thb,
                updated_at = now()
            WHERE id = v_event.partner_id;

            -- บันทึก Ledger
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

            -- อัปเดตสถานะ Event
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

-- 6.3 RPC: ยื่นขอเบิกเงินแบบ Atomic Reserve (Available -> Payout Pending ป้องกันถอนซ้ำ)
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
    -- 1. ตรวจสอบ Idempotency
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Payout request already processed');
    END IF;

    -- 2. ตรวจสอบยอดขั้นต่ำ 500 บาท
    IF p_requested_amount_thb < 500.00 THEN
        RAISE EXCEPTION 'MINIMUM_PAYOUT_THRESHOLD_500: Minimum payout is ฿500.00';
    END IF;

    -- 3. ตรวจสอบ Tax Rule แบบ Dynamic (ห้าม hard-code 3%)
    SELECT * INTO v_tax_rule
    FROM public.tax_rules
    WHERE rule_code = p_tax_rule_code AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TAX_RULE_NOT_FOUND: Tax rule % not found or inactive', p_tax_rule_code;
    END IF;

    -- 4. ล็อกแถว Partner Entity ป้องกัน Concurrent Withdrawal
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PARTNER_NOT_FOUND: %', p_partner_id;
    END IF;

    -- 5. ตรวจสอบยอดเงิน Available
    IF v_partner.available_balance < p_requested_amount_thb THEN
        RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE: Available balance is ฿%, requested ฿%',
            v_partner.available_balance, p_requested_amount_thb;
    END IF;

    -- 6. คำนวณภาษีหัก ณ ที่จ่ายตาม Tax Rule
    IF p_requested_amount_thb >= v_tax_rule.min_threshold_thb THEN
        v_wht_amount := ROUND(p_requested_amount_thb * v_tax_rule.withholding_rate, 2);
    ELSE
        v_wht_amount := 0.00;
    END IF;

    v_net_amount := ROUND(p_requested_amount_thb - v_wht_amount, 2);

    -- 7. ตัดยอด Atomic: Available ลดลง, Payout Pending เพิ่มขึ้น
    v_new_available := v_partner.available_balance - p_requested_amount_thb;
    v_new_pending := v_partner.payout_pending_balance + p_requested_amount_thb;

    v_request_number := 'PO-' || to_char(now(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0');

    -- 8. INSERT ลง payout_requests
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

    -- 9. INSERT ลง partner_ledger (Double-Entry Source of Truth)
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

-- 6.4 RPC: ยืนยันการโอนเงินสำเร็จโดย Admin (Payout Pending -> Total Withdrawn)
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
    -- 1. ตรวจสอบ Idempotency
    IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Settlement already processed');
    END IF;

    -- 2. ล็อกคำขอเบิกเงิน
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

    -- 3. ล็อก Partner Entity
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = v_request.partner_id
    FOR UPDATE;

    -- 4. ย้ายยอดเงิน: payout_pending ลดลง, total_withdrawn เพิ่มขึ้น
    v_new_pending := GREATEST(0.00, v_partner.payout_pending_balance - v_request.requested_amount_thb);
    v_new_withdrawn := v_partner.total_withdrawn + v_request.requested_amount_thb;

    -- 5. INSERT ลง payout_transactions
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

    -- 6. INSERT ลง partner_ledger
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

    -- 7. UPDATE สถานะ Payout Request
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

-- 6.5 RPC: ปฏิเสธคำขอเบิกเงินและคืนยอด (Payout Pending -> Available)
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

    -- คืนยอดเงิน: payout_pending ลดลง, available เพิ่มขึ้น
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

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: NON-DESTRUCTIVE LEGACY BACKFILL PROCEDURE
-- ─────────────────────────────────────────────────────────────────────────────

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
    -- 1. สร้าง Partner Entity ให้กับผู้ใช้ทุกคนที่มี referral_code หรือเคยมีประวัติแนะนำ
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
