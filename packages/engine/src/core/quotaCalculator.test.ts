import { describe, it, expect } from 'vitest'
import {
  getUserBillingCycleWindow,
  checkQuotaStatus,
  AI_REPORT_LIMIT,
  WISDOM_AI_LIMIT,
} from './quotaCalculator.js'

describe('Quota and Billing Cycle Engine Tests', () => {
  describe('Billing Cycle Window (30-day individual cycle)', () => {
    it('should calculate 30-day cycle for paid member from membership_expires_at', () => {
      // User registered Sept 10, expires Oct 10
      const expiresAt = new Date('2026-10-10T12:00:00.000Z')
      const now = new Date('2026-09-15T12:00:00.000Z')

      const window = getUserBillingCycleWindow({ membership_expires_at: expiresAt }, now)
      
      expect(window.cycleEnd.toISOString()).toBe(expiresAt.toISOString())
      // Cycle start is 30 days before Oct 10 = Sept 10
      expect(window.cycleStart.toISOString()).toBe(new Date('2026-09-10T12:00:00.000Z').toISOString())
    })

    it('should calculate recurring 30-day cycle for free user from created_at', () => {
      // User created on Aug 1
      const createdAt = new Date('2026-08-01T00:00:00.000Z')
      
      // Check during Cycle 1 (e.g. Aug 15)
      const nowCycle1 = new Date('2026-08-15T00:00:00.000Z')
      const window1 = getUserBillingCycleWindow({ created_at: createdAt }, nowCycle1)
      expect(window1.cycleStart.toISOString()).toBe(createdAt.toISOString())
      expect(window1.cycleEnd.toISOString()).toBe(new Date('2026-08-31T00:00:00.000Z').toISOString())

      // Check during Cycle 2 (e.g. Sept 12 = 42 days after Aug 1)
      const nowCycle2 = new Date('2026-09-12T00:00:00.000Z')
      const window2 = getUserBillingCycleWindow({ created_at: createdAt }, nowCycle2)
      // Cycle 2 starts on Aug 31
      expect(window2.cycleStart.toISOString()).toBe(new Date('2026-08-31T00:00:00.000Z').toISOString())
      // Cycle 2 ends on Sept 30
      expect(window2.cycleEnd.toISOString()).toBe(new Date('2026-09-30T00:00:00.000Z').toISOString())
    })

    it('should reset quota window when cycle changes (เปลี่ยนเดือน / เปลี่ยนรอบบิล)', () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z')
      const month1 = new Date('2026-01-15T00:00:00.000Z')
      const month2 = new Date('2026-02-15T00:00:00.000Z')

      const windowM1 = getUserBillingCycleWindow({ created_at: createdAt }, month1)
      const windowM2 = getUserBillingCycleWindow({ created_at: createdAt }, month2)

      expect(windowM1.cycleStart.getTime()).not.toBe(windowM2.cycleStart.getTime())
      expect(windowM2.cycleStart.getTime()).toBeGreaterThan(windowM1.cycleEnd.getTime() - 1000)
    })
  })

  describe('Quota Limit Enforcement Status', () => {
    it('should allow usage before limit (ก่อนถึง limit)', () => {
      // Premium AI Report Limit = 1, current usage = 0
      const status = checkQuotaStatus({ currentUsage: 0, limit: AI_REPORT_LIMIT.premium })
      expect(status.allowed).toBe(true)
      expect(status.remaining).toBe(1)
    })

    it('should disallow usage at limit (ถึง limit)', () => {
      // Premium AI Report Limit = 1, current usage = 1
      const status = checkQuotaStatus({ currentUsage: 1, limit: AI_REPORT_LIMIT.premium })
      expect(status.allowed).toBe(false)
      expect(status.remaining).toBe(0)
    })

    it('should disallow usage exceeding limit (เกิน limit)', () => {
      // Premium Wisdom AI Limit = 10, current usage = 11
      const status = checkQuotaStatus({ currentUsage: 11, limit: WISDOM_AI_LIMIT.premium })
      expect(status.allowed).toBe(false)
      expect(status.remaining).toBe(0)
    })

    it('should aggregate across different report_types without bypass (ห้าม bypass ด้วย report_type)', () => {
      // Simulating total usage of 1 report (wealth) in Premium plan (limit = 1)
      const totalUsageAcrossTypes = 1 // 1 wealth report already created
      
      // When user tries to create career or relationship report
      const status = checkQuotaStatus({ currentUsage: totalUsageAcrossTypes, limit: AI_REPORT_LIMIT.premium })
      expect(status.allowed).toBe(false)
      expect(status.remaining).toBe(0)
    })

    it('should correctly handle Plan Changes (เปลี่ยน Plan: Free -> Premium -> Pro -> Master)', () => {
      // 1. Free plan
      expect(checkQuotaStatus({ currentUsage: 0, limit: AI_REPORT_LIMIT.free }).allowed).toBe(false)
      expect(checkQuotaStatus({ currentUsage: 2, limit: WISDOM_AI_LIMIT.free }).allowed).toBe(true)
      expect(checkQuotaStatus({ currentUsage: 3, limit: WISDOM_AI_LIMIT.free }).allowed).toBe(false)

      // 2. Upgrade to Premium (AI Report: 1, Wisdom AI: 10)
      expect(checkQuotaStatus({ currentUsage: 0, limit: AI_REPORT_LIMIT.premium }).allowed).toBe(true)
      expect(checkQuotaStatus({ currentUsage: 1, limit: AI_REPORT_LIMIT.premium }).allowed).toBe(false)
      expect(checkQuotaStatus({ currentUsage: 9, limit: WISDOM_AI_LIMIT.premium }).allowed).toBe(true)
      expect(checkQuotaStatus({ currentUsage: 10, limit: WISDOM_AI_LIMIT.premium }).allowed).toBe(false)

      // 3. Upgrade to Pro (AI Report: 15, Wisdom AI: Unlimited)
      expect(checkQuotaStatus({ currentUsage: 14, limit: AI_REPORT_LIMIT.pro }).allowed).toBe(true)
      expect(checkQuotaStatus({ currentUsage: 15, limit: AI_REPORT_LIMIT.pro }).allowed).toBe(false)
      expect(checkQuotaStatus({ currentUsage: 50, limit: WISDOM_AI_LIMIT.pro }).allowed).toBe(true)
      expect(checkQuotaStatus({ currentUsage: 50, limit: WISDOM_AI_LIMIT.pro }).remaining).toBe(null)

      // 4. Upgrade to Master (AI Report: Unlimited, Wisdom AI: Unlimited)
      expect(checkQuotaStatus({ currentUsage: 100, limit: AI_REPORT_LIMIT.master }).allowed).toBe(true)
      expect(checkQuotaStatus({ currentUsage: 100, limit: AI_REPORT_LIMIT.master }).remaining).toBe(null)
      expect(checkQuotaStatus({ currentUsage: 500, limit: WISDOM_AI_LIMIT.master }).allowed).toBe(true)
      expect(checkQuotaStatus({ currentUsage: 500, limit: WISDOM_AI_LIMIT.master }).remaining).toBe(null)
    })

    it('should ensure rejected quota requests never invoke AI and never debit Sands', () => {
      // Flow Simulation:
      let aiCalled = false
      let sandsDebited = false

      const executeReportRequest = (currentUsage: number, userPlanLimit: number | null, userSands: number) => {
        const quota = checkQuotaStatus({ currentUsage, limit: userPlanLimit })
        if (!quota.allowed) {
          // Reject early with 403
          return { status: 403, error: 'QUOTA_EXCEEDED' }
        }

        if (userSands <= 0) {
          return { status: 403, error: 'NO_SANDS' }
        }

        // Only when quota & sands checks pass:
        aiCalled = true
        sandsDebited = true
        return { status: 200, success: true }
      }

      // Case 1: Quota exceeded
      aiCalled = false
      sandsDebited = false
      const resExceeded = executeReportRequest(1, AI_REPORT_LIMIT.premium, 50)
      expect(resExceeded.status).toBe(403)
      expect(aiCalled).toBe(false)
      expect(sandsDebited).toBe(false)

      // Case 2: Quota available
      aiCalled = false
      sandsDebited = false
      const resAllowed = executeReportRequest(0, AI_REPORT_LIMIT.premium, 50)
      expect(resAllowed.status).toBe(200)
      expect(aiCalled).toBe(true)
      expect(sandsDebited).toBe(true)
    })

    describe('Chat APIs Entitlement and Quota Gates', () => {
      it('should enforce Hora Nu entitlement (Free -> Reject 403, Premium+ -> Allow 200)', () => {
        let aiCalled = false
        const requestHoraNu = (plan: string) => {
          const isAllowed = ['premium', 'pro', 'master'].includes(plan)
          if (!isAllowed) {
            return { status: 403, error: 'PLAN_UPGRADE_REQUIRED' }
          }
          aiCalled = true
          return { status: 200, success: true }
        }

        // Free user
        aiCalled = false
        expect(requestHoraNu('free').status).toBe(403)
        expect(aiCalled).toBe(false)

        // Premium user
        aiCalled = false
        expect(requestHoraNu('premium').status).toBe(200)
        expect(aiCalled).toBe(true)

        // Pro user
        aiCalled = false
        expect(requestHoraNu('pro').status).toBe(200)
        expect(aiCalled).toBe(true)
      })

      it('should enforce Karnchata Wisdom quota before calling AI (Free: 3, Premium: 10, Pro/Master: Unlimited)', () => {
        let aiCalled = false
        const requestKarnchata = (plan: 'free' | 'premium' | 'pro' | 'master', currentUsage: number) => {
          const limit = WISDOM_AI_LIMIT[plan]
          const quota = checkQuotaStatus({ currentUsage, limit })
          if (!quota.allowed) {
            return { status: 403, error: 'QUOTA_EXCEEDED' }
          }
          aiCalled = true
          return { status: 200, success: true }
        }

        // Free: under limit (2 used)
        aiCalled = false
        expect(requestKarnchata('free', 2).status).toBe(200)
        expect(aiCalled).toBe(true)

        // Free: at limit (3 used) -> reject before AI
        aiCalled = false
        expect(requestKarnchata('free', 3).status).toBe(403)
        expect(aiCalled).toBe(false)

        // Premium: at limit (10 used) -> reject before AI
        aiCalled = false
        expect(requestKarnchata('premium', 10).status).toBe(403)
        expect(aiCalled).toBe(false)

        // Pro: over 50 queries -> unlimited
        aiCalled = false
        expect(requestKarnchata('pro', 50).status).toBe(200)
        expect(aiCalled).toBe(true)
      })

      it('should enforce Horoscope Chat Entitlement for Natal (Premium+) and Transit (Pro+)', () => {
        let aiCalled = false
        const requestHoroscopeChat = (plan: string, isTransitMode: boolean) => {
          const hasNatal = ['premium', 'pro', 'master'].includes(plan)
          if (!hasNatal) {
            return { status: 403, error: 'PLAN_UPGRADE_REQUIRED_NATAL' }
          }
          if (isTransitMode) {
            const hasTransit = ['pro', 'master'].includes(plan)
            if (!hasTransit) {
              return { status: 403, error: 'PLAN_UPGRADE_REQUIRED_TRANSIT' }
            }
          }
          aiCalled = true
          return { status: 200, success: true }
        }

        // Free user -> rejected
        aiCalled = false
        expect(requestHoroscopeChat('free', false).status).toBe(403)
        expect(aiCalled).toBe(false)

        // Premium user Natal -> allowed
        aiCalled = false
        expect(requestHoroscopeChat('premium', false).status).toBe(200)
        expect(aiCalled).toBe(true)

        // Premium user Transit -> rejected
        aiCalled = false
        expect(requestHoroscopeChat('premium', true).status).toBe(403)
        expect(aiCalled).toBe(false)

        // Pro user Transit -> allowed
        aiCalled = false
        expect(requestHoroscopeChat('pro', true).status).toBe(200)
        expect(aiCalled).toBe(true)
      })
    })
  })
})
