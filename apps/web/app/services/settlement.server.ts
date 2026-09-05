import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/env.server";

function getServiceRoleClient(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface HoldingClearanceResult {
  success: boolean;
  jobLogId?: string;
  jobStatus?: "completed" | "partial" | "failed";
  processedCount: number;
  skippedCount?: number;
  failedCount?: number;
  duplicateCount?: number;
  totalClearedThb: number;
  totalOffsetThb: number;
  totalNetAddedThb: number;
  failureDetails?: any[];
  timestamp: string;
  error?: string;
}

export interface ReconciliationAuditResult {
  success: boolean;
  totalPartners: number;
  reconciledCount: number;
  discrepancyCount: number;
  discrepancies: Array<{
    partner_id: string;
    partner_code: string;
    holding_balance: number;
    available_balance: number;
    payout_pending_balance: number;
    clawback_pending_balance: number;
    total_earned: number;
    total_withdrawn: number;
    error: string;
  }>;
  auditTimestamp: string;
  error?: string;
}

/**
 * 1. รันกระบวนการปลดล็อกคอมมิชชัน Holding 14 วัน (Scheduled / Cron Execution)
 * - ดึงเฉพาะรายการที่ holding_until <= now()
 * - Offset หนี้ Clawback อัตโนมัติ (ถ้ามี clawback_pending_balance > 0)
 * - Row-level locking ป้องกัน Race Condition
 * - Idempotency ป้องกันประมวลผลซ้ำ
 * - บันทึกผลลัพธ์ลง financial_job_logs พร้อม telemetry ละเอียด
 */
export async function runHoldingClearanceJob(options: {
  limit?: number;
  env: Env;
}): Promise<HoldingClearanceResult> {
  const { limit = 100, env } = options;
  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase.rpc("clear_holding_commissions_monitored_atomic", {
    p_limit: limit,
  });

  if (error) {
    console.error("[settlement.server] clear_holding_commissions_monitored_atomic error:", error);
    return {
      success: false,
      processedCount: 0,
      totalClearedThb: 0,
      totalOffsetThb: 0,
      totalNetAddedThb: 0,
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }

  const res = data as any;
  return {
    success: Boolean(res?.success),
    jobLogId: res?.job_log_id,
    jobStatus: res?.job_status || "completed",
    processedCount: Number(res?.processed_count || 0),
    skippedCount: Number(res?.skipped_count || 0),
    failedCount: Number(res?.failed_count || 0),
    duplicateCount: Number(res?.duplicate_count || 0),
    totalClearedThb: Number(res?.total_cleared_thb || 0),
    totalOffsetThb: Number(res?.total_offset_thb || 0),
    totalNetAddedThb: Number(res?.total_net_added_thb || 0),
    failureDetails: res?.failure_details || [],
    timestamp: res?.finished_at || res?.timestamp || new Date().toISOString(),
  };
}

/**
 * 2. ตรวจสอบ Audit Trail และความสมดุล 3-Balance Reconciliation
 */
export async function getPartnerReconciliationAudit(options: {
  partnerId?: string;
  env: Env;
}): Promise<ReconciliationAuditResult> {
  const { partnerId, env } = options;
  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase.rpc("get_partner_reconciliation_audit", {
    p_partner_id: partnerId || null,
  });

  if (error) {
    console.error("[settlement.server] get_partner_reconciliation_audit error:", error);
    return {
      success: false,
      totalPartners: 0,
      reconciledCount: 0,
      discrepancyCount: 0,
      discrepancies: [],
      auditTimestamp: new Date().toISOString(),
      error: error.message,
    };
  }

  const res = data as any;
  return {
    success: Boolean(res?.success),
    totalPartners: Number(res?.total_partners || 0),
    reconciledCount: Number(res?.reconciled_count || 0),
    discrepancyCount: Number(res?.discrepancy_count || 0),
    discrepancies: res?.discrepancies || [],
    auditTimestamp: res?.audit_timestamp || new Date().toISOString(),
  };
}

/**
 * 3. Batch Settlement สำหรับคำขอเบิกเงินที่ได้รับอนุมัติ (Admin Bulk Settlement)
 */
export async function settlePayoutBatch(options: {
  payoutRequestIds: string[];
  settledBy: string;
  transferBankRef?: string;
  transferProofUrl?: string;
  whtCertificateNumber?: string;
  env: Env;
}): Promise<{
  totalRequested: number;
  settledCount: number;
  failedCount: number;
  results: Array<{
    payoutRequestId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const {
    payoutRequestIds,
    settledBy,
    transferBankRef = "BATCH_MANUAL_TRANSFER",
    transferProofUrl = "",
    whtCertificateNumber = "",
    env,
  } = options;
  const supabase = getServiceRoleClient(env);

  const results: Array<{
    payoutRequestId: string;
    success: boolean;
    error?: string;
  }> = [];

  let settledCount = 0;
  let failedCount = 0;

  for (const requestId of payoutRequestIds) {
    // 1. ดึงยอดคำขอเบิกเงิน
    const { data: request, error: fetchError } = await supabase
      .from("payout_requests")
      .select("id, partner_id, net_amount_thb, status")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      results.push({
        payoutRequestId: requestId,
        success: false,
        error: fetchError?.message || "Payout request not found",
      });
      failedCount++;
      continue;
    }

    if (request.status !== "approved" && request.status !== "processing") {
      results.push({
        payoutRequestId: requestId,
        success: false,
        error: `Cannot settle request in '${request.status}' status (must be approved or processing)`,
      });
      failedCount++;
      continue;
    }

    const idempotencyKey = `settle:${requestId}:${Date.now()}`;

    // 2. เรียก Atomic Settle RPC
    const { data: settleData, error: settleError } = await supabase.rpc("settle_payout_atomic", {
      p_payout_request_id: requestId,
      p_settled_by: settledBy,
      p_actual_transferred_amount_thb: Number(request.net_amount_thb),
      p_transfer_bank_ref: transferBankRef,
      p_transfer_proof_file_url: transferProofUrl,
      p_wht_certificate_number: whtCertificateNumber,
      p_idempotency_key: idempotencyKey,
    });

    if (settleError) {
      results.push({
        payoutRequestId: requestId,
        success: false,
        error: settleError.message,
      });
      failedCount++;
    } else {
      results.push({
        payoutRequestId: requestId,
        success: true,
      });
      settledCount++;
    }
  }

  return {
    totalRequested: payoutRequestIds.length,
    settledCount,
    failedCount,
    results,
  };
}

/**
 * 4. สรุปภาพรวมสถานะ Holding และ Settlement ทั่วทั้งระบบ
 */
export async function getHoldingAndSettlementOverview(env: Env): Promise<{
  activeHoldingEventsCount: number;
  totalHoldingAmountThb: number;
  dueForClearanceCount: number;
  totalDueClearanceAmountThb: number;
  pendingPayoutCount: number;
  totalPendingPayoutAmountThb: number;
}> {
  const supabase = getServiceRoleClient(env);
  const now = new Date().toISOString();

  // 1. Commission Events ในสถานะ holding
  const { data: holdingEvents } = await supabase
    .from("commission_events")
    .select("commission_amount_thb, holding_until")
    .eq("status", "holding");

  const activeHolding = holdingEvents || [];
  const totalHoldingAmount = activeHolding.reduce((sum, e) => sum + Number(e.commission_amount_thb || 0), 0);

  const dueEvents = activeHolding.filter((e) => e.holding_until && e.holding_until <= now);
  const totalDueAmount = dueEvents.reduce((sum, e) => sum + Number(e.commission_amount_thb || 0), 0);

  // 2. คำขอเบิกเงินที่รอดำเนินการ
  const { data: pendingPayouts } = await supabase
    .from("payout_requests")
    .select("net_amount_thb")
    .in("status", ["pending_review", "approved", "processing"]);

  const payouts = pendingPayouts || [];
  const totalPendingPayoutAmount = payouts.reduce((sum, p) => sum + Number(p.net_amount_thb || 0), 0);

  return {
    activeHoldingEventsCount: activeHolding.length,
    totalHoldingAmountThb: Number(totalHoldingAmount.toFixed(2)),
    dueForClearanceCount: dueEvents.length,
    totalDueClearanceAmountThb: Number(totalDueAmount.toFixed(2)),
    pendingPayoutCount: payouts.length,
    totalPendingPayoutAmountThb: Number(totalPendingPayoutAmount.toFixed(2)),
  };
}

/**
 * 5. การตรวจสอบความสอดคล้องสองทางระหว่างยอดชำระเงินกับคอมมิชชัน (Payment ↔ Commission Dual Reconciliation - INV-PARTNER-01)
 */
export async function runPaymentCommissionReconciliationAudit(options: {
  since?: string;
  env: Env;
}): Promise<{
  success: boolean;
  totalPaymentsAudited: number;
  totalCommissionsAudited: number;
  unattributedPaymentsCount: number;
  orphanedCommissionsCount: number;
  discrepancies: Array<{
    type: "MISSING_COMMISSION" | "ORPHANED_COMMISSION" | "AMOUNT_MISMATCH";
    paymentId?: string;
    commissionEventId?: string;
    detail: string;
  }>;
  auditTimestamp: string;
}> {
  const { since = new Date(Date.now() - 30 * 86400000).toISOString(), env } = options;
  const supabase = getServiceRoleClient(env);

  // 1. ดึงธุรกรรมการชำระเงินที่สำเร็จ
  const { data: payments } = await supabase
    .from("payment_transactions")
    .select("id, user_id, subscription_plan_code, gross_amount_thb, status, created_at")
    .eq("status", "successful")
    .gte("created_at", since);

  // 2. ดึง Commission Events
  const { data: commissionEvents } = await supabase
    .from("commission_events")
    .select("id, subscription_payment_id, referred_user_id, subscription_plan_code, gross_amount_thb, commission_amount_thb, status, created_at")
    .gte("created_at", since);

  // 3. ดึง Winning Converted Attributions
  const { data: attributions } = await supabase
    .from("referral_attributions")
    .select("partner_id, referred_user_id, status")
    .eq("status", "converted");

  const convertedUserIds = new Set((attributions || []).map((a) => a.referred_user_id));
  const commEventsByPaymentId = new Map(
    (commissionEvents || []).map((c) => [c.subscription_payment_id, c])
  );
  const paymentIdsSet = new Set((payments || []).map((p) => p.id));

  const discrepancies: Array<{
    type: "MISSING_COMMISSION" | "ORPHANED_COMMISSION" | "AMOUNT_MISMATCH";
    paymentId?: string;
    commissionEventId?: string;
    detail: string;
  }> = [];

  let unattributedPayments = 0;
  let orphanedCommissions = 0;

  // Audit Step 1: Payment -> Commission
  for (const pay of payments || []) {
    const isSands = pay.subscription_plan_code?.startsWith("sands_");
    const isConvertedUser = convertedUserIds.has(pay.user_id);

    if (isConvertedUser && !isSands) {
      if (!commEventsByPaymentId.has(pay.id)) {
        unattributedPayments++;
        discrepancies.push({
          type: "MISSING_COMMISSION",
          paymentId: pay.id,
          detail: `Payment ${pay.id} by converted user ${pay.user_id} for plan ${pay.subscription_plan_code} lacks commission event`,
        });
      }
    }
  }

  // Audit Step 2: Commission -> Payment
  for (const comm of commissionEvents || []) {
    if (!paymentIdsSet.has(comm.subscription_payment_id)) {
      orphanedCommissions++;
      discrepancies.push({
        type: "ORPHANED_COMMISSION",
        commissionEventId: comm.id,
        detail: `Commission event ${comm.id} references non-existent payment ${comm.subscription_payment_id}`,
      });
    }
  }

  return {
    success: discrepancies.length === 0,
    totalPaymentsAudited: (payments || []).length,
    totalCommissionsAudited: (commissionEvents || []).length,
    unattributedPaymentsCount: unattributedPayments,
    orphanedCommissionsCount: orphanedCommissions,
    discrepancies,
    auditTimestamp: new Date().toISOString(),
  };
}

