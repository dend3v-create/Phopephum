/**
 * calculators/ageCycle.ts
 * วัยจร (Age Cycle) — ช่วงอายุ + ดาวเจ้าวัย
 *
 * ระบบวัยจรไทย:
 * 0-12   = พระจันทร์ (วัยเด็ก)
 * 12-24  = พระอังคาร (วัยหนุ่มสาว)
 * 24-36  = พระพุธ (วัยสร้างตัว)
 * 36-48  = พระพฤหัส (วัยกลางคน)
 * 48-60  = พระศุกร์ (วัยผลิดอก)
 * 60-72  = พระเสาร์ (วัยชรา)
 * 72+    = พระอาทิตย์ (วัยปราชญ์)
 */

export interface AgeCycleResult {
  /** อายุปัจจุบัน */
  age: number
  /** ปี พ.ศ. */
  ageBE: number
  /** ดาวเจ้าวัยจร */
  planet: string
  /** คำอธิบายวัย */
  theme: string
  /** ช่วงอายุ */
  ageRange: string
  /** ความหมายเชิงชีวิต */
  lifePhase: string
}

const AGE_CYCLES: Array<{ maxAge: number; planet: string; theme: string; lifePhase: string }> = [
  { maxAge: 12,  planet: 'จันทร์',   theme: 'วัยเด็ก',     lifePhase: 'การเรียนรู้ สะสมประสบการณ์ สร้างรากฐานจิตใจ' },
  { maxAge: 24,  planet: 'อังคาร',   theme: 'วัยหนุ่มสาว',  lifePhase: 'พลังงานสูง การแข่งขัน สร้างตัวตน' },
  { maxAge: 36,  planet: 'พุธ',      theme: 'วัยสร้างตัว',  lifePhase: 'การสื่อสาร การค้า สร้างเครือข่าย' },
  { maxAge: 48,  planet: 'พฤหัส',   theme: 'วัยกลางคน',    lifePhase: 'ปัญญา ขยายงาน เก็บเกี่ยวผล' },
  { maxAge: 60,  planet: 'ศุกร์',    theme: 'วัยผลิดอก',    lifePhase: 'ความสุข ความสัมพันธ์ เสน่ห์สูง' },
  { maxAge: 72,  planet: 'เสาร์',    theme: 'วัยชรา',       lifePhase: 'ความมั่นคง ปัญญาชีวิต ส่งต่อมรดก' },
  { maxAge: 999, planet: 'อาทิตย์',  theme: 'วัยปราชญ์',    lifePhase: 'ความสำเร็จ ชื่อเสียงยั่งยืน จิตวิญญาณ' },
]

/**
 * คำนวณวัยจร
 * @param birthYear ปีเกิด ค.ศ.
 * @param currentYear ปีปัจจุบัน ค.ศ. (default: ปีนี้)
 */
export function calculateAgeCycle(
  birthYear: number,
  currentYear: number = new Date().getFullYear(),
): AgeCycleResult {
  const age   = currentYear - birthYear
  const ageBE = age + 543

  const cycle = AGE_CYCLES.find(c => age <= c.maxAge) ?? AGE_CYCLES[AGE_CYCLES.length - 1]!
  const prev  = AGE_CYCLES.find(c => c.maxAge < age) ?? { maxAge: 0 }

  return {
    age,
    ageBE,
    planet:    cycle.planet,
    theme:     cycle.theme,
    ageRange:  `${prev.maxAge}–${cycle.maxAge === 999 ? '∞' : cycle.maxAge} ปี`,
    lifePhase: cycle.lifePhase,
  }
}

/**
 * ดาวจรปัจจุบัน (วัยจรตามปีเกิด พ.ศ.)
 * @param lunarBirthYear ปีเกิด พ.ศ.
 */
export function getAgeCyclePlanet(lunarBirthYear: number): string {
  const birthCE = lunarBirthYear - 543
  return calculateAgeCycle(birthCE).planet
}
