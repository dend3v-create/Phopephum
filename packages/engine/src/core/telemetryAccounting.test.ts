import { describe, it, expect } from "vitest";
import {
  calculateSandsLedgerBreakdown,
  calculateNormalizedMrr,
  buildPersistentAiTelemetryRecord,
  calculateUnitEconomicsMetrics,
  isCanonicalActiveUserEvent,
  PRICING_VERSION_SSOT,
} from "./telemetryAccounting.js";
import { CANONICAL_PLANS } from "./quotaCalculator.js";

describe("PHOPEPHUM V3 — TELEMETRY & ACCOUNTING SSoT", () => {
  // ── TEST 1: Sands Ledger SSoT Breakdown & Invariant Balance ────────────────
  it("should calculate exact Sands accounting breakdown and maintain strict invariant", () => {
    const sampleLedger = [
      // 1. Issued (Daily Login & Rituals)
      { amount: 5, activityType: "daily_login", rewardClass: "daily_ritual" },
      { amount: 10, activityType: "checkin", rewardClass: "daily_ritual" },
      // 2. Purchased (Top-up packs)
      { amount: 50, activityType: "topup_sands_50", rewardClass: "purchase" },
      { amount: 150, activityType: "topup_sands_150", rewardClass: "purchase" },
      // 3. Referral & Community
      { amount: 20, activityType: "referral_signup", rewardClass: "community" },
      // 4. Consumed (AI Features)
      { amount: -10, activityType: "ai_report_redeem", referenceId: "reserve:ai_report:user_1" },
      { amount: -1, activityType: "wisdom_deep_dive", referenceId: "reserve:wisdom_ai:user_1" },
      { amount: -1, activityType: "wisdom_deep_dive", referenceId: "reserve:wisdom_ai:user_2" },
      // 5. Reserved Hold
      { amount: -10, activityType: "reservation_hold", referenceId: "reserve:hold:user_3" },
      // 6. Refunded (Rollback from AI failure)
      { amount: 10, activityType: "admin_adjustment", referenceId: "refund:reserve:ai_report:user_4" },
      // 7. Expired
      { amount: -5, activityType: "expired_promo", rewardClass: "expiration" },
    ];

    const breakdown = calculateSandsLedgerBreakdown(sampleLedger);

    expect(breakdown.sandsIssued).toBe(15); // 5 + 10
    expect(breakdown.sandsPurchased).toBe(200); // 50 + 150
    expect(breakdown.sandsReferralPromo).toBe(20);
    expect(breakdown.sandsConsumed).toBe(12); // 10 + 1 + 1
    expect(breakdown.sandsReserved).toBe(10);
    expect(breakdown.sandsRefunded).toBe(10);
    expect(breakdown.sandsExpired).toBe(5);

    // Total Credits = 15 + 200 + 20 + 10 = 245
    // Total Debits = 12 + 10 + 5 = 27
    // Net Outstanding = 245 - 27 = 218
    expect(breakdown.sandsOutstanding).toBe(218);
    expect(breakdown.isInvariantBalanced).toBe(true);
    expect(breakdown.invariantDifference).toBe(0);
  });

  // ── TEST 2: Normalized MRR vs Cash Inflow (Pro Annual ฿2,770 = ฿230.83/mo) ───
  it("should normalize Pro Annual to ฿230.83/mo while preserving canonical plan pricing", () => {
    expect(CANONICAL_PLANS.free.priceMonthlyThb).toBe(0);
    expect(CANONICAL_PLANS.premium.priceMonthlyThb).toBe(89);
    expect(CANONICAL_PLANS.pro.priceMonthlyThb).toBe(289);
    expect(CANONICAL_PLANS.proAnnual.priceAnnualThb).toBe(2770);
    expect(CANONICAL_PLANS.master.priceMonthlyThb).toBe(1289);

    const counts = {
      free: 700,
      premium: 200,
      proMonthly: 60,
      proAnnual: 20, // 20 annual subscribers
      master: 20,
    };

    const mrr = calculateNormalizedMrr(counts);

    // Premium MRR: 200 * 89 = 17,800
    expect(mrr.premiumMrrThb).toBe(17800);
    // Pro Monthly MRR: 60 * 289 = 17,340
    expect(mrr.proMonthlyMrrThb).toBe(17340);
    // Pro Annual Normalized MRR: 20 * 230.8333... = 4,616.67
    expect(mrr.proAnnualNormalizedMrrThb).toBe(4616.67);
    // Master MRR: 20 * 1289 = 25,780
    expect(mrr.masterMrrThb).toBe(25780);

    // Total MRR: 17,800 + 17,340 + 4,616.67 + 25,780 = 65,536.67
    expect(mrr.totalMrrThb).toBe(65536.67);
    expect(mrr.activePaidSubscribers).toBe(300);
    expect(mrr.totalSubscribers).toBe(1000);
    // User Savings: 20 * (289*12 - 2770) = 20 * 698 = 13,960 THB / yr
    expect(mrr.annualBillingSavingsThb).toBe(13960);
  });

  // ── TEST 3: Canonical Active User Filter ────────────────────────────────────
  it("should filter real user interactions and exclude system/cron/heartbeat events", () => {
    // True active user actions
    expect(isCanonicalActiveUserEvent("login")).toBe(true);
    expect(isCanonicalActiveUserEvent("draw_daily_card")).toBe(true);
    expect(isCanonicalActiveUserEvent("save_journal")).toBe(true);
    expect(isCanonicalActiveUserEvent("generate_report")).toBe(true);
    expect(isCanonicalActiveUserEvent("send_wisdom_chat")).toBe(true);
    expect(isCanonicalActiveUserEvent("checkout_sands")).toBe(true);

    // Excluded background / telemetry pings
    expect(isCanonicalActiveUserEvent("heartbeat")).toBe(false);
    expect(isCanonicalActiveUserEvent("page_ping")).toBe(false);
    expect(isCanonicalActiveUserEvent("cron_reconciliation")).toBe(false);
    expect(isCanonicalActiveUserEvent("system_health_check")).toBe(false);
    expect(isCanonicalActiveUserEvent("telemetry_poll")).toBe(false);
  });

  // ── TEST 4: AI Cost Telemetry Audit Records (Independent SSoT) ─────────────
  it("should generate self-contained AI telemetry audit record with pricing version", () => {
    const recordSuccess = buildPersistentAiTelemetryRecord({
      model: "gemini-1.5-flash",
      promptTokens: 3500,
      completionTokens: 2500,
      isSuccess: true,
      sandsCharged: 10,
      isPayPerUse: true,
    });

    expect(recordSuccess.pricingVersion).toBe(PRICING_VERSION_SSOT);
    expect(recordSuccess.model).toBe("gemini-1.5-flash");
    expect(recordSuccess.promptTokens).toBe(3500);
    expect(recordSuccess.completionTokens).toBe(2500);
    expect(recordSuccess.totalTokens).toBe(6000);
    expect(recordSuccess.costUsd).toBe(0.001012); // (3500*0.075 + 2500*0.30)/1M
    expect(recordSuccess.costThb).toBe(0.0354);
    expect(recordSuccess.sandsCharged).toBe(10);
    expect(recordSuccess.sandsRefunded).toBe(0);

    // Failed AI request must record refund and 0 sands consumed
    const recordFailure = buildPersistentAiTelemetryRecord({
      model: "gemini-1.5-flash",
      promptTokens: 3500,
      completionTokens: 0,
      isSuccess: false,
      sandsCharged: 10,
      isPayPerUse: true,
    });

    expect(recordFailure.isSuccess).toBe(false);
    expect(recordFailure.sandsCharged).toBe(0); // Not counted as consumed
    expect(recordFailure.sandsRefunded).toBe(10); // Automatically refunded
  });

  // ── TEST 5: Unit Economics & Ratios Calculation ────────────────────────────
  it("should calculate exact unit economics, margins, burn rates, and liabilities", () => {
    const metrics = calculateUnitEconomicsMetrics({
      totalAiCostThb: 230.57,
      totalRevenueThb: 70500.0,
      activeUsersCount: 450,
      totalPayingUsersCount: 220,
      totalOutstandingSands: 4400,
      sandsConsumed: 600,
      periodDays: 30,
    });

    // AI Cost / Revenue = (230.57 / 70500) * 100 = 0.33%
    expect(metrics.aiCostToRevenueRatioPercent).toBe(0.33);
    // Gross Margin = (70500 - 230.57) / 70500 = 99.67%
    expect(metrics.grossMarginPercent).toBe(99.67);
    // AI Cost / Active User = 230.57 / 450 = 0.512 THB
    expect(metrics.aiCostPerActiveUserThb).toBe(0.512);
    // Sands Burn Rate = 600 / 30 = 20 Sands/day
    expect(metrics.sandsBurnRatePerDay).toBe(20);
    // Sands Liability / Paying User = 4400 / 220 = 20 Sands/paying user
    expect(metrics.sandsLiabilityPerPayingUser).toBe(20);
    // ARPU = 70500 / 450 = 156.67 THB
    expect(metrics.arpuThb).toBe(156.67);
    // ARPPU = 70500 / 220 = 320.45 THB
    expect(metrics.arppuThb).toBe(320.45);
  });
});
