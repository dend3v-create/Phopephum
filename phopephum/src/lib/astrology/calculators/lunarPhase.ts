/**
 * calculators/lunarPhase.ts
 * เฟสดวงจันทร์ — re-export และ extensions จาก calculateMoonPhase
 *
 * ใช้ module นี้เมื่อต้องการ:
 * - ข้างขึ้น/ข้างแรม (waxing/waning)
 * - วันพระ
 * - เดือนจันทรคติ
 * - คำแนะนำตามดิถี
 */

export {
  calculateMoonPhase,
  checkIsWanPhra,
  getNextWanPhra,
  type MoonPhaseResult,
} from './calculateMoonPhase'

// ─── Extended Functions ───────────────────────────────────────────────────────

import { calculateMoonPhase, MoonPhaseResult } from './calculateMoonPhase'

/**
 * สรุปเฟสดวงจันทร์เป็นข้อความสั้น
 */
export function getLunarPhaseSummary(date: Date = new Date()): string {
  const phase = calculateMoonPhase(date)
  const wanPhra = phase.isWanPhra ? ' (วันพระ🙏)' : ''
  return `${phase.moonPhase}${wanPhra} — ${phase.guidance}`
}

/**
 * ดิถี (lunar day index for rituals)
 * คืนชื่อดิถี เช่น "อัฏฐมี" (8), "จตุรทศี" (14), "ปัณรสี" (15=เพ็ญ)
 */
const TITHI_NAMES: Record<number, string> = {
  1:  'ปฐมา',  2:  'ทุติยา',  3:  'ตฤตียา',  4: 'จตุรถี',
  5:  'ปัญจมี', 6: 'ฉัฏฐี',   7:  'สัปตมี',   8: 'อัฏฐมี',
  9:  'นวมี',  10: 'ทศมี',    11: 'เอกาทศี', 12: 'ทวาทศี',
  13: 'ตรโยทศี', 14: 'จตุรทศี', 15: 'ปัณรสี',
}

export function getTithiName(lunarDay: number): string {
  const day = lunarDay <= 15 ? lunarDay : lunarDay - 15
  return TITHI_NAMES[day] ?? `ดิถีที่ ${day}`
}

/**
 * ฤกษ์ตามดิถี (auspicious level by lunar day)
 * ดิถีมงคล: 1,3,5,7,10,11,12,13 ข้างขึ้น / 1,2,3,5 ข้างแรม
 */
export function isAuspiciousDithi(lunarDay: number): boolean {
  const AUSPICIOUS_WAXING  = [1, 3, 5, 7, 10, 11, 12, 13]
  const AUSPICIOUS_WANING  = [16, 17, 18, 20] // ข้างแรม 1,2,3,5

  if (lunarDay === 8 || lunarDay === 15 || lunarDay === 23 || lunarDay === 30) {
    return false // วันพระ — ไม่เริ่มสิ่งใหม่
  }

  return AUSPICIOUS_WAXING.includes(lunarDay) || AUSPICIOUS_WANING.includes(lunarDay)
}
