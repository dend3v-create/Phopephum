# 🏛️ PHOPEPHUM V3 — POST-LAUNCH MONITORING & OPERATIONAL ALERTING GUIDE

**Status:** 🟢 **OPERATIONAL STANDARD (STEP 6.9)**  
**Target Environment:** Live Supabase Production + Cloudflare Pages SSR  
**Governing Architecture:** `PHOPEPHUM V3 ECONOMIC ARCHITECTURE v2 — FROZEN`

---

## 1. Monitoring Topology & Observability Stack

```
[ External Uptime Monitor / Cloudflare ]
                │  (GET /api/health)
                ▼
      ┌──────────────────┐
      │ Remix Web Worker │
      └─────────┬────────┘
                ├───────────────────────────────┐
                ▼                               ▼
       [ Live Supabase DB ]           [ AI Proxy Worker ]
       - profiles                     - /health
       - payment_transactions
       - sands_ledger
       - partner_ledger
       - financial_job_logs
```

---

## 2. Telemetry & Health Endpoints

### 2.1 Public & Authorized Health Check: `GET /api/health`
- **Purpose**: Uptime checks and latency monitoring.
- **Headers (Optional)**: `Authorization: Bearer <HEALTH_CHECK_SECRET>`
- **Response Format (200 OK)**:
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "architecture": "v2-frozen",
  "timestamp": "2026-09-06T00:00:00.000Z",
  "checks": {
    "supabase": { "ok": true, "latencyMs": 180 },
    "aiWorker": { "ok": true, "latencyMs": 85 }
  },
  "anomalies": {
    "detected": false,
    "count": 0
  }
}
```

### 2.2 Admin Metrics & Observability Aggregator: `GET /api/admin/metrics`
- **Purpose**: Deep telemetry covering transactions, revenue, Sands velocity, and INV-07 reconciliation.
- **Security**: Admin Session Role or Bearer Token.
- **Key Metrics Aggregated**:
  - `totalTransactions` & `successRatePercent` (24h / 7d)
  - `grossSalesThb`, `gatewayFeesThb`, `gatewayFeeVatThb`, `pmarketInvoiceVatThb`, `netReceivedThb`
  - `subscriptionBreakdown` (Distribution across `basic`, `pro`, `pro_annual`, `imperial`)
  - `sandsTurnover` (Total credits, debits, and net delta)
  - `reconciliation.isBalanced` (100% mathematical integrity)

---

## 3. Anomaly Detection & Automatic Classification

| Anomaly Type | Severity | Detection Rule | Immediate Action / SLA |
|---|:---:|---|---|
| `financial_reconciliation_mismatch` | 🔴 **CRITICAL** | Gross $\neq$ Net + Fee + Fee VAT ($> ฿0.05$ variance) | Alert dispatched, investigate gateway settlement |
| `sands_ledger_discrepancy` | 🔴 **CRITICAL** | Cached `time_sands` $\neq$ $\text{SUM}(\text{credits}) - \text{SUM}(\text{debits})$ | Trigger RPC audit, freeze manual credit |
| `stalled_pending_payment` | 🟡 **WARNING** | Pending charge age $> 15$ min (900 seconds) | Auto-mark as expired, verify webhook queue |
| `payout_settlement_failed` | 🔴 **CRITICAL** | Partner payout batch transfer failed | Check bank destination and Omise transfer balance |
| `webhook_replay_anomaly` | 🟡 **WARNING** | High frequency duplicate webhook payload | Ensure idempotency key locks match |
| `security_cross_tenant_attempt` | 🔴 **CRITICAL** | Unauthenticated mutation attempts on private tables | Log IP/Origin, verify RLS policy |

---

## 4. Alert Dispatching & Anti-Spam Cooldown

All alerts are dispatched via [`apps/web/app/services/alert.server.ts`](file:///e:/00.1_DenD3v_AI/69_phopephum-v2/apps/web/app/services/alert.server.ts):
1. **LINE Messaging API Push**: Formatted Flex Message with direct `/admin` action button.
2. **KV Cache Cooldown**:
   - `critical`: 60-second cooldown per alert type.
   - `warning`: 300-second (5 min) cooldown.
   - `info`: 600-second (10 min) cooldown.
3. **Audit Log Persistence**: Automatically logged to `financial_job_logs` with sanitized metadata (Zero secret leakage).

---

## 5. Escalation & Response Playbook

1. **When a 🔴 CRITICAL Alert Fires**:
   - Check LINE Alert details for correlation ID and User ID.
   - Open `/api/admin/metrics` to inspect active anomaly counts and reconciliation balance.
   - Refer to [`docs/production-recovery-runbook.md`](file:///e:/00.1_DenD3v_AI/69_phopephum-v2/docs/production-recovery-runbook.md) for step-by-step resolution SOPs.
2. **When a 🟡 WARNING Alert Fires**:
   - Monitor trend over 15 minutes. If self-healing succeeds (e.g. pending QR expires normally), no action needed.
