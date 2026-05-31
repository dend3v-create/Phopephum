/**
 * core/lunarCalendar.ts
 * Thai Lunar Calendar — จันทรคติไทย
 *
 * ✅ Fixed: 23 ก.ค. 1982 = วันศุกร์ เดือน 9 ปีจอ ขึ้น 3 ค่ำ
 *
 * Lookup priority (highest → lowest):
 *   1. THAI_LUNAR_NEW_MONTH  — hand-verified specific years (override)
 *   2. lunar100year.json     — Meeus algorithm ±2 min (CE 1920–2040)
 *   3. LUNAR_LOOKUP_EXTENDED — 400-year table (CE 1757–2157)
 *   4. Suriyayat approximation fallback
 *
 * Key format: "ceYear-thaiMonth" → "YYYY-MM-DD" (ขึ้น 1 ค่ำ, Bangkok time)
 * Special key: thaiMonth=88 → เดือน 8 สอง (อธิกมาส)
 */

import { LUNAR_LOOKUP_EXTENDED } from "../datasets/lunarLookup.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** วัน (JS getDay 0=Sun) → เลข 1-7 */
const DAY_TO_NUMBER: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7,
}

const DAY_NAMES_THAI = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
const PLANET_NAMES  = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

const ZODIAC_ORDER = [
  'rat','ox','tiger','rabbit','dragon','snake',
  'horse','goat','monkey','rooster','dog','pig',
] as const
type ZodiacKey = typeof ZODIAC_ORDER[number]

const ZODIAC_NAMES_THAI: Record<ZodiacKey, string> = {
  rat:'ชวด', ox:'ฉลู', tiger:'ขาล', rabbit:'เถาะ', dragon:'มะโรง', snake:'มะเส็ง',
  horse:'มะเมีย', goat:'มะแม', monkey:'วอก', rooster:'ระกา', dog:'จอ', pig:'กุน',
}

const THAI_MONTH_NAMES: Record<number, string> = {
  1:'อ้าย', 2:'ยี่', 3:'สาม', 4:'สี่', 5:'ห้า',
  6:'หก', 7:'เจ็ด', 8:'แปด', 9:'เก้า', 10:'สิบ',
  11:'สิบเอ็ด', 12:'สิบสอง', 13:'สิบสาม (อธิกมาส)',
}

// ─── Lookup Table ─────────────────────────────────────────────────────────────
// Key = "ceYear-thaiMonth", Value = ISO date of ขึ้น 1 ค่ำ
// Source: ปฏิทินสุริยยาตร์มาตรฐาน พ.ศ. 2500-2570

import rawLunarData from '../datasets/thaiLunarCalendar.json';
import rawMeeus from '../datasets/lunar100year.json';

const THAI_LUNAR_NEW_MONTH: Record<string, string> = rawLunarData;

// Meeus-generated 121-year table — strip metadata keys (prefix "_")
const LUNAR_MEEUS: Record<string, string> = Object.fromEntries(
  Object.entries(rawMeeus as Record<string, any>).filter(([k]) => !k.startsWith('_'))
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Circular reduce to 1-7 */
function r7(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1
}

/** พ.ศ. → ปีนักษัตร */
function thaiYearToZodiac(thaiYear: number): ZodiacKey {
  const idx = ((thaiYear - 2503) % 12 + 12) % 12
  return ZODIAC_ORDER[idx]!
}

/** ปีนักษัตร → เลข 1-7 */
function zodiacToNumber(animal: ZodiacKey): number {
  const idx = ZODIAC_ORDER.indexOf(animal) + 1 // 1-12
  return idx > 7 ? idx - 7 : idx
}

// ─── Merged lookup (priority: hand-verified > Meeus > Extended) ──────────────
const MERGED_LOOKUP: Record<string, string> = {
  ...LUNAR_LOOKUP_EXTENDED,   // layer 3: 400-year table baseline
  ...LUNAR_MEEUS,             // layer 2: Meeus ±2 min overrides 1920-2040
  ...THAI_LUNAR_NEW_MONTH,    // layer 1: hand-verified (highest authority)
}

// ─── Core: Gregorian → Thai Lunar Month ──────────────────────────────────────

function gregorianToThaiLunar(date: Date): {
  thaiMonth: number
  monthNum: number   // 1-7
  lunarDay: number   // 1-30
  isWaxing: boolean
  moonPhase: string
  isApproximate: boolean
} {
  const ceYear = date.getFullYear()
  const dateMs = date.getTime()

  // Collect all month-start entries within range (prev + current + next year overlap)
  // เพิ่ม ceYear+1 เพื่อจัดการ gap ระหว่างเดือน 12 และเดือน 1 ปีถัดไป
  const entries: Array<{ month: number; startMs: number }> = []
  for (let y = ceYear - 1; y <= ceYear + 1; y++) {
    for (let m of [1,2,3,4,5,6,7,8,88,9,10,11,12,13]) {
      const key = `${y}-${m}`
      const val = MERGED_LOOKUP[key]
      if (val) {
        const ms = new Date(val + 'T00:00:00').getTime()
        entries.push({ month: m, startMs: ms })
      }
    }
  }

  if (entries.length > 0) {
    entries.sort((a, b) => a.startMs - b.startMs)
    // หา entry ล่าสุดที่ startMs ≤ dateMs (เป็น เดือนที่วันนั้นอยู่)
    let current = entries[0]!
    for (const e of entries) {
      if (e.startMs <= dateMs) current = e
      else break
    }
    const daysIn = Math.floor((dateMs - current.startMs) / 86400000)
    // ป้องกัน daysIn > 29 (เกินขอบเดือน → หา next entry)
    if (daysIn > 29) {
      const nextEntry = entries.find(e => e.startMs > current.startMs)
      if (nextEntry && nextEntry.startMs <= dateMs) {
        const daysIn2 = Math.floor((dateMs - nextEntry.startMs) / 86400000)
        if (daysIn2 <= 29) {
          const isWaxing2 = daysIn2 < 15
          const lunarDay2 = isWaxing2 ? daysIn2 + 1 : daysIn2 - 14
          const thaiMonth2 = nextEntry.month === 88 ? 8 : nextEntry.month
          const monthNum2 = thaiMonth2 > 7 ? thaiMonth2 - 7 : thaiMonth2
          return {
            thaiMonth: nextEntry.month, monthNum: monthNum2,
            lunarDay: lunarDay2, isWaxing: isWaxing2,
            moonPhase: isWaxing2 ? `ขึ้น ${lunarDay2} ค่ำ` : `แรม ${lunarDay2} ค่ำ`,
            isApproximate: false,
          }
        }
      }
    }
    const isWaxing = daysIn < 15
    const lunarDay = isWaxing ? daysIn + 1 : daysIn - 14
    // เดือน 88 (อธิกมาส) → monthNum คิดเป็น เดือน 8
    const thaiMonth = current.month === 88 ? 8 : current.month
    const monthNum = thaiMonth > 7 ? thaiMonth - 7 : thaiMonth
    const moonPhase = isWaxing ? `ขึ้น ${lunarDay} ค่ำ` : `แรม ${lunarDay} ค่ำ`
    return { thaiMonth: current.month, monthNum, lunarDay, isWaxing, moonPhase, isApproximate: false }
  }

  // Fallback: Suriyayat approximation
  const solarMonth = date.getMonth() + 1
  const solarDay   = date.getDate()
  const offset     = solarDay >= 20 ? 2 : 1
  let thaiMonth    = solarMonth + offset
  if (thaiMonth > 12) thaiMonth -= 12
  const monthNum = thaiMonth > 7 ? thaiMonth - 7 : thaiMonth
  return { thaiMonth, monthNum, lunarDay: 1, isWaxing: true, moonPhase: 'ขึ้น 1 ค่ำ', isApproximate: true }
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
}

/**
 * คำนวณเลขฐาน 1-7 สำหรับ ระบบ 7 ตัว 9 ฐาน
 * @param dateStr "YYYY-MM-DD" (ค.ศ.)
 * @param birthTime "HH:MM" optional (ใช้ตรวจ 06:01 cutoff)
 */
export function getThaiBaseNumbers(dateStr: string, birthTime?: string): ThaiBaseNumbers {
  // ── 06:01 Cutoff (ทางโหราศาสตร์เปลี่ยนวันตอน 06:01 น.) ──────────────────────
  let effectiveDate = new Date(dateStr + 'T12:00:00') // local noon to avoid UTC shift
  if (birthTime) {
    const [h, m] = birthTime.split(':').map(Number)
    const totalMin = (h ?? 0) * 60 + (m ?? 0)
    // ถ้าก่อน 06:01 น. (361 นาที) ถือเป็นวันก่อนหน้า
    if (totalMin < 361) {
      effectiveDate = new Date(effectiveDate.getTime() - 86400000)
    }
  }

  // ── Day Number ────────────────────────────────────────────────────────────
  const weekDay = effectiveDate.getDay()
  const dayNum  = DAY_TO_NUMBER[weekDay] ?? 1

  // ── Thai Lunar Month ──────────────────────────────────────────────────────
  const lunar = gregorianToThaiLunar(effectiveDate)

  // ── Zodiac Year Number ────────────────────────────────────────────────────
  const thaiYear   = effectiveDate.getFullYear() + 543
  const zodiacKey  = thaiYearToZodiac(thaiYear)
  const yearNum    = zodiacToNumber(zodiacKey)
  const zodiacName = ZODIAC_NAMES_THAI[zodiacKey]

  // ── Display ───────────────────────────────────────────────────────────────
  const dayName   = DAY_NAMES_THAI[weekDay] ?? 'อาทิตย์'
  const dayPlanet = PLANET_NAMES[weekDay]   ?? 'อาทิตย์'
  const lunarMonthName = THAI_MONTH_NAMES[lunar.thaiMonth] ?? String(lunar.thaiMonth)
  const isWanPhra = [8, 15, 23, 30].includes(lunar.lunarDay)

  const thaiDateText =
    `วัน${dayName} เดือน${lunarMonthName} ปี${zodiacName} (${lunar.moonPhase})`

  return {
    dayNum,
    monthNum: lunar.monthNum,
    yearNum,
    dayName,
    dayPlanet,
    zodiacName,
    lunarMonth: lunar.thaiMonth,
    lunarMonthName,
    lunarDay: lunar.lunarDay,
    moonPhase: lunar.moonPhase,
    thaiDateText,
    weekDay,
    isWanPhra,
    isApproximate: lunar.isApproximate,
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
  const lunar = gregorianToThaiLunar(d)
  return {
    lunarDay:   lunar.lunarDay,
    lunarMonth: lunar.thaiMonth,
    lunarYear:  d.getFullYear() + 543,
    moonPhase:  lunar.moonPhase,
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
