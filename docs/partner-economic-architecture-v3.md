# 🏛️ PHOPEPHUM V3 — PARTNER & AFFILIATE ECONOMIC ARCHITECTURE (v3.0.0-LOCKED)

**Document Version:** 3.0.0-LOCKED  
**Status:** 🔒 **FROZEN & LOCKED (Production Architecture Baseline)**  
**Effective Date:** 2026-09-06  
**Governing Principle:** Zero client-side financial computation, strict 4-rail ledger segregation, multi-signal attribution state machine, append-only double-entry ledger, dynamic tax rule engine, and server-side single source of truth (SSoT).

---

## 1. Locked Business Policies & Decision Registry

| Policy Domain | Locked Decision (v1 Production Baseline) | Architecture & Accounting Rationale |
|---|---|---|
| **Referral Model** | **Single-Tier (1-Level Direct)** | Direct 1:1 attribution. Database model supports nullable `parent_partner_id` for future Phase 8 expansion, but multi-level cascading is strictly deactivated in V1. |
| **Attribution Window** | **30 Days / Last-Touch** | 30-day (`2,592,000` seconds) cookie and database attribution window with last-touch resolution prior to registration. |
| **Winning Attribution** | **1 Partner / 1 Customer Lock** | Locked via partial unique index `UNIQUE (referred_user_id) WHERE status = 'converted'`. Subsequent clicks do not overwrite the winning partner. |
| **Subscription Commission** | **Commissionable (Explicit Policy)** | All 4 Canonical Subscription SKUs (`basic`, `pro`, `pro_annual`, `imperial`) have `commissionable: true`. |
| **Sands Refill Commission** | **0% / Non-Commissionable** | All 3 Sands Refill SKUs (`sands_50`, `sands_150`, `sands_500`) have `commissionable: false` to protect AI token unit economics. |
| **Commission Term** | **12 Months (Active Subscription)** | Commission is granted for up to 12 billing cycles from the initial conversion. Months 13+ return `EXPIRED_COMMISSION_TERM` to protect long-term company margin. |
| **Commission Base** | **VAT-Segregated Base** | $\text{Commissionable Base} = \text{Gross} \times \frac{100}{107}$ (Invoice VAT 7% is deducted prior to rate multiplication). |
| **Holding Period** | **14 Days** | Commissions remain locked in `holding_balance` for 14 days before automated clearance to `available_balance`. |
| **Minimum Payout** | **฿500.00 THB** | Minimum withdrawal threshold per payout request to optimize Omise transfer overhead and manual finance reviews. |
| **Self-Referral Policy** | **Hard Block** | Multi-signal rejection: `partner.user_id === payer.user_id`, matching Tax ID, and matching payout destination accounts. |
| **Post-Maturity Refund** | **Clawback Debt Offset** | Refunds after 14 days debit `available_balance` or allocate to `clawback_pending_balance` to offset future cleared earnings. |
| **Partner Tier Naming** | **Non-Colliding Taxonomy** | `affiliate`, `creator`, `partner_pro`, `institutional` (Zero collision with product SKU `imperial` or legacy alias `master`). |
| **Partner Terms** | **Versioned Agreement** | `partner_terms_versions` & `partner_terms_acceptances` tracking `partner_id`, `terms_version`, `accepted_at`, `ip_hash`, `document_checksum`. |
| **Withholding Tax (WHT)** | **Dynamic Tax Rule Engine** | Tax resolution via `tax_rules` table based on entity type, jurisdiction, and threshold (No hardcoded universal 3% in application code). |
| **Reconciliation Engine** | **Dual-Direction Audit** | Verifies `Verified Payment ↔ Commission Event` and `3-Balance ↔ Partner Ledger` mathematical sum conservation. |

---

## 2. The 4 Segregated Economic Rails Architecture (ECON-09)

$$\text{Customer Payment} \neq \text{Partner Commission} \neq \text{Time Sands Balance} \neq \text{Partner Cash Balance}$$

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       4 STRICTLY SEGREGATED LEDGER RAILS                    │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│ 1. Customer Payment     │ 2. Partner Commission   │ 3. Sands Micro-Economy  │
│    Rail (Omise / Bank)  │    Rail (Holding/Clearing)│    Rail (Time Sands)    │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ • THB Currency (Gross)  │ • THB Commission Rights │ • Pure Utility Tokens   │
│ • SSoT: payment_tx      │ • SSoT: comm_events     │ • SSoT: sands_ledger    │
│ • Net = Gross - Fee-VAT │ • 14-day hold clearance │ • Non-cash convertible  │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │ 4. Partner Cash / Payout  │
                         │    Rail (Bank / PromptPay)│
                         ├───────────────────────────┤
                         │ • SSoT: partner_ledger    │
                         │ • Available Balance       │
                         │ • Net Payout = Gross - WHT│
                         └───────────────────────────┘
```

---

## 3. End-to-End Commission & Settlement Pipeline

```
                 VERIFIED PAYMENT (Omise Webhook)
                               │
                               ▼
               Attribution Check (30-day Last Touch)
                               │
                               ▼
              Commission Rule Resolution (Priority: Partner > Campaign > Tier)
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
        Subscription                           Sands
     (commissionable: true)             (commissionable: false)
             │                                   │
             ▼                                   ▼
      12-Month Term Check                 0% / No Commission
             │                                (Terminated)
             ▼
      VAT Base (Gross × 100/107)
             │
             ▼
       Commission Event Created
             │
       14-Day Dispute Holding Window
             │
       ┌─────┴─────────────────────────┐
       │                               │
Refund < 14 Days               14 Days Elapsed
       │                               │
Holding Clawback               Automated Clearance Job
 (Zero Available loss)                 │
                                       ▼
                               Clawback Debt Offset Check
                                       │
                                       ▼
                               Available Balance
                                       │
                                 (≥ ฿500.00 THB)
                                       │
                                       ▼
                               Payout Request (SELECT FOR UPDATE)
                                       │
                                       ▼
                               Tax Rule Engine (WHT Resolution)
                                       │
                                       ▼
                               Admin Review & Approval
                                       │
                                       ▼
                               Omise Transfer API Execution
                                       │
                                       ▼
                               Settled & Payout Complete
```

---

## 4. Commission State Machine & Transition Authority

| Transition | Trigger / Caller | Authority Level | Ledger Action |
|---|---|---|---|
| `Payment` $\to$ `HOLDING` | Omise Webhook (`charge.complete`) | Service Role / Database RPC | `commission_holding_in` (+Holding) |
| `HOLDING` $\to$ `CLEARED` | Scheduled Cron (`clear_holding_commissions_monitored_atomic`) | Cron / System Service Role | `commission_cleared` (-Holding, +Available) |
| `HOLDING` $\to$ `REVERSED` | Omise Webhook (`charge.refund`) | Service Role / Database RPC | `commission_clawback` (-Holding) |
| `CLEARED` $\to$ `CLAWBACK_DEBT` | Post-14-Day Refund Webhook | Service Role / Database RPC | `commission_clawback` (-Available or +Debt) |
| `AVAILABLE` $\to$ `PAYOUT_PENDING`| Partner Portal (`submitPayoutRequest`) | Authenticated Partner via RPC | `payout_reserved` (-Available, +Pending) |
| `PAYOUT_PENDING` $\to$ `APPROVED` | Admin Portal (`adminApprovePayoutRequest`) | Finance Officer / Admin | Status transition only |
| `PAYOUT_PENDING` $\to$ `REJECTED` | Admin Portal (`adminRejectPayoutRequest`) | Finance Officer / Admin | `payout_rejected` (-Pending, +Available) |
| `APPROVED` $\to$ `SETTLED_PAID`  | Omise Transfer Webhook (`transfer.paid`) | Omise Webhook / Finance | `payout_settled` (-Pending, +TotalWithdrawn)|

---

## 5. Dynamic Tax Rule Engine Specification

```
Partner Payout Request
          │
          ▼
Tax Rule Engine Resolution:
  1. Partner Entity Type ('individual' vs 'corporate')
  2. Tax Jurisdiction (Default 'TH')
  3. Income Classification ('commission_brokerage' vs 'professional_service')
  4. Withholding Exemption Status (from partner_tax_profiles)
  5. Minimum Threshold Verification (from tax_rules table)
          │
          ▼
Tax Rule Applied Snapshot:
  • rule_code: 'TH_INDIVIDUAL_COMMISSION' | 'TH_CORPORATE_SERVICE' | 'TH_EXEMPT_ZERO'
  • withholding_rate: 0.0300 (or resolved rule rate)
  • withholding_tax_amount: RequestedAmount × Rate
  • net_payout_amount: RequestedAmount - WHT Amount
  • rule_version: Recorded on payout_requests for 50 ทวิ Tax Certificate Generation
```

---

## 6. Versioned Partner Terms Architecture

```sql
CREATE TABLE IF NOT EXISTS public.partner_terms_versions (
    version TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    document_url TEXT NOT NULL,
    document_checksum TEXT NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.partner_terms_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partner_entities(id) ON DELETE CASCADE,
    terms_version TEXT NOT NULL REFERENCES public.partner_terms_versions(version),
    ip_hash TEXT NOT NULL,
    user_agent_hash TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (partner_id, terms_version)
);
```

---

## 7. Dual-Direction Reconciliation Invariants (INV-PARTNER-01 → INV-PARTNER-25)

The reconciliation engine audits both rails daily:
1. **Payment ↔ Commission Integrity (INV-PARTNER-01):**
   - Every verified paid subscription transaction associated with a converted user must have exactly 1 matching `commission_event`.
   - Every `commission_event` must map to a verified paid `payment_transactions` row.
2. **Double-Entry Mathematical Conservation (INV-PARTNER-21):**
   $$\text{Holding Balance} = \sum (\text{commission\_holding\_in}) - \sum (\text{commission\_cleared}) - \sum (\text{holding\_reversals})$$
   $$\text{Available Balance} = \sum (\text{commission\_cleared}) - \sum (\text{commission\_clawback}) - \sum (\text{payout\_reserved}) + \sum (\text{payout\_rejected})$$
   $$\text{Payout Pending Balance} = \sum (\text{payout\_reserved}) - \sum (\text{payout\_settled}) - \sum (\text{payout\_rejected})$$
   $$\text{Clawback Pending Balance} = \sum (\text{uncovered\_clawback\_liabilities}) - \sum (\text{auto\_cleared\_offsets})$$

---

## 8. Partner Tier Taxonomy

| Tier Code | Display Label | Default Commission Rate | Requirements |
|---|---|:---:|---|
| `affiliate` | General Affiliate | 7.00% | Registered User + KYC Verified |
| `creator` | Content Creator | 15.00% | 10+ Active Referred Customers |
| `partner_pro` | Master Pro Partner | 25.00% | Institutional / Master Academy Partner |
| `institutional` | Enterprise / Institute | Custom Agreement | Contractual Custom Rate Rule |

*(Note: Legacy alias `master` is deprecated and mapped to `partner_pro` to avoid collision with product SKU `imperial`).*
