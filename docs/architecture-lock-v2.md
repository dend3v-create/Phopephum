# 🏛️ PHOPEPHUM V3 ECONOMIC ARCHITECTURE v2 — FROZEN

**Status:** 🔒 **FROZEN & LOCKED (Production Baseline)**  
**Effective Date:** 2026-09-06  
**Governing Principle:** Any future modifications to pricing, SKUs, quota limits, Sands ledger, or financial invariants require a formal **Change Review & Architecture Decision Record (ADR)**. Direct modifications during feature development are strictly prohibited.

---

## 1. Canonical Product SKU Registry

| SKU | Type | Price (THB) | Billing Interval | Entitlement Tier | Description |
|---|---|---|---|---|---|
| `free` | Base | ฿0 | Lifetime | `free` | 0 People / 0 AI Reports |
| `basic` | Subscription | ฿89 | Monthly | `basic` | 3 People / 1 AI Report |
| `pro` | Subscription | ฿289 | Monthly | `pro` | 20 People / 15 AI Reports |
| `pro_annual` | Subscription | ฿2,790 | Yearly (~20% Save) | `pro` | 20 People / 15 AI Reports |
| `imperial` | Lifetime | ฿789 | One-time / Lifetime | `imperial` | Unlimited (∞) People & AI Reports |
| `sands_50` | Refill Pack | ฿59 | One-time | N/A (+50 Sands) | Micro-economy Refill |
| `sands_150` | Refill Pack | ฿149 | One-time | N/A (+150 Sands) | Popular Refill |
| `sands_500` | Refill Pack | ฿399 | One-time | N/A (+500 Sands) | Bulk Refill (Save ~32%) |

### Legacy Aliases (Strictly Normalized via `normalizeSku()`)
- `premium` → `basic`
- `master` → `imperial`
- `master_monthly` → `imperial`
- `master_lifetime` → `imperial`
- `lifetime` → `imperial`
- `pro_monthly` → `pro`
- `premium_monthly` → `basic`

*Note: Legacy aliases must NEVER be stored as distinct products or SKU records.*

---

## 2. Quota & Entitlement Matrix (Single Source of Truth)

| Tier | Person Profiles Quota | AI Reports Quota | Consultation Discount | Time Sands Refill Capability |
|---|:---:|:---:|:---:|:---:|
| **Free Explorer** | 0 | 0 | 0% | ✅ Yes (Daily Ritual / Purchase) |
| **Basic Sage** | 3 | 1 | 0% | ✅ Yes |
| **Pro Master** | 20 | 15 | 10% | ✅ Yes |
| **Imperial Emperor** | `null` (∞ Unlimited) | `null` (∞ Unlimited) | 20% | ✅ Yes |

*Rule: Unlimited semantics are represented by `null` in the engine and database, NEVER magic numbers like 999 or -1.*

---

## 3. Financial Invariants (INV-01 → INV-07)

- **INV-01 (Gross Settlement Integrity)**: `Gross Sales = Net Sales + Gateway Fees + VAT on Fees`.
- **INV-02 (Atomic Transaction Locking)**: All payment recording, entitlement activation, and Sands crediting must execute within a single PostgreSQL transaction or atomic RPC.
- **INV-03 (Idempotent Webhook Processing)**: Payment status updates must verify existing transaction terminal states (`successful`, `failed`, `expired`) before mutating database records. Replays return `duplicate: true` with zero balance or subscription changes.
- **INV-04 (Zero Trust Server Pricing)**: All amounts and packaging parameters are resolved exclusively from the server registry. Client price tampering is rejected with HTTP 400.
- **INV-05 (Deterministic QR Expiry)**: PromptPay QR codes enforce an exact 15-minute (900 seconds) server-side expiration window.
- **INV-06 (Clawback & Refund Isolation)**: Refund events downgrade entitlements and log debt tracking without corrupting historical ledger rows.
- **INV-07 (Gateway Fee & Invoice VAT Segregation)**:
  $$\text{Omise Fee} = \text{Gross} \times 0.0165$$
  $$\text{VAT on Omise Fee} = \text{Omise Fee} \times 0.07$$
  $$\text{Net Received} = \text{Gross} - \text{Omise Fee} - \text{VAT on Fee}$$
  $$\text{PhopePhum Invoice VAT (7\% Included)} = \text{Gross} \times \frac{7}{107}$$

---

## 4. Economic Invariants (ECON-01 → ECON-08)

- **ECON-01 (Append-Only Ledger)**: All balance mutations on `sands_ledger` and `partner_ledger` are strictly append-only.
- **ECON-02 (Atomic Balance Mutation)**: Direct updates to `profiles.time_sands` or partner balances are prohibited. Mutations must occur via `credit_sands`, `debit_sands`, or ledger settlement RPCs.
- **ECON-03 (Mathematical Sum Consistency)**:
  $$\text{SUM}(\text{credits}) - \text{SUM}(\text{debits}) = \text{Current Balance}$$
- **ECON-04 (Ledger Rail Segregation)**: Sands micro-economy tokens (reward class `adjustment`, `daily_ritual`, `spend`) are strictly separated from Partner Cash Commission balances (`partner_ledger`). Sands cannot be converted to cash.
- **ECON-05 (Non-Negative Balance Protection)**: Any attempt to debit Sands resulting in a balance $< 0$ must be rejected atomically.
- **ECON-06 (Daily Ritual Cap)**: Daily ritual earnings are capped at 15 Sands per UTC day. Purchased Sands are exempt from the cap.
- **ECON-07 (Partner 14-Day Holding Window)**: Partner commissions remain locked in `holding_balance` for 14 days before automated clearance to `available_balance`.
- **ECON-08 (Self-Referral Prevention)**: Partners are strictly prohibited from earning affiliate commissions on their own user accounts.

---

## 5. Change Management Governance

1. **No Direct Edits**: No feature branch or engineer may alter `plans.ts`, `permissions.server.ts`, or database RPCs relating to economic rules without an approved Architecture Decision Record (ADR).
2. **Regression Gate**: Any proposed change must pass the 96-test automated regression suite before merge.
3. **Audit Trail Requirement**: All financial events must emit sanitized audit telemetry without secret leakage.
