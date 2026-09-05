/**
 * core/astroTime.ts
 * Astronomical time utilities — เวลาเกิด → decimal hours / total minutes
 *
 * ใช้สำหรับ:
 * - ส่งเข้า ephemeris calculation (decimal hour)
 * - ยามอัฏฐกาล (total minutes)
 * - กฎตัดวัน 06:01 AM ของโหราศาสตร์ไทย
 */

export interface AstroTime {
  /** ชั่วโมง (0-23) */
  hour: number
  /** นาที (0-59) */
  minute: number
  /** รวมนาที (0-1439) */
  totalMinutes: number
  /** ชั่วโมงทศนิยม (สำหรับ ephemeris) */
  decimalHour: number
  /** กลางวัน / กลางคืน */
  period: 'day' | 'night'
}

/**
 * แปลงเวลาเกิด "HH:MM" → AstroTime
 * @param birthTime เวลาเกิด เช่น "07:30"
 */
export function convertBirthTime(birthTime: string): AstroTime {
  const [hStr, mStr] = birthTime.split(':')
  const hour   = parseInt(hStr ?? '12', 10)
  const minute = parseInt(mStr ?? '0', 10)
  const totalMinutes = hour * 60 + minute
  const decimalHour  = hour + minute / 60

  return {
    hour,
    minute,
    totalMinutes,
    decimalHour,
    period: (hour >= 6 && (hour > 6 || minute >= 1) && hour < 18) ? 'day' : 'night',
  }
}

/**
 * กฎตัดวัน — เกิดก่อน 06:01 น. นับเป็นวันก่อนหน้า
 * @returns dayOffset: -1 ถ้าต้องถอยวัน, 0 ถ้าปกติ
 */
export function getDayCutoffOffset(birthTime: string): number {
  const [hStr, mStr] = birthTime.split(':')
  const hour = parseInt(hStr ?? '12', 10)
  const minute = parseInt(mStr ?? '0', 10)
  return (hour < 6 || (hour === 6 && minute < 1)) ? -1 : 0
}

/**
 * แปลง birthDate + birthTime → Date object (local time)
 */
export function toBirthDate(birthDate: string, birthTime: string = '12:00'): Date {
  return new Date(`${birthDate}T${birthTime}:00`)
}

/**
 * คำนวณวันทางโหราศาสตร์ไทย (Astrological Thai Date)
 * กฎ: ตัดวันใหม่ที่เวลา 06:01 น. (ยามอัฐกาลกลางวันเริ่ม 06:01 น.)
 * ช่วงเวลา 00:00:00 - 06:00:59 (เวลาไทย) ถือเป็นวันเดิม (ถอยหลัง 1 วัน)
 * ตั้งแต่ 06:01:00 น. เป็นต้นไป ถือเป็นเช้าวันใหม่
 *
 * @param date วันและเวลา (default: new Date())
 * @param timeZone Timezone (default: "Asia/Bangkok")
 * @returns Date object ของวันทางโหราศาสตร์ (เวลา 12:00:00 ป้องกัน UTC shift)
 */
export function getAstrologicalDate(date: Date = new Date(), timeZone: string = 'Asia/Bangkok'): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  let year = 0, month = 0, day = 0, hour = 0, minute = 0
  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10)
    if (p.type === 'month') month = parseInt(p.value, 10)
    if (p.type === 'day') day = parseInt(p.value, 10)
    if (p.type === 'hour') hour = parseInt(p.value, 10)
    if (p.type === 'minute') minute = parseInt(p.value, 10)
  }

  if (hour === 24) hour = 0

  // ก่อน 06:01 (hour < 6 หรือ hour === 6 && minute < 1) ถอยหลัง 1 วัน
  const isBeforeCutoff = hour < 6 || (hour === 6 && minute < 1)

  const baseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  if (isBeforeCutoff) {
    baseDate.setUTCDate(baseDate.getUTCDate() - 1)
  }

  return baseDate
}

/**
 * คำนวณวันที่ทางโหราศาสตร์ไทยเป็น String รูปแบบ "YYYY-MM-DD"
 */
export function getAstrologicalDateStr(date: Date = new Date(), timeZone: string = 'Asia/Bangkok'): string {
  const astroDate = getAstrologicalDate(date, timeZone)
  const y = astroDate.getUTCFullYear()
  const m = String(astroDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(astroDate.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * คำนวณข้อความวันที่ภาษาไทยตามระบบโหราศาสตร์ (ตัดวัน 06:01 น.)
 * เช่น "วันศุกร์ที่ 4 กันยายน 2569"
 */
export function getAstrologicalThaiFormattedDate(
  date: Date = new Date(),
  locale: string = 'th-TH',
  timeZone: string = 'Asia/Bangkok'
): string {
  const astroDateStr = getAstrologicalDateStr(date, timeZone)
  const [y, m, d] = astroDateStr.split('-').map(Number)
  const targetDate = new Date(y!, m! - 1, d!, 12, 0, 0)

  if (locale.startsWith('th')) {
    const weekdays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์']
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    const wd = weekdays[targetDate.getDay()]
    const monthName = thaiMonths[m! - 1]
    const beYear = y! + 543
    return `${wd}ที่ ${d} ${monthName} ${beYear}`
  }

  return targetDate.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
