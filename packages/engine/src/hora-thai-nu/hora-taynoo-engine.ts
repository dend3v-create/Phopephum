/**
 * hora-taynoo-engine.ts
 * โหรทายหนู — Engine หลัก (Production Grade)
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

/** 12 ราศีเรียง CCW จาก index 0 = พฤษก (บนซ้าย) */
export const ZODIAC_ORDER = [
  { index: 0,  name: 'พฤษก',  nameEn: 'Taurus',      sectorAngle: 255 },
  { index: 1,  name: 'เมษ',   nameEn: 'Aries',       sectorAngle: 285 },
  { index: 2,  name: 'มีน',   nameEn: 'Pisces',      sectorAngle: 315 },
  { index: 3,  name: 'กุมภ์',  nameEn: 'Aquarius',    sectorAngle: 345 },
  { index: 4,  name: 'มกร',   nameEn: 'Capricorn',   sectorAngle: 15  },
  { index: 5,  name: 'ธนู',   nameEn: 'Sagittarius', sectorAngle: 45  },
  { index: 6,  name: 'พิจก',  nameEn: 'Scorpio',     sectorAngle: 75  },
  { index: 7,  name: 'ตุลย์',  nameEn: 'Libra',       sectorAngle: 105 },
  { index: 8,  name: 'กันย์',  nameEn: 'Virgo',       sectorAngle: 135 },
  { index: 9,  name: 'สิงห์',  nameEn: 'Leo',         sectorAngle: 165 },
  { index: 10, name: 'กรกฎ',  nameEn: 'Cancer',      sectorAngle: 195 },
  { index: 11, name: 'เมถุน',  nameEn: 'Gemini',      sectorAngle: 225 },
]

/** ดาวเกษตร: zodiac index ที่ดาวแต่ละดวงปกครอง */
export const PLANET_KASTERN: Record<number, number[]> = {
  1: [9],        // อาทิตย์ → สิงห์
  2: [10],       // จันทร์  → กรกฎ
  3: [1, 6],     // อังคาร  → เมษ, พิจก
  4: [11, 8],    // พุธ     → เมถุน, กันย์
  5: [5, 2],     // พฤหัส   → ธนู, มีน
  6: [0, 7],     // ศุกร์    → พฤษก, ตุลย์
  7: [4, 3],     // เสาร์    → มกร, กุมภ์
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
}

export interface PlanetEntry {
  label: string          // '1','2',...,'7','8','ล','9','0'
  planetNum: number | null  // 1-7 หรือ null สำหรับ ล,8,9,0
  zodiacIndex: number
  zodiacName: string
  steps: number
  isLagna: boolean
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
  let folded = false
  let goingBack = false

  for (let p = 0; p < 11; p++) {
    steps.push(row[idx])

    if (!folded) {
      if (idx === 7) {
        // ถึงยามที่ 8 → พับ (ย้ำยาม 8 ก่อน แล้วถอย)
        folded = true
        goingBack = true
        // idx ยังเป็น 7 (ย้ำ) → loop ถัดไปถึงจะถอย
      } else {
        idx++ // เดินหน้า
      }
    } else {
      idx-- // ถอยหลัง
    }
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
    const zIdx = (startZodiacIndex + i) % 12
    const startMin = yamStartMin + i * DURATION
    const endMin = startMin + DURATION
    slots.push({
      slotIndex: i,
      zodiacIndex: zIdx,
      zodiacName: ZODIAC_ORDER[zIdx].name,
      bhavaName: bhavaMap[zIdx] ?? '',
      startMin,
      endMin,
      startStr: minToStr(startMin),
      endStr: minToStr(endMin),
    })
  }
  return slots
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateHoraTaynoo — คำนวณผังดวงโหรทายหนูสมบูรณ์
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
  const PLANET_NUMS = [1,2,3,4,5,6,7,8,null,9,null] // null = ล, 0

  const planetEntries: PlanetEntry[] = LABELS.map((label, i) => ({
    label,
    planetNum: PLANET_NUMS[i],
    zodiacIndex: positions[i],
    zodiacName: ZODIAC_ORDER[positions[i]].name,
    steps: planetSteps[i],
    isLagna: label === 'ล',
  }))

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

interface ChartConfig {
  size?: number     // default 680
  theme?: 'dark' | 'light'
  showLabels?: boolean
  highlightLagna?: boolean
}

/**
 * generateHoraTaynooSVG — สร้าง SVG string ของผังดวง
 * ใช้สำหรับ server-side render หรือ React dangerouslySetInnerHTML
 */
export function generateHoraTaynooSVG(
  result: HoraTaynooResult,
  config: ChartConfig = {}
): string {
  const SIZE = config.size ?? 680
  const CX = SIZE / 2
  const CY = SIZE / 2
  const scale = SIZE / 680

  const R_OUT  = 240 * scale
  const R_ZIN  = 176 * scale
  const R_YIN  = 140 * scale
  const R_GRD  = 106 * scale
  const R_LBL  = 208 * scale
  const R_NUM  = 158 * scale
  const R_COR  = 256 * scale

  const GOLD = config.theme === 'dark' ? '#C9A96E' : '#8B6914'
  const GOLD2 = config.theme === 'dark' ? '#C9A96E40' : '#8B691440'
  const TXT   = config.theme === 'dark' ? '#F5F0E8' : '#1a1714'
  const TXT2  = config.theme === 'dark' ? '#8B7E6E' : '#5a5148'
  const HIGHL = config.theme === 'dark' ? '#C9A96E20' : '#C9A96E15'

  function polar(deg: number, r: number) {
    const rad = (deg * Math.PI) / 180
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
  }

  // 12 เส้นแบ่ง
  let dividers = ''
  for (let i = 0; i < 12; i++) {
    const angle = 240 + i * 30
    const inner = polar(angle, R_YIN)
    const outer = polar(angle, R_OUT)
    dividers += `<line x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}" stroke="${GOLD}" stroke-width="0.8"/>`
  }

  // ราศี + ไฮไลท์
  let zodiacLabels = ''
  let highlights = ''
  const entryByZodiac: Record<number, PlanetEntry[]> = {}
  result.planetEntries.forEach(e => {
    if (!entryByZodiac[e.zodiacIndex]) entryByZodiac[e.zodiacIndex] = []
    entryByZodiac[e.zodiacIndex].push(e)
  })

  for (const z of ZODIAC_ORDER) {
    const mid = polar(z.sectorAngle, R_LBL)
    const entries = entryByZodiac[z.index] ?? []
    const isLagna = z.index === result.lagnaZodiacIndex
    const hasFloating = entries.length > 0

    // highlight sector
    if (hasFloating || isLagna) {
      const a1 = z.sectorAngle - 15
      const a2 = z.sectorAngle + 15
      const p1 = polar(a1, R_ZIN), p2 = polar(a2, R_ZIN)
      const p3 = polar(a2, R_OUT), p4 = polar(a1, R_OUT)
      const fill = isLagna ? '#185FA520' : HIGHL
      highlights += `<path d="M${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A${R_ZIN} ${R_ZIN} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L${p3.x.toFixed(1)} ${p3.y.toFixed(1)} A${R_OUT} ${R_OUT} 0 0 0 ${p4.x.toFixed(1)} ${p4.y.toFixed(1)} Z" fill="${fill}" stroke="none"/>`
    }

    // ชื่อราศี
    zodiacLabels += `<text x="${mid.x.toFixed(1)}" y="${mid.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${13*scale}" font-family="sans-serif" fill="${TXT}" font-weight="500">${z.name}</text>`

    // ดาวลอย
    if (entries.length > 0) {
      const innerMid = polar(z.sectorAngle, R_NUM)
      const labels = entries.map(e => e.label).join(',')
      const p = entries.find(e => e.planetNum != null)
      const pInfo = p?.planetNum ? PLANET_INFO[p.planetNum] : null
      const color = pInfo?.color ?? GOLD
      zodiacLabels += `<text x="${innerMid.x.toFixed(1)}" y="${innerMid.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${12*scale}" font-family="sans-serif" fill="${color}" font-weight="500">${labels}</text>`
    }
  }

  // ตัวเลขมุมนอก
  const CORNER_NUMS = [2,1,2,3,4,5,6,7,6,5,4,3]
  let cornerNums = ''
  for (let i = 0; i < 12; i++) {
    const angle = 240 + i * 30
    const pos = polar(angle, R_COR)
    if (pos.x >= 10 && pos.x <= SIZE-10 && pos.y >= 10 && pos.y <= SIZE-10) {
      cornerNums += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${14*scale}" font-family="sans-serif" fill="${TXT2}" font-weight="500">${CORNER_NUMS[i]}</text>`
    }
  }

  // Inner grid
  const gSize = R_GRD * 0.65
  const innerGrid = `
    <line x1="${(CX-gSize).toFixed(1)}" y1="${CY.toFixed(1)}" x2="${(CX+gSize).toFixed(1)}" y2="${CY.toFixed(1)}" stroke="${GOLD}" stroke-width="0.6"/>
    <line x1="${CX.toFixed(1)}" y1="${(CY-gSize).toFixed(1)}" x2="${CX.toFixed(1)}" y2="${(CY+gSize).toFixed(1)}" stroke="${GOLD}" stroke-width="0.6"/>
    <line x1="${(CX-gSize*0.4).toFixed(1)}" y1="${(CY-gSize).toFixed(1)}" x2="${(CX-gSize*0.4).toFixed(1)}" y2="${(CY+gSize).toFixed(1)}" stroke="${GOLD2}" stroke-width="0.4"/>
    <line x1="${(CX+gSize*0.4).toFixed(1)}" y1="${(CY-gSize).toFixed(1)}" x2="${(CX+gSize*0.4).toFixed(1)}" y2="${(CY+gSize).toFixed(1)}" stroke="${GOLD2}" stroke-width="0.4"/>
    <line x1="${(CX-gSize).toFixed(1)}" y1="${(CY-gSize*0.35).toFixed(1)}" x2="${(CX+gSize).toFixed(1)}" y2="${(CY-gSize*0.35).toFixed(1)}" stroke="${GOLD2}" stroke-width="0.4"/>
    <line x1="${(CX-gSize).toFixed(1)}" y1="${(CY+gSize*0.35).toFixed(1)}" x2="${(CX+gSize).toFixed(1)}" y2="${(CY+gSize*0.35).toFixed(1)}" stroke="${GOLD2}" stroke-width="0.4"/>
    <text x="${CX.toFixed(1)}" y="${(CY+gSize*0.6).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${18*scale}" font-family="sans-serif" fill="${GOLD}" font-weight="500">${result.dayPlanet}</text>
  `

  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${CX}" cy="${CY}" r="${R_OUT}" fill="none" stroke="${GOLD}" stroke-width="1.5"/>
  <circle cx="${CX}" cy="${CY}" r="${R_ZIN}" fill="none" stroke="${GOLD}" stroke-width="0.8"/>
  <circle cx="${CX}" cy="${CY}" r="${R_YIN}" fill="none" stroke="${GOLD2}" stroke-width="0.5"/>
  <circle cx="${CX}" cy="${CY}" r="${R_GRD}" fill="none" stroke="${GOLD}" stroke-width="1"/>
  ${highlights}
  ${dividers}
  ${zodiacLabels}
  ${cornerNums}
  ${innerGrid}
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
