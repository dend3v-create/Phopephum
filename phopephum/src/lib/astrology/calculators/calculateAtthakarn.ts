/**
 * calculateAtthakarn.ts
 * คำนวณยามกำเนิด (อัฏฐกาล) จากวันเกิดและเวลาเกิด
 *
 * หลักการ:
 * - 1 วัน แบ่งเป็น 8 ยามใหญ่ (กลางวัน 4 + กลางคืน 4)
 * - แต่ละยามใหญ่ = 180 นาที (3 ชั่วโมง)
 * - กลางวัน: 06:00–18:00 | กลางคืน: 18:00–06:00
 * - ดาวเจ้าของยาม 1 = ดาวเจ้าของวัน → วนตาม Chaldean order
 */

// Chaldean order (เสาร์ → พฤหัส → อังคาร → อาทิตย์ → ศุกร์ → พุธ → จันทร์)
const CHALDEAN_PLANETS = ['เสาร์', 'พฤหัส', 'อังคาร', 'อาทิตย์', 'ศุกร์', 'พุธ', 'จันทร์'] as const
const CHALDEAN_SYMBOLS = ['♄', '♃', '♂', '☉', '♀', '☿', '☽'] as const

// ดาวเจ้าของวัน (index = dayOfWeek: 0=อาทิตย์)
const DAY_RULER_CHALDEAN_INDEX = [3, 6, 2, 5, 1, 4, 0] // อา=อาทิตย์(3), จ=จันทร์(6), อ=อังคาร(2), พ=พุธ(5), พฤ=พฤหัส(1), ศ=ศุกร์(4), ส=เสาร์(0)

// ความหมายยามกำเนิดตามดาวเจ้าของยาม
const HORA_MEANINGS: Record<string, { meaning: string; strengths: string[]; isAuspicious: boolean }> = {
  'อาทิตย์': {
    meaning: 'เกิดยามอาทิตย์ — จิตวิญญาณของผู้นำ มีอำนาจและเกียรติยศ',
    strengths: ['ความเป็นผู้นำ', 'ชื่อเสียง', 'อำนาจบารมี'],
    isAuspicious: true,
  },
  'จันทร์': {
    meaning: 'เกิดยามจันทร์ — เมตตาสูง สัญชาตญาณแหลม ผู้คนไว้วางใจ',
    strengths: ['ความเมตตา', 'สัญชาตญาณ', 'ความสัมพันธ์'],
    isAuspicious: true,
  },
  'อังคาร': {
    meaning: 'เกิดยามอังคาร — กล้าหาญไม่แพ้ใคร พลังงานล้นเหลือ',
    strengths: ['ความกล้าหาญ', 'พลังงาน', 'ความเด็ดเดี่ยว'],
    isAuspicious: false,
  },
  'พุธ': {
    meaning: 'เกิดยามพุธ — ฉลาดปราดเปรื่อง สื่อสารเก่ง ธุรกิจรุ่งเรือง',
    strengths: ['สติปัญญา', 'การสื่อสาร', 'ธุรกิจ'],
    isAuspicious: true,
  },
  'พฤหัส': {
    meaning: 'เกิดยามพฤหัส — โชคลาภเข้าหา ปัญญาล้ำเลิศ บุญบารมีมาก',
    strengths: ['โชคลาภ', 'ปัญญา', 'จิตวิญญาณ'],
    isAuspicious: true,
  },
  'ศุกร์': {
    meaning: 'เกิดยามศุกร์ — เสน่ห์ดึงดูดใจ ความรักราบรื่น ศิลปะโดดเด่น',
    strengths: ['เสน่ห์', 'ความรัก', 'ศิลปะ'],
    isAuspicious: true,
  },
  'เสาร์': {
    meaning: 'เกิดยามเสาร์ — วินัยเข้มแข็ง อดทน สร้างสิ่งยิ่งใหญ่ในระยะยาว',
    strengths: ['วินัย', 'ความอดทน', 'ความมั่นคง'],
    isAuspicious: false,
  },
}

export interface AtthakarnResult {
  /** ชื่อดาวเจ้าของยามกำเนิด */
  horaPlanet: string
  /** สัญลักษณ์ดาว */
  horaSymbol: string
  /** ยามใหญ่ที่ (1–8) */
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
 * @param birthTime  "HH:MM" (optional, default 12:00 ถ้าไม่ทราบเวลา)
 */
export function calculateAtthakarn(birthDate: string, birthTime?: string): AtthakarnResult {
  const timeStr = birthTime ?? '12:00'
  const [hStr, mStr] = timeStr.split(':')
  const totalMinutes = (parseInt(hStr ?? '12') * 60) + (parseInt(mStr ?? '0'))

  const date = new Date(birthDate)
  const dayOfWeek = date.getDay() // 0=อาทิตย์

  // ดาวเจ้าของวัน → Chaldean index เริ่มต้น
  const startChaldeanIdx = DAY_RULER_CHALDEAN_INDEX[dayOfWeek] ?? 3

  // ยามกลางวันเริ่ม 06:00 = 360 นาที
  const DAY_START = 360
  const MAJOR_SLOT = 180 // 3 ชั่วโมง
  const NIGHT_START = DAY_START + 4 * MAJOR_SLOT // 1080 = 18:00

  let majorOffset: number
  let period: 'day' | 'night'

  if (totalMinutes >= DAY_START && totalMinutes < NIGHT_START) {
    majorOffset = Math.floor((totalMinutes - DAY_START) / MAJOR_SLOT)
    period = 'day'
  } else {
    const nightMinutes = totalMinutes >= NIGHT_START
      ? totalMinutes - NIGHT_START
      : totalMinutes + (1440 - NIGHT_START)
    majorOffset = Math.floor(nightMinutes / MAJOR_SLOT) + 4
    period = 'night'
  }

  // หาดาวเจ้าของยาม
  const chaldeanIdx = (startChaldeanIdx + majorOffset) % 7
  const planetName = CHALDEAN_PLANETS[chaldeanIdx] as string
  const planetSymbol = CHALDEAN_SYMBOLS[chaldeanIdx] as string
  const horaNumber = (majorOffset % 8) + 1

  const info = HORA_MEANINGS[planetName] ?? {
    meaning: `เกิดยาม${planetName} — มีพลังงานพิเศษจากดาว${planetName}`,
    strengths: ['พลังงานพิเศษ'],
    isAuspicious: true,
  }

  return {
    horaPlanet: planetName,
    horaSymbol: planetSymbol,
    horaNumber,
    period,
    meaning: info.meaning,
    strengths: info.strengths,
    isAuspicious: info.isAuspicious,
  }
}
