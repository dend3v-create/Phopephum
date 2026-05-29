/**
 * calculators/sevenBase.ts
 * เลข 7 ตัว — คำนวณจากวัน/เดือน/ปี จันทรคติ
 *
 * หลักการ:
 * - ฐาน 7 = ระบบดาวเคราะห์ 7 ดวง (อาทิตย์ จันทร์ อังคาร พุธ พฤหัส ศุกร์ เสาร์)
 * - แต่ละตัวแทนพลังงาน 1 มิติของชีวิต
 * - ใช้วัน/เดือน/ปีจันทรคติเป็นฐาน
 */

/** ชื่อดาวเจ้าฐาน 1-7 */
export const SEVEN_BASE_PLANETS: Record<number, string> = {
  1: 'อาทิตย์',
  2: 'จันทร์',
  3: 'อังคาร',
  4: 'พุธ',
  5: 'พฤหัส',
  6: 'ศุกร์',
  7: 'เสาร์',
}

/** สัญลักษณ์ดาว */
export const SEVEN_BASE_SYMBOLS: Record<number, string> = {
  1: '☉', 2: '☽', 3: '♂', 4: '☿', 5: '♃', 6: '♀', 7: '♄',
}

/**
 * คำนวณเลข 7 ตัว จากวัน/เดือน/ปีจันทรคติ
 * สูตร: ค่า % 7 (ถ้า 0 → 7)
 *
 * @param lunarDay   วันจันทรคติ (1-30)
 * @param lunarMonth เดือนจันทรคติ (1-12)
 * @param lunarYear  ปีจันทรคติ (พ.ศ. เช่น 2525)
 * @returns [dayBase, monthBase, yearBase] — ค่า 1-7 ทั้ง 3 ตัว
 */
export function calculateSevenBase(
  lunarDay:   number,
  lunarMonth: number,
  lunarYear:  number,
): [number, number, number] {
  const mod7 = (n: number) => n % 7 || 7
  return [
    mod7(lunarDay),
    mod7(lunarMonth),
    mod7(lunarYear),
  ]
}

/**
 * คำนวณฐานรวม (master base) จาก sevenBase ทั้ง 3 ตัว
 */
export function calculateSevenMasterBase(bases: [number, number, number]): number {
  const sum = bases[0] + bases[1] + bases[2]
  return sum % 7 || 7
}

/**
 * ดึงชื่อดาวเจ้าฐาน
 */
export function getSevenBasePlanet(base: number): string {
  return SEVEN_BASE_PLANETS[base] ?? 'พฤหัส'
}

export interface SevenBaseResult {
  dayBase:    number
  monthBase:  number
  yearBase:   number
  masterBase: number
  dayPlanet:    string
  monthPlanet:  string
  yearPlanet:   string
  masterPlanet: string
}

/**
 * คำนวณเลข 7 ตัวเต็มรูปแบบ พร้อมชื่อดาว
 */
export function calculateSevenBaseFull(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
): SevenBaseResult {
  const [dayBase, monthBase, yearBase] = calculateSevenBase(lunarDay, lunarMonth, lunarYear)
  const masterBase = calculateSevenMasterBase([dayBase, monthBase, yearBase])

  return {
    dayBase,
    monthBase,
    yearBase,
    masterBase,
    dayPlanet:    SEVEN_BASE_PLANETS[dayBase]    ?? '',
    monthPlanet:  SEVEN_BASE_PLANETS[monthBase]  ?? '',
    yearPlanet:   SEVEN_BASE_PLANETS[yearBase]   ?? '',
    masterPlanet: SEVEN_BASE_PLANETS[masterBase] ?? '',
  }
}
