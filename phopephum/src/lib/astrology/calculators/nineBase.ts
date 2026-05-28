/**
 * calculators/nineBase.ts
 * เลข 9 ฐาน — คำนวณจากเลข 7 ตัว (แปลงระบบ 7 → ระบบ 9)
 *
 * หลักการ:
 * - ระบบ 9 ฐาน ใช้ดาว 9 ดวง (รวม ราหู + เกตุ)
 * - แปลงค่า 7-base → 9-base ด้วย mod 9
 * - ใช้วิเคราะห์ชะตาในมิติที่ลึกกว่า
 */

/** ดาวประจำฐาน 1-9 (ระบบโหราศาสตร์ไทย) */
export const NINE_BASE_PLANETS: Record<number, string> = {
  1: 'อาทิตย์',
  2: 'จันทร์',
  3: 'อังคาร',
  4: 'พุธ',
  5: 'พฤหัส',
  6: 'ศุกร์',
  7: 'เสาร์',
  8: 'ราหู',
  9: 'เกตุ',
}

export const NINE_BASE_SYMBOLS: Record<number, string> = {
  1: '☉', 2: '☽', 3: '♂', 4: '☿', 5: '♃', 6: '♀', 7: '♄', 8: '☊', 9: '☋',
}

/**
 * แปลงค่าเดี่ยว → ฐาน 9 (1-9)
 */
export function toBase9(n: number): number {
  return n % 9 || 9
}

/**
 * แปลงอาร์เรย์ค่า → ฐาน 9 ทั้งหมด
 * @param values ค่าต้นทาง (เช่น sevenBase)
 */
export function calculateNineBase(values: number[]): number[] {
  return values.map(toBase9)
}

export interface NineBaseResult {
  /** เลข 9 ฐาน 3 ตัว [day, month, year] */
  bases:    [number, number, number]
  /** ดาวประจำแต่ละฐาน */
  planets:  [string, string, string]
  /** ฐานรวม (master) */
  master:   number
  /** ดาวเจ้าฐานรวม */
  masterPlanet: string
}

/**
 * คำนวณ 9 ฐานเต็มรูปแบบ
 */
export function calculateNineBaseFull(sevenBases: [number, number, number]): NineBaseResult {
  const [d, m, y] = calculateNineBase(sevenBases) as [number, number, number]
  const master = toBase9(d + m + y)

  return {
    bases:        [d, m, y],
    planets:      [NINE_BASE_PLANETS[d] ?? '', NINE_BASE_PLANETS[m] ?? '', NINE_BASE_PLANETS[y] ?? ''],
    master,
    masterPlanet: NINE_BASE_PLANETS[master] ?? '',
  }
}
