/**
 * permissions.server.ts — Single source of truth for plan-based access control (PHASE 6.1)
 *
 * Canonical Plan hierarchy: free (0) → premium (1) → pro (2) → master (3)
 * Backward compatible with legacy aliases:
 *   - "basic" === "premium" (Tier 1)
 *   - "imperial" === "master" (Tier 3)
 *   - "lifetime" === "master" (Tier 3)
 *
 * Always use getUserPlan() to normalize profile → CanonicalPlan before checking.
 */

import type { CanonicalPlan, LegacyPlan, MembershipPlan } from "@phopephum/types";

export type Plan = CanonicalPlan | LegacyPlan;

export const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  basic: 1,
  premium: 1,
  pro: 2,
  imperial: 3,
  master: 3,
  lifetime: 3,
};

type ProfileLike = {
  plan?: string | null;
  subscription?: string | null;
  membership_status?: string | null;
  membership_expires_at?: string | Date | null;
  role?: string | null;
} | null | undefined;

/**
 * Normalize profile to canonical Plan ('free' | 'premium' | 'pro' | 'master').
 * Rules:
 *   - admin / operator → master (bypass all gates)
 *   - subscription === "lifetime" → master
 *   - membership_status !== "active" → free (unpaid / pending / expired)
 *   - Dynamic Expiry Gate: if membership_expires_at < now() and not lifetime → free
 *   - legacy "imperial" → master
 *   - legacy "basic" → premium
 *   - otherwise use plan field
 */
export function getUserPlan(profile: ProfileLike): CanonicalPlan {
  if (!profile) return "free";
  if (profile.role === "admin" || profile.role === "operator") return "master";
  if (profile.subscription === "lifetime" || profile.plan === "lifetime") return "master";
  if (profile.membership_status && profile.membership_status !== "active") return "free";
  
  // Dynamic Expiration Check
  if (profile.membership_expires_at) {
    const expiresAt = new Date(profile.membership_expires_at).getTime();
    if (!isNaN(expiresAt) && expiresAt < Date.now()) {
      return "free";
    }
  }

  const rawPlan = (profile.plan || profile.subscription || "free").toLowerCase();
  if (rawPlan === "master" || rawPlan === "imperial") return "master";
  if (rawPlan === "pro" || rawPlan === "pro_annual" || rawPlan === "pro_monthly") return "pro";
  if (rawPlan === "premium" || rawPlan === "basic" || rawPlan === "basic_monthly") return "premium";
  return "free";
}

/** Return true if user's plan is at or above minPlan (supports canonical and legacy names) */
export function canAccess(profile: ProfileLike, minPlan: Plan | string): boolean {
  const userRank = PLAN_HIERARCHY[getUserPlan(profile)] ?? 0;
  const requiredRank = PLAN_HIERARCHY[minPlan] ?? 0;
  return userRank >= requiredRank;
}

// ─── Subscription Plans & Sands Pack Definitions (STEP 6.6) ───────────────────
export {
  SUBSCRIPTION_PLANS,
  SANDS_REFILL_PACKS,
  type SubscriptionPlanDef,
  type SandsRefillPackDef,
  type CanonicalSku,
  type ResolvedProduct,
  CANONICAL_SKUS,
  LEGACY_SKU_ALIASES,
  normalizeSku,
  isCanonicalSku,
  resolveProductFromSku,
} from "../lib/plans";


// ─── Feature → minimum plan required ────────────────────────────────────────
export const FEATURE_PLANS = {
  // ─ Yam (ฤกษ์งามยามดี) ─────────────────────────────────────────────────
  yam_live:    "free"     as Plan,  // widget บนหน้าหลัก (free เห็นได้)
  yam_ashta:   "premium"  as Plan,  // 🔮 คำนวณยามดี
  yam_finder:  "premium"  as Plan,  // ✨ คำนวณฤกษ์มีชัย
  yam_compare: "pro"      as Plan,  // ✈️ เปรียบเทียบฤกษ์เดินทาง
  yam_grid:    "pro"      as Plan,  // 📅 ตารางยามอัฏฐกาล (7-day grid)

  // ─ Horoscope (เลข 7 ตัว) ─────────────────────────────────────────────────
  horoscope_self:   "premium"  as Plan,  // ผัง 7 ตัว 9 ฐาน (ดวงตนเอง)
  horoscope_others: "pro"      as Plan,  // บันทึกดวงผู้อื่น
  transit_system:   "pro"      as Plan,  // ระบบจร (วัยจร/ปีจร)

  // ─ Rahu (ราหูค้นทรัพย์) ──────────────────────────────────────────────────
  rahu:          "premium"  as Plan,  // ราหูวันนี้
  rahu_forecast: "pro"      as Plan,  // ราหูล่วงหน้า

  // ─ Planner & Appointments ────────────────────────────────────────────────
  planner:               "premium"  as Plan,  // วางแผนชีวิต TQM
  appointments_basic:    "free"     as Plan,  // นัดหมายไม่เกิน 3 รายการ
  appointments_full:     "pro"      as Plan,  // นัดหมายไม่จำกัด

  // ─ Hora Nu (ยามพรายกระซิบ) ───────────────────────────────────────────
  horanu: "premium"  as Plan,  // ยามพรายกระซิบ

  // ─ AI Reports ─────────────────────────────────────────────────────────────
  ai_report: "premium"  as Plan,  // สร้าง AI Life Report

  // ─ Timing Comparison (STEP 4.4) ──────────────────────────────────────────
  timing_comparison:       "premium" as Plan,  // เปรียบเทียบ 2 ทางเลือก
  timing_comparison_multi: "pro"     as Plan,  // เปรียบเทียบ 3–5 ทางเลือก

  // ─ Personal Wisdom Intelligence (STEP 4.5) ───────────────────────────────
  wisdom_history:   "free"    as Plan,  // ประวัติคำถาม
  wisdom_patterns:  "pro"     as Plan,  // การวิเคราะห์ Pattern และสังเคราะห์ AI

  // ─ Calendar Intelligence (STEP 5.1) ──────────────────────────────────────
  calendar_current_month: "free"    as Plan,
  calendar_3months:       "premium" as Plan,
  calendar_100years:      "pro"     as Plan,

  // ─ Timing Reminders (STEP 5.2) ───────────────────────────────────────────
  timing_reminders: "premium" as Plan,

  // ─ Master / Emperor Only ─────────────────────────────────────────────────
  matchmaking:            "master"  as Plan,  // ดวงสมพงษ์
  customers_management:   "pro"     as Plan,  // สมุดบันทึกดวงลูกค้า (Pro: 20 คน, Master: ไม่จำกัด)
  pdf_export:             "pro"     as Plan,  // Export PDF ทั่วไป
  pdf_whitelabel_export:  "master"  as Plan,  // Export PDF แบรนด์ตนเอง
  history_forever:        "master"  as Plan,  // เก็บประวัติถาวร
} as const;

export type Feature = keyof typeof FEATURE_PLANS;

export function canUseFeature(profile: ProfileLike, feature: Feature): boolean {
  return canAccess(profile, FEATURE_PLANS[feature]);
}

// ─── Quota Limits per Plan ─────────────────────────────────────────────────

export const AI_REPORT_LIMIT: Record<CanonicalPlan, number | null> = {
  free:     0,
  premium:  1,
  pro:      15,
  master:   null, // Unlimited
};

export function getAiReportLimit(profile: ProfileLike): number | null {
  return AI_REPORT_LIMIT[getUserPlan(profile)];
}

export const PERSON_LIMIT: Record<CanonicalPlan, number | null> = {
  free:     0,
  premium:  3,    // ตนเอง + คนใกล้ชิด 3 คน
  pro:      20,   // ทีมงาน / ลูกค้าเบื้องต้น
  master:   null, // Unlimited
};

export function getPersonLimit(profile: ProfileLike): number | null {
  return PERSON_LIMIT[getUserPlan(profile)];
}

export const TIMING_COMPARISON_CANDIDATE_LIMIT: Record<CanonicalPlan, number> = {
  free:     0,
  premium:  2,
  pro:      5,
  master:   10,
};

export function getTimingComparisonLimit(profile: ProfileLike): number {
  return TIMING_COMPARISON_CANDIDATE_LIMIT[getUserPlan(profile)];
}
