/**
 * calculators/calculateMoonPhase.ts
 * คำนวณเดือนจันทรคติและวันพระ จากวันที่ Gregorian
 *
 * รองรับ:
 * - ดึงจาก lunar100year.json (แม่นยำ)
 * - Fallback อัลกอริทึม Suriyayat
 *
 * ใช้สำหรับ:
 * - แสดงวันพระบน Dashboard
 * - เสริมข้อมูล RAG Context (เดือนจันทรคติ)
 * - คำนวณฤกษ์มงคล (calculateAuspiciousTime)
 */

import { getLunarDate, LunarDate } from '../core/lunarCalendar.js'

export interface MoonPhaseResult {
  /** วันจันทรคติ 1-30 */
  lunarDay: number
  /** เดือนจันทรคติ 1-12 */
  lunarMonth: number
  /** ปี พ.ศ. */
  lunarYear: number
  /** ข้อความแสดงข้างขึ้น/ข้างแรม */
  moonPhase: string
  /** วันพระ? */
  isWanPhra: boolean
  /** ข้างขึ้น (true) หรือ ข้างแรม (false) */
  isWaxing: boolean
  /** ความสว่างดวงจันทร์ (0-100%) */
  illumination: number
  /** คำแนะนำตามวันจันทรคติ */
  guidance: string
}

/** คำแนะนำตามช่วงข้างขึ้น/แรม */
const MOON_GUIDANCE: Record<string, string> = {
  'ขึ้น 1-4':  'จุดเริ่มต้น — ปลูกเมล็ดพันธุ์แห่งความตั้งใจใหม่',
  'ขึ้น 5-9':  'โมเมนตัมสูงขึ้น — ลงมือทำ เริ่มโปรเจกต์ใหม่',
  'ขึ้น 10-14': 'พลังงานสูงสุดกำลังมา — เตรียมพร้อมสู่จุดสูงสุด',
  'ขึ้น 15':   'เพ็ญเดือน — วันพระพลังสูง ทำทาน ฝึกสมาธิ โชคดี',
  'แรม 1-4':  'ปล่อยผ่าน — สะสางสิ่งที่ไม่ต้องการออกไป',
  'แรม 5-9':  'ถอนพลัง — พักฟื้น ไตร่ตรอง ไม่เริ่มสิ่งใหม่ใหญ่',
  'แรม 10-14': 'พลังต่ำสุด — บำรุงร่างกาย ดูแลตัวเอง',
  'แรม 15':   'มืดสนิท — วันพระ สะสางกรรม ทำจิตใจให้บริสุทธิ์',
}

function getMoonGuidance(lunarDay: number): string {
  const isWaxing = lunarDay <= 15
  const dayNum = isWaxing ? lunarDay : lunarDay - 15

  if (lunarDay === 15) return MOON_GUIDANCE['ขึ้น 15']!
  if (lunarDay === 30) return MOON_GUIDANCE['แรม 15']!

  if (isWaxing) {
    if (dayNum <= 4)  return MOON_GUIDANCE['ขึ้น 1-4']!
    if (dayNum <= 9)  return MOON_GUIDANCE['ขึ้น 5-9']!
    return MOON_GUIDANCE['ขึ้น 10-14']!
  } else {
    if (dayNum <= 4)  return MOON_GUIDANCE['แรม 1-4']!
    if (dayNum <= 9)  return MOON_GUIDANCE['แรม 5-9']!
    return MOON_GUIDANCE['แรม 10-14']!
  }
}

/**
 * คำนวณเดือนจันทรคติจาก Date
 * @param date วันที่ที่ต้องการ (default: วันนี้)
 */
export function calculateMoonPhase(date: Date = new Date()): MoonPhaseResult {
  const lunar: LunarDate = getLunarDate(date)

  const isWaxing = lunar.lunarDay <= 15
  // ความสว่าง: ขึ้น 1 = 0%, ขึ้น 15 = 100%, แรม 1 = 93%, แรม 15 = 0%
  const illumination = isWaxing
    ? Math.round((lunar.lunarDay / 15) * 100)
    : Math.round(((30 - lunar.lunarDay) / 15) * 100)

  return {
    lunarDay:     lunar.lunarDay,
    lunarMonth:   lunar.lunarMonth,
    lunarYear:    lunar.lunarYear,
    moonPhase:    lunar.moonPhase,
    isWanPhra:    lunar.isWanPhra,
    isWaxing,
    illumination: Math.min(100, Math.max(0, illumination)),
    guidance:     getMoonGuidance(lunar.lunarDay),
  }
}

/**
 * ตรวจสอบว่าวันที่ที่ระบุเป็นวันพระหรือไม่
 */
export function checkIsWanPhra(date: Date = new Date()): boolean {
  return getLunarDate(date).isWanPhra
}

/**
 * หาวันพระถัดไปจากวันที่ระบุ
 */
export function getNextWanPhra(from: Date = new Date()): { date: Date; moonPhase: MoonPhaseResult } {
  let checkDate = new Date(from)
  for (let i = 1; i <= 30; i++) {
    checkDate = new Date(from.getTime() + i * 86400000)
    const phase = calculateMoonPhase(checkDate)
    if (phase.isWanPhra) {
      return { date: checkDate, moonPhase: phase }
    }
  }
  // fallback: +15 วัน
  checkDate = new Date(from.getTime() + 15 * 86400000)
  return { date: checkDate, moonPhase: calculateMoonPhase(checkDate) }
}
