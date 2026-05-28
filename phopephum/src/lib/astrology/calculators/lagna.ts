/**
 * calculators/lagna.ts
 * ลัคนา (Ascendant) — คำนวณจาก ephemeris + พิกัดเกิด
 *
 * ใช้ pure JS ephemeris (edge-compatible, ไม่ต้องใช้ swisseph)
 * ความแม่นยำ ~2° — เพียงพอสำหรับโหราศาสตร์ไทย (ระบุราศีได้ถูกต้อง)
 *
 * หลักการ:
 * 1. คำนวณ Greenwich Mean Sidereal Time (GMST) ณ JD ที่กำหนด
 * 2. แปลงเป็น Local Sidereal Time (LST) ด้วย longitude เกิด
 * 3. คำนวณ Ascendant จาก LST + obliquity + latitude
 */

import { julianCenturies } from '../core/julianDay'
import { obliquityOfEcliptic } from '../core/ephemeris'
import { getZodiacSign, getZodiacFull, getDegreeInSign } from '../core/zodiac'

export interface LagnaResult {
  /** ลัคนา องศา ecliptic (0-360) */
  ascendant: number
  /** มัธยลัคนา (MC) องศา ecliptic */
  mc: number
  /** ชื่อราศีลัคนา */
  lagnaSign: string
  /** องศาภายในราศี */
  degreeInSign: number
  /** ดาวเจ้าราศีลัคนา */
  lagnaRuler: string
  /** บ้าน 12 หลัง (เริ่มจากลัคนา) */
  houses: number[]
}

function rad(d: number) { return d * Math.PI / 180 }
function deg(r: number) { return r * 180 / Math.PI }
function norm360(d: number) { return ((d % 360) + 360) % 360 }

/**
 * คำนวณ GMST ณ Julian Day (Meeus Ch. 12)
 * @returns GMST in degrees (0-360)
 */
function calcGMST(jd: number): number {
  const T = julianCenturies(jd)
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T - T * T * T / 38710000
  return norm360(gmst)
}

/**
 * คำนวณ Local Sidereal Time (LST) จาก GMST + longitude
 * @param gmst   GMST in degrees
 * @param lng    Geographic longitude (east = positive)
 */
function calcLST(gmst: number, lng: number): number {
  return norm360(gmst + lng)
}

/**
 * คำนวณ Ascendant จาก LST + obliquity + latitude
 * สูตร: tan(ASC) = -cos(RAMC) / (sin(RAMC)*cos(ε) + tan(φ)*sin(ε))
 */
function calcAscendant(lst: number, obliquity: number, latitude: number): number {
  const ramcRad = rad(lst)
  const oblRad  = rad(obliquity)
  const latRad  = rad(latitude)

  const y = -Math.cos(ramcRad)
  const x = Math.sin(ramcRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad)

  let asc = deg(Math.atan2(y, x))
  // Adjust quadrant: if x > 0 add 180°
  if (x > 0) asc += 180
  asc = norm360(asc)

  return asc
}

/**
 * คำนวณ MC (Midheaven) จาก RAMC + obliquity
 */
function calcMC(ramc: number, obliquity: number): number {
  const ramcRad = rad(ramc)
  const oblRad  = rad(obliquity)
  const mc = deg(Math.atan2(Math.tan(ramcRad), Math.cos(oblRad)))
  const mcNorm = norm360(mc)
  // Ensure MC is in same half as RAMC
  if (Math.abs(mcNorm - ramc) > 90 && Math.abs(mcNorm - ramc) < 270) {
    return norm360(mcNorm + 180)
  }
  return mcNorm
}

/**
 * คำนวณลัคนา (Ascendant) และเรือนชะตา
 * @param jd         Julian Day ณ เวลาเกิด
 * @param latitude   ละติจูดเกิด (เหนือ = บวก)
 * @param longitude  ลองจิจูดเกิด (ออก = บวก)
 */
export function calculateLagna(
  jd: number,
  latitude: number,
  longitude: number,
): LagnaResult {
  const gmst      = calcGMST(jd)
  const lst       = calcLST(gmst, longitude)
  const obliquity = obliquityOfEcliptic(jd)

  const ascendant = calcAscendant(lst, obliquity, latitude)
  const mc        = calcMC(lst, obliquity)

  // สร้างเรือน 12 หลัง แบบ Equal House (เรือนละ 30° จาก Ascendant)
  const houses = Array.from({ length: 12 }, (_, i) => norm360(ascendant + i * 30))

  const lagnaSign  = getZodiacSign(ascendant)
  const lagnaFull  = getZodiacFull(ascendant)

  return {
    ascendant,
    mc,
    lagnaSign,
    degreeInSign: getDegreeInSign(ascendant),
    lagnaRuler:  lagnaFull.ruler,
    houses,
  }
}
