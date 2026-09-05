-- ==============================================================================
-- 🏛️ PHOPEPHUM V3 — STEP 6.5.5: HOLDING & SETTLEMENT ENGINE PATCH 2
-- Apply in: Supabase SQL Editor
-- ==============================================================================

-- 1. Add updated_at column to commission_events if not exists
ALTER TABLE public.commission_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Enhanced clear_holding_commissions_atomic RPC
CREATE OR REPLACE FUNCTION public.clear_holding_commissions_atomic(p_limit INT DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_partner public.partner_entities%ROWTYPE;
    v_processed_count INT := 0;
    v_total_cleared_amount NUMERIC(12, 2) := 0.00;
    v_total_offset_amount NUMERIC(12, 2) := 0.00;
    v_total_net_added NUMERIC(12, 2) := 0.00;
    
    v_offset NUMERIC(12, 2) := 0.00;
    v_avail_to_add NUMERIC(12, 2) := 0.00;
    v_new_holding NUMERIC(12, 2);
    v_new_available NUMERIC(12, 2);
    v_new_clawback NUMERIC(12, 2);
    v_idem TEXT;
BEGIN
    FOR v_event IN
        SELECT * FROM public.commission_events
        WHERE status = 'holding' AND holding_until <= now()
        ORDER BY holding_until ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    LOOP
        v_idem := 'clear:' || v_event.id;

        -- ตรวจสอบ Idempotency: หากเคย clear ไปแล้ว ให้ข้าม
        IF EXISTS (SELECT 1 FROM public.partner_ledger WHERE idempotency_key = v_idem) THEN
            UPDATE public.commission_events SET status = 'cleared' WHERE id = v_event.id;
            CONTINUE;
        END IF;

        -- ล็อกแถว Partner
        SELECT * INTO v_partner
        FROM public.partner_entities
        WHERE id = v_event.partner_id
        FOR UPDATE;

        IF FOUND THEN
            -- คำนวณ Clawback Offset (ถ้ามีหนี้ค้าง clawback_pending_balance > 0)
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

            -- 1. อัปเดต Partner Entity
            UPDATE public.partner_entities
            SET holding_balance = v_new_holding,
                available_balance = v_new_available,
                clawback_pending_balance = v_new_clawback,
                updated_at = now()
            WHERE id = v_event.partner_id;

            -- 2. บันทึก Ledger: commission_cleared
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

            -- 3. หากมี Clawback Offset บันทึก Entry พิเศษเพื่อ Audit Trail ชัดเจน
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

            -- 4. อัปเดตสถานะ Event
            UPDATE public.commission_events
            SET status = 'cleared'
            WHERE id = v_event.id;

            v_processed_count := v_processed_count + 1;
            v_total_cleared_amount := v_total_cleared_amount + v_event.commission_amount_thb;
            v_total_offset_amount := v_total_offset_amount + v_offset;
            v_total_net_added := v_total_net_added + v_avail_to_add;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'total_cleared_thb', v_total_cleared_amount,
        'total_offset_thb', v_total_offset_amount,
        'total_net_added_thb', v_total_net_added,
        'timestamp', now()
    );
END;
$$;
