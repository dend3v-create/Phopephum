/**
 * calculators/houseMapping.ts
 * แมปตำแหน่งดาวไปยังเรือนชะตา (House Mapping)
 *
 * ใช้กับผล calculateLagna() ซึ่งคืน houses[] เป็น array 12 องศา
 */

import { getZodiacSign } from '../core/zodiac'
import { NINE_BASE_PLANETS } from './nineBase'

export interface PlanetInHouse {
  planet:     string
  planetThai: string
  longitude:  number
  signName:   string
  house:      number   // 1-12
  houseTheme: string
}

/** ความหมายเรือน 1-12 */
const HOUSE_THEMES: Record<number, string> = {
  1:  'ตนุ — ตัวตน บุคลิกภาพ สุขภาพ',
  2:  'กดุมภะ — ทรัพย์สิน การเงิน ครอบครัว',
  3:  'สหัชชะ — พี่น้อง การสื่อสาร การเดินทางสั้น',
  4:  'พันธุ — มารดา บ้าน ที่ดิน รากฐาน',
  5:  'ปุตตะ — บุตร ความรัก ความสุข ความสร้างสรรค์',
  6:  'อริ — ศัตรู โรค หนี้ อุปสรรค',
  7:  'ปัตนิ — คู่ครอง หุ้นส่วน สัญญา',
  8:  'มรณะ — การเปลี่ยนผ่าน มรดก วิกฤต',
  9:  'ศุภะ — โชคลาภ บิดา ศาสนา ปรัชญา',
  10: 'กัมมะ — อาชีพ ชื่อเสียง สถานภาพ',
  11: 'ลาภะ — รายได้ โอกาส เพื่อน เครือข่าย',
  12: 'วินาสะ — การสูญเสีย จิตวิญญาณ ต่างแดน',
}

/**
 * หาเรือนที่ดาวสถิต จาก longitude ของดาว + houses array จาก calculateLagna
 * @param planetLon  องศา ecliptic ของดาว (0-360)
 * @param houses     อาร์เรย์ 12 องศาเริ่มต้นของแต่ละเรือน
 */
export function mapPlanetToHouse(planetLon: number, houses: number[]): number {
  const norm = ((planetLon % 360) + 360) % 360
  for (let i = 0; i < houses.length; i++) {
    const current = houses[i] ?? 0
    const next    = houses[(i + 1) % houses.length] ?? (houses[i]! + 30)
    // wrap-around case
    if (current <= next) {
      if (norm >= current && norm < next) return i + 1
    } else {
      // wraps around 360°
      if (norm >= current || norm < next) return i + 1
    }
  }
  return 1
}

/**
 * แมปดาวทั้งหมดไปยังเรือนชะตา
 */
export function mapAllPlanetsToHouses(
  planets: Record<string, { longitude: number; nameThai: string }>,
  houses:  number[],
): PlanetInHouse[] {
  return Object.entries(planets).map(([name, planet]) => {
    const house = mapPlanetToHouse(planet.longitude, houses)
    return {
      planet:     name,
      planetThai: planet.nameThai,
      longitude:  planet.longitude,
      signName:   getZodiacSign(planet.longitude),
      house,
      houseTheme: HOUSE_THEMES[house] ?? '',
    }
  })
}
