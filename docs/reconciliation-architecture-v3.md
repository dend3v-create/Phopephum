# 🏛️ PHOPEPHUM V3 — FINANCIAL RECONCILIATION ARCHITECTURE (v3.0.0-LOCKED)
## Comprehensive Dual-Direction Reconciliation, 4-Rail Audit & Anomaly Detection Framework

**Architecture Baseline:** `PHOPEPHUM V3 ECONOMIC ARCHITECTURE v2 — FROZEN`  
**Partner Architecture Baseline:** `PARTNER ECONOMIC ARCHITECTURE v3.0.0-LOCKED`  
**Compliance Standard:** Double-Entry Ledger Conservation, Zero Client Authority, Full Auditability  

---

## 1. Executive Summary & Design Philosophy

ระบบการเงินของ PhopePhum V3 ทำงานอยู่บนหลักการ **"Continuous Automated Financial Surveillance"** (การตรวจสอบและกระทบยอดทางการเงินอย่างต่อเนื่องโดยอัตโนมัติ) เพื่อให้มั่นใจว่า:

1. **Zero Financial Leakage:** ทุกบาทที่เคลื่อนไหวระหว่าง ลูกค้า $\leftrightarrow$ แพลตฟอร์ม $\leftrightarrow$ พันธมิตร $\leftrightarrow$ ธนาคาร ต้องสามารถสืบสาวและพิสูจน์ความสอดคล้องทางคณิตศาสตร์ได้ 100%
2. **Dual-Direction Bidirectional Guarantee:** ไม่ตรวจสอบแค่ขาไป (Payment $\to$ Commission) แต่ต้องตรวจขากลับ (Commission $\to$ Payment) เพื่อป้องกันทั้ง **Orphaned Commission** และ **Unattributed Revenue**
3. **Segregation of 4 Economic Rails:** ป้องกันการปะปนระหว่าง 4 ระบบเศรษฐกิจ (Customer Payment $\ne$ Partner Commission $\ne$ Sands Ledger $\ne$ Partner Cash/Payout)
4. **Configurable Business SLA (No Hardcoding):** ระยะเวลา Thresholds และ SLA (เช่น ระยะเวลา Reconciling Timeout, Maturation Grace Period) ต้องถูกกำหนดเป็นพารามิเตอร์ที่ปรับแต่งได้ผ่านระบบ Single Source of Truth ห้าม Hard-code ใน Business Logic

---

## 2. The 4 Segregated Economic Rails & Conservation Laws

```
                      ┌────────────────────────────────────────┐
                      │    CUSTOMER PAYMENT RAIL (Omise/PP)    │
                      │  Gross THB, Card/PromptPay, Fee, VAT   │
                      └───────────────────┬────────────────────┘
                                          │ (Winning Attribution)
                                          ▼
                      ┌────────────────────────────────────────┐
                      │      PARTNER COMMISSION RAIL (THB)     │
                      │   14-Day Holding -> Available Balance  │
                      └───────────────────┬────────────────────┘
                                          │ (Payout Request ≥ ฿500)
                                          ▼
                      ┌────────────────────────────────────────┐
                      │     PARTNER PAYOUT RAIL (Bank/Omise)   │
                      │ WHT 3% (50 ทวิ) -> Net Transfer -> Paid │
                      └────────────────────────────────────────┘

                      ┌────────────────────────────────────────┐
                      │    SANDS OF TIME NON-MONETARY RAIL     │
                      │ (Closed-Loop Credits - ZERO FIAT LINK) │
                      └────────────────────────────────────────┘
```

### Mathematical Conservation Equations:

$$\text{Equation 1 (Ledger Invariant): } \sum \text{Holding} + \sum \text{Available} + \sum \text{PayoutPending} + \sum \text{Withdrawn} + \sum \text{ClawbackReversed} \equiv \sum \text{GrossCommissionInflow}$$

$$\text{Equation 2 (Dual Inbound Invariant): } \text{Total Verified Commissionable Sales} \equiv \sum \text{Commission Events}$$

$$\text{Equation 3 (Dual Outbound Invariant): } \text{Total Settled Payouts} \equiv \sum \text{Paid Omise Transfers} \equiv \sum \text{Ledger Payout Debits}$$

---

## 3. Reconciliation System Topology (4-Layer Engine)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: ADMIN SURVEILLANCE & FINANCE OPERATIONS DASHBOARD                     │
│ - Real-time Invariant Health Gauge (🟢 GREEN / 🟡 YELLOW / 🔴 RED)             │
│ - Discrepancy Review Queue & Manual Resolution Workflow                        │
│ - Monthly Partner Statement Generation & 50 ทวิ Export                          │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼────────────────────────────────────────┐
│ LAYER 3: SCHEDULED BACKGROUND RUNNER (Cron / Cloudflare Worker / Node Job)     │
│ - Hourly Continuous Surveillance Cron (every hour at :00)                      │
│ - Daily Deep Reconciliation Sweep (midnight 00:00 UTC)                         │
│ - Automated Threshold Escalation & Alert Dispatch                              │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼────────────────────────────────────────┐
│ LAYER 2: RECONCILIATION APPLICATION SERVICES (`reconciliation.server.ts`)      │
│ - Engine 1: Payment ↔ Commission Dual Auditor                                  │
│ - Engine 2: Holding Maturation & Debt Offset Auditor                           │
│ - Engine 3: Payout ↔ Transfer ↔ Settlement Auditor                             │
│ - Engine 4: 3-Balance & Double-Entry Ledger Auditor                            │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼────────────────────────────────────────┐
│ LAYER 1: DATABASE ATOMIC RECONCILIATION RPCS (PostgreSQL / Supabase)           │
│ - `get_partner_reconciliation_audit(partner_id)`                               │
│ - `run_financial_reconciliation_atomic(config_params)`                         │
│ - `resolve_stale_reconciling_payouts_atomic(sla_hours)`                        │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. The 4 Dual-Direction Reconciliation Subsystems

### Subsystem 1: Payment $\leftrightarrow$ Commission Dual Reconciliation (Rail 1)
- **Forward Audit:** ทุก Payment ที่สำเร็จ (`status = 'successful'`) ของ User ที่มี Converted Attribution และเป็นสินค้าที่ Commissionable (ยกเว้น Sands 0%) ต้องมี `commission_events` ตรงกัน 1:1
- **Reverse Audit:** ทุก `commission_events` ต้องมี `payment_transactions` รองรับ และยอด Gross / Commissionable Base ต้องคำนวณถูกต้องตาม Dynamic VAT Rule (ห้าม Orphaned Commissions)

### Subsystem 2: Holding Maturation & Debt Offset Reconciliation (Rail 2)
- **Holding Audit:** รายการ Commission ในสถานะ `holding` ที่พ้นกำหนด 14 วัน (`holding_until <= now()`) ต้องถูกเคลียร์เข้า `available_balance`
- **Debt Offset Audit:** หาก Partner มีหนี้ Clawback (`clawback_pending_balance > 0`) ยอดที่ครบกำหนดต้องถูกนำไปตัดหนี้ก่อนเข้า Available Balance ตามลำดับ

### Subsystem 3: Payout Request $\leftrightarrow$ Omise Transfer $\leftrightarrow$ Settlement (Rail 3)
- **Transfer Linkage Audit:** ทุก `payout_requests` ในสถานะ `processing`, `completed` ต้องมี `omise_transfers` ตรงกัน 1:1
- **Settlement Audit:** ทุก Omise Transfer ที่ `status = 'paid'` ต้องมี `payout_transactions` และ `partner_ledger` (entry_type = `'payout_paid'`) บันทึกแล้ว 1:1
- **Reconciling / Timeout Audit:** ทุก Transfer ที่ติดสถานะ `reconciling` หรือ `processing` เกินกำหนด SLA ต้องถูกตรวจจับและส่งต่อเข้า Manual Review

### Subsystem 4: 3-Balance & Double-Entry Ledger Conservation (Rail 4)
- **Mathematical Sum Consistency:** คำนวณยอดเงินสะสมใน `partner_ledger` เปรียบเทียบกับ Materialized Cache ใน `partner_entities`
- **Zero Drift Rule:** หากพบผลต่าง $(\Delta \ne 0.00)$ แม้แต่ 1 สตางค์ ระบบจะแจ้งเตือนระดับ 🔴 RED ทันที

---

## 5. Discrepancy Classification & Taxonomy (Discrepancy Codes)

| Discrepancy Code | Name | Severity | Description | Automated Resolution / Escalation |
|---|---|:---:|---|---|
| `DISC-01` | `ORPHANED_COMMISSION` | 🔴 RED | มี Commission Event แต่ไม่พบ Payment Transaction ที่จ่ายเงินจริง | Freeze Commission, Alert Lead Architect |
| `DISC-02` | `MISSING_COMMISSION` | 🟡 YELLOW | มี Payment สำเร็จจากผู้ถูกแนะนำ แต่ยังไม่ถูกสร้าง Commission Event | Trigger Replay Worker / Inspect Webhook Log |
| `DISC-03` | `COMMISSION_AMOUNT_MISMATCH` | 🔴 RED | ยอด Commission ไม่ตรงกับ Dynamic VAT Base $\times$ Commission Rate | Lock Event, Log Discrepancy Audit |
| `DISC-04` | `HOLDING_OVERDUE_CLEARANCE` | 🟡 YELLOW | Commission Holding พ้น 14 วัน + Grace Period แต่ยังไม่ถูกเคลียร์ | Trigger `clear_holding_commissions_atomic` |
| `DISC-05` | `ORPHANED_OMISE_TRANSFER` | 🔴 RED | มี Omise Transfer โดยไม่มี Payout Request อนุมัติรองรับ | Freeze Gateway, Immediate Security Alert |
| `DISC-06` | `TRANSFER_SETTLEMENT_MISSING` | 🔴 RED | Omise Transfer สถานะ `paid` แต่ไม่มี Ledger Settlement | Trigger Emergency Idempotent Settlement |
| `DISC-07` | `LEDGER_DRIFT_DETECTED` | 🔴 RED | ผลรวมใน `partner_ledger` ไม่ตรงกับ `partner_entities` | Suspend Outbound Payouts for Partner |
| `DISC-08` | `RECONCILING_SLA_EXCEEDED` | 🟡 YELLOW | Transfer อยู่ในสถานะ `reconciling` นานเกิน Configured SLA | Transition to `manual_review` + Escalate |

---

## 6. Configurable SLA Architecture (Zero Hardcoding Rule)

สถาปัตยกรรมกำหนดให้ SLA และ Thresholds ทั้งหมดถูกจัดเก็บในโครงสร้าง Configuration ที่สามารถปรับเปลี่ยนได้โดยไม่ต้องแก้ Code:

```typescript
export interface FinancialReconciliationConfig {
  // Payout & Gateway SLA
  reconcilingSlaHours: number;         // e.g. Configured by Business Policy (Default: 48, Configurable)
  transferPollingIntervalMinutes: number; // e.g. 15 minutes
  maxActiveTransfersPerPartner: number; // Strictly 1 (INV-PARTNER-26)

  // Commission & Holding SLA
  holdingMaturityPeriodDays: number;   // Strictly 14 days
  holdingClearanceGraceHours: number;  // e.g. 2 hours before flagging DISC-04

  // Thresholds & Batches
  minimumPayoutThresholdThb: number;   // Strictly ฿500.00 (INV-PARTNER-15)
  batchClearanceLimit: number;         // e.g. 100 items per batch
  maxAllowedDiscrepancyDeltaThb: number; // Strictly 0.00 THB (Zero Drift)
}
```

---

## 7. Telemetry & Data Model for Reconciliation

### 7.1 Table: `financial_reconciliation_runs`
บันทึกประวัติการรันการกระทบยอดทุกรอบ (Hourly Cron / On-demand):
- `id` UUID PRIMARY KEY
- `run_type` TEXT ('hourly_surveillance', 'daily_deep_reconciliation', 'manual_audit')
- `status` TEXT ('green', 'yellow', 'red')
- `total_payments_checked` INT
- `total_commissions_checked` INT
- `total_transfers_checked` INT
- `total_partners_checked` INT
- `discrepancy_count` INT
- `summary_metadata` JSONB
- `started_at` TIMESTAMPTZ
- `completed_at` TIMESTAMPTZ

### 7.2 Table: `financial_reconciliation_discrepancies`
บันทึกความคลาดเคลื่อนที่ตรวจพบรายรายการ:
- `id` UUID PRIMARY KEY
- `run_id` UUID REFERENCES financial_reconciliation_runs(id)
- `discrepancy_code` TEXT ('DISC-01' ถึง 'DISC-08')
- `severity` TEXT ('yellow', 'red')
- `partner_id` UUID REFERENCES partner_entities(id)
- `reference_table` TEXT
- `reference_id` TEXT
- `expected_value` NUMERIC(12, 2)
- `actual_value` NUMERIC(12, 2)
- `delta_thb` NUMERIC(12, 2)
- `status` TEXT ('open', 'investigating', 'resolved', 'dismissed')
- `resolution_notes` TEXT
- `resolved_by` UUID REFERENCES profiles(id)
- `created_at` TIMESTAMPTZ
- `resolved_at` TIMESTAMPTZ

---

## 8. Implementation Stages Roadmap

```
STEP 7.2E.1: Reconciliation Architecture Specification  (✅ COMPLETED)
                     ↓
STEP 7.2E.2: Business SLA & Threshold Configuration Lock (Next)
                     ↓
STEP 7.2E.3: Hourly Reconciliation Engine Implementation & Automation
                     ↓
STEP 7.2F:   Partner Statement & Finance Operations
                     ↓
STEP 7.2G:   Controlled Real-Money Pilot Launch
```
