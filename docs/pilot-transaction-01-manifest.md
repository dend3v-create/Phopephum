# 🏛️ PHOPEPHUM V3 — PILOT TRANSACTION #1 MANIFEST & PRE-FLIGHT AUDIT SHEET

**Document Version:** `1.1.0-LOCKED`  
**Execution Stage:** `STEP 7.2H.2 (Wave 1 — Transaction #1)`  
**Security & Operational Clearance:** `HUMAN AUTHORIZATION REQUIRED / ZERO AUTO-TRANSFER`

---

## 1. 🎯 Transaction #1 Scope & Boundaries

| Parameter | Operational Limit | Current Manifest Value | Compliance Status |
|---|---|---|:---:|
| **Target Partner** | Exactly 1 Designated Partner | `Partner #1` (Pending Human Designation) | 🔍 Required |
| **Payout Amount Range** | ฿500.00 – ฿1,000.00 THB | ฿500.00 THB (Recommended Baseline) | ✅ Within Bounds |
| **Cumulative Pilot Total** | $\le$ ฿10,000.00 THB | ฿0.00 THB (Prior to Tx #1) | ✅ ฿0 Disbursed |
| **Execution Mode** | Strictly Human-Controlled | Human Finance Officer Manual Execution | ✅ Enforced |
| **Circuit Breaker** | Fail-Closed Active | `OFF` (Normal Operating State) | ✅ Ready |

---

## 2. 📋 Pre-Flight Audit Checklist (All Must Be Verified Before Transfer)

### A. Partner #1 Verification
- [ ] **Partner Designation:** Official internal/designated Partner #1 assigned by human management.
- [ ] **Onboarding State:** Partner entity is in `active` status.
- [ ] **Terms Acceptance:** Partner has accepted the latest terms version (`v2026.1`).
- [ ] **Tax Profile:** Valid 13-digit Thai Tax ID, Legal Name, and Registered Address present.
- [ ] **Payout Destination:** Verified Thai Bank Name, Account Number, and Account Name.
- [ ] **Pilot Whitelist:** Partner ID explicitly enrolled in the server-side Pilot Whitelist.

### B. Financial & Ledger Verification
- [ ] **Reconciliation Status:** Automated Surveillance Run = `GREEN`.
- [ ] **Unexplained Ledger Discrepancy:** Exactly `฿0.00` across all 4 rails.
- [ ] **Available Balance:** Available Balance $\ge$ Requested Payout Amount (฿500.00 THB).
- [ ] **Conflict Check:** No other payout request in `pending_review`, `processing`, or `sent` status for this partner.
- [ ] **Circuit Breaker Status:** Not tripped (`recon_status != 'red'`).

### C. Tax Governance Sign-Off
- [ ] **Tax Policy Status:** Tax Configuration Rate is **subject to formal Accounting/Tax Owner approval** prior to transfer execution.
- [ ] **Accounting Acknowledgment:** Designated tax owner has reviewed and confirmed the applicable deduction rate on Thai service commission.

### D. Human Authorization & Dual Confirmation
- [ ] **First Reviewer:** Partner Operations Officer approval logged.
- [ ] **Second Reviewer:** Finance Director / Officer approval logged.

---

## 3. 🔍 Full-Chain Traceability Matrix (1..N Aggregation Model)

*Principle:* ยอดเงิน Payout Amount ต้องสามารถ Trace ย้อนกลับไปยัง Commission Events ที่ eligible จริงทั้งหมด ($1..N$) โดยไม่จำกัดว่าต้องเกิดจาก SKU ใด หรือจำนวน Transaction เท่าใด

```
[1]  Payment ID(s)          : chrg_live_... [1..N Omise PromptPay Charges]
       │
[2]  Order ID(s) / SKU(s)   : ord_live_... / [basic / pro / pro_annual / imperial]
       │
[3]  Buyer User ID(s)       : usr_... [Stored in Database with Zero PII Leaked]
       │
[4]  Attribution ID(s)      : ref_attr_... [1:1 Winning Attribution Locks]
       │
[5]  Commission Event ID(s) : comm_h_... [7% Ex-VAT Commissions in Holding]
       │
[6]  Holding Ledger ID(s)   : leg_h_... [Immutable Double-Entry Ledger Entries]
       │
[7]  Clearance Ledger ID(s) : leg_clr_... [Matured 14-Day Holding Clearances]
       │
[8]  Available Balance      : Sum of Cleared Balances >= ฿500.00 THB
       │
[9]  Payout Request ID      : pay_req_wave1_001 [Status: PENDING_REVIEW -> APPROVED]
       │
[10] Omise Transfer ID      : trsf_live_... [Dispatched by Human Finance Officer]
       │
[11] Webhook Event ID       : evnt_... [transfer.paid Webhook Verified]
       │
[12] Settlement Ledger ID   : leg_stl_... [Immutable Entry: payout_settled]
       │
[13] WHT Certificate No.    : WHT-2026-09-XXXXXX [50 ทวิ Withholding Tax Document]
```

---

## 4. 🚨 Incident & Stop Conditions

If **ANY** of the following occur during Transaction #1:
- Unexplained ledger discrepancy $> \text{฿}0.00$
- Omise Transfer timeout / network error (เกินเกณฑ์ Payout Reconciliation Escalation SLA ตาม Operational Policy ที่ได้รับอนุมัติ เช่น `PAYOUT-OPS-2026-V1`)
- Webhook signature failure or duplicate event payload
- Any unknown external transfer detected

**Mandatory Protocol:**
1. **STOP PILOT IMMEDIATELY**
2. **ACTIVATE AUTO-FREEZE** (Fail-Closed)
3. **DO NOT edit the ledger manually**
4. **DO NOT perform blind retries**
5. **Report to Finance Team for Manual Log Inspection & Root Cause Analysis**

---

## 5. 🏁 Transaction #1 Success Conditions

Transaction #1 is formally certified as **PASS** only when:
1. ยอดเงินโอนเข้าบัญชี Partner ถูกต้องตาม Net Payout ที่คำนวณจาก Tax Configuration ซึ่งได้รับการอนุมัติอย่างเป็นทางการก่อน Transaction #1
2. External transfer maps 1:1 with approved Payout Request.
3. Webhook settlement recorded without duplicate ledger mutations.
4. Partner Available Balance decrements accurately.
5. All constituent commission events trace back to verified buyer payments.
6. 50 ทวิ certificate generated with valid 13-digit Thai Tax ID and approved tax rate.
7. Post-flight deep reconciliation confirms status `GREEN` (Unexplained Discrepancy = ฿0.00).
8. 100% Immutable Audit Trail persisted.
