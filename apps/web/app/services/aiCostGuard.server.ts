/**
 * aiCostGuard.server.ts — Server-Side AI Cost Guard & Pay-Per-Use Telemetry SSoT
 *
 * Flow:
 * Auth → Entitlement → Quota Check → Sands Pay-Per-Use Balance → Rate Limit → Concurrency → Reserve Sands → AI → Usage/Cost Log → Result / Refund on failure
 *
 * Core Features:
 * 1. Per-user Rate Limiting & Cooldown Protection
 * 2. Concurrent AI Request Limit (Slot Acquisition & Release)
 * 3. Daily/Monthly Billing Cycle Usage Tracking
 * 4. Pay-Per-Use Sands Reservation (1 Sands for Wisdom AI, 10 Sands for AI Report when quota exceeded)
 * 5. Automatic Refund on AI Execution Failure (Atomic Credit)
 * 6. Token & Cost Calculation from SSoT (DeepSeek, Gemini, etc.)
 * 7. High-cost Anomaly Detection & Soft Warnings
 * 8. Admin Alerts via LINE Flex Message (Zero Secrets Leaked)
 * 9. Master Plan Fair-Use Ceilings (Not Infinite Unmetered Drain)
 */

import type { Env } from "~/env.server";
import { getUserPlan } from "./permissions.server";
import {
  AI_GUARD_CONFIG,
  AI_PAY_PER_USE_SANDS_COST,
  calculateAiCost,
  checkAiCostAnomaly,
  checkAiConcurrency,
  checkAiRateLimit,
  checkQuotaSoftWarning,
  estimateTokensFromText,
  type CostCalculationResult,
  type CostAnomalyCheckResult,
  type AiPayPerUseFeature,
} from "@phopephum/engine";
import {
  AI_REPORT_LIMIT,
  WISDOM_AI_LIMIT,
  getUserBillingCycleWindow,
} from "@phopephum/engine";
import type { CanonicalPlan } from "@phopephum/types";
import { sendAdminAlert } from "./alert.server";
import { debitSandsAtomic, creditSandsAtomic } from "./rewards.server";

// ── In-Memory Concurrency & Rate Tracking (Per-Isolate Fast Cache) ────────────

interface UserRateRecord {
  lastRequestTime: number;
  requestTimestamps: number[];
  cooldownUntil?: number;
}

const activeConcurrencyMap = new Map<string, number>();
const userRateMap = new Map<string, UserRateRecord>();

/** Reset concurrency/rate map for testing or maintenance */
export function _resetAiGuardState(): void {
  activeConcurrencyMap.clear();
  userRateMap.clear();
}

/** Get current active concurrency count for user */
export function getActiveConcurrencyCount(userId: string): number {
  return activeConcurrencyMap.get(userId) || 0;
}

// ── 1. Concurrency Management ────────────────────────────────────────────────

export async function acquireAiConcurrencySlot(
  userId: string,
  plan: CanonicalPlan,
  env?: Env
): Promise<{
  success: boolean;
  releaseSlot: () => Promise<void>;
  currentActive: number;
  limit: number;
  reason?: string;
}> {
  const currentActive = activeConcurrencyMap.get(userId) || 0;
  const check = checkAiConcurrency(currentActive, plan, AI_GUARD_CONFIG);

  if (!check.allowed) {
    if (env) {
      sendAdminAlert(env, {
        type: "ai_concurrency_exceeded",
        severity: "warning",
        message: `User ${userId.slice(0, 8)} เกิน Concurrency Limit (${currentActive}/${check.limit})`,
        userId,
      }).catch(console.error);
    }

    return {
      success: false,
      releaseSlot: async () => {},
      currentActive,
      limit: check.limit,
      reason: check.reason,
    };
  }

  // Increment active slot
  activeConcurrencyMap.set(userId, currentActive + 1);

  let released = false;
  const releaseSlot = async () => {
    if (released) return;
    released = true;
    const current = activeConcurrencyMap.get(userId) || 1;
    const next = Math.max(0, current - 1);
    if (next === 0) {
      activeConcurrencyMap.delete(userId);
    } else {
      activeConcurrencyMap.set(userId, next);
    }
  };

  return {
    success: true,
    releaseSlot,
    currentActive: currentActive + 1,
    limit: check.limit,
  };
}

// ── 2. Rate Limit & Cooldown Check ───────────────────────────────────────────

export async function checkAndApplyAiRateLimit(
  userId: string,
  plan: CanonicalPlan,
  env?: Env,
  now: number = Date.now()
): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
  reason?: string;
}> {
  let record = userRateMap.get(userId);
  if (!record) {
    record = {
      lastRequestTime: 0,
      requestTimestamps: [],
    };
  }

  // Filter timestamps to last 60 seconds
  const oneMinuteAgo = now - 60000;
  record.requestTimestamps = record.requestTimestamps.filter((t) => t > oneMinuteAgo);

  const check = checkAiRateLimit(
    {
      lastRequestTime: record.lastRequestTime,
      requestCountLastMinute: record.requestTimestamps.length,
      cooldownUntil: record.cooldownUntil,
    },
    plan,
    now,
    AI_GUARD_CONFIG
  );

  if (!check.allowed) {
    // Apply penalty cooldown if rapid hammer
    if (!record.cooldownUntil || record.cooldownUntil <= now) {
      record.cooldownUntil = now + AI_GUARD_CONFIG.cooldownPenaltyMs;
    }
    userRateMap.set(userId, record);

    if (env) {
      sendAdminAlert(env, {
        type: "ai_rate_limit_spike",
        severity: "warning",
        message: `User ${userId.slice(0, 8)} (${plan}) ติด Rate Limit: ${check.reason}`,
        userId,
      }).catch(console.error);
    }

    return {
      allowed: false,
      retryAfterSeconds: check.retryAfterSeconds,
      reason: check.reason,
    };
  }

  // Record successful request timestamp
  record.lastRequestTime = now;
  record.requestTimestamps.push(now);
  userRateMap.set(userId, record);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

// ── 3. Quota & Pay-Per-Use Verification ──────────────────────────────────────

export interface QuotaEvaluationResult {
  isWithinQuota: boolean;
  isPayPerUse: boolean;
  sandsRequired: number;
  remaining: number | null;
  limit: number | null;
  currentUsage: number;
  isSoftWarning: boolean;
}

export async function evaluateAiQuota(options: {
  userId: string;
  featureType: "ai_report" | "wisdom_ai";
  profile: any;
  supabase: any;
}): Promise<QuotaEvaluationResult> {
  const { userId, featureType, profile, supabase } = options;
  const plan = getUserPlan(profile);

  const limit =
    featureType === "ai_report"
      ? AI_REPORT_LIMIT[plan]
      : WISDOM_AI_LIMIT[plan];

  if (limit === null) {
    return {
      isWithinQuota: true,
      isPayPerUse: false,
      sandsRequired: 0,
      remaining: null,
      limit: null,
      currentUsage: 0,
      isSoftWarning: false,
    };
  }

  // Count usage in user billing cycle window
  const { cycleStart } = getUserBillingCycleWindow(profile);
  const tableName = featureType === "ai_report" ? "ai_reports" : "wisdom_queries";

  const { count } = await supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", cycleStart.toISOString());

  const currentUsage = count || 0;

  if (limit > 0 && currentUsage < limit) {
    const softWarn = checkQuotaSoftWarning(currentUsage + 1, limit, AI_GUARD_CONFIG);
    return {
      isWithinQuota: true,
      isPayPerUse: false,
      sandsRequired: 0,
      remaining: Math.max(0, limit - currentUsage),
      limit,
      currentUsage,
      isSoftWarning: softWarn.isSoftWarning,
    };
  }

  // Quota reached or limit === 0 (Free AI report) → Pay-Per-Use with Sands
  const payPerUseCost = AI_PAY_PER_USE_SANDS_COST[featureType];
  return {
    isWithinQuota: false,
    isPayPerUse: true,
    sandsRequired: payPerUseCost,
    remaining: 0,
    limit,
    currentUsage,
    isSoftWarning: false,
  };
}

// ── 4. Full Preflight Guard Pipeline with 2-Phase Sands Reservation ─────────

export interface PreflightSuccessResult {
  allowed: true;
  releaseSlot: () => Promise<void>;
  refundSandsIfNeeded: (reason?: string) => Promise<void>;
  softWarning: boolean;
  remainingQuota: number | null;
  plan: CanonicalPlan;
  isPayPerUse: boolean;
  sandsCharged: number;
  reservationRefId?: string;
}

export interface PreflightErrorResult {
  allowed: false;
  status: number;
  errorCode: string;
  errorMessage: string;
}

export async function guardAiRequestPreflight(options: {
  userId: string;
  profile: any;
  featureType: "ai_report" | "wisdom_ai";
  promptText: string;
  env: Env;
  supabase: any;
}): Promise<PreflightSuccessResult | PreflightErrorResult> {
  const { userId, profile, featureType, promptText, env, supabase } = options;
  const plan = getUserPlan(profile);

  // 1. Payload size guard (Prevent mega-prompt abuse)
  if (promptText && promptText.length > AI_GUARD_CONFIG.maxPromptLengthChars) {
    return {
      allowed: false,
      status: 400,
      errorCode: "PAYLOAD_TOO_LARGE",
      errorMessage: "ขนาดข้อมูลคำขอเกินขีดจำกัดความปลอดภัยของระบบ",
    };
  }

  // 2. Evaluate Quota & Pay-Per-Use Sands Requirement
  const quotaEval = await evaluateAiQuota({
    userId,
    featureType,
    profile,
    supabase,
  });

  // 3. If Pay-Per-Use, verify Sands balance before proceeding
  const currentSands = profile?.time_sands ?? 0;
  if (quotaEval.isPayPerUse && currentSands < quotaEval.sandsRequired) {
    const featureName = featureType === "ai_report" ? "สร้างรายงาน AI" : "สนทนา Wisdom AI";
    return {
      allowed: false,
      status: 403,
      errorCode: "INSUFFICIENT_SANDS",
      errorMessage: `คุณใช้โควตารอบนี้ครบแล้ว และมีทรายกาลเวลาไม่เพียงพอ (ต้องการ ${quotaEval.sandsRequired} ละอองทราย เพื่อ${featureName}) กรุณาเติมทรายหรืออัปเกรดแพ็กเกจ`,
    };
  }

  // 4. Rate Limit & Cooldown Check (before any reservation)
  const rateLimit = await checkAndApplyAiRateLimit(userId, plan, env);
  if (!rateLimit.allowed) {
    return {
      allowed: false,
      status: 429,
      errorCode: "RATE_LIMIT_EXCEEDED",
      errorMessage: rateLimit.reason || "คุณส่งคำขอถี่เกินไป กรุณารอสักครู่",
    };
  }

  // 5. Concurrency Limit Check (Slot Acquisition)
  const slot = await acquireAiConcurrencySlot(userId, plan, env);
  if (!slot.success) {
    return {
      allowed: false,
      status: 429,
      errorCode: "CONCURRENT_REQUEST_LIMIT",
      errorMessage: slot.reason || "มีคำขอ AI กำลังประมวลผลอยู่ กรุณารอสักครู่",
    };
  }

  // 6. 2-Phase Reservation: Reserve Sands before calling AI (if pay-per-use)
  let reservationRefId: string | undefined;
  let refunded = false;

  if (quotaEval.isPayPerUse && quotaEval.sandsRequired > 0) {
    reservationRefId = `reserve:${featureType}:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    const debitRes = await debitSandsAtomic({
      userId,
      amount: quotaEval.sandsRequired,
      activityType: featureType === "ai_report" ? "ai_report_redeem" : "wisdom_deep_dive",
      referenceId: reservationRefId,
      description: `หักทรายกาลเวลาส่วนเกินโควตา (${featureType === "ai_report" ? "AI Report" : "Wisdom AI"})`,
      metadata: { featureType, isPayPerUse: true, reservationRefId },
      env,
    });

    if (!debitRes.success) {
      await slot.releaseSlot();
      return {
        allowed: false,
        status: 403,
        errorCode: "INSUFFICIENT_SANDS",
        errorMessage: debitRes.error || "ละอองทรายกาลเวลาไม่เพียงพอ กรุณาเติมทรายเพื่อใช้งานต่อ",
      };
    }
  }

  // Refund helper for failures
  const refundSandsIfNeeded = async (reason?: string) => {
    if (refunded || !quotaEval.isPayPerUse || !reservationRefId || quotaEval.sandsRequired <= 0) {
      return;
    }
    refunded = true;
    const refundRefId = `refund:${reservationRefId}`;
    try {
      await creditSandsAtomic({
        userId,
        amount: quotaEval.sandsRequired,
        rewardClass: "adjustment",
        activityType: "admin_adjustment",
        referenceId: refundRefId,
        description: `คืนทรายกาลเวลาเนื่องจากระบบ AI ขัดข้อง (${reason || featureType})`,
        metadata: { originalRefId: reservationRefId, featureType },
        env,
      });
      console.log(`[AiCostGuard] Successfully refunded ${quotaEval.sandsRequired} sands to ${userId}`);
    } catch (refundErr) {
      console.error("[AiCostGuard] Fatal refund error:", refundErr);
    }
  };

  return {
    allowed: true,
    releaseSlot: slot.releaseSlot,
    refundSandsIfNeeded,
    softWarning: quotaEval.isSoftWarning,
    remainingQuota: quotaEval.remaining,
    plan,
    isPayPerUse: quotaEval.isPayPerUse,
    sandsCharged: quotaEval.sandsRequired,
    reservationRefId,
  };
}

// ── 5. Post-Execution Telemetry & Logging ────────────────────────────────────

export async function recordAiExecutionTelemetry(options: {
  userId: string;
  profile?: any;
  reportType: string;
  promptText?: string;
  outputText?: string;
  providerMetadata?: {
    promptTokens?: number;
    completionTokens?: number;
    model?: string;
  };
  env: Env;
  isSuccess: boolean;
  error?: unknown;
  releaseSlot?: () => Promise<void>;
  refundSandsIfNeeded?: (reason?: string) => Promise<void>;
}): Promise<CostCalculationResult> {
  const {
    userId,
    profile,
    reportType,
    promptText,
    outputText,
    providerMetadata,
    env,
    isSuccess,
    error,
    releaseSlot,
    refundSandsIfNeeded,
  } = options;

  // If AI execution failed, refund reserved sands immediately
  if (!isSuccess && refundSandsIfNeeded) {
    try {
      await refundSandsIfNeeded(error instanceof Error ? error.message : "Execution failure");
    } catch (e) {
      console.error("[AiCostGuard] Error executing refund:", e);
    }
  }

  // Always release concurrency slot
  if (releaseSlot) {
    try {
      await releaseSlot();
    } catch (e) {
      console.error("[AiCostGuard] Error releasing slot:", e);
    }
  }

  // Calculate tokens & estimated cost using SSoT
  const costResult = calculateAiCost({
    model: providerMetadata?.model || "deepseek-chat",
    promptTokens: providerMetadata?.promptTokens,
    completionTokens: providerMetadata?.completionTokens,
    promptText,
    completionText: outputText,
  });

  // Check for Cost / Token Anomalies
  const anomaly = checkAiCostAnomaly(costResult, AI_GUARD_CONFIG);

  if (anomaly.isAnomaly && env) {
    sendAdminAlert(env, {
      type: "ai_cost_anomaly",
      severity: anomaly.severity || "warning",
      message: `[AI Cost Guard] ตรวจพบความผิดปกติ: ${anomaly.reason} (User: ${userId.slice(0, 8)})`,
      details: JSON.stringify({
        userId,
        reportType,
        ...costResult,
        error: error ? String(error) : undefined,
      }),
      userId,
      reportType,
    }).catch(console.error);
  }

  // If AI execution failed, send critical alert
  if (!isSuccess && env) {
    sendAdminAlert(env, {
      type: "ai_generation_failed",
      severity: "critical",
      message: `AI Execution Failed: ${error instanceof Error ? error.message : String(error)}`,
      userId,
      reportType,
    }).catch(console.error);
  }

  return costResult;
}
