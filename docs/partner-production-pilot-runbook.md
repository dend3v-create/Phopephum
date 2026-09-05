# 🏛️ PHOPEPHUM V3 — STEP 7.2H.1: CONTROLLED REAL-MONEY PILOT RUNBOOK & WAVE 1 GOVERNANCE

**Status:** `v3.1.1-PILOT-WAVE-1-HARDENED`  
**Governing Baseline:** `docs/partner-economic-architecture-v3.md` (LOCKED)  
**Security & Operational Clearance:** `FINANCIAL TIER 1 / HUMAN-CONTROLLED`

---

## 1. 🔒 Locked Operational Rules for Pilot Wave 1 (The 6 Production Commandments)

1. **Pilot Wave 1 = 1 Partner Only:**  
   The pilot starts with exactly **1 authorized partner** (`Partner #1`).  
   Flow: `Partner #1 ➔ 1 Transaction ➔ Observe ➔ Reconcile ➔ 2nd Transaction ➔ Observe ➔ Multiple Transactions ➔ Partner #2`.  
   *Rule: Never launch multi-partner concurrent payouts on Day 1.*

2. **Wave 1 Budget Target (฿500 – ฿2,000 Cumulative):**  
   - Hard Cap Ceiling: **฿10,000.00 THB** (Enforced server-side)  
   - Single Transaction Limit: **฿500.00 – ฿1,000.00 THB**  
   - Wave 1 Target: **฿500 – ฿2,000 THB** (Do NOT rush to exhaust the ฿10,000 cap; use minimum necessary for proof of flow).

3. **Full-Chain Traceability with Aggregation Where Applicable:**  
   Payment to Payout is NOT a 1:1 relationship. Payout Amount must trace deterministically to all eligible constituent Commission Events ($1..N$), regardless of SKU combination or transaction count:  
   $$\text{Payment}_{1..N} \longrightarrow \text{Order}_{1..N} \longrightarrow \text{Buyer}_{1..N} \longrightarrow \text{Attribution}_{1..N} \longrightarrow \text{Commission Event}_{1..N} \longrightarrow \text{Partner Ledger} \longrightarrow \text{Available Balance} \longrightarrow \text{Payout Request} \longrightarrow \text{Omise Transfer} \longrightarrow \text{Settlement} \longrightarrow \text{WHT Certificate}$$  
   *If any underlying ID or link is missing in the chain: STOP PILOT IMMEDIATELY.*

4. **Reconciliation "Before AND After" Every Payout:**  
   - **Pre-Payout Mandatory Conditions:**  
     1. Financial Reconciliation Status = `GREEN`  
     2. **Unexplained Ledger Discrepancy = ฿0.00**  
     3. Partner Available Balance $\ge$ Payout Request Amount  
     4. No payout already in `processing` / `sent` status for the same economic obligation  
     5. No Circuit Breaker active  
     6. Partner remains `PILOT ELIGIBLE`  
   - **Post-Payout Check:** Run deep reconciliation immediately after webhook settlement. If not `GREEN` ➔ **AUTO FREEZE**.

5. **Circuit Breaker: Fail-Closed & Zero Developer Bypass:**  
   Circuit Breaker auto-freezes transfers on RED status, discrepancies > ฿0.00, or unknown transfers.  
   *Rule: Developers are strictly prohibited from bypassing or unfreezing the Circuit Breaker. Unfreeze requires formal Finance Officer authorization with audit logging.*

6. **Mandatory Human Accounting/Tax Sign-Off:**  
   Automated test suites do not constitute legal tax certification.  
   *Rule: Tax rule versions and withholding tax rates must receive written sign-off from designated accounting/tax owner prior to the first live payout.*

---

## 2. 📋 First Transaction Traceability Sheet (Full-Chain Aggregation Model)

| # | Trace Point | Relationship | Description | Verification Method |
|---|---|:---:|---|---|
| **1** | `payment_id(s)` | $1..N$ | Live Omise PromptPay Charge IDs (`chrg_live_...`) | Webhook Payload / DB |
| **2** | `order_id(s)` / `sku(s)` | $1..N$ | Canonical SKUs (`basic`, `pro`, `pro_annual`, `imperial`) | Invoices Table |
| **3** | `buyer_user_id(s)` | $1..N$ | Customer User UUIDs (Zero PII exposed to Partner) | Profiles Table |
| **4** | `attribution_id(s)` | $1..N$ | Winning 1:1 Attribution Links (`partner_referrals`) | Referrals Table |
| **5** | `commission_event_id(s)` | $1..N$ | 7% Ex-VAT Commissions in Holding | Comm Events Table |
| **6** | `holding_ledger_id(s)` | $1..N$ | Immutable Ledger Entries (`commission_holding_in`) | `partner_ledger` |
| **7** | `clearance_ledger_id(s)`| $1..N$ | Matured Clearance Entries (`commission_cleared`) | `partner_ledger` |
| **8** | `available_balance` | $1$ | Sum of Matured Cleared Balance ($\ge$ ฿500.00 THB) | `partner_ledger` |
| **9** | `payout_request_id` | $1$ | Approved Payout Request (`payout_requests`) | Payouts Table |
| **10** | `omise_transfer_id` | $1$ | External Bank Transfer ID (`trsf_live_...`) | Omise API / DB |
| **11** | `settlement_ledger_id`| $1$ | Final Settlement Entry (`payout_settled`) | `partner_ledger` |
| **12** | `wht_certificate_num` | $1$ | 50 ทวิ Certificate (`WHT-YYYY-MM-XXXXXX`) | Statement Service |

---

## 3. 🚨 Incident Response & Fail-Closed Protocol

```
[Discrepancy / Timeout / Unknown Transfer Detected]
                      │
                      ▼
             AUTO FREEZE ACTIVATED
  (payoutOperations.server.ts blocks all transfer dispatches)
                      │
                      ▼
            FINANCE & TECH ALERT SENT
                      │
                      ▼
              MANUAL INVESTIGATION
    (Inspect raw Omise logs & partner_ledger compensating entries)
                      │
                      ▼
           ROOT CAUSE DOCUMENTATION
                      │
                      ▼
        FINANCE-AUTHORIZED UNFREEZE ONLY
```

---

## 4. 🏁 Wave 1 Post-Transaction Review Checklist (13 Quality Gates)

1. [ ] Payment received correctly (PromptPay net fee calculated accurately)
2. [ ] Commission calculated on Ex-VAT base (7% of net base)
3. [ ] Commission entered Holding balance correctly
4. [ ] 14-Day maturity rule respected (no premature clearance)
5. [ ] Available balance credited upon clearance
6. [ ] Payout requested within ฿500 – ฿1,000 wave 1 limit
7. [ ] Dual approval completed (Reviewer + Finance Officer)
8. [ ] Omise transfer dispatched with unique idempotency key
9. [ ] Webhook received and verified with secret key signature
10. [ ] `partner_ledger` stamped `payout_settled` with 0 duplicate entries
11. [ ] Statement generated with UTF-8 BOM CSV and zero buyer PII
12. [ ] 50 ทวิ Certificate stamped with 13-digit Thai Tax ID and approved tax rate
13. [ ] Post-flight deep reconciliation confirms status `GREEN` (Unexplained Discrepancy = ฿0.00)
