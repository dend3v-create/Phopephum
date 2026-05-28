/**
 * newMoon.ts — Meeus Astronomical New Moon Calculator
 *
 * อ้างอิง: Jean Meeus, "Astronomical Algorithms", 2nd ed., Ch. 49
 * ความแม่นยำ: ±2 นาที (เกินพอสำหรับปฏิทินจันทรคติไทย)
 *
 * ไม่ต้องติดตั้ง dependency ใดๆ — pure math
 */

const DEG = Math.PI / 180;
const J2000_UNIX_MS = 946728000000; // 2000-01-01 12:00:00 UTC
const J2000_JDE     = 2451545.0;
const MEAN_LUNATION = 29.530588861; // วันต่อเดือนจันทรคติ

/** แปลงองศา → เรเดียน */
function r(d: number): number { return d * DEG; }

/**
 * คำนวณ Julian Ephemeris Day ของ New Moon ครั้งที่ k
 * k = 0 คือ New Moon วันที่ 6 ม.ค. 2000
 * k < 0 = ก่อน J2000, k > 0 = หลัง J2000
 */
export function newMoonJDE(k: number): number {
  const T  = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // สมการหลัก (ค่าเฉลี่ย)
  let JDE = 2451550.09766
    + MEAN_LUNATION * k
    + 0.00015437 * T2
    - 0.000000150 * T3
    + 0.00000000073 * T4;

  // ค่าความผิดปกติของดวงอาทิตย์และดวงจันทร์
  const M  = r(2.5534    + 29.10535670  * k - 0.0000014  * T2 - 0.00000011 * T3);
  const Mp = r(201.5643  + 385.81693528 * k + 0.0107582  * T2 + 0.00001238 * T3 - 0.000000058 * T4);
  const F  = r(160.7108  + 390.67050284 * k - 0.0016118  * T2 - 0.00000227 * T3 + 0.000000011 * T4);
  const Om = r(124.7746  - 1.56375588   * k + 0.0020672  * T2 + 0.00000215 * T3);
  const E  = 1 - 0.002516 * T - 0.0000074 * T2;

  // การแก้ไขหลัก
  JDE +=
    - 0.40720 * Math.sin(Mp)
    + 0.17241 * E * Math.sin(M)
    + 0.01608 * Math.sin(2 * Mp)
    + 0.01039 * Math.sin(2 * F)
    + 0.00739 * E * Math.sin(Mp - M)
    - 0.00514 * E * Math.sin(Mp + M)
    + 0.00208 * E * E * Math.sin(2 * M)
    - 0.00111 * Math.sin(Mp - 2 * F)
    - 0.00057 * Math.sin(Mp + 2 * F)
    + 0.00056 * E * Math.sin(2 * Mp + M)
    - 0.00042 * Math.sin(3 * Mp)
    + 0.00042 * E * Math.sin(M + 2 * F)
    + 0.00038 * E * Math.sin(M - 2 * F)
    - 0.00024 * E * Math.sin(2 * Mp - M)
    - 0.00017 * Math.sin(Om)
    - 0.00007 * Math.sin(Mp + 2 * M)
    + 0.00004 * Math.sin(2 * Mp - 2 * F)
    + 0.00004 * Math.sin(3 * M)
    + 0.00003 * Math.sin(Mp + M - 2 * F)
    + 0.00003 * Math.sin(2 * Mp + 2 * F)
    - 0.00003 * Math.sin(Mp + M + 2 * F)
    + 0.00003 * Math.sin(Mp - M + 2 * F)
    - 0.00002 * Math.sin(Mp - M - 2 * F)
    - 0.00002 * Math.sin(3 * Mp + M)
    + 0.00002 * Math.sin(4 * Mp);

  return JDE;
}

/** แปลง JDE → Unix milliseconds (UTC) */
export function jdeToUnixMs(jde: number): number {
  return J2000_UNIX_MS + (jde - J2000_JDE) * 86400000;
}

/** แปลง Unix ms (UTC) → วันที่ Bangkok (UTC+7) */
export function utcMsToBangkokDate(utcMs: number): { year: number; month: number; day: number } {
  const bkk = new Date(utcMs + 7 * 3600000);
  return { year: bkk.getUTCFullYear(), month: bkk.getUTCMonth() + 1, day: bkk.getUTCDate() };
}

/**
 * หา New Moon ทั้งหมดในปี CE year (เวลา Bangkok UTC+7)
 * คืนค่าเป็น Date objects (local midnight ของวันที่เกิด New Moon ใน BKK)
 */
export function newMoonsInYear(ceYear: number): Date[] {
  // ค่า k โดยประมาณสำหรับต้นปี
  const kApprox = Math.floor((ceYear - 2000) * 12.3685) - 1;
  const results: Date[] = [];

  for (let dk = 0; dk <= 14; dk++) {
    const k = kApprox + dk;
    const jde = newMoonJDE(k);
    const utcMs = jdeToUnixMs(jde);
    const bkk = utcMsToBangkokDate(utcMs);

    if (bkk.year === ceYear) {
      results.push(new Date(bkk.year, bkk.month - 1, bkk.day));
    }
  }

  return results.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * หา k (lunation number) โดยประมาณสำหรับ date ที่กำหนด
 */
export function kForDate(date: Date): number {
  const yearFrac = date.getFullYear() + (date.getMonth() + 0.5) / 12;
  return (yearFrac - 2000) * 12.3685;
}

/**
 * หา New Moon ที่ใกล้ที่สุดกับ date ที่กำหนด (Bangkok time)
 * Returns the Bangkok-local date of that new moon
 */
export function nearestNewMoon(date: Date): Date {
  const k0 = Math.round(kForDate(date));
  let bestDate: Date | null = null;
  let bestDiffDays = Infinity;

  for (let dk = -2; dk <= 2; dk++) {
    const jde = newMoonJDE(k0 + dk);
    const utcMs = jdeToUnixMs(jde);
    const bkk = utcMsToBangkokDate(utcMs);
    const nm = new Date(bkk.year, bkk.month - 1, bkk.day);
    const diff = Math.abs(nm.getTime() - date.getTime()) / 86400000;
    if (diff < bestDiffDays) {
      bestDiffDays = diff;
      bestDate = nm;
    }
  }

  return bestDate!;
}

/**
 * หา New Moon ถัดจาก date (Bangkok)
 * startAfter = true → เอา new moon ที่อยู่หลัง date
 */
export function nextNewMoonAfter(date: Date): Date {
  const k0 = Math.floor(kForDate(date));
  for (let dk = 0; dk <= 3; dk++) {
    const jde = newMoonJDE(k0 + dk);
    const utcMs = jdeToUnixMs(jde);
    const bkk = utcMsToBangkokDate(utcMs);
    const nm = new Date(bkk.year, bkk.month - 1, bkk.day);
    if (nm.getTime() > date.getTime()) return nm;
  }
  // fallback
  return new Date(date.getTime() + 30 * 86400000);
}
