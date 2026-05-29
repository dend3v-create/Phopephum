/**
 * core/astroTime.ts
 * Astronomical time utilities — เวลาเกิด → decimal hours / total minutes
 *
 * ใช้สำหรับ:
 * - ส่งเข้า ephemeris calculation (decimal hour)
 * - ยามอัฐกาล (total minutes)
 * - กฎตัดวัน 06:00 AM ของโหราศาสตร์ไทย
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
    period: (hour >= 6 && hour < 18) ? 'day' : 'night',
  }
}

/**
 * กฎตัดวัน — เกิดก่อน 06:00 น. นับเป็นวันก่อนหน้า
 * @returns dayOffset: -1 ถ้าต้องถอยวัน, 0 ถ้าปกติ
 */
export function getDayCutoffOffset(birthTime: string): number {
  const [hStr] = birthTime.split(':')
  const hour = parseInt(hStr ?? '12', 10)
  return hour < 6 ? -1 : 0
}

/**
 * แปลง birthDate + birthTime → Date object (local time)
 */
export function toBirthDate(birthDate: string, birthTime: string = '12:00'): Date {
  return new Date(`${birthDate}T${birthTime}:00`)
}
