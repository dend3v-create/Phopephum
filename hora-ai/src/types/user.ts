/**
 * types/user.ts
 * User & Profile domain types
 */

export interface UserProfile {
  id: string
  fullName: string
  birthDate: string       // 'YYYY-MM-DD'
  birthTime?: string      // 'HH:MM'
  birthProvince?: string
  gender?: 'male' | 'female' | 'other'
  plan: 'free' | 'pro' | 'premium'
  planExpiresAt?: string
  aiTokensUsed: number
  aiTokensLimit: number   // -1 = unlimited
  createdAt: string
  updatedAt: string
}

export interface BirthData {
  date: Date
  time?: Date
  province?: string
}

export interface OnboardingData {
  fullName: string
  birthDate: string
  birthTime?: string
  birthProvince?: string
  gender?: 'male' | 'female' | 'other'
}
