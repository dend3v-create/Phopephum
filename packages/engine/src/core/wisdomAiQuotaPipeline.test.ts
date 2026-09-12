import { describe, it, expect, beforeEach } from "vitest";
import {
  WISDOM_AI_LIMIT,
  AI_PAY_PER_USE_SANDS_COST,
  getWisdomAiLimit,
  getAiSandsCost,
  checkQuotaStatus,
  calculateAiCost,
  checkAiRateLimit,
  checkAiConcurrency,
} from "./index.js";
import type { CanonicalPlan } from "@phopephum/types";

describe("PHOPEPHUM V3 — WISDOM AI QUOTA & PAY-PER-USE PIPELINE", () => {
  interface UserProfileState {
    id: string;
    plan: CanonicalPlan;
    sandsBalance: number;
    monthlyQueriesUsed: number;
    ledger: Array<{
      id: string;
      amount: number;
      type: "debit" | "credit";
      referenceId: string;
      balanceAfter: number;
    }>;
  }

  let db: Map<string, UserProfileState>;

  beforeEach(() => {
    db = new Map();
  });

  function getMockUser(id: string, plan: CanonicalPlan, initialSands: number, usedQueries: number = 0): UserProfileState {
    if (!db.has(id)) {
      db.set(id, {
        id,
        plan,
        sandsBalance: initialSands,
        monthlyQueriesUsed: usedQueries,
        ledger: [],
      });
    }
    return db.get(id)!;
  }

  function debitSands(user: UserProfileState, amount: number, referenceId: string) {
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

  function refundSands(user: UserProfileState, amount: number, referenceId: string) {
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

  function executeWisdomAiChat(options: {
    userId: string;
    plan: CanonicalPlan;
    initialSands: number;
    monthlyQueriesUsed: number;
    shouldAiSucceed: boolean;
    isRejectedEarly?: boolean;
    requestId: string;
  }) {
    const user = getMockUser(options.userId, options.plan, options.initialSands, options.monthlyQueriesUsed);

    // 1. Quota Check (SSoT)
    const limit = WISDOM_AI_LIMIT[options.plan];
    const quota = checkQuotaStatus({
      currentUsage: user.monthlyQueriesUsed,
      limit,
    });

    const isWithinQuota = quota.allowed;
    const sandsRequired = getAiSandsCost("wisdom_ai", isWithinQuota);

    // 2. Early rejection (e.g. rate limit, auth)
    if (options.isRejectedEarly) {
      return {
        status: 429,
        allowed: false,
        error: "RATE_LIMIT_EXCEEDED",
        balance: user.sandsBalance,
        ledgerEntries: user.ledger.length,
      };
    }

    // 3. 2-Phase Reservation
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

      reservationRef = `reserve:wisdom_ai:${user.id}:${options.requestId}`;
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

    // 4. AI Call
    if (!options.shouldAiSucceed) {
      if (sandsRequired > 0 && reservationRef) {
        refundSands(user, sandsRequired, `refund:${reservationRef}`);
      }
      return {
        status: 500,
        allowed: true,
        aiSuccess: false,
        error: "AI_WORKER_ERROR",
        balance: user.sandsBalance,
        ledgerEntries: user.ledger.length,
      };
    }

    // 5. Success Settlement
    user.monthlyQueriesUsed += 1;
    const cost = calculateAiCost({
      model: "deepseek-chat",
      promptTokens: 800,
      completionTokens: 1200,
    });

    return {
      status: 200,
      allowed: true,
      aiSuccess: true,
      isPayPerUse: sandsRequired > 0,
      sandsCharged: sandsRequired,
      balance: user.sandsBalance,
      ledgerEntries: user.ledger.length,
      monthlyQueriesUsed: user.monthlyQueriesUsed,
      cost,
    };
  }

  it("should verify exact SSoT monthly quota for all plans (Free 5, Premium 20, Pro 100, Master 100)", () => {
    expect(WISDOM_AI_LIMIT.free).toBe(5);
    expect(WISDOM_AI_LIMIT.premium).toBe(20);
    expect(WISDOM_AI_LIMIT.pro).toBe(100);
    expect(WISDOM_AI_LIMIT.master).toBe(100);
    expect(AI_PAY_PER_USE_SANDS_COST.wisdom_ai).toBe(1);
  });

  it("should allow Free user 5 queries for 0 Sands, then charge 1 Sands for query #6", () => {
    // Query 5: within quota
    const res5 = executeWisdomAiChat({
      userId: "free_user",
      plan: "free",
      initialSands: 10,
      monthlyQueriesUsed: 4,
      shouldAiSucceed: true,
      requestId: "req_f5",
    });
    expect(res5.status).toBe(200);
    expect(res5.isPayPerUse).toBe(false);
    expect(res5.sandsCharged).toBe(0);
    expect(res5.balance).toBe(10);

    // Query 6: exceeds quota -> 1 Sands
    const res6 = executeWisdomAiChat({
      userId: "free_user",
      plan: "free",
      initialSands: 10,
      monthlyQueriesUsed: 5,
      shouldAiSucceed: true,
      requestId: "req_f6",
    });
    expect(res6.status).toBe(200);
    expect(res6.isPayPerUse).toBe(true);
    expect(res6.sandsCharged).toBe(1);
    expect(res6.balance).toBe(9); // 10 - 1 = 9
  });

  it("should reject Free user with 0 Sands when exceeding 5 queries and never call AI", () => {
    const res = executeWisdomAiChat({
      userId: "free_broke_user",
      plan: "free",
      initialSands: 0,
      monthlyQueriesUsed: 5,
      shouldAiSucceed: true,
      requestId: "req_f_broke",
    });

    expect(res.status).toBe(403);
    expect(res.allowed).toBe(false);
    expect(res.error).toBe("INSUFFICIENT_SANDS");
    expect(res.balance).toBe(0);
    expect(res.ledgerEntries).toBe(0);
  });

  it("should allow Premium user 20 queries, Pro user 100 queries, and charge 1 Sands beyond", () => {
    // Premium query 20 (within quota)
    const prem20 = executeWisdomAiChat({
      userId: "prem_u",
      plan: "premium",
      initialSands: 10,
      monthlyQueriesUsed: 19,
      shouldAiSucceed: true,
      requestId: "req_p20",
    });
    expect(prem20.isPayPerUse).toBe(false);
    expect(prem20.sandsCharged).toBe(0);

    // Premium query 21 (exceeded)
    const prem21 = executeWisdomAiChat({
      userId: "prem_u",
      plan: "premium",
      initialSands: 10,
      monthlyQueriesUsed: 20,
      shouldAiSucceed: true,
      requestId: "req_p21",
    });
    expect(prem21.isPayPerUse).toBe(true);
    expect(prem21.sandsCharged).toBe(1);
    expect(prem21.balance).toBe(9);

    // Pro query 100 (within quota)
    const pro100 = executeWisdomAiChat({
      userId: "pro_u",
      plan: "pro",
      initialSands: 20,
      monthlyQueriesUsed: 99,
      shouldAiSucceed: true,
      requestId: "req_pro100",
    });
    expect(pro100.isPayPerUse).toBe(false);
    expect(pro100.sandsCharged).toBe(0);

    // Pro query 101 (exceeded)
    const pro101 = executeWisdomAiChat({
      userId: "pro_u",
      plan: "pro",
      initialSands: 20,
      monthlyQueriesUsed: 100,
      shouldAiSucceed: true,
      requestId: "req_pro101",
    });
    expect(pro101.isPayPerUse).toBe(true);
    expect(pro101.sandsCharged).toBe(1);
    expect(pro101.balance).toBe(19);
  });

  it("should automatically refund 1 Sands on upstream AI failure or timeout", () => {
    const user = getMockUser("fail_user", "free", 10, 5);

    const res = executeWisdomAiChat({
      userId: "fail_user",
      plan: "free",
      initialSands: 10,
      monthlyQueriesUsed: 5, // Requires 1 Sands
      shouldAiSucceed: false, // Upstream AI drops connection
      requestId: "req_fail_wisdom",
    });

    expect(res.status).toBe(500);
    expect(res.aiSuccess).toBe(false);
    expect(user.sandsBalance).toBe(10); // Fully refunded
    expect(user.ledger.length).toBe(2);
    expect(user.ledger[0].amount).toBe(-1);
    expect(user.ledger[1].amount).toBe(1);
  });

  it("should enforce Master Fair-Use ceiling (100 baseline) and concurrency protection", () => {
    // Master query 100: within quota
    const m100 = executeWisdomAiChat({
      userId: "master_u",
      plan: "master",
      initialSands: 50,
      monthlyQueriesUsed: 99,
      shouldAiSucceed: true,
      requestId: "req_m100",
    });
    expect(m100.isPayPerUse).toBe(false);
    expect(m100.sandsCharged).toBe(0);

    // Master query 101: exceeds baseline quota -> 1 Sands
    const m101 = executeWisdomAiChat({
      userId: "master_u",
      plan: "master",
      initialSands: 50,
      monthlyQueriesUsed: 100,
      shouldAiSucceed: true,
      requestId: "req_m101",
    });
    expect(m101.isPayPerUse).toBe(true);
    expect(m101.sandsCharged).toBe(1);

    // Concurrency limit check
    const concCheck = checkAiConcurrency(2, "master");
    expect(concCheck.allowed).toBe(false); // Max 2 parallel streams even for Master
  });
});
