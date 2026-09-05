import { createClient } from "@supabase/supabase-js";
import type { Env } from "../env.server";
import type {
  FinancialReconciliationConfig,
  ReconciliationRunRecord,
  ReconciliationDiscrepancyRecord,
  DiscrepancyCode,
  DiscrepancySeverity,
} from "@phopephum/types";

// ==============================================================================
// 🏛️ PHOPEPHUM V3 — STEP 7.2E.3: AUTOMATED FINANCIAL RECONCILIATION SERVICES
// ==============================================================================

export const DEFAULT_RECONCILIATION_CONFIG: FinancialReconciliationConfig = {
  reconcilingSlaHours: 48, // 48-Hour Bank Clearance SLA
  holdingMaturityPeriodDays: 14, // 14-Day Holding Window
  holdingClearanceGraceHours: 2, // 2-Hour Grace Period
  minimumPayoutThresholdThb: 500.0,
  batchClearanceLimit: 100,
  maxAllowedDiscrepancyDeltaThb: 0.0, // Strictly Zero Drift
};

function getServiceRoleClient(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * 1. รันการกระทบยอดทางการเงินอัตโนมัติ (Hourly Surveillance / Deep Reconciliation)
 */
export async function executeHourlyReconciliation(options: {
  runType?: "hourly_surveillance" | "daily_deep_reconciliation" | "manual_audit";
  config?: Partial<FinancialReconciliationConfig>;
  env: Env;
}): Promise<{
  success: boolean;
  runId?: string;
  status?: "green" | "yellow" | "red";
  discrepancyCount?: number;
  paymentsChecked?: number;
  commissionsChecked?: number;
  transfersChecked?: number;
  partnersChecked?: number;
  durationMs?: number;
  error?: string;
}> {
  const { runType = "hourly_surveillance", config = {}, env } = options;
  const mergedConfig = { ...DEFAULT_RECONCILIATION_CONFIG, ...config };
  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase.rpc("run_financial_reconciliation_atomic", {
    p_run_type: runType,
    p_sla_hours: mergedConfig.reconcilingSlaHours,
    p_grace_hours: mergedConfig.holdingClearanceGraceHours,
    p_batch_limit: mergedConfig.batchClearanceLimit,
  });

  if (error) {
    console.error("[reconciliation.server] run_financial_reconciliation_atomic error:", error);
    return { success: false, error: error.message };
  }

  const res = data as any;
  return {
    success: Boolean(res?.success),
    runId: res?.run_id,
    status: res?.status,
    discrepancyCount: Number(res?.discrepancy_count || 0),
    paymentsChecked: Number(res?.payments_checked || 0),
    commissionsChecked: Number(res?.commissions_checked || 0),
    transfersChecked: Number(res?.transfers_checked || 0),
    partnersChecked: Number(res?.partners_checked || 0),
  };
}

/**
 * 2. ดึงประวัติการรันการกระทบยอด (Reconciliation Run History)
 */
export async function getReconciliationHistory(options: {
  limit?: number;
  env: Env;
}): Promise<ReconciliationRunRecord[]> {
  const { limit = 30, env } = options;
  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase
    .from("financial_reconciliation_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    runType: row.run_type,
    status: row.status,
    totalPaymentsChecked: Number(row.total_payments_checked || 0),
    totalCommissionsChecked: Number(row.total_commissions_checked || 0),
    totalTransfersChecked: Number(row.total_transfers_checked || 0),
    totalPartnersChecked: Number(row.total_partners_checked || 0),
    discrepancyCount: Number(row.discrepancy_count || 0),
    summaryMetadata: row.summary_metadata || {},
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));
}

/**
 * 3. ดึงรายการความคลาดเคลื่อนล่าสุด (Discrepancy Investigation Queue)
 */
export async function getRecentDiscrepancies(options: {
  status?: "open" | "investigating" | "resolved" | "dismissed";
  limit?: number;
  env: Env;
}): Promise<ReconciliationDiscrepancyRecord[]> {
  const { status, limit = 50, env } = options;
  const supabase = getServiceRoleClient(env);

  let query = supabase
    .from("financial_reconciliation_discrepancies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    runId: row.run_id,
    discrepancyCode: row.discrepancy_code as DiscrepancyCode,
    severity: row.severity as DiscrepancySeverity,
    partnerId: row.partner_id,
    partnerCode: row.partner_code,
    referenceTable: row.reference_table,
    referenceId: row.reference_id,
    expectedValue: row.expected_value ? Number(row.expected_value) : null,
    actualValue: row.actual_value ? Number(row.actual_value) : null,
    deltaThb: row.delta_thb ? Number(row.delta_thb) : null,
    status: row.status,
    resolutionNotes: row.resolution_notes,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
}

/**
 * 4. บันทึกการแก้ไข/ตรวจสอบความคลาดเคลื่อน (Resolve Discrepancy by Admin)
 */
export async function resolveDiscrepancy(options: {
  discrepancyId: string;
  resolutionNotes: string;
  adminId: string;
  newStatus?: "resolved" | "dismissed";
  env: Env;
}): Promise<{ success: boolean; error?: string }> {
  const { discrepancyId, resolutionNotes, adminId, newStatus = "resolved", env } = options;
  const supabase = getServiceRoleClient(env);

  const { error } = await supabase
    .from("financial_reconciliation_discrepancies")
    .update({
      status: newStatus,
      resolution_notes: resolutionNotes.trim(),
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", discrepancyId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
