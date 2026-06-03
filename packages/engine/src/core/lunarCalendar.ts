/**
 * core/lunarCalendar.ts
 * Thai Lunar Calendar — จันทรคติไทย
 * 
 * ✅ Synced with v3 "Perfect" engine from reference project.
 */

import { gregorianToThaiLunarV3, getZodiacYear } from "./thaiLunar.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** วัน (JS getDay 0=Sun) → เลข 1-7 */
const DAY_TO_NUMBER: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7,
}

const DAY_NAMES_THAI = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
const PLANET_NAMES  = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Circular reduce to 1-7 */
function r7(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ThaiBaseNumbers {
  /** เลข 1-7 จากวันในสัปดาห์ */
  dayNum:    number
  /** เลข 1-7 จากเดือนจันทรคติ */
  monthNum:  number
  /** เลข 1-7 จากปีนักษัตร */
  yearNum:   number
  /** ชื่อวัน */
  dayName:   string
  /** ดาวประจำวัน */
  dayPlanet: string
  /** ชื่อปีนักษัตร */
  zodiacName: string
  /** เลขเดือนจันทรคติ (1-13) */
  lunarMonth: number
  /** ชื่อเดือนจันทรคติ */
  lunarMonthName: string
  /** วันขึ้น/แรม (1-30) */
  lunarDay: number
  /** เช่น "ขึ้น 3 ค่ำ" */
  moonPhase: string
  /** เช่น "วันศุกร์ เดือนเก้า ปีจอ (ขึ้น 3 ค่ำ)" */
  thaiDateText: string
  /** วันในสัปดาห์ JS (0=อาทิตย์...6=เสาร์) */
  weekDay: number
  /** isWanPhra */
  isWanPhra: boolean
  /** approximate month? */
  isApproximate: boolean
  /** ปีไทย (พ.ศ.) ที่ปรับปรุงแล้ว */
  thaiYear: number
}

/**
 * คำนวณเลขฐาน 1-7 สำหรับ ระบบ 7 ตัว 9 ฐาน (v3 Sync)
 * @param dateStr "YYYY-MM-DD" (ค.ศ.)
 * @param birthTime "HH:MM" optional (ใช้ตรวจ 06:01 cutoff)
 */
export function getThaiBaseNumbers(dateStr: string, birthTime?: string): ThaiBaseNumbers {
  // ── 06:00 Cutoff (ทางโหราศาสตร์เปลี่ยนวันตอน 06:00 น.) ──────────────────────
  let effectiveDate = new Date(dateStr + 'T12:00:00') // local noon to avoid UTC shift
  if (birthTime) {
    const [h, m] = birthTime.split(':').map(Number)
    const totalMin = (h ?? 0) * 60 + (m ?? 0)
    // ถ้าก่อน 06:00 น. (360 นาที) ถือเป็นวันก่อนหน้า
    if (totalMin < 360) {
      effectiveDate = new Date(effectiveDate.getTime() - 86400000)
    }
  }

  // ── Day Number ────────────────────────────────────────────────────────────
  const weekDay = effectiveDate.getDay()
  let dayNum  = DAY_TO_NUMBER[weekDay] ?? 1

  // เช็ควันพุธกลางคืน (ราหู)
  let isRahu = false
  if (birthTime) {
    const [h, m] = birthTime.split(':').map(Number)
    const totalMin = (h ?? 0) * 60 + (m ?? 0)
    
    // วันพุธ (3) หลัง 18:00 (1080 นาที)
    if (weekDay === 3 && totalMin >= 1080) {
      isRahu = true
      dayNum = 8
    }
  }

  // ── Thai Lunar Month (v3 Engine) ──────────────────────────────────────────
  const lunar = gregorianToThaiLunarV3(effectiveDate)

  // ── Zodiac Year Number (v3 Engine — เปลี่ยนที่เดือน 5) ──────────────────────
  const zodiac = getZodiacYear(effectiveDate)

  // ── Display ───────────────────────────────────────────────────────────────
  const dayName   = isRahu ? "พุธกลางคืน (ราหู)" : (DAY_NAMES_THAI[weekDay] ?? 'อาทิตย์')
  const dayPlanet = isRahu ? "ราหู" : (PLANET_NAMES[weekDay] ?? 'อาทิตย์')
  
  const isWanPhra = [8, 15, 23, 30].includes(lunar.lunarDay)

  const thaiDateText =
    `วัน${dayName} ${lunar.thaiMonthName} ปี${zodiac.zodiacName} (${lunar.moonPhaseText})`

  return {
    dayNum,
    monthNum: lunar.monthNumber,
    yearNum:  zodiac.zodiacNumber,
    dayName,
    dayPlanet,
    zodiacName: zodiac.zodiacName,
    lunarMonth: lunar.thaiMonth,
    lunarMonthName: lunar.thaiMonthName,
    lunarDay: lunar.lunarDay,
    moonPhase: lunar.moonPhaseText,
    thaiDateText,
    weekDay,
    isWanPhra,
    isApproximate: lunar.source === "astronomical",
    thaiYear: zodiac.thaiYear,
  }
}

// ─── Legacy API (backward compat) ────────────────────────────────────────────

export interface LunarDate {
  lunarDay:   number
  lunarMonth: number
  lunarYear:  number
  moonPhase:  string
  isWanPhra:  boolean
}

export function getThaiLunarDate(dateStr: string): LunarDate {
  const d    = new Date(dateStr + 'T12:00:00')
  const lunar = gregorianToThaiLunarV3(d)
  return {
    lunarDay:   lunar.lunarDay,
    lunarMonth: lunar.thaiMonth,
    lunarYear:  d.getFullYear() + 543,
    moonPhase:  lunar.moonPhaseText,
    isWanPhra:  [8,15,23,30].includes(lunar.lunarDay),
  }
}

export function getLunarDate(date: Date): LunarDate {
  return getThaiLunarDate(date.toISOString().slice(0, 10))
}

export function isWanPhra(lunarDay: number): boolean {
  return [8, 15, 23, 30].includes(lunarDay)
}

export function lunarDayToPhaseString(lunarDay: number): string {
  if (lunarDay <= 15) return `ขึ้น ${lunarDay} ค่ำ`
  return `แรม ${lunarDay - 15} ค่ำ`
}

export { r7 }
