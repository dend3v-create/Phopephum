-- 020_omise_payment_and_transfer_schema.sql
-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — STEP 6.5.4.1: OMISE INTEGRATION & FINANCIAL HARDENING
-- ==============================================================================

-- 1. ตารางบันทึกธุรกรรมการชำระเงินขาเข้า (Inbound Payment Transactions)
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

-- 2. ตารางบันทึกการโอนเงินออกให้พันธมิตรผ่าน Omise Transfer (Outbound Transfers)
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

-- 3. Atomic RPC: บันทึกการชำระเงิน Omise สำเร็จ + เปิดใช้งาน Subscription สมาชิก
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

    -- 2. คำนวณ VAT ตามไดนามิกเรต
    IF p_vat_rate > 0 THEN
        v_vat_amount := ROUND(p_gross_amount_thb * p_vat_rate / (1.0 + p_vat_rate), 2);
    ELSE
        v_vat_amount := 0.00;
    END IF;

    -- 3. กำหนดระดับและอายุการใช้งานตามแผน
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

    -- 4. บันทึก Transaction
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

    -- 5. อัปเดต Profile สมาชิก
    UPDATE public.profiles
    SET plan = p_subscription_plan_code,
        subscription = v_sub_tier,
        membership_status = 'active',
        membership_expires_at = v_new_expires_at,
        updated_at = now()
    WHERE id = p_user_id;

    -- 6. ปิด Pending Subscription Request (ถ้ามี)
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

-- Service Role มีสิทธิ์เต็มที่
GRANT ALL ON public.payment_transactions TO service_role;
GRANT ALL ON public.omise_transfers TO service_role;

-- User ดูเฉพาะของตนเอง
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

-- ลิดรอนสิทธิ์ EXECUTE จาก public / anon / authenticated เพื่อบังคับผ่าน Service Role
REVOKE EXECUTE ON FUNCTION public.record_omise_payment_and_activate_atomic(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_omise_payment_and_activate_atomic(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_subscription_commission_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_subscription_commission_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_refund_clawback_atomic(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_refund_clawback_atomic(UUID, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transition_payout_status_atomic(UUID, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_payout_status_atomic(UUID, TEXT, UUID, TEXT, TEXT) TO service_role;
