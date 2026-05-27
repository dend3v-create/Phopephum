/**
 * calculateTransit.ts
 * คำนวณจังหวะชีวิตตามเดือน (ดวงจร) — วัยจร ทักษาจร
 */

import { TaksaResult } from '../types/horoscope'

// จังหวะชีวิต 12 เดือน (รายเดือน)
const MONTHLY_TRANSITS: string[] = [
  'เริ่มต้นใหม่ — จุดเริ่มต้นของพลังงานและความกล้า',
  'ขยายงาน — สร้างรากฐานและสะสมทรัพย์',
  'พัฒนาความสัมพันธ์ — เสริมสร้างเครือข่ายและมิตรภาพ',
  'ปรับโครงสร้าง — วางรากฐานบ้านและจิตใจ',
  'เติบโตด้านความคิดสร้างสรรค์ — แสดงออกและสร้างผลงาน',
  'สะสางกรรมเก่า — ปล่อยวางและเยียวยาจิตใจ',
  'ขยายเครือข่าย — หุ้นส่วนและความร่วมมือที่ดี',
  'เปลี่ยนผ่านครั้งสำคัญ — วิกฤตนำมาซึ่งการเติบโต',
  'โชคลาภและปัญญา — ขยายมุมมองและโอกาสใหม่',
  'เก็บเกี่ยวผลลัพธ์ — ชื่อเสียงและความสำเร็จการงาน',
  'สร้างรายได้ใหม่ — เครือข่ายนำมาซึ่งโอกาส',
  'เปิดพลังจิตวิญญาณ — ช่วงพักฟื้นและเติมพลังใจ',
]

export function calculateTransit(month: number): string {
  const idx = ((month - 1) % 12)
  return MONTHLY_TRANSITS[idx] ?? MONTHLY_TRANSITS[0]
}

// ─────────────────────────────────────────────────────────────────────────────
// วัยจร — Vaya Chon (Age Transit)
// ─────────────────────────────────────────────────────────────────────────────
const VAYA_CYCLES = [
  { maxAge: 12,  planet: 'พระจันทร์',  theme: 'วัยเด็ก — การเรียนรู้และการสะสมประสบการณ์' },
  { maxAge: 24,  planet: 'พระอังคาร',  theme: 'วัยหนุ่มสาว — พลังงานและการแข่งขัน' },
  { maxAge: 36,  planet: 'พระพุธ',     theme: 'วัยทำงาน — การสื่อสารและการสร้างตัว' },
  { maxAge: 48,  planet: 'พระพฤหัส',   theme: 'วัยกลางคน — ปัญญาและการขยายงาน' },
  { maxAge: 60,  planet: 'พระศุกร์',   theme: 'วัยสร้างผล — ความสุขและความสัมพันธ์' },
  { maxAge: 72,  planet: 'พระเสาร์',   theme: 'วัยชรา — ความมั่นคงและปัญญาชีวิต' },
  { maxAge: 120, planet: 'พระอาทิตย์', theme: 'วัยปราชญ์ — ความสำเร็จและชื่อเสียง' },
]

export function calculateVayaChorn(birthDateStr: string): string {
  const birth = new Date(birthDateStr)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const cycle = VAYA_CYCLES.find(c => age <= c.maxAge) ?? VAYA_CYCLES[VAYA_CYCLES.length - 1]
  return `วัยจร ${cycle.planet} (อายุ ${age} ปี) — ${cycle.theme}`
}

// ─────────────────────────────────────────────────────────────────────────────
// ทักษา — Taksa (Auspicious Position by Day of Week & Base)
// ─────────────────────────────────────────────────────────────────────────────
// ทักษา 8 ตำแหน่ง: 1=มหานิยม 2=รักษา 3=มูละ 4=อุตสาหะ 5=หินะ 6=วินาศ 7=กาลกิณี 8=สมปัตติ
const TAKSA_MEANINGS: Record<number, { name: string; meaning: string; isAuspicious: boolean }> = {
  1: { name: 'มหานิยม',  meaning: 'ชื่อเสียง โชคลาภ คนรักและนิยม', isAuspicious: true },
  2: { name: 'รักษา',    meaning: 'สุขภาพดี รักษาทุกอย่างไว้ได้', isAuspicious: true },
  3: { name: 'มูละ',     meaning: 'รากฐานมั่นคง ทรัพย์สินเพิ่มพูน', isAuspicious: true },
  4: { name: 'อุตสาหะ',  meaning: 'ขยันได้ผล ความพยายามสำเร็จ', isAuspicious: true },
  5: { name: 'หินะ',     meaning: 'ต้องระวัง อาจมีอุปสรรคชั่วคราว', isAuspicious: false },
  6: { name: 'วินาศ',    meaning: 'ช่วงปรับตัว ระวังการสูญเสีย', isAuspicious: false },
  7: { name: 'กาลกิณี', meaning: 'ช่วงเรียนรู้ ความท้าทายสร้างปัญญา', isAuspicious: false },
  8: { name: 'สมปัตติ',  meaning: 'ความสมหวัง ความสุขที่แท้จริง', isAuspicious: true },
}

// ตารางทักษา: [dayOfWeek (0=อาทิตย์)][base (1-9)] → taksa position (1-8)
const TAKSA_TABLE: number[][] = [
  [1, 2, 3, 4, 5, 6, 7, 8, 1], // อาทิตย์
  [2, 3, 4, 5, 6, 7, 8, 1, 2], // จันทร์
  [3, 4, 5, 6, 7, 8, 1, 2, 3], // อังคาร
  [4, 5, 6, 7, 8, 1, 2, 3, 4], // พุธ
  [5, 6, 7, 8, 1, 2, 3, 4, 5], // พฤหัส
  [6, 7, 8, 1, 2, 3, 4, 5, 6], // ศุกร์
  [7, 8, 1, 2, 3, 4, 5, 6, 7], // เสาร์
]

export function calculateTaksa(dayOfWeek: number, base: number): TaksaResult {
  const row = TAKSA_TABLE[dayOfWeek % 7] ?? TAKSA_TABLE[0]
  const position = row[(base - 1) % 9] ?? 1
  const info = TAKSA_MEANINGS[position] ?? TAKSA_MEANINGS[1]
  return {
    position,
    meaning: `${info.name} — ${info.meaning}`,
    isAuspicious: info.isAuspicious,
  }
}
