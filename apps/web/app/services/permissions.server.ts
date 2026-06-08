/**
 * permissions.server.ts — Single source of truth for plan-based access control
 *
 * Plan hierarchy: free → basic → pro → imperial
 * Always use getUserPlan() to normalize profile → Plan before checking.
 */

export type Plan = "free" | "basic" | "pro" | "imperial";

export const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  imperial: 3,
};

type ProfileLike = {
  plan?: string | null;
  subscription?: string | null;
  membership_status?: string | null;
  role?: string | null;
} | null | undefined;

/**
 * Normalize profile to canonical Plan.
 * Rules:
 *   - admin / operator → imperial (bypass all gates)
 *   - subscription === "lifetime" → imperial
 *   - membership_status !== "active" → free (unpaid / pending / expired)
 *   - otherwise use plan field
 */
export function getUserPlan(profile: ProfileLike): Plan {
  if (!profile) return "free";
  if (profile.role === "admin" || profile.role === "operator") return "imperial";
  if (profile.subscription === "lifetime") return "imperial";
  if (profile.membership_status !== "active") return "free";
  if (profile.plan === "imperial") return "imperial";
  if (profile.plan === "pro") return "pro";
  if (profile.plan === "basic") return "basic";
  return "free";
}

/** Return true if user's plan is at or above minPlan */
export function canAccess(profile: ProfileLike, minPlan: Plan): boolean {
  return PLAN_HIERARCHY[getUserPlan(profile)] >= PLAN_HIERARCHY[minPlan];
}

// ─── Feature → minimum plan required ────────────────────────────────────────
// Keep this table in sync with pricing.tsx COMPARE_ROWS and dashboard.upgrade.tsx PLANS
export const FEATURE_PLANS = {
  // ─ Yam (ฤกษ์งามยามดี) ─────────────────────────────────────────────────
  yam_live:    "free"     as Plan,  // widget บนหน้าหลัก (free เห็นได้)
  yam_ashta:   "basic"   as Plan,  // 🔮 คำนวณยามดี
  yam_finder:  "basic"   as Plan,  // ✨ คำนวณฤกษ์มีชัย
  yam_compare: "pro"     as Plan,  // ✈️ เปรียบเทียบฤกษ์เดินทาง
  yam_grid:    "pro"     as Plan,  // 📅 ตารางยามอัฏฐกาล (7-day grid)

  // ─ Horoscope (เลข 7 ตัว) ─────────────────────────────────────────────────
  horoscope_self:   "basic"    as Plan,  // ผัง 7 ตัว 9 ฐาน (ดวงตนเอง)
  horoscope_others: "pro"      as Plan,  // บันทึกดวงผู้อื่น (15 คน)
  transit_system:   "pro"      as Plan,  // ระบบจร (วัยจร/ปีจร)

  // ─ Rahu (ราหูค้นทรัพย์) ──────────────────────────────────────────────────
  rahu:          "basic"  as Plan,  // ราหูวันนี้
  rahu_forecast: "pro"    as Plan,  // ราหูล่วงหน้า

  // ─ Planner ────────────────────────────────────────────────────────────────
  planner: "basic" as Plan,  // วางแผนชีวิต TQM

  // ─ Hora Nu (โหรทายหนู) ────────────────────────────────────────────────
  horanu: "basic" as Plan,  // โหรทายหนู

  // ─ AI Reports ─────────────────────────────────────────────────────────────
  ai_report: "basic" as Plan,  // สร้าง AI Life Report

  // ─ Imperial only ──────────────────────────────────────────────────────────
  matchmaking:      "imperial" as Plan,  // ดวงสมพงษ์
  pdf_export:       "imperial" as Plan,  // Export PDF พรีเมียม
  history_forever:  "imperial" as Plan,  // เก็บประวัติถาวร
} as const;

export type Feature = keyof typeof FEATURE_PLANS;

export function canUseFeature(profile: ProfileLike, feature: Feature): boolean {
  return canAccess(profile, FEATURE_PLANS[feature]);
}

// ─── AI Report monthly quota per plan ───────────────────────────────────────
export const AI_REPORT_LIMIT: Record<Plan, number> = {
  free:     0,
  basic:    1,
  pro:      15,
  imperial: 9_999,
};

export function getAiReportLimit(profile: ProfileLike): number {
  return AI_REPORT_LIMIT[getUserPlan(profile)];
}

// ─── Person record limit per plan ───────────────────────────────────────────
export const PERSON_LIMIT: Record<Plan, number> = {
  free:     0,
  basic:    1,   // ตนเองเท่านั้น
  pro:      15,
  imperial: 9_999,
};

export function getPersonLimit(profile: ProfileLike): number {
  return PERSON_LIMIT[getUserPlan(profile)];
}
