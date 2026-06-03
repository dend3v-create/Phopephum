/**
 * core/julianDay.ts
 * Julian Day (JD) calculation — NASA/Meeus standard.
 * Strictly follows the logic provided for the 100-year calendar.
 */

/**
 * แปลง Gregorian Date → Julian Day (JD)
 * อ้างอิงสูตรจาก Meeus / NASA
 * @param y ปี ค.ศ.
 * @param m เดือน (1-12)
 * @param d วันที่ (1-31)
 */
export function gregorianToJD(y: number, m: number, d: number): number {
  let year = y;
  let month = m;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    d +
    B -
    1524.5
  );
}

/**
 * สร้าง Julian Day จาก Date object (รองรับ Time)
 * @param date Date
 */
export function dateToJD(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  
  // Calculate JD for 00:00:00 of that day, then add hours
  return gregorianToJD(y, m, d) + (h - 12) / 24; // JD starts at noon
}

/**
 * แปลง Julian Day (JD) กลับเป็น Date object
 */
export function jdToDate(jd: number): Date {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day   = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year  = month > 2 ? c - 4716 : c - 4715;
  const totalHours = f * 24;

  const h = Math.floor(totalHours);
  const m = Math.floor((totalHours % 1) * 60);
  const s = Math.round(((totalHours * 60) % 1) * 60);

  return new Date(year, month - 1, day, h, m, s);
}

// Backward compatibility aliases
export const createJulianDay = (y: number, m: number, d: number, h: number = 12) => gregorianToJD(y, m, d) + (h - 12) / 24;
export const dateToJulianDay = dateToJD;
export const julianDayToDate = jdToDate;
export function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525;
}
