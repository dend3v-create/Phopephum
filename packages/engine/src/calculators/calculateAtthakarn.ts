/**
 * calculateAtthakarn.ts
 * คำนวณยามกำเนิด (อัฏฐกาล) จากวันเกิดและเวลาเกิด
 *
 * หลักการ:
 * - ภาคกลางวัน: 06:00–18:00 (8 ยาม ยามละ 90 นาที)
 * - ภาคกลางคืน: 18:00–06:00 (8 ยาม ยามละ 90 นาที)
 * - ลำดับดาวกลางวัน: +5 mod 7 (1-6-4-2-7-5-3)
 * - ลำดับดาวกลางคืน: +4 mod 7 (1-5-2-6-3-7-4)
 */

export const PLANET_NAMES_THAI = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'] as const;
export const PLANET_SYMBOLS = ['☉', '☽', '♂', '☿', '♃', '♀', '♄'] as const;

// ความหมายยามกำเนิดตามดาวเจ้าของยาม
const HORA_MEANINGS: Record<number, { meaning: string; strengths: string[]; isAuspicious: boolean }> = {
  1: {
    meaning: 'เกิดยามอาทิตย์ — จิตวิญญาณของผู้นำ มีอำนาจและเกียรติยศ',
    strengths: ['ความเป็นผู้นำ', 'ชื่อเสียง', 'อำนาจบารมี'],
    isAuspicious: true,
  },
  2: {
    meaning: 'เกิดยามจันทร์ — เมตตาสูง สัญชาตญาณแหลม ผู้คนไว้วางใจ',
    strengths: ['ความเมตตา', 'สัญชาตญาณ', 'ความสัมพันธ์'],
    isAuspicious: true,
  },
  3: {
    meaning: 'เกิดยามอังคาร — กล้าหาญไม่แพ้ใคร พลังงานล้นเหลือ',
    strengths: ['ความกล้าหาญ', 'พลังงาน', 'ความเด็ดเดี่ยว'],
    isAuspicious: false,
  },
  4: {
    meaning: 'เกิดยามพุธ — ฉลาดปราดเปรื่อง สื่อสารเก่ง ธุรกิจรุ่งเรือง',
    strengths: ['สติปัญญา', 'การสื่อสาร', 'ธุรกิจ'],
    isAuspicious: true,
  },
  5: {
    meaning: 'เกิดยามพฤหัส — โชคลาภเข้าหา ปัญญาล้ำเลิศ บุญบารมีมาก',
    strengths: ['โชคลาภ', 'ปัญญา', 'จิตวิญญาณ'],
    isAuspicious: true,
  },
  6: {
    meaning: 'เกิดยามศุกร์ — เสน่ห์ดึงดูดใจ ความรักราบรื่น ศิลปะโดดเด่น',
    strengths: ['เสน่ห์', 'ความรัก', 'ศิลปะ'],
    isAuspicious: true,
  },
  7: {
    meaning: 'เกิดยามเสาร์ — วินัยเข้มแข็ง อดทน สร้างสิ่งยิ่งใหญ่ในระยะยาว',
    strengths: ['วินัย', 'ความอดทน', 'ความมั่นคง'],
    isAuspicious: false,
  },
}

export interface AtthakarnResult {
  /** เลขดาวเจ้าของยามกำเนิด (1-7) */
  horaPlanet: number
  /** ชื่อดาว */
  horaPlanetName: string
  /** สัญลักษณ์ดาว */
  horaSymbol: string
  /** ยามใหญ่ที่ (1–16) */
  horaNumber: number
  /** กลางวัน / กลางคืน */
  period: 'day' | 'night'
  /** ความหมายยามกำเนิด */
  meaning: string
  /** จุดแข็งจากยามกำเนิด */
  strengths: string[]
  /** ยามกำเนิดเป็นมงคล? */
  isAuspicious: boolean
}

/**
 * คำนวณยามกำเนิด (อัฏฐกาล) จากวันเกิด + เวลาเกิด
 * @param birthDate  "YYYY-MM-DD"
 * @param birthTime  "HH:MM"
 */
export function calculateAtthakarn(birthDate: string, birthTime?: string): AtthakarnResult {
  const timeStr = birthTime ?? '12:00'
  const [hStr, mStr] = timeStr.split(':')
  const totalMinutes = (parseInt(hStr ?? '12') * 60) + (parseInt(mStr ?? '0'))

  const date = new Date(birthDate)
  // วันโหราศาสตร์เปลี่ยนตอน 06:00
  let effectiveDate = date;
  if (parseInt(hStr ?? '12') < 6) {
    effectiveDate = new Date(date.getTime() - 86400000);
  }
  const dayOfWeek = effectiveDate.getDay() // 0=อาทิตย์
  const dayRuler = dayOfWeek === 0 ? 1 : dayOfWeek + 1;

  const DAY_START = 360 // 06:00
  const NIGHT_START = 1080 // 18:00
  const YAM_DURATION = 90 // 1.5 ชั่วโมง

  let period: 'day' | 'night'
  let yamIndex: number

  if (totalMinutes >= DAY_START && totalMinutes < NIGHT_START) {
    period = 'day'
    yamIndex = Math.floor((totalMinutes - DAY_START) / YAM_DURATION)
  } else {
    period = 'night'
    const nightMinutes = totalMinutes >= NIGHT_START 
      ? totalMinutes - NIGHT_START 
      : totalMinutes + (1440 - NIGHT_START)
    yamIndex = Math.floor(nightMinutes / YAM_DURATION)
  }

  // ลำดับดาว: กลางวัน +5, กลางคืน +4
  const step = period === 'day' ? 5 : 4
  const planet = ((dayRuler - 1 + yamIndex * step) % 7) + 1

  const info = HORA_MEANINGS[planet]!

  return {
    horaPlanet: planet,
    horaPlanetName: PLANET_NAMES_THAI[planet - 1]!,
    horaSymbol: PLANET_SYMBOLS[planet - 1]!,
    horaNumber: period === 'day' ? yamIndex + 1 : yamIndex + 9,
    period,
    meaning: info.meaning,
    strengths: info.strengths,
    isAuspicious: info.isAuspicious,
  }
}

