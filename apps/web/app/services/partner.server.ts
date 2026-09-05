import { createClient } from "@supabase/supabase-js";
import type { Env } from "../env.server";
import type {
  PartnerEntity,
  PartnerProfileRecord,
  PartnerLedgerEntry,
  PayoutRequest,
  PayoutRequestRecord,
  PartnerTier,
  TaxRule,
  CommissionPlan,
  PartnerCommissionItem,
  PartnerReferralPerformance,
  PartnerBenefit,
  PartnerOnboardingStep,
  PartnerOnboardingStatus,
  PartnerEligibilityOperation,
  PartnerEligibilityResult,
} from "@phopephum/types";

function getServiceRoleClient(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Helper: Mask buyer identity for security (Strict Zero Buyer PII Leakage)
 */
export function maskBuyerIdentifier(userId: string, displayName?: string | null): string {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(" ");
    if (parts.length > 1) {
      return `${parts[0]!.charAt(0)}*** ${parts[1]!.charAt(0)}***`;
    }
    return `${displayName.charAt(0)}*** (User)`;
  }
  const shortId = userId.replace(/-/g, "").slice(-4).toUpperCase();
  return `User #***${shortId}`;
}

/**
 * 1. ดึงหรือสร้าง Partner Entity (Public Data + 3-Balance Model + Clawback Debt + State Machine)
 */
export async function getOrCreatePartnerProfile(
  userId: string,
  env: Env
): Promise<PartnerProfileRecord | null> {
  const supabase = getServiceRoleClient(env);

  // ดึงจาก partner_entities
  const { data, error } = await supabase
    .from("partner_entities")
    .select(`
      *,
      partner_tax_profiles (*),
      partner_payout_destinations (*)
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    const tax = Array.isArray(data.partner_tax_profiles) ? data.partner_tax_profiles[0] : data.partner_tax_profiles;
    const dest = Array.isArray(data.partner_payout_destinations) ? data.partner_payout_destinations[0] : data.partner_payout_destinations;

    return {
      id: data.id,
      userId: data.user_id,
      partnerCode: data.partner_code,
      tierCode: data.tier_code as PartnerTier,
      tier: data.tier_code as PartnerTier,
      commissionRate: (data.tier_code === "partner_pro" || data.tier_code === "master") ? 25.0 : data.tier_code === "creator" ? 15.0 : 7.0,
      status: data.status,
      verificationStatus: data.verification_status,
      
      // 3-Balance Model + Clawback Debt
      holdingBalance: Number(data.holding_balance || 0),
      availableBalance: Number(data.available_balance || 0),
      payoutPendingBalance: Number(data.payout_pending_balance || 0),
      clawbackPendingBalance: Number(data.clawback_pending_balance || 0),
      
      totalEarned: Number(data.total_earned || 0),
      totalWithdrawn: Number(data.total_withdrawn || 0),
      lifetimeReferredCount: Number(data.lifetime_referred_count || 0),
      retentionPolicy: data.retention_policy || "standard_accounting_policy",
      retentionUntil: data.retention_until,
      
      // Private Data Snapshots (Masked for Security)
      bankName: dest?.bank_code || null,
      bankAccountNo: dest?.account_number || null,
      bankAccountName: dest?.account_name || null,
      promptpayId: dest?.promptpay_id || null,
      taxId: tax?.tax_id || null,
      legalName: tax?.legal_name || null,
      entityType: tax?.entity_type || null,
      isVatRegistered: Boolean(tax?.is_vat_registered),
      
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // หากยังไม่มี ให้สร้างใหม่ (Default: status applied, tier affiliate)
  // ดึง referral_code จาก profile เดิมถ้ามี
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .single();

  const generatedCode = userProfile?.referral_code || `P${userId.slice(0, 8).toUpperCase()}`;

  const { data: newEntity, error: createError } = await supabase
    .from("partner_entities")
    .insert({
      user_id: userId,
      partner_code: generatedCode,
      tier_code: "affiliate",
      status: "applied",
      onboarding_step: "applied",
      verification_status: "unverified",
      holding_balance: 0.0,
      available_balance: 0.0,
      payout_pending_balance: 0.0,
      total_earned: 0.0,
      total_withdrawn: 0.0,
    })
    .select("*")
    .single();

  if (createError || !newEntity) {
    console.error("[partner.server] Error creating partner entity:", createError);
    return null;
  }

  // Trigger initial state evaluation
  try {
    await supabase.rpc("evaluate_and_update_partner_onboarding_state", {
      p_partner_id: newEntity.id,
    });
  } catch (evalErr) {
    console.warn("[partner.server] Initial onboarding state eval warning:", evalErr);
  }

  return {
    id: newEntity.id,
    userId: newEntity.user_id,
    partnerCode: newEntity.partner_code,
    tierCode: newEntity.tier_code as PartnerTier,
    tier: newEntity.tier_code as PartnerTier,
    commissionRate: 7.0,
    status: newEntity.status,
    verificationStatus: newEntity.verification_status,
    holdingBalance: 0,
    availableBalance: 0,
    payoutPendingBalance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    lifetimeReferredCount: 0,
    retentionPolicy: "standard_accounting_policy",
    createdAt: newEntity.created_at,
    updatedAt: newEntity.updated_at,
  };
}

/**
 * 2. ฟังก์ชันคำนวณคอมมิชชันแบบไดนามิก (Dynamic VAT Separation)
 * ไม่ Hard-code 7% หรือ 7/107
 */
export function calculateCommission(params: {
  grossAmountThb: number;
  vatRate: number; // e.g. 0.07, 0.00
  commissionRate: number; // e.g. 0.07, 0.15, 0.25
}) {
  const { grossAmountThb, vatRate, commissionRate } = params;
  const vatAmountThb = vatRate > 0 ? Number((grossAmountThb * vatRate / (1.0 + vatRate)).toFixed(2)) : 0.0;
  const commissionableAmountThb = Number((grossAmountThb - vatAmountThb).toFixed(2));
  const commissionAmountThb = Number((commissionableAmountThb * commissionRate).toFixed(2));

  return {
    grossAmountThb,
    vatRate,
    vatAmountThb,
    commissionableAmountThb,
    commissionRate,
    commissionAmountThb,
  };
}

/**
 * 3. ค้นหา Tax Rule ที่มีผลบังคับใช้แบบไดนามิก (Tax Rule Resolution)
 * ห้าม Hard-code 3% — ค้นหาจากฐานข้อมูล tax_rules และเงื่อนไขสรรพากร
 */
export async function resolveApplicableTaxRule(
  partnerId: string,
  requestedAmountThb: number,
  env: Env
): Promise<TaxRule> {
  const supabase = getServiceRoleClient(env);

  // 1. ดึง Tax Profile ของ Partner
  const { data: taxProfile } = await supabase
    .from("partner_tax_profiles")
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();

  // หากได้รับการยกเว้นภาษี
  if (taxProfile?.withholding_tax_exempt) {
    const { data: exemptRule } = await supabase
      .from("tax_rules")
      .select("*")
      .eq("rule_code", "TH_EXEMPT_ZERO")
      .single();
    if (exemptRule) {
      return {
        ruleCode: exemptRule.rule_code,
        description: exemptRule.description,
        entityType: exemptRule.entity_type,
        withholdingRate: Number(exemptRule.withholding_rate),
        minThresholdThb: Number(exemptRule.min_threshold_thb),
        requiresTaxCertificate: Boolean(exemptRule.requires_tax_certificate),
        isActive: Boolean(exemptRule.is_active),
        effectiveFrom: exemptRule.effective_from,
        effectiveTo: exemptRule.effective_to,
        rule_code: exemptRule.rule_code,
        withholding_rate: exemptRule.withholding_rate,
      } as any;
    }
  }

  // หากยอดไม่ถึงเกณฑ์ขั้นต่ำคำสั่งสรรพากร (1,000 บาท)
  if (requestedAmountThb < 1000.0) {
    const { data: belowRule } = await supabase
      .from("tax_rules")
      .select("*")
      .eq("rule_code", "TH_BELOW_THRESHOLD")
      .single();
    if (belowRule) {
      return {
        ruleCode: belowRule.rule_code,
        description: belowRule.description,
        entityType: belowRule.entity_type,
        withholdingRate: Number(belowRule.withholding_rate),
        minThresholdThb: Number(belowRule.min_threshold_thb),
        requiresTaxCertificate: Boolean(belowRule.requires_tax_certificate),
        isActive: Boolean(belowRule.is_active),
        effectiveFrom: belowRule.effective_from,
        effectiveTo: belowRule.effective_to,
        rule_code: belowRule.rule_code,
        withholding_rate: belowRule.withholding_rate,
      } as any;
    }
  }

  // ค้นหาตาม entity_type
  const entityType = taxProfile?.entity_type || "individual";
  const ruleCode = entityType === "corporate" ? "TH_CORPORATE_SERVICE" : "TH_INDIVIDUAL_COMMISSION";

  const { data: rule, error } = await supabase
    .from("tax_rules")
    .select("*")
    .eq("rule_code", ruleCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !rule) {
    throw new Error(`TAX_REVIEW_REQUIRED: Unable to resolve valid tax rule for entity_type '${entityType}'`);
  }

  return {
    ruleCode: rule.rule_code,
    description: rule.description,
    entityType: rule.entity_type,
    withholdingRate: Number(rule.withholding_rate),
    minThresholdThb: Number(rule.min_threshold_thb),
    requiresTaxCertificate: Boolean(rule.requires_tax_certificate),
    isActive: Boolean(rule.is_active),
    effectiveFrom: rule.effective_from,
    effectiveTo: rule.effective_to,
    rule_code: rule.rule_code,
    withholding_rate: rule.withholding_rate,
  } as any;
}

/**
 * 4. ประมวลผลและคำนวณคอมมิชชัน Subscription ผ่าน Atomic RPC
 * เชื่อมโยง: Payment -> Winning Converted Attribution -> Plan Priority (100 > 50 > 10)
 * -> Commission Term -> Dynamic VAT -> 14-Day Holding -> Partner Financial Ledger
 */
export async function processSubscriptionCommission(options: {
  paymentId: string;
  payerUserId: string;
  planCode: string;
  grossAmountThb: number;
  vatRate?: number; // dynamic tax/invoice configuration, e.g. 0.07
  idempotencyKey?: string;
  env: Env;
}): Promise<{
  success: boolean;
  awarded?: boolean;
  duplicate?: boolean;
  partnerId?: string;
  partnerCode?: string;
  planId?: string;
  planName?: string;
  commissionRate?: number;
  grossAmount?: number;
  vatAmount?: number;
  commissionableBase?: number;
  commissionAmount?: number;
  holdingUntil?: string;
  newHoldingBalance?: number;
  reason?: string;
  message?: string;
  error?: string;
}> {
  // vatRate: Business Invoice VAT rate for separating VAT from commissionable base.
  // Caller MUST pass this from env.INVOICE_VAT_RATE (not hardcode 0.07 in business logic).
  // Default 0.07 is a fallback only — production callers should always pass explicitly.
  const { paymentId, payerUserId, planCode, grossAmountThb, vatRate = 0.07, idempotencyKey, env } = options;

  // 1. Explicit SKU Commissionability Policy (INV-PARTNER-02): Sands refill packs are 0% commissionable
  if (planCode.startsWith("sands_")) {
    return {
      success: true,
      awarded: false,
      reason: "SANDS_NON_COMMISSIONABLE",
      message: "Sands refill packs are 0% commissionable to protect AI unit economics",
    };
  }

  const supabase = getServiceRoleClient(env);
  const idem = idempotencyKey || `comm:${paymentId}:${payerUserId}`;

  const { data, error } = await supabase.rpc("process_subscription_commission_atomic", {
    p_subscription_payment_id: paymentId,
    p_payer_user_id: payerUserId,
    p_subscription_plan_code: planCode,
    p_gross_amount_thb: grossAmountThb,
    p_vat_rate: vatRate,
    p_idempotency_key: idem,
  });

  if (error) {
    console.error("[partner.server] process_subscription_commission_atomic error:", error);
    return { success: false, error: error.message };
  }

  const res = data as any;
  return {
    success: Boolean(res.success),
    awarded: Boolean(res.awarded),
    duplicate: Boolean(res.duplicate),
    partnerId: res.partner_id,
    partnerCode: res.partner_code,
    planId: res.plan_id,
    planName: res.plan_name,
    commissionRate: res.commission_rate ? Number(res.commission_rate) : undefined,
    grossAmount: res.gross_amount ? Number(res.gross_amount) : undefined,
    vatAmount: res.vat_amount ? Number(res.vat_amount) : undefined,
    commissionableBase: res.commissionable_base ? Number(res.commissionable_base) : undefined,
    commissionAmount: res.commission_amount ? Number(res.commission_amount) : undefined,
    holdingUntil: res.holding_until,
    newHoldingBalance: res.new_holding_balance ? Number(res.new_holding_balance) : undefined,
    reason: res.reason,
    message: res.message,
  };
}

/**
 * 4.1 ประมวลผลการยึดคอมมิชชันคืน (Refund Clawback Atomic)
 * - คืนเงินก่อนพ้นกำหนด 14 วัน: ยกเลิก Holding Balance ทันที
 * - คืนเงินหลังพ้นกำหนด: หัก Available Balance, หากไม่พอ นำส่วนที่ขาดเข้า clawback_pending_balance (ไม่ติดลบโดยไร้ policy)
 */
export async function processRefundClawback(options: {
  paymentId: string;
  reason?: string;
  idempotencyKey?: string;
  env: Env;
}): Promise<{
  success: boolean;
  clawedBack?: boolean;
  duplicate?: boolean;
  type?: "holding_reversed" | "available_clawback";
  amount?: number;
  deductedFromAvailable?: number;
  addedToClawbackPending?: number;
  newHoldingBalance?: number;
  newAvailableBalance?: number;
  newClawbackPendingBalance?: number;
  reason?: string;
  message?: string;
  error?: string;
}> {
  const { paymentId, reason = "Subscription payment refunded / charged back", idempotencyKey, env } = options;
  const supabase = getServiceRoleClient(env);
  const idem = idempotencyKey || `refund_clawback:${paymentId}`;

  const { data, error } = await supabase.rpc("process_refund_clawback_atomic", {
    p_subscription_payment_id: paymentId,
    p_refund_reason: reason,
    p_idempotency_key: idem,
  });

  if (error) {
    console.error("[partner.server] process_refund_clawback_atomic error:", error);
    return { success: false, error: error.message };
  }

  const res = data as any;
  return {
    success: Boolean(res.success),
    clawedBack: Boolean(res.clawed_back),
    duplicate: Boolean(res.duplicate),
    type: res.type,
    amount: res.amount ? Number(res.amount) : undefined,
    deductedFromAvailable: res.deducted_from_available ? Number(res.deducted_from_available) : undefined,
    addedToClawbackPending: res.added_to_clawback_pending ? Number(res.added_to_clawback_pending) : undefined,
    newHoldingBalance: res.new_holding_balance ? Number(res.new_holding_balance) : undefined,
    newAvailableBalance: res.new_available_balance ? Number(res.new_available_balance) : undefined,
    newClawbackPendingBalance: res.new_clawback_pending_balance ? Number(res.new_clawback_pending_balance) : undefined,
    reason: res.reason,
    message: res.message,
  };
}

/**
 * 4.2 เปลี่ยนสถานะคำขอเบิกเงินตาม State Machine ที่เคร่งครัด (Strict Payout Transition Engine)
 * Allowed transitions:
 *   pending_review -> approved
 *   pending_review -> rejected (releases reserve)
 *   approved -> processing
 *   processing -> completed (writes payout_paid ledger)
 */
export async function transitionPayoutStatus(options: {
  payoutRequestId: string;
  newStatus: "approved" | "rejected" | "processing" | "completed" | "failed";
  reviewedBy: string;
  reason?: string;
  omiseTransferId?: string;
  idempotencyKey?: string;
  env: Env;
}): Promise<{
  success: boolean;
  payoutRequestId?: string;
  oldStatus?: string;
  newStatus?: string;
  duplicate?: boolean;
  error?: string;
}> {
  const { payoutRequestId, newStatus, reviewedBy, reason, idempotencyKey, env } = options;
  const supabase = getServiceRoleClient(env);

  // Check current payout status
  const { data: currentReq } = await supabase
    .from("payout_requests")
    .select("status")
    .eq("id", payoutRequestId)
    .maybeSingle();

  if (!currentReq) {
    return { success: false, error: "PAYOUT_REQUEST_NOT_FOUND" };
  }

  // Terminal state idempotency guard
  if (currentReq.status === "completed" || currentReq.status === "rejected") {
    return {
      success: true,
      duplicate: true,
      payoutRequestId,
      oldStatus: currentReq.status,
      newStatus: currentReq.status,
    };
  }

  const { data, error } = await supabase.rpc("admin_process_payout_transition_atomic", {
    p_payout_request_id: payoutRequestId,
    p_admin_id: reviewedBy,
    p_new_status: newStatus,
    p_reason: reason || null,
    p_idempotency_key: idempotencyKey || null,
  });

  if (error) {
    console.error("[partner.server] admin_process_payout_transition_atomic error:", error);
    return { success: false, error: error.message };
  }

  const res = data as any;
  return {
    success: Boolean(res.success),
    payoutRequestId: res.payout_request_id,
    oldStatus: res.previous_status || res.old_status,
    newStatus: res.new_status,
    duplicate: Boolean(res.duplicate),
  };
}

/**
 * Legacy Adapter: บันทึกคอมมิชชันพันธมิตร (Backward-compatible adapter)
 */
export async function recordCommissionOnSubscription(options: {
  referrerId: string;
  referredId: string;
  subscriptionAmount: number;
  paymentId?: string;
  planId?: string;
  planCode?: string;
  vatRate?: number;
  env: Env;
}): Promise<{ success: boolean; commission?: number; holdingUntil?: string; error?: string }> {
  // Legacy adapter: vatRate default 0.07 is fallback only.
  // Production flows (webhook) read INVOICE_VAT_RATE from env and pass explicitly.
  const { paymentId = `pay_${Date.now()}`, referredId, planCode = options.planId || "pro_monthly", subscriptionAmount, vatRate = 0.07, env } = options;
  const result = await processSubscriptionCommission({
    paymentId,
    payerUserId: referredId,
    planCode,
    grossAmountThb: subscriptionAmount,
    vatRate,
    env,
  });

  return {
    success: result.success,
    commission: result.commissionAmount,
    holdingUntil: result.holdingUntil,
    error: result.error || (result.reason ? `${result.reason}: ${result.message}` : undefined),
  };
}

/**
 * 4.9 ดึงและประเมินสถานะ Onboarding ของ Partner แบบ Canonical (Onboarding State Machine SSoT)
 */
export async function getPartnerOnboardingStatus(
  partnerId: string,
  env: Env
): Promise<{
  status: PartnerOnboardingStatus;
  step: PartnerOnboardingStep;
  taxProfileComplete: boolean;
  payoutDestinationComplete: boolean;
  termsAccepted: boolean;
  activeTermsVersion: string;
  missingRequirements: string[];
}> {
  const supabase = getServiceRoleClient(env);

  // ดึง active terms
  const termsStatus = await getPartnerTermsStatus(partnerId, env);

  // ดึง partner entity และ relations
  const { data: partner } = await supabase
    .from("partner_entities")
    .select(`
      *,
      partner_tax_profiles (*),
      partner_payout_destinations (*)
    `)
    .eq("id", partnerId)
    .maybeSingle();

  if (!partner) {
    return {
      status: "applied",
      step: "applied",
      taxProfileComplete: false,
      payoutDestinationComplete: false,
      termsAccepted: false,
      activeTermsVersion: termsStatus.activeVersion,
      missingRequirements: ["partner_entity_not_found"],
    };
  }

  const tax = Array.isArray(partner.partner_tax_profiles)
    ? partner.partner_tax_profiles[0]
    : partner.partner_tax_profiles;
  const dest = Array.isArray(partner.partner_payout_destinations)
    ? partner.partner_payout_destinations[0]
    : partner.partner_payout_destinations;

  const taxProfileComplete = Boolean(tax?.tax_id && tax?.legal_name);
  const payoutDestinationComplete = Boolean(dest?.bank_code && dest?.account_number && dest?.account_name);
  const termsAccepted = termsStatus.accepted;

  const missingRequirements: string[] = [];
  if (!taxProfileComplete) missingRequirements.push("tax_profile_required");
  if (!payoutDestinationComplete) missingRequirements.push("payout_destination_required");
  if (!termsAccepted) missingRequirements.push("latest_terms_acceptance_required");

  let calculatedStep: PartnerOnboardingStep = "applied";
  if (partner.partner_code) calculatedStep = "profile_complete";
  if (taxProfileComplete && calculatedStep === "profile_complete") calculatedStep = "tax_profile_complete";
  if (payoutDestinationComplete && calculatedStep === "tax_profile_complete") calculatedStep = "payout_destination_complete";
  if (termsAccepted && calculatedStep === "payout_destination_complete") calculatedStep = "terms_accepted";
  if (taxProfileComplete && payoutDestinationComplete && termsAccepted) calculatedStep = "active";

  return {
    status: partner.status as PartnerOnboardingStatus,
    step: calculatedStep,
    taxProfileComplete,
    payoutDestinationComplete,
    termsAccepted,
    activeTermsVersion: termsStatus.activeVersion,
    missingRequirements,
  };
}

/**
 * 4.10 ตรวจสอบ Financial Eligibility ของ Partner (Canonical Server-Side State Guard)
 * ตรวจสอบ:
 * 1. Partner Entity exists
 * 2. Status ต้องเป็น 'active' (ห้าม 'applied', 'profile_complete', 'suspended', 'rejected')
 * 3. Latest Terms accepted
 * 4. Tax profile & Bank destination valid (สำหรับ operation 'payout')
 * 5. ป้องกัน Client bypass ทุกกรณี
 */
export async function assertPartnerFinancialEligibility(
  partnerId: string,
  operation: PartnerEligibilityOperation,
  env: Env
): Promise<PartnerEligibilityResult> {
  const supabase = getServiceRoleClient(env);

  // 1. ตรวจสอบผ่าน Database Atomic RPC
  const { data: rpcRes, error: rpcError } = await supabase.rpc("assert_partner_eligibility_atomic", {
    p_partner_id: partnerId,
    p_operation: operation,
  });

  const onboarding = await getPartnerOnboardingStatus(partnerId, env);

  // Fallback / Validation logic
  const { data: partner } = await supabase
    .from("partner_entities")
    .select("partner_code, status")
    .eq("id", partnerId)
    .maybeSingle();

  const partnerCode = partner?.partner_code || "UNKNOWN";
  const status = (partner?.status || "applied") as PartnerOnboardingStatus;

  if (rpcError) {
    console.error("[partner.server] assert_partner_eligibility_atomic RPC error:", rpcError);
    return {
      eligible: false,
      partnerId,
      partnerCode,
      status,
      operation,
      missingRequirements: onboarding.missingRequirements,
      termsStatus: {
        accepted: onboarding.termsAccepted,
        activeVersion: onboarding.activeTermsVersion,
      },
      taxProfileValid: onboarding.taxProfileComplete,
      payoutDestinationValid: onboarding.payoutDestinationComplete,
      reason: rpcError.message || "SERVER_ERROR",
    };
  }

  const isEligible = Boolean(rpcRes?.eligible);

  return {
    eligible: isEligible,
    partnerId,
    partnerCode,
    status,
    operation,
    missingRequirements: onboarding.missingRequirements,
    termsStatus: {
      accepted: onboarding.termsAccepted,
      activeVersion: onboarding.activeTermsVersion,
    },
    taxProfileValid: onboarding.taxProfileComplete,
    payoutDestinationValid: onboarding.payoutDestinationComplete,
    reason: rpcRes?.reason || (isEligible ? undefined : rpcRes?.message),
  };
}

/**
 * 5. ยื่นคำขอเบิกเงินแบบ Atomic Reserve (หัก Available ทันที -> เข้า Payout Pending ป้องกันถอนซ้ำ)
 *
 * ⚠️  OMISE TRANSFER CONDITIONS (อ่านก่อนเบิก):
 * เมื่อ Commission Holding 14 วันผ่าน → Available Balance พร้อมถอน
 * แต่ Omise Transfer มีเงื่อนไขเพิ่มเติมที่ต้องผ่านทุกข้อ:
 *   1. Omise Transferable Balance ต้องเพียงพอ (ผ่าน Omise 7-Day Payment Holding แล้ว)
 *   2. Recipient ต้องผ่านการตรวจสอบ (verified = true)
 *   3. ต้องเป็นวันทำการธนาคาร
 *   4. ไม่มี Transfer ที่ยังค้างอยู่สำหรับ Recipient เดียวกัน
 *   5. เงินเข้าบัญชีปลายทางในวันทำการถัดไป (T+1 Banking Day)
 * ดังนั้น PhopePhum Commission Available ≠ "โอนได้ทันที" — Omise อาจ delay ตาม banking conditions
 */
export async function requestPartnerPayout(options: {
  partnerId: string; // user_id หรือ partner entity id
  amount: number;
  bankInfo: {
    bankName: string;
    accountNo: string;
    accountName: string;
    taxId?: string;
  };
  env: Env;
}): Promise<{ success: boolean; netPayout?: number; whtAmount?: number; error?: string }> {
  const { partnerId, amount, bankInfo, env } = options;

  if (amount < 500) {
    return { success: false, error: "ยอดถอนขั้นต่ำคือ 500 บาท" };
  }

  const supabase = getServiceRoleClient(env);

  // ดึง entity ID
  const partner = await getOrCreatePartnerProfile(partnerId, env);
  if (!partner) {
    return { success: false, error: "ไม่พบข้อมูลพันธมิตร" };
  }

  // 1. ตรวจสอบ Financial Eligibility ผ่าน Canonical Server-Side State Guard (STEP 7.2D.2)
  const eligibility = await assertPartnerFinancialEligibility(partner.id, "payout", env);
  if (!eligibility.eligible) {
    return {
      success: false,
      error: `ไม่สามารถขอเบิกเงินได้: ${eligibility.reason || "คุณสมบัติของพันธมิตรยังไม่ครบถ้วนตามข้อกำหนด"}`,
    };
  }

  // 2. แก้ปัญหา Tax Rule แบบ Dynamic
  let taxRule: TaxRule;
  try {
    taxRule = await resolveApplicableTaxRule(partner.id, amount, env);
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  const idempotencyKey = `payout:${partner.id}:${Date.now()}`;

  const { data, error } = await supabase.rpc("reserve_payout_atomic", {
    p_partner_id: partner.id,
    p_requested_amount_thb: amount,
    p_tax_rule_code: taxRule.ruleCode,
    p_destination_snapshot: bankInfo,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    console.error("[partner.server] reserve_payout_atomic error:", error);
    return { success: false, error: error.message };
  }

  const res = data as any;
  return {
    success: res.success,
    netPayout: res.net_amount,
    whtAmount: res.withholding_tax,
  };
}

/**
 * 6. ดึงประวัติรายการใน Partner Ledger (3-Balance History)
 */
export async function getPartnerLedgerHistory(
  userId: string,
  env: Env,
  limit = 50
): Promise<PartnerLedgerEntry[]> {
  const supabase = getServiceRoleClient(env);
  const partner = await getOrCreatePartnerProfile(userId, env);
  if (!partner) return [];

  const { data, error } = await supabase
    .from("partner_ledger")
    .select("*")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    partnerId: row.partner_id,
    entryType: row.entry_type,
    amount: Number(row.amount),
    holdingBalanceBefore: Number(row.holding_balance_before || 0),
    holdingBalanceAfter: Number(row.holding_balance_after || 0),
    availableBalanceBefore: Number(row.available_balance_before || 0),
    availableBalanceAfter: Number(row.available_balance_after || 0),
    payoutPendingBefore: Number(row.payout_pending_before || 0),
    payoutPendingAfter: Number(row.payout_pending_after || 0),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    idempotencyKey: row.idempotency_key,
    notes: row.notes,
    createdAt: row.created_at,
    // Aliases for UI compatibility
    description: row.notes,
    status: row.entry_type === "commission_holding_in" ? "holding" : "available",
    balanceBefore: Number(row.available_balance_before || 0),
    balanceAfter: Number(row.available_balance_after || 0),
  }));
}

/**
 * 7. ดึงรายการคำขอถอนเงินสด (Payout Requests & Provider Details)
 */
export async function getPartnerPayoutRequests(
  userId: string,
  env: Env
): Promise<PayoutRequestRecord[]> {
  const supabase = getServiceRoleClient(env);
  const partner = await getOrCreatePartnerProfile(userId, env);
  if (!partner) return [];

  let { data, error } = await supabase
    .from("payout_requests")
    .select(`
      *,
      omise_transfers (
        omise_transfer_id,
        status,
        failure_code,
        failure_message,
        paid_at
      )
    `)
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false });

  if (error) {
    const fallback = await supabase
      .from("payout_requests")
      .select("*")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false });
    data = fallback.data;
  }

  if (!data) return [];

  return data.map((row: any) => {
    const trsf = Array.isArray(row.omise_transfers) ? row.omise_transfers[0] : row.omise_transfers;
    const rawDest = row.destination_snapshot || {};
    const rawAccNo = String(rawDest.accountNo || rawDest.account_number || "");
    const rawAccName = String(rawDest.accountName || rawDest.account_name || "");
    const maskedDest = {
      bankName: rawDest.bankName || rawDest.bank_code || "ธนาคาร",
      accountNo: rawAccNo.length >= 4 ? `•••• ${rawAccNo.slice(-4)}` : rawAccNo || "—",
      accountName: rawAccName ? maskBuyerIdentifier(rawAccName) : "—",
      taxId: rawDest.taxId ? `•••• ••••• ${String(rawDest.taxId).slice(-2)}` : undefined,
    };

    return {
      id: row.id,
      requestNumber: row.request_number,
      partnerId: row.partner_id,
      requestedAmountThb: Number(row.requested_amount_thb),
      taxRuleCodeApplied: row.tax_rule_code_applied,
      withholdingRateApplied: Number(row.withholding_rate_applied),
      withholdingTaxAmountThb: Number(row.withholding_tax_amount_thb),
      netPayoutAmountThb: Number(row.net_payout_amount_thb),
      destinationSnapshot: maskedDest,
      status: row.status,
      rejectionReason: row.rejection_reason,
      failureCode: trsf?.failure_code || null,
      failureMessage: trsf?.failure_message || null,
      failedAt: trsf?.status === "failed" ? row.updated_at : null,
      omiseTransferId: trsf?.omise_transfer_id || null,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Aliases
      amount: Number(row.requested_amount_thb),
      whtAmount: Number(row.withholding_tax_amount_thb),
      netPayout: Number(row.net_payout_amount_thb),
      bankInfo: maskedDest,
    };
  });
}

/**
 * 8. ดึงประวัติคอมมิชชันพันธมิตร (Commission History with Strict Buyer PII Masking)
 */
export async function getPartnerCommissionHistory(options: {
  userId: string;
  status?: "all" | "holding" | "cleared" | "clawback_refunded" | "void";
  limit?: number;
  offset?: number;
  env: Env;
}): Promise<{ items: PartnerCommissionItem[]; total: number }> {
  const { userId, status, limit = 50, offset = 0, env } = options;
  const supabase = getServiceRoleClient(env);
  const partner = await getOrCreatePartnerProfile(userId, env);
  if (!partner) return { items: [], total: 0 };

  let query = supabase
    .from("commission_events")
    .select(`
      *,
      commission_plans (
        plan_name
      ),
      profiles!referred_user_id (
        id,
        display_name
      )
    `, { count: "exact" })
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  let { data, count, error } = await query;
  if (error) {
    const fallbackRes = await supabase
      .from("commission_events")
      .select("*, commission_plans(plan_name)", { count: "exact" })
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    data = fallbackRes.data;
    count = fallbackRes.count;
  }

  if (!data) return { items: [], total: 0 };

  const now = new Date();
  const items: PartnerCommissionItem[] = data.map((row: any) => {
    const planName = row.commission_plans?.plan_name || (row.subscription_plan_code === "pro_monthly" ? "Pro Monthly (399฿)" : row.subscription_plan_code);
    const buyerProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const maskedBuyerName = maskBuyerIdentifier(row.referred_user_id, buyerProfile?.display_name);
    const holdingDate = new Date(row.holding_until);

    return {
      id: row.id,
      subscriptionPaymentId: row.subscription_payment_id,
      subscriptionPlanCode: row.subscription_plan_code,
      planName,
      maskedBuyerName,
      grossAmountThb: Number(row.gross_amount_thb),
      vatRate: Number(row.vat_rate || 0),
      vatAmountThb: Number(row.vat_amount_thb || 0),
      commissionableAmountThb: Number(row.commissionable_amount_thb),
      commissionRateApplied: Number(row.commission_rate_applied),
      commissionAmountThb: Number(row.commission_amount_thb),
      status: row.status,
      holdingUntil: row.holding_until,
      isHoldingExpired: holdingDate <= now,
      createdAt: row.created_at,
    };
  });

  return {
    items,
    total: count || 0,
  };
}

/**
 * 9. ดึงข้อมูลประสิทธิภาพการแนะนำ (Customer Referral Performance & Attribution Stats)
 */
export async function getPartnerReferralPerformance(options: {
  userId: string;
  env: Env;
}): Promise<PartnerReferralPerformance> {
  const { userId, env } = options;
  const supabase = getServiceRoleClient(env);
  const partner = await getOrCreatePartnerProfile(userId, env);
  if (!partner) {
    return {
      totalClicks: 0,
      totalConverted: 0,
      conversionRate: 0,
      activeReferralsCount: 0,
      topCampaigns: [],
      recentReferrals: [],
    };
  }

  // 1. Clicks & attributions
  const { data: attributions } = await supabase
    .from("referral_attributions")
    .select("campaign_code, status")
    .eq("partner_id", partner.id);

  const totalClicks = attributions?.length || 0;
  const totalConverted = attributions?.filter(a => a.status === "converted").length || 0;
  const conversionRate = totalClicks > 0 ? Number(((totalConverted / totalClicks) * 100).toFixed(1)) : 0;

  // Group top campaigns
  const campaignMap: Record<string, { clicks: number; conversions: number }> = {};
  for (const attr of attributions || []) {
    const code = attr.campaign_code || "organic";
    if (!campaignMap[code]) {
      campaignMap[code] = { clicks: 0, conversions: 0 };
    }
    campaignMap[code].clicks += 1;
    if (attr.status === "converted") {
      campaignMap[code].conversions += 1;
    }
  }

  const topCampaigns = Object.entries(campaignMap)
    .map(([campaignCode, stats]) => ({
      campaignCode,
      clicks: stats.clicks,
      conversions: stats.conversions,
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 5);

  // 2. Active referrals from profiles (Masked PII)
  const { data: referredUsers, count: activeCount } = await supabase
    .from("profiles")
    .select("id, display_name, plan, role, created_at", { count: "exact" })
    .eq("referred_by", partner.partnerCode)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentReferrals = (referredUsers || []).map(u => ({
    maskedName: maskBuyerIdentifier(u.id, u.display_name),
    tierOrPlan: u.plan === "pro" || u.plan === "imperial" ? `${u.plan.toUpperCase()} Member` : "Free Explorer",
    joinedAt: u.created_at,
  }));

  return {
    totalClicks,
    totalConverted,
    conversionRate,
    activeReferralsCount: activeCount || (partner.lifetimeReferredCount || 0),
    topCampaigns,
    recentReferrals,
  };
}

/**
 * 10. บันทึก/อัปเดตข้อมูล Private Bank & PromptPay PII
 */
export async function updatePartnerBankInfo(options: {
  userId: string;
  payoutMethod?: "bank_transfer" | "promptpay";
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  promptpayId?: string;
  taxId?: string;
  env: Env;
}): Promise<boolean> {
  const { userId, payoutMethod = "bank_transfer", bankName, bankAccountNo, bankAccountName, promptpayId, taxId, env } = options;
  const supabase = getServiceRoleClient(env);
  const partner = await getOrCreatePartnerProfile(userId, env);
  if (!partner) return false;

  // อัปเดต partner_payout_destinations
  const { error: destError } = await supabase
    .from("partner_payout_destinations")
    .upsert(
      {
        partner_id: partner.id,
        payout_method: payoutMethod,
        bank_code: bankName,
        account_number: bankAccountNo.trim(),
        account_name: bankAccountName.trim(),
        promptpay_id: promptpayId ? promptpayId.trim() : null,
        is_default: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "partner_id" }
    );

  // อัปเดต partner_tax_profiles legal name & taxId
  if (taxId) {
    await supabase.from("partner_tax_profiles").upsert(
      {
        partner_id: partner.id,
        tax_id: taxId.trim(),
        legal_name: bankAccountName.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "partner_id" }
    );
  }

  // Trigger state machine evaluation
  if (!destError) {
    try {
      await supabase.rpc("evaluate_and_update_partner_onboarding_state", {
        p_partner_id: partner.id,
      });
    } catch (e) {
      console.warn("[partner.server] evaluate_and_update_partner_onboarding_state error:", e);
    }
  }

  return !destError;
}

/**
 * 11. บันทึก/อัปเดตข้อมูล Tax Profile (Compliance & WHT Setup)
 */
export async function updatePartnerTaxProfile(options: {
  userId: string;
  entityType: "individual" | "corporate";
  taxId: string;
  legalName: string;
  isVatRegistered?: boolean;
  withholdingTaxExempt?: boolean;
  registeredAddress?: Record<string, unknown>;
  env: Env;
}): Promise<boolean> {
  const { userId, entityType, taxId, legalName, isVatRegistered = false, withholdingTaxExempt = false, registeredAddress = {}, env } = options;
  const supabase = getServiceRoleClient(env);
  const partner = await getOrCreatePartnerProfile(userId, env);
  if (!partner) return false;

  const { error } = await supabase.from("partner_tax_profiles").upsert(
    {
      partner_id: partner.id,
      entity_type: entityType,
      tax_id: taxId.trim(),
      legal_name: legalName.trim(),
      is_vat_registered: isVatRegistered,
      withholding_tax_exempt: withholdingTaxExempt,
      registered_address: registeredAddress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "partner_id" }
  );

  // Trigger state machine evaluation
  if (!error) {
    try {
      await supabase.rpc("evaluate_and_update_partner_onboarding_state", {
        p_partner_id: partner.id,
      });
    } catch (e) {
      console.warn("[partner.server] evaluate_and_update_partner_onboarding_state error:", e);
    }
  }

  return !error;
}

/**
 * 12. ดึงสิทธิประโยชน์และ Sands Closed-loop Vouchers ของ Partner
 */
export async function getPartnerBenefits(
  partnerId: string,
  env: Env
): Promise<PartnerBenefit[]> {
  const supabase = getServiceRoleClient(env);
  const { data, error } = await supabase
    .from("partner_benefits")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("is_active", true);

  if (error || !data) return [];
  return data.map((b: any) => ({
    id: b.id,
    partnerId: b.partner_id,
    benefitType: b.benefit_type,
    title: b.title,
    description: b.description,
    sandsRedeemCost: b.sands_redeem_cost,
    benefitReferenceValueThb: Number(b.benefit_reference_value_thb || 0),
    partnerSubsidyBudgetThb: Number(b.partner_subsidy_budget_thb || 0),
    isActive: b.is_active,
    expiresAt: b.expires_at,
  }));
}

/**
 * 13. ตรวจสอบสถานะการยอมรับข้อตกลงและเงื่อนไขพันธมิตร (Versioned Partner Terms Status)
 */
export async function getPartnerTermsStatus(
  partnerId: string,
  env: Env
): Promise<{
  accepted: boolean;
  activeVersion: string;
  acceptedAt?: string;
  termsTitle?: string;
  documentUrl?: string;
}> {
  const supabase = getServiceRoleClient(env);
  const { data: activeTerms } = await supabase
    .from("partner_terms_versions")
    .select("*")
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeTerms) {
    return { accepted: true, activeVersion: "v2026.1" };
  }

  const { data: acceptance } = await supabase
    .from("partner_terms_acceptances")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("terms_version", activeTerms.version)
    .maybeSingle();

  return {
    accepted: Boolean(acceptance),
    activeVersion: activeTerms.version,
    acceptedAt: acceptance?.accepted_at,
    termsTitle: activeTerms.title,
    documentUrl: activeTerms.document_url,
  };
}

/**
 * 14. บันทึกการยอมรับข้อตกลงและเงื่อนไขพันธมิตร (Accept Partner Terms Atomic)
 */
export async function acceptPartnerTerms(options: {
  partnerId: string;
  termsVersion: string;
  request: Request;
  env: Env;
}): Promise<{ success: boolean; error?: string }> {
  const { partnerId, termsVersion, request, env } = options;
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";
  const ua = request.headers.get("user-agent") || "unknown";

  const msgUint8 = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const ipHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const uaUint8 = new TextEncoder().encode(ua);
  const uaBuffer = await crypto.subtle.digest("SHA-256", uaUint8);
  const uaHash = Array.from(new Uint8Array(uaBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const supabase = getServiceRoleClient(env);
  const { data, error } = await supabase.rpc("accept_partner_terms_atomic", {
    p_partner_id: partnerId,
    p_terms_version: termsVersion,
    p_ip_hash: ipHash,
    p_user_agent_hash: uaHash,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: data?.error || error?.message || "Failed to accept partner terms",
    };
  }

  // Trigger state machine evaluation
  try {
    await supabase.rpc("evaluate_and_update_partner_onboarding_state", {
      p_partner_id: partnerId,
    });
  } catch (e) {
    console.warn("[partner.server] evaluate_and_update_partner_onboarding_state error:", e);
  }

  return { success: true };
}

