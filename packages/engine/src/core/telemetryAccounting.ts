/**
 * telemetryAccounting.ts
 * ============================================================================
 * 🏛️ PHOPEPHUM V3 — TELEMETRY & ACCOUNTING SSoT ENGINE
 * ============================================================================
 *
 * Single Source of Truth for:
 *  1. Sands Ledger SSoT Accounting (Issued, Purchased, Referral, Consumed, Reserved, Refunded, Expired, Outstanding)
 *  2. MRR Normalization (Pro Annual ฿2,770 = ฿230.83/mo) & Cash Inflow Tracking
 *  3. Active Paid Subscribers vs Historical Paying Users vs Sands Buyers Segmentation
 *  4. Canonical Active User Classification (Excluding background / heartbeat pings)
 *  5. AI Cost Telemetry Audit Records (Independent of transient pricing lookups)
 *  6. Unit Economics Ratios (AI Cost / Revenue, AI Cost / User, Sands Burn Rate, Sands Liability / Paying User)
 */

import { CANONICAL_PLANS } from "./quotaCalculator.js";
import { USD_TO_THB_EXCHANGE_RATE, AI_MODEL_PRICING } from "./aiCostGuard.js";

export const PRICING_VERSION_SSOT = "2026-v3-production";

// ── 1. Canonical Active User Event Filter ────────────────────────────────────

export const CANONICAL_ACTIVE_USER_EVENTS = [
  "login",
  "draw_daily_card",
  "save_journal",
  "generate_report",
  "send_wisdom_chat",
  "send_karnchata_chat",
  "send_horanu_chat",
  "create_people_profile",
  "update_profile",
  "view_horoscope",
  "check_yam",
  "checkout_sands",
  "upgrade_plan",
] as const;

export const SYSTEM_BACKGROUND_EVENTS = [
  "heartbeat",
  "page_ping",
  "cron_reconciliation",
  "system_health_check",
  "background_sync",
  "admin_action",
  "webhook_received",
  "telemetry_poll",
  "slot_release",
] as const;

export function isCanonicalActiveUserEvent(eventName: string): boolean {
  if (!eventName) return false;
  const lower = eventName.toLowerCase().trim();
  if (SYSTEM_BACKGROUND_EVENTS.some((sys) => lower === sys || lower.startsWith("sys_") || lower.startsWith("cron_"))) {
    return false;
  }
  return CANONICAL_ACTIVE_USER_EVENTS.some((act) => lower === act || lower.includes(act));
}

// ── 2. Sands Ledger SSoT Accounting Breakdown ───────────────────────────────

export interface SandsLedgerEntryInput {
  amount: number;
  activityType?: string | null;
  rewardClass?: string | null;
  referenceId?: string | null;
  createdAt?: string | null;
}

export interface SandsAccountingBreakdown {
  sandsIssued: number;
  sandsPurchased: number;
  sandsReferralPromo: number;
  sandsConsumed: number;
  sandsReserved: number;
  sandsRefunded: number;
  sandsExpired: number;
  sandsOutstanding: number;
  isInvariantBalanced: boolean;
  invariantDifference: number;
}

export function calculateSandsLedgerBreakdown(
  entries: SandsLedgerEntryInput[]
): SandsAccountingBreakdown {
  let sandsIssued = 0;
  let sandsPurchased = 0;
  let sandsReferralPromo = 0;
  let sandsConsumed = 0;
  let sandsReserved = 0;
  let sandsRefunded = 0;
  let sandsExpired = 0;

  for (const entry of entries) {
    const amt = Number(entry.amount || 0);
    const act = (entry.activityType || "").toLowerCase();
    const ref = (entry.referenceId || "").toLowerCase();
    const rewClass = (entry.rewardClass || "").toLowerCase();

    if (amt > 0) {
      if (act.startsWith("topup") || rewClass === "purchase") {
        sandsPurchased += amt;
      } else if (ref.startsWith("refund:") || act === "admin_adjustment_refund") {
        sandsRefunded += amt;
      } else if (
        act.startsWith("referral") ||
        act.startsWith("creator") ||
        rewClass === "community"
      ) {
        sandsReferralPromo += amt;
      } else {
        // Daily login, daily ritual, onboarding, checkin, etc.
        sandsIssued += amt;
      }
    } else if (amt < 0) {
      const absAmt = Math.abs(amt);
      if (act.startsWith("expired") || rewClass === "expiration") {
        sandsExpired += absAmt;
      } else if (ref.startsWith("reserve:") && act === "reservation_hold") {
        sandsReserved += absAmt;
      } else {
        // AI Report, Wisdom Chat, Deep Dive
        sandsConsumed += absAmt;
      }
    }
  }

  // Net Outstanding from immutable Ledger SSoT
  const totalCredits = sandsIssued + sandsPurchased + sandsReferralPromo + sandsRefunded;
  const totalDebits = sandsConsumed + sandsReserved + sandsExpired;
  const sandsOutstanding = totalCredits - totalDebits;

  // Direct sum verification
  const directSum = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const invariantDifference = Math.abs(sandsOutstanding - directSum);
  const isInvariantBalanced = invariantDifference < 0.0001;

  return {
    sandsIssued,
    sandsPurchased,
    sandsReferralPromo,
    sandsConsumed,
    sandsReserved,
    sandsRefunded,
    sandsExpired,
    sandsOutstanding,
    isInvariantBalanced,
    invariantDifference,
  };
}

// ── 3. MRR & Cash Collection Telemetry ──────────────────────────────────────

export interface SubscriberPlanCount {
  free: number;
  premium: number;
  proMonthly: number;
  proAnnual: number;
  master: number;
}

export interface RevenueMrrBreakdown {
  premiumMrrThb: number;
  proMonthlyMrrThb: number;
  proAnnualNormalizedMrrThb: number;
  masterMrrThb: number;
  totalMrrThb: number;
  totalSubscribers: number;
  activePaidSubscribers: number;
  annualBillingSavingsThb: number;
}

export function calculateNormalizedMrr(counts: SubscriberPlanCount): RevenueMrrBreakdown {
  const premiumPrice = CANONICAL_PLANS.premium.priceMonthlyThb; // 89
  const proMonthlyPrice = CANONICAL_PLANS.pro.priceMonthlyThb; // 289
  const proAnnualNormalized = CANONICAL_PLANS.proAnnual.normalizedMonthlyPriceThb; // 230.8333...
  const masterPrice = CANONICAL_PLANS.master.priceMonthlyThb; // 1289

  const premiumMrrThb = Math.round(counts.premium * premiumPrice * 100) / 100;
  const proMonthlyMrrThb = Math.round(counts.proMonthly * proMonthlyPrice * 100) / 100;
  const proAnnualNormalizedMrrThb = Math.round(counts.proAnnual * proAnnualNormalized * 100) / 100;
  const masterMrrThb = Math.round(counts.master * masterPrice * 100) / 100;

  const totalMrrThb =
    Math.round(
      (premiumMrrThb + proMonthlyMrrThb + proAnnualNormalizedMrrThb + masterMrrThb) * 100
    ) / 100;

  const activePaidSubscribers = counts.premium + counts.proMonthly + counts.proAnnual + counts.master;
  const totalSubscribers = counts.free + activePaidSubscribers;

  // Annual discount savings passed to users (289 * 12 - 2770 = 698 THB / year per annual subscriber)
  const annualBillingSavingsThb = counts.proAnnual * (proMonthlyPrice * 12 - CANONICAL_PLANS.proAnnual.priceAnnualThb);

  return {
    premiumMrrThb,
    proMonthlyMrrThb,
    proAnnualNormalizedMrrThb,
    masterMrrThb,
    totalMrrThb,
    totalSubscribers,
    activePaidSubscribers,
    annualBillingSavingsThb,
  };
}

// ── 4. AI Cost Telemetry Audit Record Builder ────────────────────────────────

export interface PersistentAiTelemetryRecord {
  pricingVersion: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptRateUsdPerMillion: number;
  completionRateUsdPerMillion: number;
  costUsd: number;
  costThb: number;
  exchangeRate: number;
  isSuccess: boolean;
  sandsCharged: number;
  sandsRefunded: number;
  isPayPerUse: boolean;
}

export function buildPersistentAiTelemetryRecord(options: {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  isSuccess: boolean;
  sandsCharged?: number;
  sandsRefunded?: number;
  isPayPerUse?: boolean;
}): PersistentAiTelemetryRecord {
  const modelKey = options.model && AI_MODEL_PRICING[options.model] ? options.model : "default";
  const pricing = AI_MODEL_PRICING[modelKey] || AI_MODEL_PRICING.default;

  const promptTokens = Math.max(0, options.promptTokens || 0);
  const completionTokens = Math.max(0, options.completionTokens || 0);
  const totalTokens = promptTokens + completionTokens;

  const promptCostUsd = (promptTokens / 1_000_000) * pricing.promptCostPerMillion;
  const completionCostUsd = (completionTokens / 1_000_000) * pricing.completionCostPerMillion;
  const costUsd = Number((promptCostUsd + completionCostUsd).toFixed(6));
  const costThb = Number((costUsd * USD_TO_THB_EXCHANGE_RATE).toFixed(4));

  const sandsCharged = options.sandsCharged || 0;
  const sandsRefunded = options.isSuccess ? 0 : options.sandsRefunded ?? sandsCharged;

  return {
    pricingVersion: PRICING_VERSION_SSOT,
    provider: pricing.name,
    model: modelKey,
    promptTokens,
    completionTokens,
    totalTokens,
    promptRateUsdPerMillion: pricing.promptCostPerMillion,
    completionRateUsdPerMillion: pricing.completionCostPerMillion,
    costUsd,
    costThb,
    exchangeRate: USD_TO_THB_EXCHANGE_RATE,
    isSuccess: options.isSuccess,
    sandsCharged: options.isSuccess ? sandsCharged : 0, // Never count failed as consumed
    sandsRefunded,
    isPayPerUse: Boolean(options.isPayPerUse),
  };
}

// ── 5. Unit Economics & Ratio Calculators ────────────────────────────────────

export interface UnitEconomicsMetrics {
  aiCostToRevenueRatioPercent: number;
  aiCostPerActiveUserThb: number;
  sandsBurnRatePerDay: number;
  sandsLiabilityPerPayingUser: number;
  arpuThb: number;
  arppuThb: number;
  grossMarginPercent: number;
}

export function calculateUnitEconomicsMetrics(params: {
  totalAiCostThb: number;
  totalRevenueThb: number;
  activeUsersCount: number;
  totalPayingUsersCount: number;
  totalOutstandingSands: number;
  sandsConsumed: number;
  periodDays?: number;
}): UnitEconomicsMetrics {
  const periodDays = params.periodDays && params.periodDays > 0 ? params.periodDays : 30;
  const totalRevenue = Math.max(0, params.totalRevenueThb);
  const totalAiCost = Math.max(0, params.totalAiCostThb);
  const activeUsers = Math.max(1, params.activeUsersCount);
  const payingUsers = Math.max(1, params.totalPayingUsersCount);

  const aiCostToRevenueRatioPercent =
    totalRevenue > 0
      ? Math.round((totalAiCost / totalRevenue) * 10000) / 100
      : 0.0;

  const aiCostPerActiveUserThb = Math.round((totalAiCost / activeUsers) * 1000) / 1000;
  const sandsBurnRatePerDay = Math.round((params.sandsConsumed / periodDays) * 100) / 100;
  const sandsLiabilityPerPayingUser = Math.round((params.totalOutstandingSands / payingUsers) * 10) / 10;

  const arpuThb = Math.round((totalRevenue / activeUsers) * 100) / 100;
  const arppuThb = Math.round((totalRevenue / payingUsers) * 100) / 100;

  const grossProfitThb = totalRevenue - totalAiCost;
  const grossMarginPercent =
    totalRevenue > 0
      ? Math.round((grossProfitThb / totalRevenue) * 10000) / 100
      : 100.0;

  return {
    aiCostToRevenueRatioPercent,
    aiCostPerActiveUserThb,
    sandsBurnRatePerDay,
    sandsLiabilityPerPayingUser,
    arpuThb,
    arppuThb,
    grossMarginPercent,
  };
}
