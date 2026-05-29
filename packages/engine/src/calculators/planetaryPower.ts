/**
 * calculators/planetaryPower.ts
 * กำลังดาวเคราะห์ (Planetary Power) จากองศา ecliptic
 *
 * หลักการ:
 * - 0°-10° (ต้นราศี)   = เข้มแข็ง — ดาวเพิ่งเข้าราศี พลังงานสด
 * - 10°-20° (กลางราศี) = ปานกลาง  — สมดุล มั่นคง
 * - 20°-30° (ปลายราศี) = แปรปรวน  — กำลังจะเปลี่ยน
 *
 * เพิ่มเติม:
 * - องศาเกษตร (Domicile) — ดาวอยู่ราศีตัวเอง = พลังสูงสุด
 * - องศาอุจจ์ (Exaltation) — ดาวอยู่ราศีเชิดชู = พลังสูง
 * - องศาประ (Fall/Detriment) — พลังอ่อน
 */

import { getZodiacSign } from '../core/zodiac.js'

export type PlanetPowerLevel =
  | 'เกษตร'    // Domicile — สูงสุด
  | 'อุจจ์'    // Exaltation — สูง
  | 'เข้มแข็ง' // Strong — 0-10°
  | 'ปานกลาง'  // Medium — 10-20°
  | 'แปรปรวน'  // Mutable — 20-30°
  | 'ประ'      // Fall/Detriment — อ่อน

export interface PlanetPowerResult {
  longitude:     number
  degreeInSign:  number  // 0-30
  signName:      string
  powerLevel:    PlanetPowerLevel
  powerScore:    number  // 1-10
  description:   string
}

/** ราศีเกษตร (Domicile) ของดาวแต่ละดวง */
const DOMICILE: Record<string, string[]> = {
  'Sun':     ['สิงห์'],
  'Moon':    ['กรกฎ'],
  'Mercury': ['เมถุน', 'กันย์'],
  'Venus':   ['พฤษภ', 'ตุลย์'],
  'Mars':    ['เมษ', 'พิจิก'],
  'Jupiter': ['ธนู', 'มีน'],
  'Saturn':  ['มกร', 'กุมภ์'],
  'Rahu':    ['เมถุน'],
  'Ketu':    ['ธนู'],
}

/** ราศีอุจจ์ (Exaltation) */
const EXALTATION: Record<string, string> = {
  'Sun':     'เมษ',
  'Moon':    'พฤษภ',
  'Mercury': 'กันย์',
  'Venus':   'มีน',
  'Mars':    'มกร',
  'Jupiter': 'กรกฎ',
  'Saturn':  'ตุลย์',
  'Rahu':    'เมถุน',
  'Ketu':    'ธนู',
}

/**
 * คำนวณกำลังดาวจากองศา ecliptic
 * @param longitude   องศา ecliptic (0-360)
 * @param planetName  ชื่อดาว (English: Sun, Moon, ...)
 */
export function calculatePlanetaryPower(
  longitude:  number,
  planetName: string = '',
): PlanetPowerResult {
  const norm = ((longitude % 360) + 360) % 360
  const degreeInSign = norm % 30
  const signName = getZodiacSign(longitude)

  // ตรวจ domicile / exaltation
  const isDomicile   = DOMICILE[planetName]?.includes(signName)   ?? false
  const isExaltation = EXALTATION[planetName] === signName

  let powerLevel: PlanetPowerLevel
  let powerScore: number
  let description: string

  if (isDomicile) {
    powerLevel  = 'เกษตร'
    powerScore  = 10
    description = `ดาวอยู่ราศีเกษตร (${signName}) — พลังสูงสุด เต็มศักยภาพ`
  } else if (isExaltation) {
    powerLevel  = 'อุจจ์'
    powerScore  = 9
    description = `ดาวอยู่ราศีอุจจ์ (${signName}) — พลังสูง ได้รับการเชิดชู`
  } else if (degreeInSign <= 10) {
    powerLevel  = 'เข้มแข็ง'
    powerScore  = 8
    description = `ต้นราศี ${signName} (${degreeInSign.toFixed(1)}°) — พลังสด กำลังเริ่มต้น`
  } else if (degreeInSign <= 20) {
    powerLevel  = 'ปานกลาง'
    powerScore  = 6
    description = `กลางราศี ${signName} (${degreeInSign.toFixed(1)}°) — สมดุล มั่นคง`
  } else {
    powerLevel  = 'แปรปรวน'
    powerScore  = 4
    description = `ปลายราศี ${signName} (${degreeInSign.toFixed(1)}°) — กำลังเปลี่ยนผ่าน`
  }

  return { longitude: norm, degreeInSign, signName, powerLevel, powerScore, description }
}
