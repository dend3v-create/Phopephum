import type { CanonicalPlan } from '@phopephum/types'

export interface QuotaProfileLike {
  plan?: string | null
  subscription?: string | null
  membership_status?: string | null
  membership_expires_at?: string | Date | null
  created_at?: string | Date | null
  role?: string | null
}

export interface BillingCycleWindow {
  cycleStart: Date
  cycleEnd: Date
}

export interface QuotaCheckResult {
  allowed: boolean
  remaining: number | null
  limit: number | null
  currentUsage: number
}

export const AI_REPORT_LIMIT: Record<CanonicalPlan, number | null> = {
  free: 0,
  premium: 1,
  pro: 15,
  master: null, // Unlimited
}

export const WISDOM_AI_LIMIT: Record<CanonicalPlan, number | null> = {
  free: 3,       // ทดลองใช้งาน 3 ครั้งต่อรอบ 30 วัน
  premium: 10,   // 10 ครั้งต่อรอบ 30 วัน
  pro: null,     // Unlimited (Fair use)
  master: null,  // Unlimited (Real-time)
}

export function getWisdomAiLimit(plan: CanonicalPlan): number | null {
  return WISDOM_AI_LIMIT[plan]
}

/**
 * คำนวณช่วงเวลา Billing Cycle รายบุคคล (รอบละ 30 วัน)
 * อิงจากวันแรกและวันที่ 30 ของการสมัครสมาชิก (membership_expires_at) 
 * หรือวันสมัครใช้งาน (created_at) เป็นหลัก
 */
export function getUserBillingCycleWindow(
  profile: QuotaProfileLike | null | undefined,
  now: Date = new Date()
): BillingCycleWindow {
  const nowMs = now.getTime()
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

  // 1. กรณีเป็นสมาชิกที่มีวันหมดอายุ (Active Subscription Cycle)
  if (profile?.membership_expires_at) {
    const expiresAt = new Date(profile.membership_expires_at)
    if (!isNaN(expiresAt.getTime())) {
      const expiresMs = expiresAt.getTime()
      if (expiresMs >= nowMs) {
        // อยู่ในรอบปัจจุบัน: สิ้นสุดที่ expiresAt, เริ่มต้นที่ 30 วันก่อนหน้า
        const cycleStart = new Date(expiresMs - THIRTY_DAYS_MS)
        return { cycleStart, cycleEnd: expiresAt }
      }
    }
  }

  // 2. กรณี Free หรือนับจากวันสร้างบัญชี (created_at)
  if (profile?.created_at) {
    const createdAt = new Date(profile.created_at)
    if (!isNaN(createdAt.getTime())) {
      const createdMs = createdAt.getTime()
      const elapsedMs = nowMs - createdMs
      if (elapsedMs >= 0) {
        const cycleIndex = Math.floor(elapsedMs / THIRTY_DAYS_MS)
        const cycleStart = new Date(createdMs + cycleIndex * THIRTY_DAYS_MS)
        const cycleEnd = new Date(cycleStart.getTime() + THIRTY_DAYS_MS)
        return { cycleStart, cycleEnd }
      }
    }
  }

  // 3. Fallback: 30 วันย้อนหลังจากเวลาปัจจุบัน
  const cycleStart = new Date(nowMs - THIRTY_DAYS_MS)
  return { cycleStart, cycleEnd: now }
}

/**
 * ตรวจสอบสถานะ Quota ว่าสามารถใช้งานต่อได้หรือไม่
 */
export function checkQuotaStatus(options: {
  currentUsage: number
  limit: number | null
}): {
  allowed: boolean
  remaining: number | null
  limit: number | null
  currentUsage: number
} {
  const { currentUsage, limit } = options
  if (limit === null) {
    return {
      allowed: true,
      remaining: null,
      limit: null,
      currentUsage,
    }
  }

  const remaining = Math.max(0, limit - currentUsage)
  const allowed = currentUsage < limit

  return {
    allowed,
    remaining,
    limit,
    currentUsage,
  }
}
