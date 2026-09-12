import { describe, it, expect, beforeEach } from "vitest";
import {
  AI_PAY_PER_USE_SANDS_COST,
  getAiSandsCost,
  AI_REPORT_LIMIT,
  WISDOM_AI_LIMIT,
  checkQuotaStatus,
  calculateAiCost,
} from "./index.js";
import type { CanonicalPlan } from "@phopephum/types";

describe("PHOPEPHUM V3 — AI QUOTA + SANDS PAY-PER-USE FLOW", () => {
  interface UserAccount {
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

  let users: Map<string, UserAccount>;

  beforeEach(() => {
    users = new Map();
  });

  function getOrCreateUser(id: string, plan: CanonicalPlan, initialSands: number): UserAccount {
    if (!users.has(id)) {
      users.set(id, {
        id,
        plan,
        sandsBalance: initialSands,
        ledger: [],
      });
    }
    return users.get(id)!;
  }

  // Atomic Ledger Debit Mock (Strict Non-Negative & Idempotent)
  function atomicDebit(user: UserAccount, amount: number, referenceId: string): { success: boolean; error?: string } {
    // 1. Idempotency Check
    const existing = user.ledger.find((l) => l.referenceId === referenceId);
    if (existing) {
      return { success: true }; // Already debited
    }

    // 2. Non-negative Balance Check
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

  // Atomic Ledger Credit/Refund Mock (Strict Idempotent)
  function atomicCredit(user: UserAccount, amount: number, referenceId: string): { success: boolean } {
    const existing = user.ledger.find((l) => l.referenceId === referenceId);
    if (existing) {
      return { success: true }; // Already credited
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

  // Simulated Full Preflight + AI + Settlement/Rollback Pipeline
  function executeAiPipeline(options: {
    userId: string;
    plan: CanonicalPlan;
    initialSands: number;
    currentUsage: number;
    featureType: "ai_report" | "wisdom_ai";
    shouldAiSucceed: boolean;
    isRejectedBeforeAi?: boolean;
    requestId: string;
  }) {
    const user = getOrCreateUser(options.userId, options.plan, options.initialSands);

    // 1. Check Entitlement & Quota
    const limit =
      options.featureType === "ai_report"
        ? AI_REPORT_LIMIT[options.plan]
        : WISDOM_AI_LIMIT[options.plan];

    const quotaStatus = checkQuotaStatus({
      currentUsage: options.currentUsage,
      limit,
    });

    const isWithinQuota = quotaStatus.allowed;
    const sandsCost = getAiSandsCost(options.featureType, isWithinQuota);

    // 2. If Rejected Before AI (e.g. rate limit, auth, payload error)
    if (options.isRejectedBeforeAi) {
      return {
        status: 400,
        allowed: false,
        error: "REJECTED_BEFORE_AI",
        userBalance: user.sandsBalance,
        ledgerCount: user.ledger.length,
      };
    }

    // 3. Balance Check & 2-Phase Reservation before AI
    let reservationRefId: string | undefined;
    if (sandsCost > 0) {
      if (user.sandsBalance < sandsCost) {
        return {
          status: 403,
          allowed: false,
          error: "INSUFFICIENT_SANDS",
          userBalance: user.sandsBalance,
          ledgerCount: user.ledger.length,
        };
      }

      reservationRefId = `reserve:${options.featureType}:${user.id}:${options.requestId}`;
      const debitRes = atomicDebit(user, sandsCost, reservationRefId);
      if (!debitRes.success) {
        return {
          status: 403,
          allowed: false,
          error: debitRes.error,
          userBalance: user.sandsBalance,
          ledgerCount: user.ledger.length,
        };
      }
    }

    // 4. AI Execution
    if (!options.shouldAiSucceed) {
      // Rollback / Refund reserved sands
      if (sandsCost > 0 && reservationRefId) {
        const refundRefId = `refund:${reservationRefId}`;
        atomicCredit(user, sandsCost, refundRefId);
      }

      return {
        status: 500,
        allowed: true,
        aiSuccess: false,
        error: "AI_EXECUTION_FAILED",
        userBalance: user.sandsBalance,
        ledgerCount: user.ledger.length,
      };
    }

    // 5. Success Settlement
    return {
      status: 200,
      allowed: true,
      aiSuccess: true,
      sandsCharged: sandsCost,
      isPayPerUse: sandsCost > 0,
      userBalance: user.sandsBalance,
      ledgerCount: user.ledger.length,
    };
  }

  // ── TEST 1: Wisdom AI within quota ─────────────────────────────────────────
  it("should not charge Sands when Wisdom AI is within monthly quota (0 Sands)", () => {
    // Premium user has 10 monthly queries. Currently used 5.
    const res = executeAiPipeline({
      userId: "user_prem_within",
      plan: "premium",
      initialSands: 20,
      currentUsage: 5,
      featureType: "wisdom_ai",
      shouldAiSucceed: true,
      requestId: "req_001",
    });

    expect(res.status).toBe(200);
    expect(res.sandsCharged).toBe(0);
    expect(res.isPayPerUse).toBe(false);
    expect(res.userBalance).toBe(20); // No deduction
    expect(res.ledgerCount).toBe(0);
  });

  // ── TEST 2: Wisdom AI exceeded quota (Pay-Per-Use: 1 Sands) ────────────────
  it("should charge exactly 1 Sands when Wisdom AI exceeds monthly quota", () => {
    // Premium user has 10 monthly queries. Currently used 10 (exceeded).
    const res = executeAiPipeline({
      userId: "user_prem_exceeded",
      plan: "premium",
      initialSands: 20,
      currentUsage: 10,
      featureType: "wisdom_ai",
      shouldAiSucceed: true,
      requestId: "req_002",
    });

    expect(res.status).toBe(200);
    expect(res.sandsCharged).toBe(1);
    expect(res.isPayPerUse).toBe(true);
    expect(res.userBalance).toBe(19); // 20 - 1 = 19
    expect(res.ledgerCount).toBe(1); // 1 debit in ledger
  });

  // ── TEST 3: AI Life Report within quota ────────────────────────────────────
  it("should not charge Sands when AI Life Report is within monthly quota (0 Sands)", () => {
    // Pro user has 5 monthly reports. Currently used 2.
    const res = executeAiPipeline({
      userId: "user_pro_within",
      plan: "pro",
      initialSands: 50,
      currentUsage: 2,
      featureType: "ai_report",
      shouldAiSucceed: true,
      requestId: "req_003",
    });

    expect(res.status).toBe(200);
    expect(res.sandsCharged).toBe(0);
    expect(res.isPayPerUse).toBe(false);
    expect(res.userBalance).toBe(50);
    expect(res.ledgerCount).toBe(0);
  });

  // ── TEST 4: AI Life Report exceeded quota (Pay-Per-Use: 10 Sands) ──────────
  it("should charge exactly 10 Sands when AI Life Report exceeds quota or for Free users", () => {
    // Free user has 0 monthly reports. Wants to generate report with 10 Sands.
    const res = executeAiPipeline({
      userId: "user_free_report",
      plan: "free",
      initialSands: 15,
      currentUsage: 0,
      featureType: "ai_report",
      shouldAiSucceed: true,
      requestId: "req_004",
    });

    expect(res.status).toBe(200);
    expect(res.sandsCharged).toBe(10);
    expect(res.isPayPerUse).toBe(true);
    expect(res.userBalance).toBe(5); // 15 - 10 = 5
    expect(res.ledgerCount).toBe(1);
  });

  // ── TEST 5: Insufficient Sands rejection before AI ─────────────────────────
  it("should reject with 403 and never call AI if Sands balance is insufficient", () => {
    // Free user has only 3 Sands (needs 10 Sands for report)
    const res = executeAiPipeline({
      userId: "user_broke",
      plan: "free",
      initialSands: 3,
      currentUsage: 0,
      featureType: "ai_report",
      shouldAiSucceed: true,
      requestId: "req_005",
    });

    expect(res.status).toBe(403);
    expect(res.allowed).toBe(false);
    expect(res.error).toBe("INSUFFICIENT_SANDS");
    expect(res.userBalance).toBe(3); // Untouched
    expect(res.ledgerCount).toBe(0); // No transaction written
  });

  // ── TEST 6: Automatic Refund on AI Failure ─────────────────────────────────
  it("should automatically refund reserved Sands if AI execution fails", () => {
    const user = getOrCreateUser("user_failure_case", "free", 20);

    const res = executeAiPipeline({
      userId: "user_failure_case",
      plan: "free",
      initialSands: 20,
      currentUsage: 0,
      featureType: "ai_report", // 10 Sands
      shouldAiSucceed: false, // AI Crashes
      requestId: "req_006",
    });

    expect(res.status).toBe(500);
    expect(res.aiSuccess).toBe(false);
    expect(user.sandsBalance).toBe(20); // Restored back to 20
    expect(user.ledger.length).toBe(2); // 1 debit (-10) + 1 refund credit (+10)
    expect(user.ledger[0].amount).toBe(-10);
    expect(user.ledger[1].amount).toBe(10);
  });

  // ── TEST 7: No debit if rejected before AI ─────────────────────────────────
  it("should NEVER debit Sands if request is rejected before AI invocation", () => {
    const res = executeAiPipeline({
      userId: "user_rejected_preflight",
      plan: "free",
      initialSands: 50,
      currentUsage: 0,
      featureType: "ai_report",
      shouldAiSucceed: true,
      isRejectedBeforeAi: true, // e.g. Rate limit hit
      requestId: "req_007",
    });

    expect(res.status).toBe(400);
    expect(res.userBalance).toBe(50); // Untouched
    expect(res.ledgerCount).toBe(0);
  });

  // ── TEST 8: Idempotency & Non-Negative Invariant ───────────────────────────
  it("should strictly enforce idempotency and prevent double-debiting or negative balances", () => {
    const user = getOrCreateUser("user_idempotency_test", "premium", 1);

    // First debit with req_idempotent_1 (Balance: 1 -> 0)
    const debit1 = atomicDebit(user, 1, "reserve:wisdom_ai:user_idempotency_test:req_idempotent_1");
    expect(debit1.success).toBe(true);
    expect(user.sandsBalance).toBe(0);

    // Duplicate call with same referenceId (Idempotent: no additional debit)
    const debitDuplicate = atomicDebit(user, 1, "reserve:wisdom_ai:user_idempotency_test:req_idempotent_1");
    expect(debitDuplicate.success).toBe(true);
    expect(user.sandsBalance).toBe(0); // Still 0, not -1
    expect(user.ledger.length).toBe(1); // Still only 1 ledger entry

    // New request when balance is 0 (Must reject, never go negative)
    const debitNew = atomicDebit(user, 1, "reserve:wisdom_ai:user_idempotency_test:req_idempotent_2");
    expect(debitNew.success).toBe(false);
    expect(debitNew.error).toBe("INSUFFICIENT_SANDS");
    expect(user.sandsBalance).toBe(0);
  });
});
