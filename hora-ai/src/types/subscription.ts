/**
 * types/subscription.ts
 * Subscription & Payment types
 */

export type PlanName = 'free' | 'pro' | 'premium'

export interface SubscriptionPlan {
  id: string
  userId: string
  stripeSubId?: string
  plan: PlanName
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodStart?: string
  currentPeriodEnd?: string
  createdAt: string
}

export interface Quota {
  aiReportsUsed: number
  aiReportsLimit: number    // -1 = unlimited
  calculationsToday: number
  calculationsLimit: number // -1 = unlimited
}

export interface PlanLimits {
  aiReportsPerMonth: number
  calculationsPerDay: number
  transitAccess: boolean
  sevenNumbersAccess: boolean
  pdfExport: boolean
}
