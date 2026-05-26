/**
 * constants/subscription-tiers.ts
 * Subscription Tier Config สำหรับ Hora AI
 */

export const TIERS = {
  free: {
    name: 'ฟรี',
    price: 0,
    aiReportsPerMonth: 1,
    calculationsPerDay: 5,
    transitAccess: false,
    sevenNumbersAccess: false,
    pdfExport: false,
    features: [
      'ยามอัฐกาล 5 ครั้ง/วัน',
      'จักรกำเนิดพื้นฐาน',
      'AI Report 1 ครั้ง/เดือน',
    ],
  },
  pro: {
    name: 'Pro',
    price: 149,
    aiReportsPerMonth: 10,
    calculationsPerDay: -1, // unlimited
    transitAccess: true,
    sevenNumbersAccess: false,
    pdfExport: true,
    features: [
      'ยามอัฐกาลไม่จำกัด',
      'ระบบจรครบ (วัยจร/ปีจร/เดือนจร/วันจร)',
      'AI Report 10 ครั้ง/เดือน',
      'Export PDF พรีเมียม',
    ],
  },
  premium: {
    name: 'Premium',
    price: 299,
    aiReportsPerMonth: -1, // unlimited
    calculationsPerDay: -1,
    transitAccess: true,
    sevenNumbersAccess: true,
    pdfExport: true,
    features: [
      'ทุก Feature ไม่จำกัด',
      'เลข 7 ตัว 9 ฐาน (Unique IP)',
      'AI Report ไม่จำกัด',
      'Priority Support 24/7',
    ],
  },
} as const

export type PlanTier = keyof typeof TIERS

export function canAccessFeature(plan: PlanTier, feature: keyof typeof TIERS.premium): boolean {
  return Boolean(TIERS[plan][feature])
}

export function isUnlimited(plan: PlanTier, limit: 'aiReportsPerMonth' | 'calculationsPerDay'): boolean {
  return TIERS[plan][limit] === -1
}
