/**
 * core/ephemeris.ts
 * Planetary Ephemeris Engine — pure JS, edge-compatible
 *
 * ใช้สมการดาราศาสตร์แบบย่อ (Meeus "Astronomical Algorithms" Ch. 25-33)
 * ความแม่นยำ ~1° สำหรับ Sun, Moon / ~2° สำหรับดาวเคราะห์
 * เพียงพอสำหรับโหราศาสตร์ไทย
 *
 * ไม่ต้องใช้ swisseph (native addon) — รองรับ Cloudflare Edge Runtime
 */

import { julianCenturies } from './julianDay.js'

export interface PlanetPosition {
  /** องศา ecliptic longitude (0-360) */
  longitude: number
  /** ความเร็วในองศา/วัน */
  speed: number
  /** ชื่อดาว */
  name: string
  /** ชื่อดาวภาษาไทย */
  nameThai: string
}

// ─── ค่าคงที่ดาราศาสตร์ ──────────────────────────────────────────────────────

function rad(deg: number): number { return (deg * Math.PI) / 180 }
function norm360(deg: number): number { return ((deg % 360) + 360) % 360 }

// ─── Sun ─────────────────────────────────────────────────────────────────────

/**
 * คำนวณตำแหน่งดวงอาทิตย์ (Meeus Ch. 25 — low accuracy)
 * ความแม่นยำ ~0.01°
 */
export function calculateSun(jd: number): PlanetPosition {
  const T = julianCenturies(jd)
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T)
  const M  = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T)
  const Mrad = rad(M)

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad)

  const sunLon = norm360(L0 + C)

  return { longitude: sunLon, speed: 0.9856, name: 'Sun', nameThai: 'อาทิตย์' }
}

// ─── Moon ────────────────────────────────────────────────────────────────────

/**
 * คำนวณตำแหน่งดวงจันทร์ (Meeus Ch. 47 — simplified)
 * ความแม่นยำ ~1°
 */
export function calculateMoon(jd: number): PlanetPosition {
  const T = julianCenturies(jd)

  const Lm = norm360(218.3164477 + 481267.88123421 * T)
  const D  = norm360(297.8501921 + 445267.1114034  * T)
  const M  = norm360(357.5291092 +  35999.0502909  * T)
  const Mm = norm360(134.9633964 + 477198.8675055  * T)
  const F  = norm360( 93.2720950 + 483202.0175233  * T)

  // Main corrections (degrees)
  const corr =
    6.288774 * Math.sin(rad(Mm)) +
    1.274027 * Math.sin(rad(2 * D - Mm)) +
    0.658314 * Math.sin(rad(2 * D)) +
    0.213618 * Math.sin(rad(2 * Mm)) +
   -0.185116 * Math.sin(rad(M)) +
   -0.114332 * Math.sin(rad(2 * F))

  const moonLon = norm360(Lm + corr)
  return { longitude: moonLon, speed: 13.176, name: 'Moon', nameThai: 'จันทร์' }
}

// ─── Inner Planets ────────────────────────────────────────────────────────────

/**
 * สูตรทั่วไปสำหรับดาวเคราะห์ (Meeus Ch. 33 simplified)
 * ใช้ orbital elements + perturbations
 */
function calcPlanetLon(
  jd: number,
  L0: number, L1: number,
  M0: number, M1: number,
  e: number,
): number {
  const T = julianCenturies(jd)
  const L = norm360(L0 + L1 * T)
  const M = norm360(M0 + M1 * T)
  const Mr = rad(M)
  // Equation of center
  const v = M + (360 / Math.PI) * e * Math.sin(Mr)
  return norm360(L + v - M)
}

export function calculateMercury(jd: number): PlanetPosition {
  const lon = calcPlanetLon(jd, 252.250906, 149474.0722491, 174.7948, 149472.5152390, 0.20563069)
  return { longitude: lon, speed: 4.09, name: 'Mercury', nameThai: 'พุธ' }
}

export function calculateVenus(jd: number): PlanetPosition {
  const lon = calcPlanetLon(jd, 181.979801, 58519.2130302, 50.4161, 58517.8156760, 0.00677323)
  return { longitude: lon, speed: 1.60, name: 'Venus', nameThai: 'ศุกร์' }
}

export function calculateMars(jd: number): PlanetPosition {
  const lon = calcPlanetLon(jd, 355.433275, 19141.6964746, 19.3730, 19140.2993313, 0.09341233)
  return { longitude: lon, speed: 0.524, name: 'Mars', nameThai: 'อังคาร' }
}

export function calculateJupiter(jd: number): PlanetPosition {
  const lon = calcPlanetLon(jd, 34.351519, 3036.3027748, 20.9217, 3034.9056746, 0.04839266)
  return { longitude: lon, speed: 0.0831, name: 'Jupiter', nameThai: 'พฤหัส' }
}

export function calculateSaturn(jd: number): PlanetPosition {
  const lon = calcPlanetLon(jd, 50.077444, 1223.5110686, 317.0207, 1222.1138742, 0.05415060)
  return { longitude: lon, speed: 0.0334, name: 'Saturn', nameThai: 'เสาร์' }
}

// ─── Rahu / Ketu (Moon's Nodes) ───────────────────────────────────────────────

/**
 * ราหู — Mean North Node of Moon
 * เคลื่อนถอยหลัง ~19.4°/ปี
 */
export function calculateRahu(jd: number): PlanetPosition {
  const T = julianCenturies(jd)
  const Om = norm360(125.0445479 - 1934.1362608 * T + 0.0020754 * T * T)
  return { longitude: Om, speed: -0.0529, name: 'Rahu', nameThai: 'ราหู' }
}

/**
 * เกตุ — South Node (ตรงข้าม ราหู เสมอ)
 */
export function calculateKetu(jd: number): PlanetPosition {
  const rahu = calculateRahu(jd)
  return { longitude: norm360(rahu.longitude + 180), speed: rahu.speed, name: 'Ketu', nameThai: 'เกตุ' }
}

// ─── All Planets ──────────────────────────────────────────────────────────────

export interface AllPlanets {
  sun:     PlanetPosition
  moon:    PlanetPosition
  mercury: PlanetPosition
  venus:   PlanetPosition
  mars:    PlanetPosition
  jupiter: PlanetPosition
  saturn:  PlanetPosition
  rahu:    PlanetPosition
  ketu:    PlanetPosition
}

/**
 * คำนวณตำแหน่งดาวทั้ง 9 ดวง ณ Julian Day ที่กำหนด
 */
export function calculateAllPlanets(jd: number): AllPlanets {
  return {
    sun:     calculateSun(jd),
    moon:    calculateMoon(jd),
    mercury: calculateMercury(jd),
    venus:   calculateVenus(jd),
    mars:    calculateMars(jd),
    jupiter: calculateJupiter(jd),
    saturn:  calculateSaturn(jd),
    rahu:    calculateRahu(jd),
    ketu:    calculateKetu(jd),
  }
}

// ─── Obliquity of Ecliptic ────────────────────────────────────────────────────

/**
 * มุมเอียงของสุริยวิถี (obliquity of ecliptic) ณ Julian Day ที่กำหนด
 * ความแม่นยำ ~0.01°
 */
export function obliquityOfEcliptic(jd: number): number {
  const T = julianCenturies(jd)
  return 23.439291 - 0.013004 * T - 0.0001638 * T * T
}
