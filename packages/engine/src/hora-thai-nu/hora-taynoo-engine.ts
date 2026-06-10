/**
 * hora-taynoo-engine.ts
 * ยามพรายกระซิบ — Engine หลัก (Production Grade)
 * อ้างอิง: อ.กานดา เอกสาร 1–8 + เอกสารประกอบ 3 ฉบับ
 *
 * อัลกอริทึม:
 * 1. หายามอัฐกาล (ยามที่ถาม + ดาวเจ้ายาม)
 * 2. พับยาม → ได้ "จำนวนก้าว" ของดาวลอย 11 ดวง
 * 3. พับย้ำลงจักรราศี → ได้ตำแหน่ง zodiac ของดาวลอย 11 ดวง
 * 4. กำหนดลัคนา → ตั้งภพ 12 หลัง
 * 5. หาจุดลงเวลา → คำนวณยามย่อย 7.5 นาที × 12 ช่อง
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** 12 ราศีเรียง CCW จาก index 0 = พฤษภ (330°) ตาม อ.กานดา */
export const ZODIAC_ORDER = [
  { index: 0,  name: 'พฤษภ',  nameEn: 'Taurus',      sectorAngle: 240 },
  { index: 1,  name: 'เมถุน',  nameEn: 'Gemini',      sectorAngle: 210 },
  { index: 2,  name: 'กรกฎ',  nameEn: 'Cancer',      sectorAngle: 180 },
  { index: 3,  name: 'สิงห์',  nameEn: 'Leo',         sectorAngle: 150 },
  { index: 4,  name: 'กันย์',  nameEn: 'Virgo',       sectorAngle: 120 },
  { index: 5,  name: 'ตุลย์',  nameEn: 'Libra',       sectorAngle: 90  },
  { index: 6,  name: 'พิจิก',  nameEn: 'Scorpio',     sectorAngle: 60  },
  { index: 7,  name: 'ธนู',   nameEn: 'Sagittarius', sectorAngle: 30  },
  { index: 8,  name: 'มังกร',  nameEn: 'Capricorn',   sectorAngle: 0   },
  { index: 9,  name: 'กุมภ์',  nameEn: 'Aquarius',    sectorAngle: 330 },
  { index: 10, name: 'มีน',   nameEn: 'Pisces',       sectorAngle: 300 },
  { index: 11, name: 'เมษ',   nameEn: 'Aries',        sectorAngle: 270 },
]

/** ดาวเกษตร: zodiac index ที่ดาวแต่ละดวงปกครอง (อิง ZODIAC_ORDER ใหม่) */
export const PLANET_KASTERN: Record<number, number[]> = {
  1: [3],        // อาทิตย์ → สิงห์  (index 3)
  2: [2],        // จันทร์  → กรกฎ   (index 2)
  3: [11, 6],    // อังคาร  → เมษ (11), พิจิก (6)
  4: [1, 4],     // พุธ     → เมถุน (1), กันย์ (4)
  5: [7, 10],    // พฤหัส   → ธนู (7), มีน (10)
  6: [0, 5],     // ศุกร์    → พฤษภ (0), ตุลย์ (5)
  7: [8],        // เสาร์    → มังกร (8)
  8: [9],        // ราหู    → กุมภ์ (9)
}

/**
 * เลขดาวเกษตรคงที่ประจำราศี (Fixed Kastern Numbers)
 * เรียงตาม ZODIAC_ORDER: พฤษภ(0)→เมษ(11)
 * ชุด 6-4-2-1-4-6-3-5-7-8-5-3
 */
export const KASTERN_FIXED: Record<number, number> = {
  0: 6,   // พฤษภ
  1: 4,   // เมถุน
  2: 2,   // กรกฎ
  3: 1,   // สิงห์
  4: 4,   // กันย์
  5: 6,   // ตุลย์
  6: 3,   // พิจิก
  7: 5,   // ธนู
  8: 7,   // มังกร
  9: 8,   // กุมภ์
  10: 5,  // มีน
  11: 3,  // เมษ
}

/**
 * สถานะมาตรฐานดาว 6 ประเภท
 * มหาอุจจ์(maha-uccj) / เกษตร(kaset) / ราชาโชค(racha-chok) / มหาจักร(maha-chakr) / ประ(pra) / นิจ(nij)
 */
export type PlanetStatus = 'kaset' | 'pra' | 'maha-uccj' | 'nij' | 'racha-chok' | 'maha-chakr' | null

/** Priority order: มหาอุจจ์ > เกษตร > ราชาโชค > มหาจักร > ประ > นิจ */
export const PLANET_STATUS_PRIORITY: PlanetStatus[] = [
  'maha-uccj', 'kaset', 'racha-chok', 'maha-chakr', 'pra', 'nij'
]

/**
 * คำนวณสถานะมาตรฐานดาวตามลำดับความสำคัญ (Version 2.0 - Final Spec)
 * อ้างอิง: ตำราพรายกระซิบ (นดา พยากรณ์)
 */
export function getPlanetStatus(planetNum: number, zodiacIndex: number): PlanetStatus {
  // 1. มหาอุจจ์ (Maha-Uccj) - ดอกไม้สีเขียว
  const MAHA_UCH: Record<number, number> = { 1: 11, 2: 0, 3: 8, 4: 4, 5: 2, 6: 10, 7: 5, 8: 6 };
  if (MAHA_UCH[planetNum] === zodiacIndex) return 'maha-uccj';

  // 2. เกษตร (Kaset) - สามเหลี่ยมสีแดง
  if (KASTERN_FIXED[zodiacIndex] === planetNum) return 'kaset';

  // 3. ราชาโชค (Racha-Chok) - หกเหลี่ยมสีน้ำเงิน
  // 1:เมถุน(1), 2:กันย์(4), 3:พฤษภ(0), 4:สิงห์(3), 5:เมษ(11), 6:มังกร(8), 7:พิจิก(6), 8:ตุลย์(5)
  const RAJA_CHOK: Record<number, number> = { 1: 1, 2: 4, 3: 0, 4: 3, 5: 11, 6: 8, 7: 6, 8: 5 };
  if (RAJA_CHOK[planetNum] === zodiacIndex) return 'racha-chok';

  // 4. มหาจักร (Maha-Chakr) - สี่เหลี่ยมสีเหลือง
  // 1:พิจิก(6), 2:เมษ(11), 3:กันย์(4), 4:สิงห์(3), 5:พิจิก(6), 6:ธนู(7), 7:พฤษภ(0), 8:มังกร(8)
  const MAHA_CHAK: Record<number, number> = { 1: 6, 2: 11, 3: 4, 4: 3, 5: 6, 6: 7, 7: 0, 8: 8 };
  if (MAHA_CHAK[planetNum] === zodiacIndex) return 'maha-chakr';

  // 5. ประ (Pra) - วงกลมสีแดง (ตรงข้ามเกษตร)
  const oppositeZodiac = (zodiacIndex + 6) % 12;
  if (KASTERN_FIXED[oppositeZodiac] === planetNum) return 'pra';

  // 6. นิจ (Nid) - ดอกจันสีแดง (ตรงข้ามมหาอุจจ์)
  const NID: Record<number, number> = { 1: 5, 2: 6, 3: 2, 4: 10, 5: 8, 6: 4, 7: 11, 8: 0 };
  if (NID[planetNum] === zodiacIndex) return 'nij';

  return null;
}

/** Label ตัวอักษรไทย สำหรับดาวลอย 11 ดวง [1,2,3,4,5,6,7,8,ลั,9,0] */
export const THAI_LABELS: string[] = ['๑','๒','๓','๔','๕','๖','๗','๘','ลั','๙','๐']

/** ชื่อสถานะดาวภาษาไทย */
export const PLANET_STATUS_NAMES: Record<string, string> = {
  'kaset': 'เกษตร',
  'pra': 'ประ',
  'maha-uccj': 'มหาอุจจ์',
  'nij': 'นิจ',
  'racha-chok': 'ราชาโชค',
  'maha-chakr': 'มหาจักร',
}

/** ดาวประจำวัน */
export const DAY_PLANET: Record<number, number> = {
  0: 1, // อาทิตย์
  1: 2, // จันทร์
  2: 3, // อังคาร
  3: 4, // พุธ
  4: 5, // พฤหัส
  5: 6, // ศุกร์
  6: 7, // เสาร์
}

/** ตารางยามอัฐกาลกลางวัน [day 0-6][yam 1-8] */
export const DAY_YAM: number[][] = [
  [1,6,4,2,7,5,3,1], // อาทิตย์
  [2,7,5,3,1,6,4,2], // จันทร์
  [3,1,6,4,2,7,5,3], // อังคาร
  [4,2,7,5,3,1,6,4], // พุธ
  [5,3,1,6,4,2,7,5], // พฤหัส
  [6,4,2,7,5,3,1,6], // ศุกร์
  [7,5,3,1,6,4,2,7], // เสาร์
]

/** ตารางยามอัฐกาลกลางคืน */
export const NIGHT_YAM: number[][] = [
  [1,5,2,6,3,7,4,1], // อาทิตย์
  [2,6,3,7,4,1,5,2], // จันทร์
  [3,7,4,1,5,2,6,3], // อังคาร
  [4,1,5,2,6,3,7,4], // พุธ
  [5,2,6,3,7,4,1,5], // พฤหัส
  [6,3,7,4,1,5,2,6], // ศุกร์
  [7,4,1,5,2,6,3,7], // เสาร์
]

/** เวลาเริ่มยาม (minutes from midnight) */
export const YAM_START: Record<'day'|'night', number[]> = {
  day:   [360,450,540,630,720,810,900,990],
  night: [1080,1170,1260,1350,0,90,180,270],
}

/** ชื่อภพ 12 หลัง */
export const BHAVA_NAMES = [
  'ตนุ','กฎุมภะ','สหัชชะ','พันธุ','ปุตตะ','อริ',
  'ปัตนิ','มรณะ','ศุภะ','กัมมะ','ลาภะ','วินาศ',
]

/** ข้อมูลดาวพระเคราะห์ */
export const PLANET_INFO: Record<number, {
  day: string; night: string; thai: string
  color: string; isMalefic: boolean
}> = {
  1: { day:'สุริชะ',  night:'ระวิ',   thai:'พระอาทิตย์', color:'#E8920A', isMalefic:false },
  2: { day:'จันเทา',  night:'ศะศิ',   thai:'พระจันทร์',  color:'#7B8FA1', isMalefic:false },
  3: { day:'ภุมมะ',   night:'ภุมโม',  thai:'พระอังคาร',  color:'#C0392B', isMalefic:true  },
  4: { day:'พุธะ',    night:'พุโธ',   thai:'พระพุธ',     color:'#27AE60', isMalefic:false },
  5: { day:'ครู',     night:'ชีโว',   thai:'พระพฤหัส',   color:'#B8860B', isMalefic:false },
  6: { day:'ศุกระ',   night:'ศุโกร',  thai:'พระศุกร์',   color:'#9B59B6', isMalefic:false },
  7: { day:'เสารี',   night:'โสโร',   thai:'พระเสาร์',   color:'#546E7A', isMalefic:true  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface HoraTaynooInput {
  dateAsked?: Date
  hour?: number    // override เฉพาะ demo/test
  minute?: number
  dayOverride?: number // 0-6 override เฉพาะ test
}

export interface SubTimeSlot {
  slotIndex: number      // 0-11
  zodiacIndex: number
  zodiacName: string
  bhavaName: string
  startMin: number       // minutes from midnight (float)
  endMin: number
  startStr: string       // "HH:MM" or "HH:MM.SS"
  endStr: string
  bhavaTimeLabel: string // e.g. "ตนุ 06:07.30"
}

export interface PlanetEntry {
  label: string          // '1','2',...,'7','8','ล','9','0'
  labelThai: string      // '๑','๒',...,'๗','๘','ลั','๙','๐'
  planetNum: number | null  // 1-7 หรือ null สำหรับ ล,8,9,0
  zodiacIndex: number
  zodiacName: string
  steps: number
  isLagna: boolean
  status: PlanetStatus   // เกษตร/ประ/มหาอุจจ์/นิจ/ราชาโชค/มหาจักร
}

export interface HoraTaynooResult {
  // Input info
  dayOfWeek: number
  dayName: string
  period: 'day' | 'night'
  yamAsked: number        // 1-8
  yamStartMin: number     // minutes from midnight
  yamEndMin: number
  yamStartStr: string
  yamEndStr: string

  // Planets
  dayPlanet: number
  yamPlanet: number
  kasternZodiacIndex: number
  kasternZodiacName: string

  // Folding results
  planetSteps: number[]   // [11 ดวง]
  planetEntries: PlanetEntry[]  // [11 ดวง] พร้อม label

  // Lagna
  lagnaZodiacIndex: number
  lagnaZodiacName: string

  // Bhava
  bhavaMap: Record<number, string>  // zodiacIndex → ชื่อภพ

  // Time slots
  lagnaRulerPlanet: number     // ดาวเจ้าเรือนของลัคนา
  timeStartZodiacIndex: number // zodiac ที่ดาวเจ้าเรือนลัคนา สถิตอยู่
  subTimeSlots: SubTimeSlot[]  // 12 ช่อง ๆ ละ 7.5 นาที
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getAstroDay(date: Date): number {
  // วันโหราศาสตร์เริ่ม 06:00
  const mins = date.getHours() * 60 + date.getMinutes()
  if (mins < 360) {
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 1)
    return prev.getDay()
  }
  return date.getDay()
}

function getPeriod(h: number): 'day' | 'night' {
  return h >= 6 && h < 18 ? 'day' : 'night'
}

function getYamNumber(h: number, m: number, period: 'day'|'night'): number {
  const mins = h * 60 + m
  const starts = YAM_START[period]
  for (let i = 7; i >= 0; i--) {
    if (period === 'night' && i >= 4) {
      // ยาม 5-8 กลางคืน = 0:00-6:00
      if (mins >= starts[i] && mins < (i < 7 ? starts[i+1] : 360)) return i + 1
    } else {
      if (mins >= starts[i]) return i + 1
    }
  }
  return 1
}

function getYamStartMin(period: 'day'|'night', yam: number): number {
  return YAM_START[period][yam - 1]
}

function minToStr(minutes: number): string {
  const safeMin = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(safeMin / 60)
  const m = safeMin % 60
  const mInt = Math.floor(m)
  const mFrac = Math.round((m - mInt) * 60)
  if (mFrac === 0) {
    return `${String(h).padStart(2,'0')}:${String(mInt).padStart(2,'0')}`
  }
  return `${String(h).padStart(2,'0')}:${String(mInt).padStart(2,'0')}.${String(mFrac).padStart(2,'0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: พับยาม (Period Folding)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getPlanetSteps — คำนวณ "จำนวนก้าว" ของดาวลอย 11 ดวง
 * ระบบ: เดินหน้า yamAsked→8, พับย้ำที่ 8, ถอยหลัง 8→
 *
 * Return: number[11] สำหรับดาว [1,2,3,4,5,6,7,8,ล,9,0]
 */
export function getPlanetSteps(
  day: number,
  yamAsked: number,
  period: 'day' | 'night'
): number[] {
  const row = period === 'day' ? DAY_YAM[day] : NIGHT_YAM[day]
  const steps: number[] = []

  // yamAsked อยู่ที่ index yamAsked-1 (0-based)
  let idx = yamAsked - 1

  for (let p = 0; p < 11; p++) {
    steps.push(row[idx])
    idx = (idx + 1) % 8 // เดินหน้าวนลูป 8 ยามปกติ
  }
  return steps
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: พับย้ำลงจักรราศี (Chained Counting)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculatePositions — เดินดาวลงผัง
 * - ดาวดวงแรก: นับจาก พฤษก (index 0) → นับ CCW steps[0] ช่อง
 * - ดาวดวงถัดๆ ไป: นับจาก zodiac ที่ดาวก่อนหน้าลงไป (พับย้ำ)
 *
 * Return: number[11] zodiacIndex ของดาวลอยแต่ละดวง
 */
export function calculatePositions(steps: number[]): number[] {
  const positions: number[] = []
  let cur = 0 // เริ่มที่ index 0 = พฤษก

  for (let p = 0; p < steps.length; p++) {
    // นับ steps[p] ช่อง จาก cur (นับย้ำ = cur นับเป็น 1)
    const land = (cur + steps[p] - 1) % 12
    positions.push(land)
    cur = land
  }
  return positions
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: ภพ + เวลายามย่อย
// ─────────────────────────────────────────────────────────────────────────────

export function buildBhavaMap(lagnaZodiacIndex: number): Record<number, string> {
  const map: Record<number, string> = {}
  for (let b = 0; b < 12; b++) {
    map[(lagnaZodiacIndex + b) % 12] = BHAVA_NAMES[b]
  }
  return map
}

/**
 * findLagnaRuler — หาดาวเจ้าเรือนของลัคนา
 * ดูว่า zodiac index ของลัคนา อยู่ใน PLANET_KASTERN ของดาวใด
 */
export function findLagnaRuler(lagnaZodiacIndex: number): number {
  for (const [planet, kasterns] of Object.entries(PLANET_KASTERN)) {
    if (kasterns.includes(lagnaZodiacIndex)) return Number(planet)
  }
  return 4 // default = พุธ (ปกครองหลายราศี)
}

/**
 * findPlanetPosition — หาว่าดาว (planetNum) อยู่ที่ zodiac index ใด
 * ใน planetEntries ที่คำนวณมาแล้ว
 */
export function findPlanetPosition(
  planetNum: number,
  entries: PlanetEntry[]
): number {
  const found = entries.find(e => e.planetNum === planetNum)
  return found ? found.zodiacIndex : 0
}

export function buildSubTimeSlots(
  yamStartMin: number,
  startZodiacIndex: number,
  bhavaMap: Record<number, string>
): SubTimeSlot[] {
  const slots: SubTimeSlot[] = []
  const DURATION = 7.5 // นาที

  for (let i = 0; i < 12; i++) {
    // วนขวา (Clockwise) = ตามลำดับราศี (index 0 -> 1 -> 2)
    const zIdx = (startZodiacIndex + i) % 12
    const startMin = yamStartMin + i * DURATION
    const endMin = startMin + DURATION
    const bhava = bhavaMap[zIdx] ?? ''
    const startStrVal = minToStr(startMin)
    slots.push({
      slotIndex: i,
      zodiacIndex: zIdx,
      zodiacName: ZODIAC_ORDER[zIdx].name,
      bhavaName: bhava,
      startMin,
      endMin,
      startStr: startStrVal,
      endStr: minToStr(endMin),
      bhavaTimeLabel: bhava ? `${bhava} ${startStrVal}` : startStrVal,
    })
  }
  return slots
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateHoraTaynoo — คำนวณผังดวงยามพรายกระซิบสมบูรณ์
 *
 * @param input HoraTaynooInput
 * @returns HoraTaynooResult
 */
export function calculateHoraTaynoo(input: HoraTaynooInput = {}): HoraTaynooResult {
  const now = new Date()
  const date = input.dateAsked ?? now
  const h = input.hour ?? date.getHours()
  const m = input.minute ?? date.getMinutes()
  const day = input.dayOverride ?? getAstroDay(date)
  const period = getPeriod(h)
  const yamAsked = getYamNumber(h, m, period)
  const yamStartMin = getYamStartMin(period, yamAsked)
  const yamEndMin = yamStartMin + 90
  const dayPlanet = DAY_PLANET[day]
  const yamPlanet = (period === 'day' ? DAY_YAM : NIGHT_YAM)[day][yamAsked - 1]
  const kasternZodiacIndex = PLANET_KASTERN[dayPlanet][0]

  // พับยาม → จำนวนก้าว
  const planetSteps = getPlanetSteps(day, yamAsked, period)

  // พับย้ำลงจักรราศี
  const positions = calculatePositions(planetSteps)

  // Labels: [1,2,3,4,5,6,7,8,ล,9,0]
  const LABELS = ['1','2','3','4','5','6','7','8','ล','9','0']
  const PLANET_NUMS: (number|null)[] = [1,2,3,4,5,6,7,8,null,9,null] // null = ล, 0

  const planetEntries: PlanetEntry[] = LABELS.map((label, i) => {
    const pNum = PLANET_NUMS[i]
    const zIdx = positions[i]
    // หา status: คำนวณแบบ Dynamic ตาม Version 2.0
    const status = pNum != null ? getPlanetStatus(pNum, zIdx) : null

    return {
      label,
      labelThai: THAI_LABELS[i],
      planetNum: pNum,
      zodiacIndex: zIdx,
      zodiacName: ZODIAC_ORDER[zIdx].name,
      steps: planetSteps[i],
      isLagna: label === 'ล',
      status,
    }
  })

  const lagnaEntry = planetEntries[8] // index 8 = ล
  const lagnaZodiacIndex = lagnaEntry.zodiacIndex
  const bhavaMap = buildBhavaMap(lagnaZodiacIndex)
  const lagnaRulerPlanet = findLagnaRuler(lagnaZodiacIndex)

  // หา zodiac ที่ดาวเจ้าเรือนลัคนาสถิต
  const timeStartZodiacIndex = findPlanetPosition(lagnaRulerPlanet, planetEntries)
  const subTimeSlots = buildSubTimeSlots(yamStartMin, timeStartZodiacIndex, bhavaMap)

  const DAY_NAMES = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

  return {
    dayOfWeek: day,
    dayName: DAY_NAMES[day],
    period,
    yamAsked,
    yamStartMin,
    yamEndMin,
    yamStartStr: minToStr(yamStartMin),
    yamEndStr: minToStr(yamEndMin),
    dayPlanet,
    yamPlanet,
    kasternZodiacIndex,
    kasternZodiacName: ZODIAC_ORDER[kasternZodiacIndex].name,
    planetSteps,
    planetEntries,
    lagnaZodiacIndex,
    lagnaZodiacName: ZODIAC_ORDER[lagnaZodiacIndex].name,
    bhavaMap,
    lagnaRulerPlanet,
    timeStartZodiacIndex,
    subTimeSlots,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG CHART GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartConfig {
  size?: number     // default 520
  theme?: 'dark' | 'light'
  showKasternFixed?: boolean
  showFloatingPlanets?: boolean
  showPlanetStatus?: boolean
  showTimeRing?: boolean
  showLagnaRulerMarker?: boolean
  highlightLagna?: boolean
}

/**
 * generateHoraTaynooSVG — สร้าง SVG ผังยามพรายกระซิบ Canonical 4-Layer (Version 2.0)
 *
 * Layer A: Fixed Kastern Numbers (Arabic, opacity 0.45)
 * Layer B: Floating Planets (Thai Numerals)
 */
export function generateHoraTaynooSVG(
  result: HoraTaynooResult,
  config: ChartConfig = {}
): string {
  const SHOW_FIXED  = config.showKasternFixed !== false
  const SHOW_FLOAT  = config.showFloatingPlanets !== false
  const SHOW_STATUS = config.showPlanetStatus !== false
  const SHOW_TIME   = config.showTimeRing !== false
  const SHOW_START  = config.showLagnaRulerMarker !== false

  const SIZE = config.size ?? 520
  const CX   = SIZE / 2
  const CY   = SIZE / 2
  const s    = SIZE / 520  // scale factor

  // ── Radii ──────────────────────────────────────────────────────────────────
  const R1   = SIZE * 0.44              // Outer zodiac ring   (100%)
  const R2   = R1 * 0.82               // House ring boundary (82%)
  const R3   = R1 * 0.65               // Planet ring boundary(65%)
  const R4   = R1 * 0.37               // Core boundary       (~37%)

  const R_ZOD   = (R1 + R2) / 2         // zodiac label midpoint
  const R_HOU   = (R2 + R3) / 2         // house label midpoint
  const R_PLN   = (R3 + R4) / 2         // planet label midpoint
  const R_FIXED = R3 - 10 * s           // Fixed kastern inside planet ring
  const R_TIME  = Math.min(R1 + 22 * s, SIZE / 2 - 4 * s)

  // ── Colors ─────────────────────────────────────────────────────────────────
  const GOLD      = '#C9A96E'
  const GOLD_MED  = '#C9A96E60'
  const GOLD_DIM  = '#C9A96E28'
  const TXT       = '#F5F0E8'
  const TXT_DIM   = '#8B7E6E'
  const LAGNA_BG  = '#1A4E9A22'
  const PLN_BG    = '#C9A96E14'
  const GOOD_CLR  = '#6EE7B7'
  const BAD_CLR   = '#FDA4AF'
  const MED_CLR   = '#A89880'

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const GOOD_BHAVA = new Set(['ตนุ','กฎุมภะ','ปุตตะ','ปัตนิ','ศุภะ','กัมมะ','ลาภะ'])
  const BAD_BHAVA  = new Set(['อริ','มรณะ','วินาศ'])

  function polar(deg: number, r: number) {
    const rad = (deg * Math.PI) / 180
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
  }

  /** วาด sector ระหว่าง rInner–rOuter ที่มุมกลาง angleMid ±15° */
  function sectorPath(angleMid: number, rInner: number, rOuter: number): string {
    const a1 = angleMid + 15  // CCW boundary (higher angle)
    const a2 = angleMid - 15  // CW boundary  (lower angle)
    const o1 = polar(a1, rOuter), o2 = polar(a2, rOuter)
    const i2 = polar(a2, rInner), i1 = polar(a1, rInner)
    const ro = rOuter.toFixed(1), ri = rInner.toFixed(1)
    return `M${o1.x.toFixed(1)} ${o1.y.toFixed(1)} ` +
           `A${ro} ${ro} 0 0 0 ${o2.x.toFixed(1)} ${o2.y.toFixed(1)} ` +
           `L${i2.x.toFixed(1)} ${i2.y.toFixed(1)} ` +
           `A${ri} ${ri} 0 0 1 ${i1.x.toFixed(1)} ${i1.y.toFixed(1)} Z`
  }

  // ── Build planet-by-zodiac map ──────────────────────────────────────────────
  const byZodiac: Record<number, PlanetEntry[]> = {}
  for (const e of result.planetEntries) {
    ;(byZodiac[e.zodiacIndex] ??= []).push(e)
  }

  // ── Sector highlights ───────────────────────────────────────────────────────
  let highlights = ''
  for (const z of ZODIAC_ORDER) {
    const isLagna    = z.index === result.lagnaZodiacIndex
    const hasPlanets = (byZodiac[z.index] ?? []).length > 0
    if (!isLagna && !hasPlanets) continue
    highlights += `<path d="${sectorPath(z.sectorAngle, R4, R1)}" fill="${isLagna ? LAGNA_BG : PLN_BG}" stroke="none"/>`
  }

  // ── Circles ─────────────────────────────────────────────────────────────────
  const circles = [
    `<circle cx="${CX}" cy="${CY}" r="${R1.toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="1.5"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R2.toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="1"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R3.toFixed(1)}" fill="none" stroke="${GOLD_MED}" stroke-width="0.7"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R4.toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="1"/>`,
  ].join('\n')

  // ── 12 radial dividers (zodiac sector boundaries) ───────────────────────────
  let dividers = ''
  for (let i = 0; i < 12; i++) {
    const angle = 345 - 30 * i
    const inner = polar(angle, R4)
    const outer = polar(angle, R1)
    dividers += `<line x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}" stroke="${GOLD}" stroke-width="0.8"/>`
  }

  // ── Layer 1: Zodiac names ────────────────────────────────────────────────────
  let zodiacLabels = ''
  for (const z of ZODIAC_ORDER) {
    const pos   = polar(z.sectorAngle, R_ZOD)
    const isLagna = z.index === result.lagnaZodiacIndex
    const color = isLagna ? '#6EB0F5' : TXT
    zodiacLabels += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${10.5*s}" font-family="sans-serif" fill="${color}" font-weight="${isLagna ? '700' : '500'}">${z.name}</text>`
  }

  // ── Layer 2: House names ─────────────────────────────────────────────────────
  let houseLabels = ''
  for (const z of ZODIAC_ORDER) {
    const bhava = result.bhavaMap[z.index]
    if (!bhava) continue
    const pos   = polar(z.sectorAngle, R_HOU)
    const color = BAD_BHAVA.has(bhava) ? BAD_CLR : GOOD_BHAVA.has(bhava) ? GOOD_CLR : MED_CLR
    houseLabels += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${8.5*s}" font-family="sans-serif" fill="${color}">${bhava}</text>`
  }

  // ── Layer 3: Planet labels (Layer B) + status overlay ────────────────────────
  const STATUS_COLORS: Record<Exclude<PlanetStatus, null>, string> = {
    'maha-uccj': '#22C55E',
    'kaset': '#C9A96E',
    'racha-chok': '#3B82F6',
    'maha-chakr': '#EAB308',
    'pra': '#EF4444',
    'nij': '#EF4444',
  }

  const STATUS_GLYPHS: Record<Exclude<PlanetStatus, null>, string> = {
    'maha-uccj': '○',
    'kaset': '△',
    'racha-chok': '⬡',
    'maha-chakr': '□',
    'pra': '⋮',
    'nij': '✳',
  }

  function statusSymbol(x: number, y: number, status: PlanetStatus): string {
    if (!status || !SHOW_STATUS) return ''
    const color = STATUS_COLORS[status]
    const glyph = STATUS_GLYPHS[status]
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${9.5*s}" font-family="sans-serif" fill="${color}" font-weight="700">${glyph}</text>`
  }

  let planetLabels = ''
  if (SHOW_FLOAT) {
    for (const z of ZODIAC_ORDER) {
      const entries = byZodiac[z.index] ?? []
      if (entries.length === 0) continue
      const pos = polar(z.sectorAngle, R_PLN)
      const baseX = pos.x
      const baseY = pos.y
      const gap = 16 * s
      const totalWidth = (entries.length - 1) * gap
      entries.forEach((entry, idx) => {
        const x = baseX - totalWidth / 2 + idx * gap
        const y = baseY
        const pInfo = entry.planetNum ? PLANET_INFO[entry.planetNum] : null
        const color = pInfo?.color ?? (entry.isLagna ? '#6EB0F5' : GOLD)
        const symbol = entry.status ? statusSymbol(x, y - 12 * s, entry.status) : ''
        planetLabels += `${symbol}<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${14*s}" font-family="serif" fill="${color}" font-weight="900">${entry.labelThai}</text>`
      })
    }
  }

  // ── Layer A: Fixed Kastern numbers ──────────────────────────────────────────
  let kasternFixedLabels = ''
  if (SHOW_FIXED) {
    for (const z of ZODIAC_ORDER) {
      const pos = polar(z.sectorAngle, R_FIXED)
      const fixedNum = KASTERN_FIXED[z.index]
      kasternFixedLabels += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${13*s}" font-family="sans-serif" fill="${GOLD}" opacity="0.45">${fixedNum}</text>`
    }
  }

  // ── Layer 4: Core grid ────────────────────────────────────────────────────────
  let coreLines = ''
  for (const angle of [0, 45, 90, 135]) {
    const p1 = polar(angle, R4), p2 = polar(angle + 180, R4)
    coreLines += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${GOLD}" stroke-width="0.8"/>`
  }

  // Anchor Numbers 1-8 (ตำแหน่ง Fixed ตามตำรา)
  const ANCHORS: Record<number, [number, number]> = {
    1: [-35, 40], 2: [-60, 0],  3: [0, -65], 4: [-65, -25],
    5: [60, -25], 6: [35, 40],  7: [0, 10],  8: [35, -65],
  }
  let anchorLabels = ''
  for (const [num, [dx, dy]] of Object.entries(ANCHORS)) {
    const x = (CX + Number(dx) * s).toFixed(1)
    const y = (CY + Number(dy) * s).toFixed(1)
    anchorLabels += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${11*s}" font-family="sans-serif" fill="${GOLD}" font-weight="700" opacity="0.6">${num}</text>`
  }

  // Sub time labels (outermost ring)
  let timeLabels = ''
  if (SHOW_TIME) {
    for (const slot of result.subTimeSlots) {
      const angle = ZODIAC_ORDER[slot.zodiacIndex].sectorAngle
      const pos = polar(angle, R_TIME)
      timeLabels += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${7.5*s}" font-family="sans-serif" fill="${TXT_DIM}" opacity="0.9">${slot.bhavaTimeLabel}</text>`
    }
  }

  // Lagna Ruler Start Marker
  let startMarker = ''
  if (SHOW_START) {
    const startAngle = ZODIAC_ORDER[result.timeStartZodiacIndex].sectorAngle
    const pos = polar(startAngle, R1 + 8 * s)
    startMarker = `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${4*s}" fill="#6EB0F5" stroke="white" stroke-width="1"/>`
  }

  // Day planet in center
  const centerLabel = `<text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" font-size="${16*s}" font-family="sans-serif" fill="${GOLD}" font-weight="700">${result.dayPlanet}</text>`

  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
${highlights}
${circles}
${dividers}
 ${kasternFixedLabels}
 ${zodiacLabels}
 ${houseLabels}
 ${planetLabels}
 ${coreLines}
 ${anchorLabels}
 ${timeLabels}
 ${startMarker}
 ${centerLabel}
</svg>`
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK API
// ─────────────────────────────────────────────────────────────────────────────

/** คำนวณ ณ เวลาปัจจุบัน */
export function calculateNow(theme: 'dark'|'light' = 'dark') {
  const result = calculateHoraTaynoo()
  const svg = generateHoraTaynooSVG(result, { theme })
  return { result, svg }
}

/** คำนวณจาก วัน + เวลา (สำหรับ demo/test) */
export function calculateAt(
  day: number,  // 0=อาทิตย์..6=เสาร์
  hour: number,
  minute: number = 0
): HoraTaynooResult {
  return calculateHoraTaynoo({ dayOverride: day, hour, minute })
}

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS YAM DATABASE (112 ผัง)
// 7 วัน × 2 ช่วง × 8 ยาม = 112 ดวงยามสำเร็จ
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS YAM CHART INTERFACE (Phase C Schema)
// ─────────────────────────────────────────────────────────────────────────────

/** โครงสร้างดวงยามสำเร็จ 1 ผัง ตามสเปค Phase C */
export interface SuccessYamChart {
  id: string
  weekday: 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat'
  period: 'day' | 'night'
  yamNo: number
  startTime: string
  endTime: string

  /** zodiac index (0-11) ที่ดาวลอยแต่ละดวงลงไป */
  planets: {
    '1': number; '2': number; '3': number; '4': number; '5': number;
    '6': number; '7': number; '8': number; '9': number; '0': number;
    'la': number;
  }

  /** zodiac index ที่ภพแต่ละภพตั้งอยู่ */
  houses: {
    tanu: number;    dhan: number;   saha: number;   bandhu: number;
    putta: number;   ari: number;    patni: number;  marana: number;
    subha: number;   karma: number;  labha: number;  vinasa: number;
  }

  /** เวลาเริ่มต้นของยามย่อย 12 ช่อง (7.5 นาที × 12) */
  timeSlots: string[]
}

/** ข้อมูล meta ของยามแต่ละช่วง */
export interface SuccessYamMeta {
  id: string
  weekday: number          // 0=อาทิตย์ ... 6=เสาร์
  weekdayName: string
  period: 'day' | 'night'
  yamNo: number            // 1-8
  start: string            // "HH:MM"
  end: string
}

const WEEKDAY_NAMES = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
const WEEKDAY_ID    = ['sun','mon','tue','wed','thu','fri','sat']

function _minToHHMM(m: number): string {
  const safe = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(safe / 60)).padStart(2,'0')}:${String(Math.floor(safe % 60)).padStart(2,'0')}`
}

/**
 * getYamTimeRange — ดึงช่วงเวลาของยาม
 */
export function getYamTimeRange(
  period: 'day' | 'night',
  yamNo: number,
): { start: string; end: string } {
  const s = YAM_START[period][yamNo - 1]
  return { start: _minToHHMM(s), end: _minToHHMM(s + 90) }
}

/**
 * getSuccessYamMeta — ดึง meta array ทั้ง 112 รายการ (ไม่คำนวณผัง)
 */
export function getSuccessYamMeta(): SuccessYamMeta[] {
  const list: SuccessYamMeta[] = []
  for (let w = 0; w < 7; w++) {
    for (const period of ['day','night'] as const) {
      for (let y = 1; y <= 8; y++) {
        const { start, end } = getYamTimeRange(period, y)
        list.push({
          id: `${WEEKDAY_ID[w]}-${period}-${y}`,
          weekday: w,
          weekdayName: WEEKDAY_NAMES[w],
          period,
          yamNo: y,
          start,
          end,
        })
      }
    }
  }
  return list
}

/**
 * loadSuccessYam — โหลดดวงยามสำเร็จ 1 ใน 112 ผัง
 * @param weekday 0=อาทิตย์...6=เสาร์ (astronomical day)
 * @param period 'day' | 'night'
 * @param yamNo 1–8
 */
export function loadSuccessYam(
  weekday: number,
  period: 'day' | 'night',
  yamNo: number,
): HoraTaynooResult {
  const startMin = YAM_START[period][yamNo - 1]
  const safeMin  = ((startMin % 1440) + 1440) % 1440
  const hour     = Math.floor(safeMin / 60)
  const minute   = safeMin % 60
  return calculateHoraTaynoo({ dayOverride: weekday, hour, minute })
}
