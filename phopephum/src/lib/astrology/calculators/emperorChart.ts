/**
 * calculators/emperorChart.ts
 * ผังดวงจักรพรรดิ (Emperor Chart) — รวมพลังงานหลัก 3 มิติ
 *
 * สร้างจาก:
 * - sevenBase  → ชะตา/ตัวตน
 * - nineBase   → ทรัพย์/ลึก
 * - taksa      → การงาน/จังหวะ
 * - ageCycle   → วัยจร
 * - moonPhase  → จังหวะจันทรคติ
 */

import { SEVEN_BASE_PLANETS } from './sevenBase'
import { NINE_BASE_PLANETS }  from './nineBase'

export interface EmperorChart {
  /** ชะตาหลัก — จากฐานวัน */
  destiny:  { base: number; planet: string; power: string }
  /** ทรัพย์สิน — จากฐานเดือน 9-base */
  wealth:   { base: number; planet: string; power: string }
  /** การงาน — จากทักษาตำแหน่งที่ 3 */
  work:     { taksa: string; isAuspicious: boolean }
  /** พลังงานรวม — ผลรวม sevenBase ทั้ง 3 ตัว */
  totalPower: number
  /** ระดับดวง */
  powerLevel: 'มหาเศรษฐี' | 'เจ้าสัว' | 'ผู้นำ' | 'ปานกลาง' | 'ต้องสร้าง'
  /** คำอธิบายผังดวง */
  summary: string
}

function getPowerLabel(n: number): string {
  if (n >= 15) return 'เข้มแข็งมาก'
  if (n >= 10) return 'เข้มแข็ง'
  if (n >= 6)  return 'ปานกลาง'
  return 'อ่อน'
}

function getPowerLevel(total: number): EmperorChart['powerLevel'] {
  if (total >= 20) return 'มหาเศรษฐี'
  if (total >= 17) return 'เจ้าสัว'
  if (total >= 14) return 'ผู้นำ'
  if (total >= 10) return 'ปานกลาง'
  return 'ต้องสร้าง'
}

/**
 * สร้างผังดวงจักรพรรดิ
 * @param sevenBase [dayBase, monthBase, yearBase] จาก calculateSevenBase
 * @param nineBase  [day9, month9, year9] จาก calculateNineBase
 * @param taksa     อาร์เรย์ชื่อทักษา 8 ตำแหน่ง จาก calculateTaksa
 */
export function buildEmperorChart(
  sevenBase: [number, number, number],
  nineBase:  [number, number, number],
  taksa:     string[],
): EmperorChart {
  const [dayBase, monthBase] = sevenBase
  const [, month9]           = nineBase

  const totalPower = sevenBase.reduce((s, v) => s + v, 0)
  const workTaksa  = taksa[2] ?? 'เดช'

  const destinyPlanet = SEVEN_BASE_PLANETS[dayBase]   ?? 'พฤหัส'
  const wealthPlanet  = NINE_BASE_PLANETS[month9]     ?? 'พฤหัส'

  const powerLevel = getPowerLevel(totalPower)

  const summary =
    `ดวงชะตาหลัก: ${destinyPlanet} (ฐาน ${dayBase}) | ` +
    `ทรัพย์: ${wealthPlanet} (ฐาน ${month9}) | ` +
    `การงาน: ทักษา${workTaksa} | ` +
    `กำลังดวงรวม: ${totalPower} — ${powerLevel}`

  return {
    destiny:    { base: dayBase,   planet: destinyPlanet, power: getPowerLabel(dayBase * 3) },
    wealth:     { base: month9,    planet: wealthPlanet,  power: getPowerLabel(month9 * 2) },
    work:       { taksa: workTaksa, isAuspicious: workTaksa !== 'กาลกิณี' },
    totalPower,
    powerLevel,
    summary,
  }
}
