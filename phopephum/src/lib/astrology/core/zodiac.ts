/**
 * core/zodiac.ts
 * ราศีทั้ง 12 — แปลงองศา ecliptic longitude → ชื่อราศีไทย/สากล
 */

export interface ZodiacSign {
  index:    number   // 0-11
  nameThai: string
  nameEng:  string
  symbol:   string
  ruler:    string   // ดาวเจ้าราศี
  element:  'ไฟ' | 'ดิน' | 'ลม' | 'น้ำ'
  quality:  'จร' | 'คงที่' | 'สองแบบ'
  degrees:  number   // องศาเริ่มต้น (0-330)
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { index: 0,  nameThai: 'เมษ',    nameEng: 'Aries',       symbol: '♈', ruler: 'อังคาร',  element: 'ไฟ',  quality: 'จร',      degrees: 0   },
  { index: 1,  nameThai: 'พฤษภ',   nameEng: 'Taurus',      symbol: '♉', ruler: 'ศุกร์',   element: 'ดิน', quality: 'คงที่',   degrees: 30  },
  { index: 2,  nameThai: 'เมถุน',  nameEng: 'Gemini',      symbol: '♊', ruler: 'พุธ',     element: 'ลม',  quality: 'สองแบบ', degrees: 60  },
  { index: 3,  nameThai: 'กรกฎ',   nameEng: 'Cancer',      symbol: '♋', ruler: 'จันทร์',  element: 'น้ำ', quality: 'จร',      degrees: 90  },
  { index: 4,  nameThai: 'สิงห์',   nameEng: 'Leo',         symbol: '♌', ruler: 'อาทิตย์', element: 'ไฟ',  quality: 'คงที่',   degrees: 120 },
  { index: 5,  nameThai: 'กันย์',   nameEng: 'Virgo',       symbol: '♍', ruler: 'พุธ',     element: 'ดิน', quality: 'สองแบบ', degrees: 150 },
  { index: 6,  nameThai: 'ตุลย์',   nameEng: 'Libra',       symbol: '♎', ruler: 'ศุกร์',   element: 'ลม',  quality: 'จร',      degrees: 180 },
  { index: 7,  nameThai: 'พิจิก',   nameEng: 'Scorpio',     symbol: '♏', ruler: 'อังคาร',  element: 'น้ำ', quality: 'คงที่',   degrees: 210 },
  { index: 8,  nameThai: 'ธนู',    nameEng: 'Sagittarius', symbol: '♐', ruler: 'พฤหัส',  element: 'ไฟ',  quality: 'สองแบบ', degrees: 240 },
  { index: 9,  nameThai: 'มกร',    nameEng: 'Capricorn',   symbol: '♑', ruler: 'เสาร์',   element: 'ดิน', quality: 'จร',      degrees: 270 },
  { index: 10, nameThai: 'กุมภ์',   nameEng: 'Aquarius',    symbol: '♒', ruler: 'เสาร์',   element: 'ลม',  quality: 'คงที่',   degrees: 300 },
  { index: 11, nameThai: 'มีน',    nameEng: 'Pisces',      symbol: '♓', ruler: 'พฤหัส',  element: 'น้ำ', quality: 'สองแบบ', degrees: 330 },
]

/**
 * แปลงองศา ecliptic (0-360) → ชื่อราศีภาษาไทย
 */
export function getZodiacSign(longitude: number): string {
  const normalised = ((longitude % 360) + 360) % 360
  const index = Math.floor(normalised / 30) % 12
  return ZODIAC_SIGNS[index]?.nameThai ?? 'เมษ'
}

/**
 * แปลงองศา ecliptic → ข้อมูลราศีเต็ม
 */
export function getZodiacFull(longitude: number): ZodiacSign {
  const normalised = ((longitude % 360) + 360) % 360
  const index = Math.floor(normalised / 30) % 12
  return ZODIAC_SIGNS[index] ?? ZODIAC_SIGNS[0]
}

/**
 * องศาภายในราศี (0-29.99)
 */
export function getDegreeInSign(longitude: number): number {
  return ((longitude % 360) + 360) % 360 % 30
}
