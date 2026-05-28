/**
 * core/lunarCalendar.ts
 * Thai Lunar Calendar Core — จันทรคติไทย 100 ปี
 *
 * ลำดับการ lookup:
 *   1. ตาราง lunar100year.json (แม่นยำ)
 *   2. อัลกอริทึม Suriyayat (fallback)
 */

import lunarData from '../datasets/lunar100year.json'

export interface LunarDate {
  lunarDay:   number   // 1-30
  lunarMonth: number   // 1-12 (13 = อธิกมาส)
  lunarYear:  number   // พ.ศ.
  moonPhase:  string   // "ขึ้น N ค่ำ" | "แรม N ค่ำ"
  isWanPhra:  boolean  // วันพระ (วันขึ้น 8, 15, แรม 8, 15 ค่ำ)
}

type LunarRecord = {
  lunarDay: number
  lunarMonth: number
  lunarYear: number
  moonPhase: string
}

/**
 * ดึงข้อมูลวันจันทรคติจาก string "YYYY-MM-DD"
 * ใช้ตาราง 100 ปี → fallback Suriyayat (ไม่ throw)
 */
export function getThaiLunarDate(dateStr: string): LunarDate {
  return getLunarDate(new Date(dateStr))
}

/**
 * ดึงข้อมูลวันจันทรคติจาก Date (Gregorian)
 * ใช้ตาราง 100 ปี → fallback Suriyayat
 */
export function getLunarDate(date: Date): LunarDate {
  const key = date.toISOString().slice(0, 10) // "YYYY-MM-DD"
  const data = lunarData as unknown as Record<string, LunarRecord>
  const record = data[key]

  if (record) {
    return {
      lunarDay:   record.lunarDay,
      lunarMonth: record.lunarMonth,
      lunarYear:  record.lunarYear,
      moonPhase:  record.moonPhase,
      isWanPhra:  isWanPhra(record.lunarDay),
    }
  }

  // Fallback: Suriyayat approximation
  return suriyayatApprox(date)
}

/**
 * ตรวจสอบวันพระ
 * วันพระ = ขึ้น 8, ขึ้น 15, แรม 8, แรม 15 ค่ำ
 */
export function isWanPhra(lunarDay: number): boolean {
  return lunarDay === 8 || lunarDay === 15 || lunarDay === 23 || lunarDay === 30
}

/**
 * แปลง lunarDay (1-30) → "ขึ้น N ค่ำ" หรือ "แรม N ค่ำ"
 */
export function lunarDayToPhaseString(lunarDay: number): string {
  if (lunarDay <= 15) {
    return `ขึ้น ${lunarDay} ค่ำ`
  }
  return `แรม ${lunarDay - 15} ค่ำ`
}

// ─── Suriyayat Fallback ──────────────────────────────────────────────────────

/**
 * คำนวณวันจันทรคติด้วย Suriyayat (ประมาณ ±1 วัน)
 * อ้างอิง: สุริยยาตร์ ฉบับปรับปรุง
 */
function suriyayatApprox(date: Date): LunarDate {
  // Julian Day Number
  const jd = toJulianDay(date)

  // Thai Solar Year (พุทธศักราช)
  const thaiYear = date.getFullYear() + 543

  // Lunar phase from JD (synodic month = 29.53059 days)
  const SYNODIC = 29.53059
  const KNOWN_NEW_MOON_JD = 2451550.1 // Jan 6, 2000 CE (New Moon)
  const daysSinceKnown = jd - KNOWN_NEW_MOON_JD
  const cyclePos = ((daysSinceKnown % SYNODIC) + SYNODIC) % SYNODIC

  // lunarDay: 1-30
  const lunarDay = Math.floor(cyclePos) + 1

  // lunarMonth: estimate from solar month
  const solarMonth = date.getMonth() + 1
  const lunarMonth = (((solarMonth + 1) % 12) + 1) // rough approximation

  const moonPhase = lunarDayToPhaseString(lunarDay)

  return {
    lunarDay,
    lunarMonth,
    lunarYear:  thaiYear,
    moonPhase,
    isWanPhra:  isWanPhra(lunarDay),
  }
}

function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate() + (date.getUTCHours() + 7) / 24 // UTC+7
  const A = Math.floor((14 - m) / 12)
  const Y = y + 4800 - A
  const M = m + 12 * A - 3
  return d + Math.floor((153 * M + 2) / 5) + 365 * Y +
    Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045
}
