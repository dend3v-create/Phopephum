/**
 * core/julianDay.ts
 * Julian Day Number (JDN) calculation — pure JS, edge-compatible
 *
 * JD เป็นหน่วยมาตรฐานทางดาราศาสตร์ ใช้ใน ephemeris คำนวณ
 * JD 2451545.0 = J2000.0 = 1 มกราคม ค.ศ. 2000 เวลา 12:00 TT
 */

/**
 * สร้าง Julian Day จากวันที่ + เวลา (Gregorian calendar)
 * @param year ปี ค.ศ.
 * @param month เดือน (1-12)
 * @param day วันที่ (1-31)
 * @param hourDecimal ชั่วโมงทศนิยม UTC (เช่น 7.5 = 07:30)
 */
export function createJulianDay(
  year: number,
  month: number,
  day: number,
  hourDecimal: number = 12,
): number {
  // Timezone offset: Thailand is UTC+7 → subtract to get UTC
  const utcHour = hourDecimal - 7

  const A = Math.floor((14 - month) / 12)
  const Y = year + 4800 - A
  const M = month + 12 * A - 3

  const JDN =
    day +
    Math.floor((153 * M + 2) / 5) +
    365 * Y +
    Math.floor(Y / 4) -
    Math.floor(Y / 100) +
    Math.floor(Y / 400) -
    32045

  return JDN - 0.5 + utcHour / 24
}

/**
 * สร้าง Julian Day จาก Date object
 * @param date Date (local time Thailand)
 */
export function dateToJulianDay(date: Date): number {
  return createJulianDay(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours() + date.getMinutes() / 60,
  )
}

/**
 * แปลง Julian Day → Date object
 */
export function julianDayToDate(jd: number): Date {
  const z = Math.floor(jd + 0.5)
  const f = jd + 0.5 - z
  let a = z
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25)
    a = z + 1 + alpha - Math.floor(alpha / 4)
  }
  const b = a + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const d = Math.floor(365.25 * c)
  const e = Math.floor((b - d) / 30.6001)

  const day   = b - d - Math.floor(30.6001 * e)
  const month = e < 14 ? e - 1 : e - 13
  const year  = month > 2 ? c - 4716 : c - 4715
  const hour  = f * 24 + 7 // UTC → Thailand UTC+7

  return new Date(year, month - 1, day, Math.floor(hour), Math.round((hour % 1) * 60))
}

/**
 * Julian Centuries จาก J2000.0 (ใช้ใน ephemeris)
 */
export function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525
}
