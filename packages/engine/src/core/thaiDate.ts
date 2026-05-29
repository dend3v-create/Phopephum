/**
 * core/thaiDate.ts
 * Thai date utilities — BE/CE conversion, formatting, day-of-week
 *
 * Buddhist Era (พ.ศ.) = CE + 543
 * Thai day names: อาทิตย์(0) … เสาร์(6)
 */

export const THAI_DAY_NAMES = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์',
] as const

export const THAI_MONTH_NAMES = [
  '', // index 0 unused
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
] as const

export const THAI_ZODIAC = [
  'ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง',
  'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน',
] as const

/**
 * แปลง ค.ศ. → พ.ศ.
 */
export function toBuddhistYear(ceYear: number): number {
  return ceYear + 543
}

/**
 * แปลง พ.ศ. → ค.ศ.
 */
export function toChristianYear(beYear: number): number {
  return beYear - 543
}

/**
 * ดึงชื่อวันภาษาไทยจาก Date
 */
export function getThaiDayName(date: Date): string {
  return THAI_DAY_NAMES[date.getDay()] ?? 'อาทิตย์'
}

/**
 * ดึงชื่อเดือนภาษาไทย (1-12)
 */
export function getThaiMonthName(month: number): string {
  return THAI_MONTH_NAMES[month] ?? 'มกราคม'
}

/**
 * ดึงปีนักษัตรจากปี ค.ศ.
 * ปี 2020 = ชวด (index 0)
 */
export function getThaiZodiacYear(ceYear: number): string {
  // 2020 = ชวด → index 0
  const idx = ((ceYear - 2020) % 12 + 12) % 12
  return THAI_ZODIAC[idx] ?? 'ชวด'
}

/**
 * จัดรูปแบบวันที่ภาษาไทย
 * เช่น "วันพฤหัสบดีที่ 23 กันยายน พ.ศ. 2525"
 */
export function formatThaiDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = toBuddhistYear(date.getFullYear())
  const dayName = getThaiDayName(date)
  return `วัน${dayName}ที่ ${day} ${getThaiMonthName(month)} พ.ศ. ${year}`
}

/**
 * คำนวณอายุ ณ ปัจจุบัน
 */
export function calculateAge(birthDateStr: string): number {
  const birth = new Date(birthDateStr)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
