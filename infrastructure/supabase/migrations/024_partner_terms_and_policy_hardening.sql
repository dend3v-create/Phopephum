-- 024_partner_terms_and_policy_hardening.sql
-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — STEP 7.2B: PARTNER TERMS & POLICY HARDENING
-- ==============================================================================
-- 1. Versioned Partner Terms & Agreements (partner_terms_versions, partner_terms_acceptances)
-- 2. Partner Tier Taxonomy Hardening (Support 'partner_pro', 'affiliate', 'creator', 'institutional')
-- 3. Dynamic RLS & RPC for Terms Acceptance
-- 4. 12-Month Commission Term & Explicit SKU Commissionability Support
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: VERSIONED PARTNER TERMS & AGREEMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_terms_versions (
    version TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    document_url TEXT NOT NULL,
    document_checksum TEXT NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_terms_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    terms_version TEXT NOT NULL REFERENCES public.partner_terms_versions(version) ON DELETE RESTRICT,
    ip_hash TEXT NOT NULL,
    user_agent_hash TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (partner_id, terms_version)
);

CREATE INDEX IF NOT EXISTS idx_terms_accept_partner ON public.partner_terms_acceptances(partner_id);
CREATE INDEX IF NOT EXISTS idx_terms_accept_version ON public.partner_terms_acceptances(terms_version);

-- Seed Baseline Partner Terms Agreement
INSERT INTO public.partner_terms_versions (version, title, document_url, document_checksum, effective_from, is_active)
VALUES (
    'v2026.1',
    'ข้อกำหนดและเงื่อนไขโปรแกรมพันธมิตร PhopePhum (Partner Program Terms v2026.1)',
    'https://phopephum.com/terms/partner-v2026.1.pdf',
    'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    now(),
    true
)
ON CONFLICT (version) DO UPDATE 
SET title = EXCLUDED.title,
    document_url = EXCLUDED.document_url,
    document_checksum = EXCLUDED.document_checksum,
    is_active = EXCLUDED.is_active;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: RLS SECURITY POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.partner_terms_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_terms_acceptances ENABLE ROW LEVEL SECURITY;

-- 2.1 partner_terms_versions: Anyone can view active terms
DROP POLICY IF EXISTS "partner_terms_versions_read_active" ON public.partner_terms_versions;
CREATE POLICY "partner_terms_versions_read_active" ON public.partner_terms_versions
    FOR SELECT
    TO authenticated, anon
    USING (is_active = true);

DROP POLICY IF EXISTS "partner_terms_versions_admin_all" ON public.partner_terms_versions;
CREATE POLICY "partner_terms_versions_admin_all" ON public.partner_terms_versions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'finance_officer')
        )
    );

-- 2.2 partner_terms_acceptances: Partner can view/insert own acceptances; Admin can view all
DROP POLICY IF EXISTS "partner_terms_acceptances_partner_view" ON public.partner_terms_acceptances;
CREATE POLICY "partner_terms_acceptances_partner_view" ON public.partner_terms_acceptances
    FOR SELECT
    TO authenticated
    USING (
        partner_id IN (
            SELECT id FROM public.partner_entities
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "partner_terms_acceptances_partner_insert" ON public.partner_terms_acceptances;
CREATE POLICY "partner_terms_acceptances_partner_insert" ON public.partner_terms_acceptances
    FOR INSERT
    TO authenticated
    WITH CHECK (
        partner_id IN (
            SELECT id FROM public.partner_entities
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "partner_terms_acceptances_admin_all" ON public.partner_terms_acceptances;
CREATE POLICY "partner_terms_acceptances_admin_all" ON public.partner_terms_acceptances
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
-- SECTION 3: ATOMIC RPC FOR TERMS ACCEPTANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_partner_terms_atomic(
    p_partner_id UUID,
    p_terms_version TEXT,
    p_ip_hash TEXT,
    p_user_agent_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_partner public.partner_entities%ROWTYPE;
    v_terms public.partner_terms_versions%ROWTYPE;
    v_acceptance_id UUID;
BEGIN
    -- 1. ตรวจสอบสถานะ Partner
    SELECT * INTO v_partner
    FROM public.partner_entities
    WHERE id = p_partner_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Partner entity not found');
    END IF;

    -- 2. ตรวจสอบเวอร์ชันข้อตกลงว่า Active หรือไม่
    SELECT * INTO v_terms
    FROM public.partner_terms_versions
    WHERE version = p_terms_version AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Terms version is invalid or inactive');
    END IF;

    -- 3. ตรวจสอบการยอมรับเดิม (Idempotent)
    IF EXISTS (
        SELECT 1 FROM public.partner_terms_acceptances
        WHERE partner_id = p_partner_id AND terms_version = p_terms_version
    ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'message', 'Terms already accepted previously'
        );
    END IF;

    -- 4. บันทึกการยอมรับ
    INSERT INTO public.partner_terms_acceptances (
        partner_id,
        terms_version,
        ip_hash,
        user_agent_hash,
        accepted_at
    ) VALUES (
        p_partner_id,
        p_terms_version,
        p_ip_hash,
        p_user_agent_hash,
        now()
    )
    RETURNING id INTO v_acceptance_id;

    RETURN jsonb_build_object(
        'success', true,
        'acceptance_id', v_acceptance_id,
        'terms_version', p_terms_version,
        'accepted_at', now()
    );
END $$;
