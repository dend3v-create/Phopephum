/**
 * types/horoscope.ts
 * Type definitions for Astrology AI Engine
 */

import type { AtthakarnResult } from '../calculators/calculateAtthakarn.js'
import type { NavamsaResult } from '../calculators/calculateNavamsa.js'

export type { AtthakarnResult, NavamsaResult }

export interface HoroscopeInput {
  name?: string
  birthDate: string   // "YYYY-MM-DD"
  birthTime?: string  // "HH:MM"
}

export interface HoroscopeData {
  base: number          // เลขฐานวันเกิด (1-9)
  power: number         // ผลรวมกำลังดวง
  house: string         // ภพหลัก (ตนุ/กดุมภะ/...)
  transit: string       // จังหวะชีวิตประจำเดือน
  dayOfWeek: number     // 0=อาทิตย์ ... 6=เสาร์
  dayName: string       // ชื่อวันภาษาไทย
  zodiacYear: string    // ปีนักษัตร
  vayaChorn: string     // วัยจรปัจจุบัน
  taksa: TaksaResult    // ทักษา
  atthakarn?: AtthakarnResult  // ยามกำเนิด (ต้องมีเวลาเกิด)
  navamsa: NavamsaResult       // นวางค์ 9 ฐานลึก
}

export interface TaksaResult {
  position: number      // ตำแหน่งทักษา (1-8)
  meaning: string       // ความหมาย
  isAuspicious: boolean // มงคล/อัปมงคล
}

export interface RuleMatch {
  id: string
  category: 'career' | 'finance' | 'love' | 'health' | 'warning' | 'opportunity' | 'branding'
  insight: string
  priority: number      // 1=สูงสุด
}

export interface HoroscopeResult {
  input: HoroscopeInput
  data: HoroscopeData
  rules: RuleMatch[]
  ragContext: string
  prediction: string | null
}
