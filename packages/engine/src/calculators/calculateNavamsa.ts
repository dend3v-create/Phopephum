/**
 * calculateNavamsa.ts
 * คำนวณนวางค์ (9 ฐาน ลึก) — ดาวเจ้าเรือนซ่อนเร้น
 *
 * นวางค์ = การแบ่งองศาราศีออกเป็น 9 ส่วน เพื่อเปิดเผยพลังงานซ่อนลึก
 * ในระบบ เลข 7 ตัว 9 ฐาน:
 *   - dayBase  → นวางค์วัน  (ตัวตนที่แท้จริง)
 *   - monthBase → นวางค์เดือน (จิตใต้สำนึก / ความต้องการลึก)
 *   - yearBase  → นวางค์ปี  (พลังงานชีวิตที่สะสมมา)
 *   - masterBase → นวางค์รวม (ผลลัพธ์ชีวิต / ศักยภาพสูงสุด)
 */

import { calculateBase, calculateDayBase, calculateMonthBase, calculateYearBase } from './calculateBase.js'

// ดาว 9 ดวงในระบบโหราศาสตร์ไทย (1=อาทิตย์ ... 9=เกตุ)
const NAVAMSA_PLANETS: Record<number, { name: string; symbol: string; aspect: string; quality: string }> = {
  1: { name: 'อาทิตย์', symbol: '☉', aspect: 'ตัวตน / อำนาจ / ผู้นำ',         quality: 'ไฟ' },
  2: { name: 'จันทร์',  symbol: '☽', aspect: 'จิตใจ / ความรู้สึก / แม่',       quality: 'น้ำ' },
  3: { name: 'อังคาร',  symbol: '♂', aspect: 'พลังงาน / ความกล้า / พี่น้อง',   quality: 'ไฟ' },
  4: { name: 'พุธ',     symbol: '☿', aspect: 'สติปัญญา / การค้า / การสื่อสาร', quality: 'ดิน' },
  5: { name: 'พฤหัส',  symbol: '♃', aspect: 'โชคลาภ / ปัญญา / ครู',           quality: 'อากาศ' },
  6: { name: 'ศุกร์',   symbol: '♀', aspect: 'ความรัก / ความงาม / ศิลปะ',      quality: 'น้ำ' },
  7: { name: 'เสาร์',   symbol: '♄', aspect: 'วินัย / กรรม / ความอดทน',       quality: 'ดิน' },
  8: { name: 'ราหู',    symbol: '☊', aspect: 'โอกาสพิเศษ / สิ่งแปลกใหม่',     quality: 'อากาศ' },
  9: { name: 'เกตุ',    symbol: '☋', aspect: 'วิทยาการซ่อนเร้น / ความหลุดพ้น', quality: 'ไฟ' },
}

// การรวมกันของ element ที่สร้างผลลัพธ์พิเศษ
const ELEMENT_SYNERGY: Record<string, string> = {
  'ไฟ-ไฟ-ไฟ':       'พลังงานสูงมาก มีไฟชีวิต กล้าตัดสินใจ ต้องระวังใจร้อน',
  'น้ำ-น้ำ-น้ำ':     'อ่อนไหวละเอียดอ่อน เมตตาสูง ต้องเสริมความมั่นใจ',
  'ดิน-ดิน-ดิน':     'มั่นคงสูง สร้างสิ่งยิ่งใหญ่ได้ ต้องระวังการยืดหยุ่น',
  'อากาศ-อากาศ-อากาศ': 'สติปัญญาสูงมาก มองเห็นอนาคต ต้องลงมือทำจริง',
  'ไฟ-น้ำ-ดิน':     'สมดุลดี มีทั้งพลัง ความรู้สึก และความมั่นคง',
  'ไฟ-อากาศ-ดิน':   'ผู้นำที่มีวิสัยทัศน์และความมั่นคง ทรงพลังมาก',
}

export interface NavamsaPosition {
  base: number
  planet: string
  symbol: string
  aspect: string
  quality: string
}

export interface NavamsaResult {
  /** นวางค์วัน — ตัวตนที่แท้จริง */
  dayNavamsa: NavamsaPosition
  /** นวางค์เดือน — จิตใต้สำนึก */
  monthNavamsa: NavamsaPosition
  /** นวางค์ปี — พลังงานสะสม */
  yearNavamsa: NavamsaPosition
  /** นวางค์รวม — ผลลัพธ์ชีวิต */
  masterNavamsa: NavamsaPosition
  /** พลังงานสัมพันธ์ของ 3 นวางค์หลัก */
  elementSynergy: string
  /** ข้อความพยากรณ์เชิงลึก */
  deepInsight: string
}

function getNavamsaPosition(base: number): NavamsaPosition {
  const b = ((base - 1) % 9) + 1
  const planet = NAVAMSA_PLANETS[b]!
  return {
    base: b,
    planet: planet.name,
    symbol: planet.symbol,
    aspect: planet.aspect,
    quality: planet.quality,
  }
}

function buildDeepInsight(day: NavamsaPosition, month: NavamsaPosition, year: NavamsaPosition, master: NavamsaPosition): string {
  const parts: string[] = []

  // ตัวตน vs จิตใต้สำนึก
  if (day.planet === month.planet) {
    parts.push(`นวางค์วันและเดือนตรงกัน (${day.planet}) — ตัวตนภายนอกและภายในสอดคล้องกัน มีความสม่ำเสมอสูง`)
  } else {
    parts.push(`ตัวตนภายนอก (${day.planet}) ต่างจากจิตใต้สำนึก (${month.planet}) — มีความลึกและหลายมิติในตัวเอง`)
  }

  // ปีเกิดสร้างพลังงานสะสม
  parts.push(`พลังงานสะสมจากปีเกิด: ดาว${year.planet} เสริมด้าน "${year.aspect}"`)

  // นวางค์รวม = ผลลัพธ์
  parts.push(`นวางค์ผลลัพธ์ชีวิต: ดาว${master.planet} — "${master.aspect}" คือเส้นทางสู่ความสำเร็จที่แท้จริง`)

  return parts.join(' | ')
}

/**
 * คำนวณนวางค์ 9 ฐาน จากวันเกิด
 * @param day   วันที่เกิด (1-31)
 * @param month เดือนเกิด (1-12)
 * @param year  ปีเกิด ค.ศ.
 */
export function calculateNavamsa(day: number, month: number, year: number): NavamsaResult {
  const dayBase    = calculateDayBase(day)
  const monthBase  = calculateMonthBase(month)
  const yearBase   = calculateYearBase(year)
  const masterBase = calculateBase(dayBase + monthBase + yearBase)

  const dayNavamsa    = getNavamsaPosition(dayBase)
  const monthNavamsa  = getNavamsaPosition(monthBase)
  const yearNavamsa   = getNavamsaPosition(yearBase)
  const masterNavamsa = getNavamsaPosition(masterBase)

  const synergyKey = `${dayNavamsa.quality}-${monthNavamsa.quality}-${yearNavamsa.quality}`
  const elementSynergy = ELEMENT_SYNERGY[synergyKey]
    ?? `ผสมผสานพลังงาน ${dayNavamsa.quality} + ${monthNavamsa.quality} + ${yearNavamsa.quality} — สร้างบุคลิกที่ไม่เหมือนใคร`

  const deepInsight = buildDeepInsight(dayNavamsa, monthNavamsa, yearNavamsa, masterNavamsa)

  return {
    dayNavamsa,
    monthNavamsa,
    yearNavamsa,
    masterNavamsa,
    elementSynergy,
    deepInsight,
  }
}
