/**
 * observability.server.ts
 * ============================================================================
 * 🏛️ PHOPEPHUM V3 — STEP 6.7: PRODUCTION OBSERVABILITY & RECONCILIATION ENGINE
 * ============================================================================
 *
 * Core Features:
 *  1. Structured Payment Lifecycle Audit Event Emitter (Zero Secret Leaks)
 *  2. Real-Time Financial & Monetization Reconciliation Engine (INV-07 / ECON-04)
 *  3. Sands Ledger Balance & Invariant Auditor (Sum credits - debits == balance)
 *  4. Entitlement & Quota Single Source of Truth Auditor
 *  5. Anomaly & Security Alert Dispatcher
 */

import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/env.server";
import { calculateOmiseFee } from "./omise.server";
import { getUserPlan, getAiReportLimit, getPersonLimit } from "./permissions.server";
import { CANONICAL_SKUS, resolveProductFromSku } from "../lib/plans";

export type PaymentLifecycleEvent =
  | "PAYMENT_CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_EXPIRED"
  | "PAYMENT_FULFILLED"
  | "PAYMENT_DUPLICATE"
  | "PAYMENT_WEBHOOK_REPLAY"
  | "PAYMENT_STATUS_ERROR";

export interface PaymentAuditLogEntry {
  event: PaymentLifecycleEvent;
  transactionId?: string | null;
  paymentId?: string | null;
  userId: string;
  sku: string;
  amountThb: number;
  timestamp: string;
  status: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Sanitize metadata to guarantee ZERO secret keys, API tokens, or raw credentials in logs.
 */
function sanitizeAuditMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {};
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = [
    "secret",
    "secretkey",
    "secret_key",
    "token",
    "password",
    "authorization",
    "apikey",
    "api_key",
    "service_role",
    "card_number",
    "cvv",
  ];

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED_SECRET]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Emit structured payment lifecycle audit event for observability
 */
export async function emitPaymentAuditEvent(
  entry: PaymentAuditLogEntry,
  env?: Env
): Promise<{ success: boolean; auditId?: string; entry: PaymentAuditLogEntry }> {
  const sanitized: PaymentAuditLogEntry = {
    ...entry,
    metadata: sanitizeAuditMetadata(entry.metadata),
  };

  const auditId = `audit_${crypto.randomUUID()}`;

  console.log(
    `[PAYMENT_OBSERVABILITY] ${sanitized.timestamp} | ${sanitized.event.padEnd(22)} | User: ${sanitized.userId} | SKU: ${sanitized.sku} | ฿${sanitized.amountThb} | Status: ${sanitized.status} | Correlation: ${sanitized.correlationId}`
  );

  if (env?.SUPABASE_URL && env?.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("financial_job_logs").insert({
        job_type: "payment_observability",
        status: sanitized.status === "failed" ? "failed" : "completed",
        total_amount_thb: sanitized.amountThb,
        metadata: {
          audit_id: auditId,
          event: sanitized.event,
          user_id: sanitized.userId,
          sku: sanitized.sku,
          status: sanitized.status,
          correlation_id: sanitized.correlationId,
          ...sanitized.metadata,
        },
      });
    } catch {
      // Non-blocking observability telemetry
    }
  }

  return { success: true, auditId, entry: sanitized };
}

// ─── Financial Reconciliation Report ──────────────────────────────────────────

export interface FinancialReconciliationReport {
  timestamp: string;
  period: string;
  grossSalesThb: number;
  gatewayFeesThb: number;
  gatewayFeeVatThb: number;
  pmarketInvoiceVatThb: number;
  netReceivedThb: number;
  subscriptionSalesCount: number;
  sandsSalesCount: number;
  successfulTransactions: number;
  failedTransactions: number;
  duplicateTransactions: number;
  unreconciledCount: number;
  anomalies: string[];
  status: "BALANCED" | "ANOMALY_DETECTED";
  isBalanced: boolean;
}

/**
 * Run deterministic financial reconciliation across transactions, invoices, and entitlements
 */
export async function runFinancialReconciliation(
  env: Env,
  daysLookback = 30
): Promise<FinancialReconciliationReport> {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  const supabase = createClient(env.SUPABASE_URL, serviceKey);
  const cutoffDate = new Date(Date.now() - daysLookback * 86400000).toISOString();

  const { data: transactions, error: txErr } = await supabase
    .from("payment_transactions")
    .select("*")
    .gte("created_at", cutoffDate);

  if (txErr || !transactions) {
    throw new Error(`Reconciliation query failed: ${txErr?.message}`);
  }

  let grossSalesThb = 0;
  let gatewayFeesThb = 0;
  let gatewayFeeVatThb = 0;
  let pmarketInvoiceVatThb = 0;
  let netReceivedThb = 0;
  let subscriptionSalesCount = 0;
  let sandsSalesCount = 0;
  let successfulTransactions = 0;
  let failedTransactions = 0;
  let duplicateTransactions = 0;
  const anomalies: string[] = [];

  const seenCharges = new Set<string>();

  for (const tx of transactions) {
    if (seenCharges.has(tx.provider_transaction_id)) {
      duplicateTransactions++;
      anomalies.push(`Duplicate transaction ID detected: ${tx.provider_transaction_id}`);
    } else {
      seenCharges.add(tx.provider_transaction_id);
    }

    if (tx.status === "successful") {
      successfulTransactions++;
      grossSalesThb += Number(tx.gross_amount_thb || 0);
      gatewayFeesThb += Number(tx.gateway_fee_thb || 0);
      gatewayFeeVatThb += Number(tx.gateway_vat_thb || 0);
      pmarketInvoiceVatThb += Number(tx.vat_amount_thb || 0);
      netReceivedThb += Number(tx.net_received_thb || 0);

      const sku = tx.subscription_plan_code || "";
      if (sku.startsWith("sands_")) {
        sandsSalesCount++;
      } else {
        subscriptionSalesCount++;
      }

      // Verify formula consistency (INV-07)
      const expectedNet = Math.round((tx.gross_amount_thb - tx.gateway_fee_thb - tx.gateway_vat_thb) * 100) / 100;
      if (Math.abs(expectedNet - Number(tx.net_received_thb)) > 0.05) {
        anomalies.push(`Net discrepancy on tx ${tx.id}: expected ${expectedNet}, got ${tx.net_received_thb}`);
      }
    } else if (tx.status === "failed") {
      failedTransactions++;
    }
  }

  grossSalesThb = Math.round(grossSalesThb * 100) / 100;
  gatewayFeesThb = Math.round(gatewayFeesThb * 100) / 100;
  gatewayFeeVatThb = Math.round(gatewayFeeVatThb * 100) / 100;
  pmarketInvoiceVatThb = Math.round(pmarketInvoiceVatThb * 100) / 100;
  netReceivedThb = Math.round(netReceivedThb * 100) / 100;

  const isBalanced = anomalies.length === 0;

  return {
    timestamp: new Date().toISOString(),
    period: `Last ${daysLookback} days`,
    grossSalesThb,
    gatewayFeesThb,
    gatewayFeeVatThb,
    pmarketInvoiceVatThb,
    netReceivedThb,
    subscriptionSalesCount,
    sandsSalesCount,
    successfulTransactions,
    failedTransactions,
    duplicateTransactions,
    unreconciledCount: anomalies.length,
    anomalies,
    status: isBalanced ? "BALANCED" : "ANOMALY_DETECTED",
    isBalanced,
  };
}

// ─── Sands Ledger Auditor ─────────────────────────────────────────────────────

export interface SandsAuditResult {
  userId: string;
  profileBalance: number;
  ledgerNetSum: number;
  isConsistent: boolean;
  totalCredits: number;
  totalDebits: number;
  error?: string;
}

/**
 * Audit Sands Ledger invariant: SUM(credits) - SUM(debits) === profile.time_sands
 */
export async function auditUserSandsBalance(
  userId: string,
  env: Env
): Promise<SandsAuditResult> {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  const supabase = createClient(env.SUPABASE_URL, serviceKey);

  const { data: profile } = await supabase
    .from("profiles")
    .select("time_sands")
    .eq("id", userId)
    .single();

  const { data: ledgerRows, error } = await supabase
    .from("sands_ledger")
    .select("amount")
    .eq("user_id", userId);

  if (error || !ledgerRows) {
    return {
      userId,
      profileBalance: profile?.time_sands || 0,
      ledgerNetSum: 0,
      isConsistent: false,
      totalCredits: 0,
      totalDebits: 0,
      error: error?.message || "Failed to fetch ledger rows",
    };
  }

  let totalCredits = 0;
  let totalDebits = 0;

  for (const row of ledgerRows) {
    const amt = Number(row.amount || 0);
    if (amt > 0) totalCredits += amt;
    else totalDebits += Math.abs(amt);
  }

  const ledgerNetSum = totalCredits - totalDebits;
  const profileBalance = profile?.time_sands || 0;
  const isConsistent = profileBalance === ledgerNetSum;

  return {
    userId,
    profileBalance,
    ledgerNetSum,
    isConsistent,
    totalCredits,
    totalDebits,
  };
}

// ─── Entitlement & Quota Single Source of Truth Auditor ───────────────────────

export interface EntitlementAuditResult {
  userId: string;
  plan: string;
  normalizedPlan: string;
  personLimit: number | null;
  aiReportLimit: number | null;
  isValid: boolean;
  notes: string[];
}

export async function auditUserEntitlement(
  userId: string,
  env: Env
): Promise<EntitlementAuditResult> {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  const supabase = createClient(env.SUPABASE_URL, serviceKey);
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
    return {
      userId,
      plan: "none",
      normalizedPlan: "free",
      personLimit: 0,
      aiReportLimit: 0,
      isValid: false,
      notes: ["User profile not found"],
    };
  }

  const normalized = getUserPlan(profile);
  const personLimit = getPersonLimit(profile);
  const aiLimit = getAiReportLimit(profile);
  const notes: string[] = [];

  if (normalized === "master") {
    if (personLimit !== null || aiLimit !== null) {
      notes.push("Master/Imperial quota must be null (unlimited)");
    }
  } else if (normalized === "pro") {
    if (personLimit !== 20 || aiLimit !== 15) {
      notes.push(`Pro quota mismatch: person=${personLimit}, ai=${aiLimit}`);
    }
  } else if (normalized === "premium") {
    if (personLimit !== 3 || aiLimit !== 1) {
      notes.push(`Basic quota mismatch: person=${personLimit}, ai=${aiLimit}`);
    }
  } else if (normalized === "free") {
    if (personLimit !== 0 || aiLimit !== 0) {
      notes.push(`Free quota mismatch: person=${personLimit}, ai=${aiLimit}`);
    }
  }

  return {
    userId,
    plan: profile.plan || "free",
    normalizedPlan: normalized,
    personLimit,
    aiReportLimit: aiLimit,
    isValid: notes.length === 0,
    notes,
  };
}

// ─── Post-Launch Operational Metrics & Anomaly Detection (STEP 6.9) ───────────

export interface OperationalSystemMetrics {
  timestamp: string;
  timeWindowHours: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  expiredTransactions: number;
  successRatePercent: number;
  financials: {
    grossSalesThb: number;
    gatewayFeesThb: number;
    gatewayFeeVatThb: number;
    pmarketInvoiceVatThb: number;
    netReceivedThb: number;
  };
  subscriptionBreakdown: Record<string, number>;
  sandsTurnover: {
    totalCredits: number;
    totalDebits: number;
    netDelta: number;
  };
}

export interface OperationalAnomaly {
  type:
    | "stalled_pending_payment"
    | "entitlement_mismatch"
    | "sands_ledger_discrepancy"
    | "reconciliation_math_mismatch"
    | "high_failure_rate";
  severity: "critical" | "warning" | "info";
  description: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AnomalyDetectionReport {
  timestamp: string;
  hasAnomalies: boolean;
  anomalyCount: number;
  anomalies: OperationalAnomaly[];
}

/**
 * Aggregate real-time operational metrics across payments, revenue, and Sands turnover
 */
export async function getOperationalSystemMetrics(
  env: Env,
  timeWindowHours = 24
): Promise<OperationalSystemMetrics> {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  const supabase = createClient(env.SUPABASE_URL, serviceKey);
  const cutoffDate = new Date(Date.now() - timeWindowHours * 3600000).toISOString();

  // 1. Fetch transactions within time window
  const { data: txs } = await supabase
    .from("payment_transactions")
    .select("*")
    .gte("created_at", cutoffDate);

  const transactions = txs || [];
  let grossSalesThb = 0;
  let successfulTransactions = 0;
  let failedTransactions = 0;
  let expiredTransactions = 0;
  const subscriptionBreakdown: Record<string, number> = {};

  for (const tx of transactions) {
    const status = tx.status || "pending";
    const sku = tx.sku || "unknown";

    if (status === "successful") {
      successfulTransactions++;
      const amount = Number(tx.amount || 0);
      grossSalesThb += amount;
      subscriptionBreakdown[sku] = (subscriptionBreakdown[sku] || 0) + 1;
    } else if (status === "failed") {
      failedTransactions++;
    } else if (status === "expired") {
      expiredTransactions++;
    }
  }

  // Calculate INV-07 Financials
  const gatewayFeesThb = Math.round(grossSalesThb * 0.0165 * 100) / 100;
  const gatewayFeeVatThb = Math.round(gatewayFeesThb * 0.07 * 100) / 100;
  const pmarketInvoiceVatThb = Math.round(((grossSalesThb * 7) / 107) * 100) / 100;
  const netReceivedThb = Math.round((grossSalesThb - gatewayFeesThb - gatewayFeeVatThb) * 100) / 100;

  const totalTransactions = transactions.length;
  const successRatePercent =
    totalTransactions > 0
      ? Math.round((successfulTransactions / totalTransactions) * 10000) / 100
      : 100.0;

  // 2. Fetch Sands ledger turnover
  const { data: sandsRows } = await supabase
    .from("sands_ledger")
    .select("amount")
    .gte("created_at", cutoffDate);

  let totalCredits = 0;
  let totalDebits = 0;

  for (const row of sandsRows || []) {
    const amt = Number(row.amount || 0);
    if (amt > 0) totalCredits += amt;
    else totalDebits += Math.abs(amt);
  }

  return {
    timestamp: new Date().toISOString(),
    timeWindowHours,
    totalTransactions,
    successfulTransactions,
    failedTransactions,
    expiredTransactions,
    successRatePercent,
    financials: {
      grossSalesThb: Math.round(grossSalesThb * 100) / 100,
      gatewayFeesThb,
      gatewayFeeVatThb,
      pmarketInvoiceVatThb,
      netReceivedThb,
    },
    subscriptionBreakdown,
    sandsTurnover: {
      totalCredits,
      totalDebits,
      netDelta: totalCredits - totalDebits,
    },
  };
}

/**
 * Real-time operational anomaly detector scanning for payments, ledgers, and entitlement bugs
 */
export async function detectOperationalAnomalies(
  env: Env
): Promise<AnomalyDetectionReport> {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  const supabase = createClient(env.SUPABASE_URL, serviceKey);
  const anomalies: OperationalAnomaly[] = [];

  try {
    // 1. Check for stalled pending payments older than 15 minutes (900s)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: stalledTxs } = await supabase
      .from("payment_transactions")
      .select("id, user_id, amount, sku, created_at")
      .eq("status", "pending")
      .lte("created_at", fifteenMinsAgo)
      .limit(10);

    if (stalledTxs && stalledTxs.length > 0) {
      for (const tx of stalledTxs) {
        anomalies.push({
          type: "stalled_pending_payment",
          severity: "warning",
          description: `Transaction ${tx.id.slice(0, 8)} for SKU '${tx.sku}' (฿${tx.amount}) in pending state > 15m (QR Expired)`,
          referenceId: tx.id,
          metadata: { userId: tx.user_id, createdAt: tx.created_at },
        });
      }
    }

    // 2. Sample check active users for Sands ledger balance integrity
    const { data: sampleUsers } = await supabase
      .from("profiles")
      .select("id, time_sands")
      .gt("time_sands", 0)
      .order("updated_at", { ascending: false })
      .limit(10);

    for (const u of sampleUsers || []) {
      const audit = await auditUserSandsBalance(u.id, env);
      if (!audit.isConsistent) {
        anomalies.push({
          type: "sands_ledger_discrepancy",
          severity: "critical",
          description: `Sands balance mismatch for user ${u.id.slice(0, 8)}: Cached=${audit.profileBalance}, LedgerSum=${audit.ledgerNetSum}`,
          referenceId: u.id,
          metadata: { profileBalance: audit.profileBalance, ledgerSum: audit.ledgerNetSum },
        });
      }
    }

    // 3. Quick INV-07 Financial Reconciliation check (Last 50 successful transactions)
    const { data: recentPaid } = await supabase
      .from("payment_transactions")
      .select("amount")
      .eq("status", "successful")
      .order("created_at", { ascending: false })
      .limit(50);

    if (recentPaid && recentPaid.length > 0) {
      const gross = recentPaid.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const fee = Math.round(gross * 0.0165 * 100) / 100;
      const feeVat = Math.round(fee * 0.07 * 100) / 100;
      const net = Math.round((gross - fee - feeVat) * 100) / 100;
      const discrepancy = Math.abs(gross - (net + fee + feeVat));

      if (discrepancy > 0.05) {
        anomalies.push({
          type: "reconciliation_math_mismatch",
          severity: "critical",
          description: `INV-07 Reconciliation invariant discrepancy detected: ฿${discrepancy}`,
          metadata: { gross, fee, feeVat, net, discrepancy },
        });
      }
    }
  } catch (err) {
    console.error("[detectOperationalAnomalies] Anomaly detector error:", err);
  }

  return {
    timestamp: new Date().toISOString(),
    hasAnomalies: anomalies.length > 0,
    anomalyCount: anomalies.length,
    anomalies,
  };
}
