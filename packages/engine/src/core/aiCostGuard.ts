import type { CanonicalPlan } from "@phopephum/types";

/**
 * SSoT AI Pricing Table (USD per 1,000,000 tokens)
 * Based on official provider pricing.
 */
export interface ModelPricingDef {
  name: string;
  promptCostPerMillion: number;
  completionCostPerMillion: number;
  currency: "USD";
}

export const AI_MODEL_PRICING: Record<string, ModelPricingDef> = {
  "deepseek-chat": {
    name: "DeepSeek Chat (V3)",
    promptCostPerMillion: 0.14,
    completionCostPerMillion: 0.28,
    currency: "USD",
  },
  "deepseek-reasoner": {
    name: "DeepSeek Reasoner (R1)",
    promptCostPerMillion: 0.55,
    completionCostPerMillion: 2.19,
    currency: "USD",
  },
  "gemini-1.5-flash": {
    name: "Google Gemini 1.5 Flash",
    promptCostPerMillion: 0.075,
    completionCostPerMillion: 0.30,
    currency: "USD",
  },
  "gemini-1.5-pro": {
    name: "Google Gemini 1.5 Pro",
    promptCostPerMillion: 1.25,
    completionCostPerMillion: 5.00,
    currency: "USD",
  },
  "gpt-4o-mini": {
    name: "OpenAI GPT-4o Mini",
    promptCostPerMillion: 0.15,
    completionCostPerMillion: 0.60,
    currency: "USD",
  },
  "claude-3-5-sonnet": {
    name: "Anthropic Claude 3.5 Sonnet",
    promptCostPerMillion: 3.00,
    completionCostPerMillion: 15.00,
    currency: "USD",
  },
  default: {
    name: "Default Provider (DeepSeek Chat)",
    promptCostPerMillion: 0.14,
    completionCostPerMillion: 0.28,
    currency: "USD",
  },
};

/** SSoT Currency Exchange Rate */
export const USD_TO_THB_EXCHANGE_RATE = 35.0;

/**
 * AI Guard Configuration Thresholds
 */
export interface AiGuardConfig {
  highCostOutputTokenThreshold: number;
  highCostTotalTokenThreshold: number;
  highCostUsdThreshold: number;
  softWarningQuotaRatio: number;
  minIntervalBetweenRequestsMs: number;
  rateLimitMaxPerMinute: Record<CanonicalPlan, number>;
  concurrentLimit: Record<CanonicalPlan, number>;
  cooldownPenaltyMs: number;
  maxPromptLengthChars: number;
}

export const AI_GUARD_CONFIG: AiGuardConfig = {
  highCostOutputTokenThreshold: 8192,
  highCostTotalTokenThreshold: 16384,
  highCostUsdThreshold: 0.05, // $0.05 (~1.75 THB)
  softWarningQuotaRatio: 0.80, // 80% of quota
  minIntervalBetweenRequestsMs: 2000, // 2s minimum interval between requests
  rateLimitMaxPerMinute: {
    free: 3,
    premium: 6,
    pro: 12,
    master: 20, // Master Fair Use ceiling per minute
  },
  concurrentLimit: {
    free: 1,
    premium: 1,
    pro: 2,
    master: 2, // Master Fair Use concurrent ceiling
  },
  cooldownPenaltyMs: 60000, // 1 minute cooldown when triggered
  maxPromptLengthChars: 30000, // Reject malicious huge payloads
};

export interface CostCalculationResult {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costThb: number;
  isEstimated: boolean;
}

/**
 * Token Estimator for Thai & English mixed text
 * Approximately 1 token ≈ 3.5 characters for Thai / 4 for English
 */
export function estimateTokensFromText(text: string | null | undefined): number {
  if (!text) return 0;
  const len = text.length;
  if (len === 0) return 0;
  // Approximation: average 3.5 characters per token for multilingual content
  return Math.max(1, Math.ceil(len / 3.5));
}

/**
 * Calculate AI Cost using SSoT Pricing Table
 */
export function calculateAiCost(options: {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  promptText?: string;
  completionText?: string;
}): CostCalculationResult {
  const modelKey = options.model && AI_MODEL_PRICING[options.model] ? options.model : "default";
  const pricing = AI_MODEL_PRICING[modelKey] || AI_MODEL_PRICING.default;

  const hasExplicitPrompt = typeof options.promptTokens === "number" && options.promptTokens >= 0;
  const hasExplicitCompletion = typeof options.completionTokens === "number" && options.completionTokens >= 0;

  const promptTokens = hasExplicitPrompt
    ? options.promptTokens!
    : estimateTokensFromText(options.promptText);

  const completionTokens = hasExplicitCompletion
    ? options.completionTokens!
    : estimateTokensFromText(options.completionText);

  const totalTokens = promptTokens + completionTokens;
  const isEstimated = !hasExplicitPrompt || !hasExplicitCompletion;

  const promptCostUsd = (promptTokens / 1_000_000) * pricing.promptCostPerMillion;
  const completionCostUsd = (completionTokens / 1_000_000) * pricing.completionCostPerMillion;
  const costUsd = Number((promptCostUsd + completionCostUsd).toFixed(6));
  const costThb = Number((costUsd * USD_TO_THB_EXCHANGE_RATE).toFixed(4));

  return {
    model: modelKey,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    costThb,
    isEstimated,
  };
}

/**
 * Check if the AI request / response exhibits a high-cost anomaly
 */
export interface CostAnomalyCheckResult {
  isAnomaly: boolean;
  reason?: string;
  severity?: "warning" | "critical";
  details?: Record<string, unknown>;
}

export function checkAiCostAnomaly(
  costResult: CostCalculationResult,
  config: AiGuardConfig = AI_GUARD_CONFIG
): CostAnomalyCheckResult {
  if (costResult.completionTokens > config.highCostOutputTokenThreshold) {
    return {
      isAnomaly: true,
      severity: "warning",
      reason: `Output token spike: ${costResult.completionTokens} tokens (threshold: ${config.highCostOutputTokenThreshold})`,
      details: { ...costResult },
    };
  }

  if (costResult.totalTokens > config.highCostTotalTokenThreshold) {
    return {
      isAnomaly: true,
      severity: "warning",
      reason: `Total token spike: ${costResult.totalTokens} tokens (threshold: ${config.highCostTotalTokenThreshold})`,
      details: { ...costResult },
    };
  }

  if (costResult.costUsd > config.highCostUsdThreshold) {
    return {
      isAnomaly: true,
      severity: "critical",
      reason: `Cost spike: $${costResult.costUsd} USD (threshold: $${config.highCostUsdThreshold})`,
      details: { ...costResult },
    };
  }

  return { isAnomaly: false };
}

/**
 * Concurrency Checker
 */
export interface ConcurrencyCheckResult {
  allowed: boolean;
  currentActive: number;
  limit: number;
  reason?: string;
}

export function checkAiConcurrency(
  currentActive: number,
  plan: CanonicalPlan,
  config: AiGuardConfig = AI_GUARD_CONFIG
): ConcurrencyCheckResult {
  const limit = config.concurrentLimit[plan] ?? 1;
  const allowed = currentActive < limit;

  return {
    allowed,
    currentActive,
    limit,
    reason: allowed
      ? undefined
      : `มีคำขอ AI กำลังประมวลผลอยู่แล้ว (${currentActive}/${limit}) กรุณารอให้คำขอแรกเสร็จสิ้น`,
  };
}

/**
 * Rate Limit Checker (Sliding minute + interval cooldown)
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  remainingRequests: number;
  cooldownRemainingMs: number;
  retryAfterSeconds: number;
  reason?: string;
}

export function checkAiRateLimit(
  record: {
    lastRequestTime?: number;
    requestCountLastMinute?: number;
    cooldownUntil?: number;
  },
  plan: CanonicalPlan,
  now: number = Date.now(),
  config: AiGuardConfig = AI_GUARD_CONFIG
): RateLimitCheckResult {
  const maxPerMinute = config.rateLimitMaxPerMinute[plan] ?? 3;

  // 1. Check active penalty cooldown
  if (record.cooldownUntil && record.cooldownUntil > now) {
    const cooldownRemainingMs = record.cooldownUntil - now;
    const retryAfterSeconds = Math.ceil(cooldownRemainingMs / 1000);
    return {
      allowed: false,
      remainingRequests: 0,
      cooldownRemainingMs,
      retryAfterSeconds,
      reason: `ระบบกำลังจำกัดความเร็วชั่วคราว กรุณารอ ${retryAfterSeconds} วินาที`,
    };
  }

  // 2. Check minimum interval between requests
  if (record.lastRequestTime) {
    const elapsedMs = now - record.lastRequestTime;
    if (elapsedMs < config.minIntervalBetweenRequestsMs) {
      const waitMs = config.minIntervalBetweenRequestsMs - elapsedMs;
      const retryAfterSeconds = Math.max(1, Math.ceil(waitMs / 1000));
      return {
        allowed: false,
        remainingRequests: Math.max(0, maxPerMinute - (record.requestCountLastMinute || 0)),
        cooldownRemainingMs: waitMs,
        retryAfterSeconds,
        reason: `กรุณาเว้นระยะห่างการส่งคำขออย่างน้อย ${config.minIntervalBetweenRequestsMs / 1000} วินาที`,
      };
    }
  }

  // 3. Check requests per minute limit
  const currentCount = record.requestCountLastMinute || 0;
  if (currentCount >= maxPerMinute) {
    return {
      allowed: false,
      remainingRequests: 0,
      cooldownRemainingMs: 60000,
      retryAfterSeconds: 60,
      reason: `คุณส่งคำขอเกินกำหนด ${maxPerMinute} ครั้งต่อนาที กรุณารอสักครู่`,
    };
  }

  const remainingRequests = Math.max(0, maxPerMinute - (currentCount + 1));
  return {
    allowed: true,
    remainingRequests,
    cooldownRemainingMs: 0,
    retryAfterSeconds: 0,
  };
}

/**
 * Soft Warning Checker for quota exhaustion
 */
export function checkQuotaSoftWarning(
  currentUsage: number,
  limit: number | null,
  config: AiGuardConfig = AI_GUARD_CONFIG
): {
  isSoftWarning: boolean;
  percentageUsed: number;
  remaining: number | null;
} {
  if (limit === null || limit <= 0) {
    return { isSoftWarning: false, percentageUsed: 0, remaining: null };
  }

  const remaining = Math.max(0, limit - currentUsage);
  const ratio = currentUsage / limit;
  const percentageUsed = Math.min(100, Math.round(ratio * 100));
  const isSoftWarning = ratio >= config.softWarningQuotaRatio && remaining > 0;

  return {
    isSoftWarning,
    percentageUsed,
    remaining,
  };
}

/**
 * AI Pay-Per-Use Sands Pricing (When monthly quota is exceeded or free tier)
 */
export const AI_PAY_PER_USE_SANDS_COST = {
  wisdom_ai: 1,  // 1 Sands per question
  ai_report: 10, // 10 Sands per report
} as const;

export type AiPayPerUseFeature = keyof typeof AI_PAY_PER_USE_SANDS_COST;

export function getAiSandsCost(
  featureType: AiPayPerUseFeature,
  isWithinQuota: boolean
): number {
  if (isWithinQuota) return 0;
  return AI_PAY_PER_USE_SANDS_COST[featureType] ?? 0;
}
