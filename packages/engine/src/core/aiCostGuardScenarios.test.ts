import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AI_MODEL_PRICING,
  USD_TO_THB_EXCHANGE_RATE,
  AI_GUARD_CONFIG,
  calculateAiCost,
  checkAiCostAnomaly,
  checkAiConcurrency,
  checkAiRateLimit,
  checkQuotaSoftWarning,
  estimateTokensFromText,
  AI_REPORT_LIMIT,
  WISDOM_AI_LIMIT,
  checkQuotaStatus,
} from "../index.js";
import type { CanonicalPlan } from "@phopephum/types";

describe("PHOPEPHUM V3 — AI COST GUARD COMPREHENSIVE SUITE", () => {
  // In-memory slot & rate tracker simulator for server-side guard
  let activeSlots: Map<string, number>;
  let userRates: Map<string, { lastTime: number; countMinute: number; cooldownUntil?: number }>;
  let alertsDispatched: Array<{ type: string; severity: string; message: string }>;

  beforeEach(() => {
    activeSlots = new Map();
    userRates = new Map();
    alertsDispatched = [];
  });

  function mockSendAlert(type: string, severity: string, message: string) {
    alertsDispatched.push({ type, severity, message });
  }

  function simulatePreflight(
    userId: string,
    plan: CanonicalPlan,
    currentUsage: number,
    featureType: "ai_report" | "wisdom_ai",
    now: number = Date.now()
  ) {
    // 1. Quota Check (SSoT)
    const limit = featureType === "ai_report" ? AI_REPORT_LIMIT[plan] : WISDOM_AI_LIMIT[plan];
    const quotaCheck = checkQuotaStatus({ currentUsage, limit });
    if (!quotaCheck.allowed) {
      return {
        allowed: false,
        status: 403,
        code: "QUOTA_EXCEEDED",
        error: `Quota exceeded: ${currentUsage}/${limit}`,
      };
    }

    // 2. Rate Limit Check
    const rateRecord = userRates.get(userId) || { lastTime: 0, countMinute: 0 };
    const rateCheck = checkAiRateLimit(
      {
        lastRequestTime: rateRecord.lastTime,
        requestCountLastMinute: rateRecord.countMinute,
        cooldownUntil: rateRecord.cooldownUntil,
      },
      plan,
      now
    );

    if (!rateCheck.allowed) {
      mockSendAlert("ai_rate_limit_spike", "warning", `Rate limit hit: ${rateCheck.reason}`);
      return {
        allowed: false,
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
        error: rateCheck.reason,
      };
    }

    // 3. Concurrency Limit Check
    const currentActive = activeSlots.get(userId) || 0;
    const concCheck = checkAiConcurrency(currentActive, plan);
    if (!concCheck.allowed) {
      mockSendAlert("ai_concurrency_exceeded", "warning", `Concurrent limit hit (${currentActive}/${concCheck.limit})`);
      return {
        allowed: false,
        status: 429,
        code: "CONCURRENT_REQUEST_LIMIT",
        error: concCheck.reason,
      };
    }

    // Acquire slot & update rate
    activeSlots.set(userId, currentActive + 1);
    userRates.set(userId, {
      lastTime: now,
      countMinute: rateRecord.countMinute + 1,
      cooldownUntil: rateRecord.cooldownUntil,
    });

    const releaseSlot = () => {
      const active = activeSlots.get(userId) || 1;
      if (active <= 1) {
        activeSlots.delete(userId);
      } else {
        activeSlots.set(userId, active - 1);
      }
    };

    const softWarn = checkQuotaSoftWarning(currentUsage + 1, limit);

    return {
      allowed: true,
      status: 200,
      releaseSlot,
      softWarning: softWarn.isSoftWarning,
      remainingQuota: quotaCheck.remaining,
    };
  }

  function simulatePostExecution(
    userId: string,
    reportType: string,
    releaseSlot: () => void,
    output: { promptTokens?: number; completionTokens?: number; text?: string; isSuccess: boolean; error?: Error }
  ) {
    // 1. Release slot always
    releaseSlot();

    if (!output.isSuccess) {
      mockSendAlert("ai_generation_failed", "critical", `AI failed: ${output.error?.message}`);
      return { isSuccess: false, cost: null };
    }

    // 2. Compute cost from SSoT
    const cost = calculateAiCost({
      model: "deepseek-chat",
      promptTokens: output.promptTokens,
      completionTokens: output.completionTokens,
      completionText: output.text,
    });

    // 3. Anomaly check
    const anomaly = checkAiCostAnomaly(cost);
    if (anomaly.isAnomaly) {
      mockSendAlert("ai_cost_anomaly", anomaly.severity || "warning", `Anomaly: ${anomaly.reason}`);
    }

    return { isSuccess: true, cost, anomaly };
  }

  // ── TEST 1: Normal User ───────────────────────────────────────────────────
  it("Scenario 1: Normal User — successfully acquires slot, executes AI, calculates cost, and releases slot", () => {
    const userId = "user_normal_123";
    const now = 1700000000000;

    // Preflight for Premium user with 0/1 report used
    const preflight = simulatePreflight(userId, "premium", 0, "ai_report", now);
    expect(preflight.allowed).toBe(true);
    expect(preflight.status).toBe(200);
    expect(activeSlots.get(userId)).toBe(1);

    // AI Execution succeeds
    const postExec = simulatePostExecution(userId, "general_prediction", preflight.releaseSlot!, {
      promptTokens: 1200,
      completionTokens: 2500,
      isSuccess: true,
    });

    expect(postExec.isSuccess).toBe(true);
    expect(postExec.cost?.costUsd).toBeGreaterThan(0);
    expect(postExec.cost?.costThb).toBeGreaterThan(0);
    expect(postExec.anomaly?.isAnomaly).toBe(false);
    expect(activeSlots.get(userId)).toBeUndefined(); // Slot cleanly released
    expect(alertsDispatched.length).toBe(0);
  });

  // ── TEST 2: Quota Exceeded ────────────────────────────────────────────────
  it("Scenario 2: Quota Exceeded — Free (0 reports) & Premium (1 report reached) rejected with 403 & zero AI calls", () => {
    const freeUser = "user_free_1";
    const premiumUser = "user_prem_1";

    // Free user trying to generate AI report (Limit: 0)
    const freeRes = simulatePreflight(freeUser, "free", 0, "ai_report");
    expect(freeRes.allowed).toBe(false);
    expect(freeRes.status).toBe(403);
    expect(freeRes.code).toBe("QUOTA_EXCEEDED");
    expect(activeSlots.get(freeUser)).toBeUndefined(); // No slot consumed

    // Premium user who already generated 1 report (Limit: 1)
    const premRes = simulatePreflight(premiumUser, "premium", 1, "ai_report");
    expect(premRes.allowed).toBe(false);
    expect(premRes.status).toBe(403);
    expect(premRes.code).toBe("QUOTA_EXCEEDED");
    expect(activeSlots.get(premiumUser)).toBeUndefined();
  });

  // ── TEST 3: Rate Limit Exceeded ───────────────────────────────────────────
  it("Scenario 3: Rate Exceeded — rapid requests (< 2s interval) rejected with 429 and cooldown info", () => {
    const userId = "user_rate_tester";
    const t0 = 1700000000000;

    // First request at t0
    const req1 = simulatePreflight(userId, "pro", 0, "wisdom_ai", t0);
    expect(req1.allowed).toBe(true);
    req1.releaseSlot!();

    // Second request immediately at t0 + 500ms (< 2000ms cooldown)
    const req2 = simulatePreflight(userId, "pro", 0, "wisdom_ai", t0 + 500);
    expect(req2.allowed).toBe(false);
    expect(req2.status).toBe(429);
    expect(req2.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(alertsDispatched.some((a) => a.type === "ai_rate_limit_spike")).toBe(true);
  });

  // ── TEST 4: Concurrent Limit Exceeded ─────────────────────────────────────
  it("Scenario 4: Concurrent Exceeded — Free/Premium user cannot run 2 requests in parallel", () => {
    const userId = "user_concurrent_test";
    const now = 1700000000000;

    // First in-flight request
    const req1 = simulatePreflight(userId, "premium", 0, "wisdom_ai", now);
    expect(req1.allowed).toBe(true);
    expect(activeSlots.get(userId)).toBe(1);

    // Second parallel request while req1 is still in-flight
    const req2 = simulatePreflight(userId, "premium", 0, "wisdom_ai", now + 3000);
    expect(req2.allowed).toBe(false);
    expect(req2.status).toBe(429);
    expect(req2.code).toBe("CONCURRENT_REQUEST_LIMIT");
    expect(alertsDispatched.some((a) => a.type === "ai_concurrency_exceeded")).toBe(true);

    // After req1 finishes, next request is allowed
    req1.releaseSlot!();
    expect(activeSlots.get(userId)).toBeUndefined();

    const req3 = simulatePreflight(userId, "premium", 0, "wisdom_ai", now + 6000);
    expect(req3.allowed).toBe(true);
    req3.releaseSlot!();
  });

  // ── TEST 5: High-Cost Request Anomaly ─────────────────────────────────────
  it("Scenario 5: High-Cost Request — abnormally large token generation triggers anomaly detection & alert", () => {
    const userId = "user_anomaly_tester";
    const preflight = simulatePreflight(userId, "pro", 0, "ai_report");
    expect(preflight.allowed).toBe(true);

    // Post-execution with 10,000 output tokens (> 8,192 threshold)
    const postExec = simulatePostExecution(userId, "general_prediction", preflight.releaseSlot!, {
      promptTokens: 2000,
      completionTokens: 10000,
      isSuccess: true,
    });

    expect(postExec.anomaly?.isAnomaly).toBe(true);
    expect(postExec.anomaly?.severity).toBe("warning");
    expect(alertsDispatched.some((a) => a.type === "ai_cost_anomaly")).toBe(true);
  });

  // ── TEST 6: Master Fair-Use Enforcement ───────────────────────────────────
  it("Scenario 6: Master Fair-Use — Master has generous limits (10 reports, 100 wisdom chats) but is strictly capped (NOT infinite unmetered)", () => {
    const masterUser = "user_master_emperor";
    let t = 1700000000000;

    // 1. AI Report limit for Master is 10/month
    expect(AI_REPORT_LIMIT.master).toBe(10);
    const reportAllowed = simulatePreflight(masterUser, "master", 9, "ai_report", t);
    expect(reportAllowed.allowed).toBe(true);
    reportAllowed.releaseSlot!();

    t += 3000;
    const reportBlocked = simulatePreflight(masterUser, "master", 10, "ai_report", t);
    expect(reportBlocked.allowed).toBe(false);
    expect(reportBlocked.code).toBe("QUOTA_EXCEEDED");

    // 2. Wisdom AI limit for Master is 100/month
    expect(WISDOM_AI_LIMIT.master).toBe(100);
    t += 3000;
    const wisdomAllowed = simulatePreflight(masterUser, "master", 99, "wisdom_ai", t);
    expect(wisdomAllowed.allowed).toBe(true);
    wisdomAllowed.releaseSlot!();

    t += 3000;
    const wisdomBlocked = simulatePreflight(masterUser, "master", 100, "wisdom_ai", t);
    expect(wisdomBlocked.allowed).toBe(false);
    expect(wisdomBlocked.code).toBe("QUOTA_EXCEEDED");

    // 3. Concurrency limit for Master is max 2 (Fair Use ceiling)
    t += 3000;
    const conc1 = simulatePreflight(masterUser, "master", 0, "wisdom_ai", t);
    t += 3000;
    const conc2 = simulatePreflight(masterUser, "master", 0, "wisdom_ai", t);
    expect(conc1.allowed).toBe(true);
    expect(conc2.allowed).toBe(true);

    t += 3000;
    const conc3 = simulatePreflight(masterUser, "master", 0, "wisdom_ai", t);
    expect(conc3.allowed).toBe(false); // Master cannot open 3+ parallel streams
    expect(conc3.code).toBe("CONCURRENT_REQUEST_LIMIT");

    conc1.releaseSlot!();
    conc2.releaseSlot!();
  });

  // ── TEST 7: AI Failure Recovery ───────────────────────────────────────────
  it("Scenario 7: AI Failure — properly releases concurrency slot and logs critical alert", () => {
    const userId = "user_fail_test";
    const preflight = simulatePreflight(userId, "pro", 0, "ai_report");
    expect(preflight.allowed).toBe(true);
    expect(activeSlots.get(userId)).toBe(1);

    // AI Call throws an exception / timeout
    const postExec = simulatePostExecution(userId, "general_prediction", preflight.releaseSlot!, {
      isSuccess: false,
      error: new Error("Cloudflare Worker upstream timeout (504)"),
    });

    expect(postExec.isSuccess).toBe(false);
    expect(activeSlots.get(userId)).toBeUndefined(); // Slot released even on fatal error
    expect(alertsDispatched.some((a) => a.type === "ai_generation_failed")).toBe(true);

    // User can immediately retry after failure without being blocked by ghost slots
    const retry = simulatePreflight(userId, "pro", 0, "ai_report", Date.now() + 3000);
    expect(retry.allowed).toBe(true);
    retry.releaseSlot!();
  });
});
