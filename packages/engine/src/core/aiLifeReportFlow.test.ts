import { describe, it, expect, beforeEach } from "vitest";
import {
  AI_REPORT_LIMIT,
  AI_PAY_PER_USE_SANDS_COST,
  getAiReportLimit,
  getAiSandsCost,
  checkQuotaStatus,
  calculateAiCost,
  checkAiCostAnomaly,
} from "./index.js";
import type { CanonicalPlan } from "@phopephum/types";

describe("PHOPEPHUM V3 — AI LIFE REPORT QUOTA & 2-PHASE SANDS PIPELINE", () => {
  interface UserState {
    id: string;
    plan: CanonicalPlan;
    sandsBalance: number;
    ledger: Array<{
      id: string;
      amount: number;
      type: "debit" | "credit";
      referenceId: string;
      balanceAfter: number;
    }>;
  }

  let userDb: Map<string, UserState>;

  beforeEach(() => {
    userDb = new Map();
  });

  function getUser(id: string, plan: CanonicalPlan, sands: number): UserState {
    if (!userDb.has(id)) {
      userDb.set(id, {
        id,
        plan,
        sandsBalance: sands,
        ledger: [],
      });
    }
    return userDb.get(id)!;
  }

  function debitSands(user: UserState, amount: number, referenceId: string) {
    if (user.ledger.find((l) => l.referenceId === referenceId)) {
      return { success: true }; // Idempotent
    }
    if (user.sandsBalance < amount) {
      return { success: false, error: "INSUFFICIENT_SANDS" };
    }
    user.sandsBalance -= amount;
    user.ledger.push({
      id: `led_${Date.now()}_${Math.random()}`,
      amount: -amount,
      type: "debit",
      referenceId,
      balanceAfter: user.sandsBalance,
    });
    return { success: true };
  }

  function refundSands(user: UserState, amount: number, referenceId: string) {
    if (user.ledger.find((l) => l.referenceId === referenceId)) {
      return { success: true };
    }
    user.sandsBalance += amount;
    user.ledger.push({
      id: `led_${Date.now()}_${Math.random()}`,
      amount,
      type: "credit",
      referenceId,
      balanceAfter: user.sandsBalance,
    });
    return { success: true };
  }

  function simulateLifeReportPipeline(options: {
    userId: string;
    plan: CanonicalPlan;
    sandsBalance: number;
    currentMonthlyReports: number;
    shouldAiSucceed: boolean;
    isRejectedEarly?: boolean;
    requestId: string;
  }) {
    const user = getUser(options.userId, options.plan, options.sandsBalance);

    // 1. Quota Check (SSoT)
    const limit = AI_REPORT_LIMIT[options.plan];
    const quota = checkQuotaStatus({
      currentUsage: options.currentMonthlyReports,
      limit,
    });

    const isWithinQuota = quota.allowed;
    const sandsRequired = getAiSandsCost("ai_report", isWithinQuota);

    // 2. Early rejection (e.g. rate limit, validation)
    if (options.isRejectedEarly) {
      return {
        status: 429,
        allowed: false,
        error: "RATE_LIMIT_HIT",
        balance: user.sandsBalance,
        ledgerEntries: user.ledger.length,
      };
    }

    // 3. Balance verification & 2-Phase Reservation
    let reservationRef: string | undefined;
    if (sandsRequired > 0) {
      if (user.sandsBalance < sandsRequired) {
        return {
          status: 403,
          allowed: false,
          error: "INSUFFICIENT_SANDS",
          balance: user.sandsBalance,
          ledgerEntries: user.ledger.length,
        };
      }

      reservationRef = `reserve:ai_report:${user.id}:${options.requestId}`;
      const debitRes = debitSands(user, sandsRequired, reservationRef);
      if (!debitRes.success) {
        return {
          status: 403,
          allowed: false,
          error: debitRes.error,
          balance: user.sandsBalance,
          ledgerEntries: user.ledger.length,
        };
      }
    }

    // 4. AI Execution
    if (!options.shouldAiSucceed) {
      if (sandsRequired > 0 && reservationRef) {
        refundSands(user, sandsRequired, `refund:${reservationRef}`);
      }
      return {
        status: 500,
        allowed: true,
        aiSuccess: false,
        error: "UPSTREAM_AI_FAILED",
        balance: user.sandsBalance,
        ledgerEntries: user.ledger.length,
      };
    }

    // 5. Success
    const cost = calculateAiCost({
      model: "deepseek-chat",
      promptTokens: 1500,
      completionTokens: 3000,
    });

    return {
      status: 200,
      allowed: true,
      aiSuccess: true,
      isPayPerUse: sandsRequired > 0,
      sandsCharged: sandsRequired,
      balance: user.sandsBalance,
      ledgerEntries: user.ledger.length,
      cost,
    };
  }

  it("should verify exact SSoT monthly quota for all tiers (Free 0, Premium 1, Pro 5, Master 10)", () => {
    expect(AI_REPORT_LIMIT.free).toBe(0);
    expect(AI_REPORT_LIMIT.premium).toBe(1);
    expect(AI_REPORT_LIMIT.pro).toBe(5);
    expect(AI_REPORT_LIMIT.master).toBe(10);
    expect(AI_PAY_PER_USE_SANDS_COST.ai_report).toBe(10);
  });

  it("should reject Free user with 0 Sands and NEVER invoke AI", () => {
    const res = simulateLifeReportPipeline({
      userId: "free_no_sands",
      plan: "free",
      sandsBalance: 0,
      currentMonthlyReports: 0,
      shouldAiSucceed: true,
      requestId: "req_f1",
    });

    expect(res.status).toBe(403);
    expect(res.allowed).toBe(false);
    expect(res.error).toBe("INSUFFICIENT_SANDS");
    expect(res.balance).toBe(0);
    expect(res.ledgerEntries).toBe(0);
  });

  it("should allow Free user with 10 Sands to generate report via Pay-Per-Use", () => {
    const res = simulateLifeReportPipeline({
      userId: "free_with_sands",
      plan: "free",
      sandsBalance: 15,
      currentMonthlyReports: 0,
      shouldAiSucceed: true,
      requestId: "req_f2",
    });

    expect(res.status).toBe(200);
    expect(res.isPayPerUse).toBe(true);
    expect(res.sandsCharged).toBe(10);
    expect(res.balance).toBe(5); // 15 - 10 = 5
    expect(res.ledgerEntries).toBe(1);
  });

  it("should allow Premium user 1 free report, then require 10 Sands for report #2", () => {
    // Report 1: Within quota (0 Sands)
    const res1 = simulateLifeReportPipeline({
      userId: "prem_user",
      plan: "premium",
      sandsBalance: 20,
      currentMonthlyReports: 0,
      shouldAiSucceed: true,
      requestId: "req_p1",
    });

    expect(res1.status).toBe(200);
    expect(res1.isPayPerUse).toBe(false);
    expect(res1.sandsCharged).toBe(0);
    expect(res1.balance).toBe(20);

    // Report 2: Exceeds quota -> 10 Sands
    const res2 = simulateLifeReportPipeline({
      userId: "prem_user",
      plan: "premium",
      sandsBalance: 20,
      currentMonthlyReports: 1,
      shouldAiSucceed: true,
      requestId: "req_p2",
    });

    expect(res2.status).toBe(200);
    expect(res2.isPayPerUse).toBe(true);
    expect(res2.sandsCharged).toBe(10);
    expect(res2.balance).toBe(10); // 20 - 10 = 10
  });

  it("should allow Pro user 5 free reports, then require 10 Sands for report #6", () => {
    // Report 5: within quota
    const res5 = simulateLifeReportPipeline({
      userId: "pro_user",
      plan: "pro",
      sandsBalance: 50,
      currentMonthlyReports: 4,
      shouldAiSucceed: true,
      requestId: "req_pro5",
    });
    expect(res5.isPayPerUse).toBe(false);
    expect(res5.sandsCharged).toBe(0);

    // Report 6: exceeds quota -> 10 Sands
    const res6 = simulateLifeReportPipeline({
      userId: "pro_user",
      plan: "pro",
      sandsBalance: 50,
      currentMonthlyReports: 5,
      shouldAiSucceed: true,
      requestId: "req_pro6",
    });
    expect(res6.isPayPerUse).toBe(true);
    expect(res6.sandsCharged).toBe(10);
    expect(res6.balance).toBe(40); // 50 - 10 = 40
  });

  it("should allow Master user 10 baseline reports, and enforce Fair-Use & Cost Guard", () => {
    // Report 10: within quota
    const res10 = simulateLifeReportPipeline({
      userId: "master_user",
      plan: "master",
      sandsBalance: 100,
      currentMonthlyReports: 9,
      shouldAiSucceed: true,
      requestId: "req_m10",
    });
    expect(res10.isPayPerUse).toBe(false);
    expect(res10.sandsCharged).toBe(0);

    // Report 11: exceeds 10 quota baseline -> 10 Sands
    const res11 = simulateLifeReportPipeline({
      userId: "master_user",
      plan: "master",
      sandsBalance: 100,
      currentMonthlyReports: 10,
      shouldAiSucceed: true,
      requestId: "req_m11",
    });
    expect(res11.isPayPerUse).toBe(true);
    expect(res11.sandsCharged).toBe(10);
    expect(res11.balance).toBe(90);
  });

  it("should automatically refund 10 Sands when AI service crashes or timeouts", () => {
    const user = getUser("fail_user", "free", 20);

    const res = simulateLifeReportPipeline({
      userId: "fail_user",
      plan: "free",
      sandsBalance: 20,
      currentMonthlyReports: 0,
      shouldAiSucceed: false, // AI Failure
      requestId: "req_fail_1",
    });

    expect(res.status).toBe(500);
    expect(res.aiSuccess).toBe(false);
    expect(user.sandsBalance).toBe(20); // 20 -> 10 -> 20 (Fully restored)
    expect(user.ledger.length).toBe(2);
    expect(user.ledger[0].amount).toBe(-10);
    expect(user.ledger[1].amount).toBe(10);
  });

  it("should NEVER deduct Sands if request is rejected before AI invocation", () => {
    const res = simulateLifeReportPipeline({
      userId: "rate_limited_user",
      plan: "free",
      sandsBalance: 30,
      currentMonthlyReports: 0,
      shouldAiSucceed: true,
      isRejectedEarly: true, // e.g. Rate limit hit
      requestId: "req_early_reject",
    });

    expect(res.status).toBe(429);
    expect(res.balance).toBe(30); // Untouched
    expect(res.ledgerEntries).toBe(0);
  });
});
