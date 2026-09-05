import { createClient } from "@supabase/supabase-js";
import type { Env } from "../env.server";
import { createOmiseRecipient, createOmiseTransfer, getOmiseTransfer } from "./omise.server";

// ==============================================================================
// 🏛️ PHOPEPHUM V3 — STEP 6.5.6: PARTNER PAYOUT & ADMIN FINANCIAL OPERATIONS
// ==============================================================================
// Strict State Machine, Omise Payout Settlement, Monitored Clearance Telemetry,
// Failed/Partial Job Inspection, and Immutable Audit Trail
// ==============================================================================

function getServiceRoleClient(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

import type { PayoutRetryClassification } from "@phopephum/types";

export interface PayoutTransitionResult {
  success: boolean;
  duplicate?: boolean;
  payoutRequestId: string;
  partnerId?: string;
  previousStatus?: string;
  newStatus?: string;
  requestedAmountThb?: number;
  netPayoutThb?: number;
  whtAmountThb?: number;
  auditLogId?: string;
  retryClassification?: PayoutRetryClassification;
  error?: string;
  message?: string;
}

export interface FinancialJobLog {
  id: string;
  jobType: string;
  status: "completed" | "partial" | "failed";
  processedCount: number;
  skippedCount: number;
  failedCount: number;
  duplicateCount: number;
  totalAmountThb: number;
  failureDetails: any[];
  metadata: Record<string, any>;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
}

export interface AdminFinancialAuditEntry {
  id: string;
  adminId: string;
  payoutRequestId?: string;
  partnerId?: string;
  action: string;
  amountThb?: number;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  evidenceUrl?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  adminProfile?: {
    displayName: string;
    email: string;
  };
}

/**
 * 1. Admin Approve Payout Request (PENDING_REVIEW -> APPROVED)
 */
export async function adminApprovePayoutRequest(options: {
  payoutRequestId: string;
  adminId: string;
  reason?: string;
  evidenceUrl?: string;
  ipAddress?: string;
  userAgent?: string;
  env: Env;
}): Promise<PayoutTransitionResult> {
  const { payoutRequestId, adminId, reason = "Approved by Admin after KYC/Tax verification", evidenceUrl, ipAddress, userAgent, env } = options;
  const supabase = getServiceRoleClient(env);

  const { data, error } = await supabase.rpc("admin_process_payout_transition_atomic", {
    p_payout_request_id: payoutRequestId,
    p_admin_id: adminId,
    p_new_status: "approved",
    p_reason: reason,
    p_evidence_url: evidenceUrl || null,
    p_ip_address: ipAddress || null,
    p_user_agent: userAgent || null,
    p_idempotency_key: `approve:${payoutRequestId}`,
  });

  if (error) {
    console.error("[payoutOperations.server] adminApprovePayoutRequest error:", error);
    return {
      success: false,
      payoutRequestId,
      error: error.message,
    };
  }

  const res = data as any;
  return {
    success: Boolean(res?.success),
    duplicate: Boolean(res?.duplicate),
    payoutRequestId: res?.payout_request_id || payoutRequestId,
    partnerId: res?.partner_id,
    previousStatus: res?.previous_status,
    newStatus: res?.new_status,
    requestedAmountThb: Number(res?.requested_amount_thb || 0),
    netPayoutThb: Number(res?.net_payout_thb || 0),
    whtAmountThb: Number(res?.wht_amount_thb || 0),
    auditLogId: res?.audit_log_id,
    message: res?.message,
  };
}

/**
 * 2. Admin Reject Payout Request (PENDING_REVIEW / APPROVED / FAILED -> REJECTED)
 * - Releases reserved funds in payout_pending_balance back to available_balance
 * - Records payout_refunded entry in partner_ledger
 */
export async function adminRejectPayoutRequest(options: {
  payoutRequestId: string;
  adminId: string;
  reason: string;
  evidenceUrl?: string;
  ipAddress?: string;
  userAgent?: string;
  env: Env;
}): Promise<PayoutTransitionResult> {
  const { payoutRequestId, adminId, reason, evidenceUrl, ipAddress, userAgent, env } = options;
  const supabase = getServiceRoleClient(env);

  if (!reason || reason.trim() === "") {
    return {
      success: false,
      payoutRequestId,
      error: "REASON_REQUIRED: ต้องระบุเหตุผลในการปฏิเสธคำขอถอนเงิน",
    };
  }

  const { data, error } = await supabase.rpc("admin_process_payout_transition_atomic", {
    p_payout_request_id: payoutRequestId,
    p_admin_id: adminId,
    p_new_status: "rejected",
    p_reason: reason.trim(),
    p_evidence_url: evidenceUrl || null,
    p_ip_address: ipAddress || null,
    p_user_agent: userAgent || null,
    p_idempotency_key: `reject:${payoutRequestId}`,
  });

  if (error) {
    console.error("[payoutOperations.server] adminRejectPayoutRequest error:", error);
    return {
      success: false,
      payoutRequestId,
      error: error.message,
    };
  }

  const res = data as any;
  return {
    success: Boolean(res?.success),
    duplicate: Boolean(res?.duplicate),
    payoutRequestId: res?.payout_request_id || payoutRequestId,
    partnerId: res?.partner_id,
    previousStatus: res?.previous_status,
    newStatus: res?.new_status,
    requestedAmountThb: Number(res?.requested_amount_thb || 0),
    netPayoutThb: Number(res?.net_payout_thb || 0),
    whtAmountThb: Number(res?.wht_amount_thb || 0),
    auditLogId: res?.audit_log_id,
    message: res?.message,
  };
}

/**
 * 3. Execute Omise Payout Settlement Transfer (APPROVED / FAILED / RECONCILING -> PROCESSING -> COMPLETED)
 *
 * 🔒 STEP 7.2D.1 HARDENING:
 * - Pre-flight check: Searches local omise_transfers and queries Omise API before attempting new transfer.
 * - Idempotent lookup: Prevents double payout if transfer was already created or is pending in bank queue.
 * - Error classification:
 *     4xx Deterministic Failure -> FINAL_FAILURE / failed
 *     Network Timeout / 5xx     -> WAIT_FOR_PROVIDER / reconciling (DO NOT mark failed, DO NOT blind retry)
 * - Atomic state transitions with row locks.
 */
export async function executeOmisePayoutTransfer(options: {
  payoutRequestId: string;
  adminId: string;
  ipAddress?: string;
  userAgent?: string;
  env: Env;
}): Promise<PayoutTransitionResult & { omiseTransferId?: string }> {
  const { payoutRequestId, adminId, ipAddress, userAgent, env } = options;
  const supabase = getServiceRoleClient(env);

  // 1. ดึงข้อมูล Payout Request พร้อมข้อมูลบัญชีธนาคารของ Partner
  const { data: requestRow, error: reqErr } = await supabase
    .from("payout_requests")
    .select(`
      *,
      partner_entities (
        id,
        partner_code,
        bank_account_brand,
        bank_account_number,
        bank_account_name,
        kyc_status,
        tax_id
      )
    `)
    .eq("id", payoutRequestId)
    .single();

  if (reqErr || !requestRow) {
    return {
      success: false,
      payoutRequestId,
      retryClassification: "FINAL_FAILURE",
      error: `PAYOUT_REQUEST_NOT_FOUND: ${reqErr?.message || "Not found"}`,
    };
  }

  // หากเป็น Terminal State (completed / rejected) อยู่แล้ว ให้คืน duplicate ทันที
  if (requestRow.status === "completed") {
    return {
      success: true,
      duplicate: true,
      payoutRequestId,
      partnerId: requestRow.partner_id,
      previousStatus: "completed",
      newStatus: "completed",
      requestedAmountThb: Number(requestRow.requested_amount_thb),
      netPayoutThb: Number(requestRow.net_payout_amount_thb),
      whtAmountThb: Number(requestRow.withholding_tax_amount_thb),
      omiseTransferId: requestRow.omise_transfer_id || undefined,
      retryClassification: "COMPLETED",
      message: "Payout request has already been completed and settled.",
    };
  }

  if (requestRow.status === "rejected") {
    return {
      success: false,
      duplicate: true,
      payoutRequestId,
      partnerId: requestRow.partner_id,
      previousStatus: "rejected",
      newStatus: "rejected",
      retryClassification: "FINAL_FAILURE",
      error: "PAYOUT_REJECTED: Payout request has already been rejected and funds returned.",
    };
  }

  const partner = requestRow.partner_entities;
  if (!partner) {
    return {
      success: false,
      payoutRequestId,
      retryClassification: "FINAL_FAILURE",
      error: "PARTNER_NOT_FOUND: ไม่พบข้อมูลพันธมิตร",
    };
  }

  // ตรวจสอบความถูกต้องของบัญชีธนาคาร
  if (!partner.bank_account_brand || !partner.bank_account_number || !partner.bank_account_name) {
    return {
      success: false,
      payoutRequestId,
      retryClassification: "FINAL_FAILURE",
      error: "BANK_ACCOUNT_INCOMPLETE: ข้อมูลบัญชีธนาคารของพันธมิตรไม่ครบถ้วน",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PRE-FLIGHT IDEMPOTENCY CHECK (INV-PARTNER-26)
  // ตรวจสอบว่าเคยมีการสร้าง Omise Transfer สำหรับคำขอนี้แล้วหรือไม่
  // ─────────────────────────────────────────────────────────────────────────────
  const { data: existingTransfer } = await supabase
    .from("omise_transfers")
    .select("*")
    .eq("payout_request_id", payoutRequestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingTransfer && existingTransfer.omise_transfer_id) {
    console.log(`[payoutOperations] Existing transfer record found: ${existingTransfer.omise_transfer_id} for payout ${payoutRequestId}`);

    // Query Omise API to verify real external state
    try {
      const remoteTransfer = await getOmiseTransfer(existingTransfer.omise_transfer_id, env);

      if (remoteTransfer.paid === true) {
        // Omise has already paid -> Finalize to COMPLETED atomically
        await supabase
          .from("omise_transfers")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTransfer.id);

        await supabase.rpc("admin_process_payout_transition_atomic", {
          p_payout_request_id: payoutRequestId,
          p_admin_id: adminId,
          p_new_status: "completed",
          p_reason: `Existing Omise transfer verified as paid (trsf_${remoteTransfer.id})`,
          p_evidence_url: `https://dashboard.omise.co/transfers/${remoteTransfer.id}`,
          p_ip_address: ipAddress || null,
          p_user_agent: userAgent || null,
          p_idempotency_key: `complete:${payoutRequestId}:${remoteTransfer.id}`,
        });

        return {
          success: true,
          duplicate: true,
          payoutRequestId,
          partnerId: partner.id,
          previousStatus: requestRow.status,
          newStatus: "completed",
          requestedAmountThb: Number(requestRow.requested_amount_thb),
          netPayoutThb: Number(requestRow.net_payout_amount_thb),
          whtAmountThb: Number(requestRow.withholding_tax_amount_thb),
          omiseTransferId: remoteTransfer.id,
          retryClassification: "COMPLETED",
          message: "Existing Omise transfer verified as paid and finalized successfully.",
        };
      }

      if (remoteTransfer.failure_code || remoteTransfer.failure_message) {
        // Previous transfer definitively failed at Omise -> Mark failed locally and allow safe retry/reject
        await supabase
          .from("omise_transfers")
          .update({
            status: "failed",
            failure_code: remoteTransfer.failure_code,
            failure_message: remoteTransfer.failure_message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTransfer.id);

        await supabase.rpc("admin_process_payout_transition_atomic", {
          p_payout_request_id: payoutRequestId,
          p_admin_id: adminId,
          p_new_status: "failed",
          p_reason: `Existing Omise transfer verified as failed: ${remoteTransfer.failure_message || remoteTransfer.failure_code}`,
          p_ip_address: ipAddress || null,
          p_user_agent: userAgent || null,
          p_idempotency_key: `fail:${payoutRequestId}:${existingTransfer.omise_transfer_id}`,
        });

        return {
          success: false,
          payoutRequestId,
          partnerId: partner.id,
          previousStatus: requestRow.status,
          newStatus: "failed",
          omiseTransferId: remoteTransfer.id,
          retryClassification: "SAFE_TO_RETRY",
          error: `PREVIOUS_TRANSFER_FAILED: ${remoteTransfer.failure_message || remoteTransfer.failure_code}`,
          message: "Previous Omise transfer definitively failed. Admin may retry or reject request.",
        };
      }

      // Transfer is still in banking queue / sent -> Keep in processing (DO NOT CREATE SECOND TRANSFER)
      if (requestRow.status !== "processing") {
        await supabase.rpc("admin_process_payout_transition_atomic", {
          p_payout_request_id: payoutRequestId,
          p_admin_id: adminId,
          p_new_status: "processing",
          p_reason: `Transfer in progress at Omise bank queue (trsf_${remoteTransfer.id})`,
          p_ip_address: ipAddress || null,
          p_user_agent: userAgent || null,
          p_idempotency_key: `processing:${payoutRequestId}:${remoteTransfer.id}`,
        });
      }

      return {
        success: true,
        duplicate: true,
        payoutRequestId,
        partnerId: partner.id,
        previousStatus: requestRow.status,
        newStatus: "processing",
        requestedAmountThb: Number(requestRow.requested_amount_thb),
        netPayoutThb: Number(requestRow.net_payout_amount_thb),
        whtAmountThb: Number(requestRow.withholding_tax_amount_thb),
        omiseTransferId: remoteTransfer.id,
        retryClassification: "WAIT_FOR_PROVIDER",
        message: "Omise transfer is currently being processed by bank queue (T+1). Do not create duplicate transfer.",
      };
    } catch (queryErr: any) {
      console.warn(`[payoutOperations] Failed to query Omise for transfer ${existingTransfer.omise_transfer_id}:`, queryErr);
      return {
        success: false,
        payoutRequestId,
        partnerId: partner.id,
        previousStatus: requestRow.status,
        newStatus: requestRow.status === "reconciling" ? "reconciling" : "processing",
        retryClassification: "WAIT_FOR_PROVIDER",
        error: `PROVIDER_UNREACHABLE: Existing transfer ${existingTransfer.omise_transfer_id} exists but cannot verify remote status: ${queryErr.message}`,
        message: "Cannot verify remote status. Awaiting provider connection. Do not retry transfer dispatch.",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ATOMIC TRANSITION TO PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────
  if (requestRow.status !== "processing") {
    const { error: transErr } = await supabase.rpc("admin_process_payout_transition_atomic", {
      p_payout_request_id: payoutRequestId,
      p_admin_id: adminId,
      p_new_status: "processing",
      p_reason: "Initiated Omise Transfer dispatch",
      p_ip_address: ipAddress || null,
      p_user_agent: userAgent || null,
      p_idempotency_key: `processing:${payoutRequestId}:${Date.now()}`,
    });

    if (transErr) {
      return {
        success: false,
        payoutRequestId,
        retryClassification: "MANUAL_REVIEW",
        error: `TRANSITION_FAILED: ${transErr.message}`,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DISPATCH OMISE TRANSFER WITH TIMEOUT RECOVERY & ERROR CLASSIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    // 4.1 สร้างหรือดึง Omise Recipient
    let recipientId = (requestRow.metadata as any)?.omise_recipient_id;
    if (!recipientId) {
      const recipient = await createOmiseRecipient({
        name: partner.bank_account_name,
        bankBrand: partner.bank_account_brand,
        accountNumber: partner.bank_account_number,
        accountName: partner.bank_account_name,
        type: "individual",
        env,
      });
      recipientId = recipient.id;
    }

    // 4.2 ส่งคำสั่งโอนเงินผ่าน Omise Transfer API
    const transferRes = await createOmiseTransfer({
      recipientId,
      amountThb: Number(requestRow.net_payout_amount_thb),
      payoutRequestId,
      metadata: {
        partnerId: partner.id,
        partnerCode: partner.partner_code,
        whtAmountThb: requestRow.wht_amount_thb,
      },
      env,
    });

    // 4.3 บันทึกลง omise_transfers table
    await supabase.from("omise_transfers").insert({
      payout_request_id: payoutRequestId,
      partner_id: partner.id,
      omise_transfer_id: transferRes.id,
      omise_recipient_id: recipientId,
      amount_thb: requestRow.net_payout_amount_thb,
      fee_thb: 20.00,
      fee_vat_thb: 1.40,
      net_transferred_thb: requestRow.net_payout_amount_thb,
      status: transferRes.paid ? "paid" : "pending",
      idempotency_key: `omise_trsf:${transferRes.id}`,
      metadata: {
        omiseResponse: transferRes,
      },
      paid_at: transferRes.paid ? new Date().toISOString() : null,
    });

    // 4.4 หาก Omise แจ้งสำเร็จทันที (เช่นใน Test/Mock Mode หรือ Instant Transfer)
    if (transferRes.paid) {
      await supabase.rpc("admin_process_payout_transition_atomic", {
        p_payout_request_id: payoutRequestId,
        p_admin_id: adminId,
        p_new_status: "completed",
        p_reason: `Omise transfer settled (ID: ${transferRes.id})`,
        p_evidence_url: `https://dashboard.omise.co/transfers/${transferRes.id}`,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null,
        p_idempotency_key: `complete:${payoutRequestId}:${transferRes.id}`,
      });
    }

    return {
      success: true,
      payoutRequestId,
      partnerId: partner.id,
      previousStatus: "approved",
      newStatus: transferRes.paid ? "completed" : "processing",
      requestedAmountThb: Number(requestRow.requested_amount_thb),
      netPayoutThb: Number(requestRow.net_payout_amount_thb),
      whtAmountThb: Number(requestRow.wht_amount_thb),
      omiseTransferId: transferRes.id,
      retryClassification: transferRes.paid ? "COMPLETED" : "WAIT_FOR_PROVIDER",
      message: transferRes.paid ? "Transfer completed successfully" : "Transfer dispatched to bank queue (Processing)",
    };
  } catch (err: any) {
    console.error("[payoutOperations.server] Omise Transfer execution error:", err);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: RETRY & FAILURE CLASSIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    const errMsg = String(err?.message || "");
    const isDeterministicClientError =
      errMsg.includes("[400]") ||
      errMsg.includes("[401]") ||
      errMsg.includes("[403]") ||
      errMsg.includes("[404]") ||
      errMsg.includes("[422]") ||
      errMsg.includes("amount_is_greater_than_transferable_balance") ||
      errMsg.includes("recipient_is_not_verified");

    if (isDeterministicClientError) {
      // Omise definitely rejected the request -> No transfer exists on provider side -> Mark failed
      await supabase.rpc("admin_process_payout_transition_atomic", {
        p_payout_request_id: payoutRequestId,
        p_admin_id: adminId,
        p_new_status: "failed",
        p_reason: `Omise transfer rejected (Deterministic 4xx): ${errMsg}`,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null,
        p_idempotency_key: `fail:${payoutRequestId}:${Date.now()}`,
      });

      return {
        success: false,
        payoutRequestId,
        partnerId: partner.id,
        previousStatus: "processing",
        newStatus: "failed",
        retryClassification: "FINAL_FAILURE",
        error: `TRANSFER_REJECTED: ${errMsg}`,
      };
    } else {
      // Network Timeout / 502 / 504 / Abort / Connection Drop:
      // ⚠️ DO NOT mark as 'failed' immediately!
      // Must enter 'reconciling' state to block blind re-dispatch and await verification
      await supabase.rpc("admin_process_payout_transition_atomic", {
        p_payout_request_id: payoutRequestId,
        p_admin_id: adminId,
        p_new_status: "reconciling",
        p_reason: `Network/Gateway Timeout during Omise transfer dispatch: ${errMsg}. Awaiting reconciliation.`,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null,
        p_idempotency_key: `reconcile_timeout:${payoutRequestId}:${Date.now()}`,
      });

      return {
        success: false,
        payoutRequestId,
        partnerId: partner.id,
        previousStatus: "processing",
        newStatus: "reconciling",
        retryClassification: "WAIT_FOR_PROVIDER",
        error: `GATEWAY_TIMEOUT: ${errMsg}`,
        message: "Omise API request timed out or connection dropped. Status transitioned to RECONCILING. System will safely verify before retry.",
      };
    }
  }
}

/**
 * 3.1 Reconcile Payout Request (RECONCILING / PROCESSING -> COMPLETED / FAILED / MANUAL_REVIEW)
 *
 * 🔒 STEP 7.2D.1.1 DETERMINISTIC RECONCILIATION & ESCALATION:
 * - Checks local omise_transfers and remote Omise status.
 * - If paid -> Finalize to COMPLETED.
 * - If failed -> Update status to FAILED.
 * - If processing/sent -> Keep PROCESSING.
 * - If provider status is unknown / unresolvable -> Transition to MANUAL_REVIEW and insert
 *   audit log with action 'PAYOUT_RECONCILIATION_ESCALATED'.
 * - NEVER mutate balance if provider status is unknown.
 */
export async function reconcilePayoutRequest(options: {
  payoutRequestId: string;
  adminId?: string;
  reason?: string;
  env: Env;
}): Promise<PayoutTransitionResult & { omiseTransferId?: string }> {
  const { payoutRequestId, adminId = "00000000-0000-0000-0000-000000000000", reason = "Scheduled/Manual Payout Reconciliation", env } = options;
  const supabase = getServiceRoleClient(env);

  const { data: requestRow, error: reqErr } = await supabase
    .from("payout_requests")
    .select("*, partner_entities(id, partner_code)")
    .eq("id", payoutRequestId)
    .single();

  if (reqErr || !requestRow) {
    return {
      success: false,
      payoutRequestId,
      retryClassification: "FINAL_FAILURE",
      error: `PAYOUT_NOT_FOUND: ${reqErr?.message || "Not found"}`,
    };
  }

  // Terminal states guard
  if (requestRow.status === "completed" || requestRow.status === "rejected") {
    return {
      success: true,
      duplicate: true,
      payoutRequestId,
      partnerId: requestRow.partner_id,
      previousStatus: requestRow.status,
      newStatus: requestRow.status,
      retryClassification: "COMPLETED",
      message: `Payout request is already in terminal state ${requestRow.status}`,
    };
  }

  // Lookup local omise_transfers
  const { data: existingTransfer } = await supabase
    .from("omise_transfers")
    .select("*")
    .eq("payout_request_id", payoutRequestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingTransfer && existingTransfer.omise_transfer_id) {
    try {
      const remoteTransfer = await getOmiseTransfer(existingTransfer.omise_transfer_id, env);

      if (remoteTransfer.paid === true) {
        await supabase
          .from("omise_transfers")
          .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", existingTransfer.id);

        await supabase.rpc("admin_process_payout_transition_atomic", {
          p_payout_request_id: payoutRequestId,
          p_admin_id: adminId,
          p_new_status: "completed",
          p_reason: `Reconciliation verified Omise transfer paid (trsf_${remoteTransfer.id})`,
          p_idempotency_key: `reconcile_complete:${payoutRequestId}:${remoteTransfer.id}`,
        });

        return {
          success: true,
          payoutRequestId,
          partnerId: requestRow.partner_id,
          previousStatus: requestRow.status,
          newStatus: "completed",
          omiseTransferId: remoteTransfer.id,
          retryClassification: "COMPLETED",
          message: "Reconciled Omise transfer as paid and settled.",
        };
      }

      if (remoteTransfer.failure_code || remoteTransfer.failure_message) {
        await supabase
          .from("omise_transfers")
          .update({
            status: "failed",
            failure_code: remoteTransfer.failure_code,
            failure_message: remoteTransfer.failure_message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTransfer.id);

        await supabase.rpc("admin_process_payout_transition_atomic", {
          p_payout_request_id: payoutRequestId,
          p_admin_id: adminId,
          p_new_status: "failed",
          p_reason: `Reconciliation verified Omise transfer failed: ${remoteTransfer.failure_message || remoteTransfer.failure_code}`,
          p_idempotency_key: `reconcile_fail:${payoutRequestId}:${existingTransfer.omise_transfer_id}`,
        });

        return {
          success: false,
          payoutRequestId,
          partnerId: requestRow.partner_id,
          previousStatus: requestRow.status,
          newStatus: "failed",
          omiseTransferId: remoteTransfer.id,
          retryClassification: "SAFE_TO_RETRY",
          error: `TRANSFER_FAILED: ${remoteTransfer.failure_message || remoteTransfer.failure_code}`,
        };
      }

      // Still in progress
      return {
        success: true,
        duplicate: true,
        payoutRequestId,
        partnerId: requestRow.partner_id,
        previousStatus: requestRow.status,
        newStatus: "processing",
        omiseTransferId: remoteTransfer.id,
        retryClassification: "WAIT_FOR_PROVIDER",
        message: "Transfer is currently in flight at Omise bank clearing queue.",
      };
    } catch (queryErr: any) {
      // Provider unresolvable -> Escalate to MANUAL_REVIEW
      console.warn(`[reconcilePayoutRequest] Cannot verify Omise transfer ${existingTransfer.omise_transfer_id}:`, queryErr);

      await supabase.rpc("admin_process_payout_transition_atomic", {
        p_payout_request_id: payoutRequestId,
        p_admin_id: adminId,
        p_new_status: "manual_review",
        p_reason: `Reconciliation escalation: Provider unreachable (${queryErr.message})`,
        p_idempotency_key: `reconcile_escalate:${payoutRequestId}:${Date.now()}`,
        p_metadata: {
          action: "PAYOUT_RECONCILIATION_ESCALATED",
          local_transfer_id: existingTransfer.id,
          provider_transfer_id: existingTransfer.omise_transfer_id,
          error: queryErr.message,
        },
      });

      return {
        success: false,
        payoutRequestId,
        partnerId: requestRow.partner_id,
        previousStatus: requestRow.status,
        newStatus: "manual_review",
        omiseTransferId: existingTransfer.omise_transfer_id,
        retryClassification: "MANUAL_REVIEW",
        error: `PAYOUT_RECONCILIATION_ESCALATED: ${queryErr.message}`,
        message: "Omise status could not be verified. Escalated to Manual Review for Finance Officer inspection.",
      };
    }
  }

  // If no local transfer record exists in reconciling state
  if (requestRow.status === "reconciling") {
    await supabase.rpc("admin_process_payout_transition_atomic", {
      p_payout_request_id: payoutRequestId,
      p_admin_id: adminId,
      p_new_status: "manual_review",
      p_reason: "Reconciliation escalation: Reconciling without local transfer record",
      p_idempotency_key: `reconcile_no_record:${payoutRequestId}:${Date.now()}`,
      p_metadata: {
        action: "PAYOUT_RECONCILIATION_ESCALATED",
        reason: "No local transfer record found during reconciling",
      },
    });

    return {
      success: false,
      payoutRequestId,
      partnerId: requestRow.partner_id,
      previousStatus: "reconciling",
      newStatus: "manual_review",
      retryClassification: "MANUAL_REVIEW",
      error: "PAYOUT_RECONCILIATION_ESCALATED: Missing local transfer record during reconciling state",
    };
  }

  return {
    success: true,
    payoutRequestId,
    partnerId: requestRow.partner_id,
    previousStatus: requestRow.status,
    newStatus: requestRow.status,
    retryClassification: "SAFE_TO_RETRY",
    message: "No action required during reconciliation.",
  };
}

/**
 * 4. ดึง Payout Queue สำหรับ Admin Financial Dashboard
 */
export async function getAdminPayoutQueue(options: {
  status?: string;
  limit?: number;
  offset?: number;
  env: Env;
}) {
  const { status, limit = 50, offset = 0, env } = options;
  const supabase = getServiceRoleClient(env);

  let query = supabase
    .from("payout_requests")
    .select(`
      *,
      partner_entities (
        id,
        partner_code,
        bank_account_brand,
        bank_account_number,
        bank_account_name,
        holding_balance,
        available_balance,
        payout_pending_balance,
        clawback_pending_balance,
        total_earned,
        total_withdrawn,
        kyc_status,
        tax_id,
        profiles (
          id,
          display_name,
          email,
          phone
        )
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("[payoutOperations.server] getAdminPayoutQueue error:", error);
    return { items: [], total: 0, error: error.message };
  }

  return {
    items: data || [],
    total: count || 0,
  };
}

/**
 * 5. ดึง Financial Job Logs สำหรับ Monitoring Dashboard
 */
export async function getFinancialJobLogs(options: {
  jobType?: string;
  status?: string;
  limit?: number;
  env: Env;
}): Promise<{ items: FinancialJobLog[]; error?: string }> {
  const { jobType, status, limit = 20, env } = options;
  const supabase = getServiceRoleClient(env);

  let query = supabase
    .from("financial_job_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (jobType) query = query.eq("job_type", jobType);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return { items: [], error: error.message };
  }

  const items: FinancialJobLog[] = (data || []).map((row: any) => ({
    id: row.id,
    jobType: row.job_type,
    status: row.status,
    processedCount: row.processed_count,
    skippedCount: row.skipped_count,
    failedCount: row.failed_count,
    duplicateCount: row.duplicate_count,
    totalAmountThb: Number(row.total_amount_thb),
    failureDetails: row.failure_details || [],
    metadata: row.metadata || {},
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  }));

  return { items };
}

/**
 * 6. ดึง Immutable Admin Financial Audit Logs
 */
export async function getAdminFinancialAuditLogs(options: {
  payoutRequestId?: string;
  partnerId?: string;
  limit?: number;
  env: Env;
}): Promise<{ items: AdminFinancialAuditEntry[]; error?: string }> {
  const { payoutRequestId, partnerId, limit = 50, env } = options;
  const supabase = getServiceRoleClient(env);

  let query = supabase
    .from("admin_financial_audit_logs")
    .select(`
      *,
      profiles (
        display_name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (payoutRequestId) query = query.eq("payout_request_id", payoutRequestId);
  if (partnerId) query = query.eq("partner_id", partnerId);

  const { data, error } = await query;
  if (error) {
    return { items: [], error: error.message };
  }

  const items: AdminFinancialAuditEntry[] = (data || []).map((row: any) => ({
    id: row.id,
    adminId: row.admin_id,
    payoutRequestId: row.payout_request_id,
    partnerId: row.partner_id,
    action: row.action,
    amountThb: row.amount_thb ? Number(row.amount_thb) : undefined,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    reason: row.reason,
    evidenceUrl: row.evidence_url,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    adminProfile: row.profiles ? {
      displayName: row.profiles.display_name,
      email: row.profiles.email,
    } : undefined,
  }));

  return { items };
}
