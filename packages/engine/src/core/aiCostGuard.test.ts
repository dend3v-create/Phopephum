import { describe, it, expect } from "vitest";
import {
  AI_MODEL_PRICING,
  USD_TO_THB_EXCHANGE_RATE,
  AI_GUARD_CONFIG,
  estimateTokensFromText,
  calculateAiCost,
  checkAiCostAnomaly,
  checkAiConcurrency,
  checkAiRateLimit,
  checkQuotaSoftWarning,
} from "./aiCostGuard.js";

describe("AI Cost Guard — Core SSoT & Safety Checks", () => {
  describe("1. Pricing SSoT & Cost Calculations", () => {
    it("should accurately calculate cost for DeepSeek Chat based on explicit tokens", () => {
      // 1,000 prompt tokens + 2,000 completion tokens
      const result = calculateAiCost({
        model: "deepseek-chat",
        promptTokens: 1000,
        completionTokens: 2000,
      });

      // Prompt: (1000 / 1M) * 0.14 = $0.00014
      // Completion: (2000 / 1M) * 0.28 = $0.00056
      // Total: $0.00070 USD
      expect(result.costUsd).toBe(0.0007);
      expect(result.costThb).toBe(Number((0.0007 * USD_TO_THB_EXCHANGE_RATE).toFixed(4)));
      expect(result.isEstimated).toBe(false);
      expect(result.totalTokens).toBe(3000);
    });

    it("should estimate tokens and cost from raw text when explicit tokens are missing", () => {
      const promptText = "สวัสดีชาวโลก นี่คือการทดสอบคำถามดวงชะตา";
      const completionText = "คำทำนายของคุณคือดาวพฤหัสบดีโคจรเข้าเรือนลาภะ";

      const result = calculateAiCost({
        model: "deepseek-chat",
        promptText,
        completionText,
      });

      expect(result.isEstimated).toBe(true);
      expect(result.promptTokens).toBeGreaterThan(0);
      expect(result.completionTokens).toBeGreaterThan(0);
      expect(result.costUsd).toBeGreaterThan(0);
      expect(result.costThb).toBeGreaterThan(0);
    });

    it("should fallback to default model if unknown model is provided", () => {
      const result = calculateAiCost({
        model: "unknown-experimental-model",
        promptTokens: 1000,
        completionTokens: 1000,
      });

      expect(result.model).toBe("default");
      expect(result.costUsd).toBe(0.00042); // 0.00014 + 0.00028
    });
  });

  describe("2. Rate Limiting & Cooldown Protection", () => {
    const now = 1700000000000;

    it("should allow a normal user under rate limits", () => {
      const res = checkAiRateLimit(
        {
          lastRequestTime: now - 5000, // 5 seconds ago
          requestCountLastMinute: 1,
        },
        "premium",
        now
      );

      expect(res.allowed).toBe(true);
      expect(res.remainingRequests).toBe(4); // 6 - 2 = 4
    });

    it("should reject rapid burst requests under the minimum interval (< 2s)", () => {
      const res = checkAiRateLimit(
        {
          lastRequestTime: now - 500, // 500ms ago (< 2000ms)
          requestCountLastMinute: 1,
        },
        "pro",
        now
      );

      expect(res.allowed).toBe(false);
      expect(res.cooldownRemainingMs).toBe(1500);
      expect(res.retryAfterSeconds).toBe(2);
      expect(res.reason).toContain("กรุณาเว้นระยะห่าง");
    });

    it("should reject when max per minute rate is exceeded", () => {
      // Free limit is 3 req/min
      const res = checkAiRateLimit(
        {
          lastRequestTime: now - 3000,
          requestCountLastMinute: 3,
        },
        "free",
        now
      );

      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("3 ครั้งต่อนาที");
    });

    it("should block requests when under active penalty cooldown", () => {
      const res = checkAiRateLimit(
        {
          cooldownUntil: now + 30000, // 30s remaining
        },
        "master",
        now
      );

      expect(res.allowed).toBe(false);
      expect(res.retryAfterSeconds).toBe(30);
    });
  });

  describe("3. Concurrency Limits", () => {
    it("should allow 1 concurrent request for Free and Premium", () => {
      expect(checkAiConcurrency(0, "free").allowed).toBe(true);
      expect(checkAiConcurrency(1, "free").allowed).toBe(false);
      expect(checkAiConcurrency(1, "premium").allowed).toBe(false);
    });

    it("should allow up to 2 concurrent requests for Pro and Master (Fair Use ceiling)", () => {
      expect(checkAiConcurrency(0, "pro").allowed).toBe(true);
      expect(checkAiConcurrency(1, "pro").allowed).toBe(true);
      expect(checkAiConcurrency(2, "pro").allowed).toBe(false);

      expect(checkAiConcurrency(0, "master").allowed).toBe(true);
      expect(checkAiConcurrency(1, "master").allowed).toBe(true);
      expect(checkAiConcurrency(2, "master").allowed).toBe(false); // Master Fair Use ceiling
    });
  });

  describe("4. High-Cost Anomaly Detection", () => {
    it("should not flag normal requests as anomalies", () => {
      const normalResult = calculateAiCost({
        model: "deepseek-chat",
        promptTokens: 1500,
        completionTokens: 2500,
      });

      const check = checkAiCostAnomaly(normalResult);
      expect(check.isAnomaly).toBe(false);
    });

    it("should flag excessive output token burst as anomaly (> 8,192 tokens)", () => {
      const highTokensResult = calculateAiCost({
        model: "deepseek-chat",
        promptTokens: 2000,
        completionTokens: 9000,
      });

      const check = checkAiCostAnomaly(highTokensResult);
      expect(check.isAnomaly).toBe(true);
      expect(check.severity).toBe("warning");
      expect(check.reason).toContain("Output token spike");
    });

    it("should flag excessive USD cost spike as critical anomaly (> $0.05 USD)", () => {
      const highCostResult = calculateAiCost({
        model: "claude-3-5-sonnet", // expensive model
        promptTokens: 10000,
        completionTokens: 5000,
      });

      const check = checkAiCostAnomaly(highCostResult);
      expect(check.isAnomaly).toBe(true);
      expect(check.severity).toBe("critical");
      expect(check.reason).toContain("Cost spike");
    });
  });

  describe("5. Soft Warning Triggering", () => {
    it("should trigger soft warning when reaching 80% of quota", () => {
      // 8/10 used for Pro AI Report
      const warn = checkQuotaSoftWarning(8, 10);
      expect(warn.isSoftWarning).toBe(true);
      expect(warn.percentageUsed).toBe(80);
      expect(warn.remaining).toBe(2);
    });

    it("should not trigger soft warning below 80% of quota", () => {
      const warn = checkQuotaSoftWarning(7, 10);
      expect(warn.isSoftWarning).toBe(false);
      expect(warn.percentageUsed).toBe(70);
      expect(warn.remaining).toBe(3);
    });

    it("should not trigger soft warning when quota is completely exhausted (handled by hard gate)", () => {
      const warn = checkQuotaSoftWarning(10, 10);
      expect(warn.isSoftWarning).toBe(false);
      expect(warn.remaining).toBe(0);
    });
  });
});
