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

/** 12 ราศีเรียง CCW จาก index 0 = พฤษภ (330°) ตาม อ.กานดา */
export const ZODIAC_ORDER = [
  { index: 0,  name: 'พฤษภ',  nameEn: 'Taurus',      sectorAngle: 330 },
  { index: 1,  name: 'เมถุน',  nameEn: 'Gemini',      sectorAngle: 300 },
  { index: 2,  name: 'กรกฎ',  nameEn: 'Cancer',      sectorAngle: 270 },
  { index: 3,  name: 'สิงห์',  nameEn: 'Leo',         sectorAngle: 240 },
  { index: 4,  name: 'กันย์',  nameEn: 'Virgo',       sectorAngle: 210 },
  { index: 5,  name: 'ตุลย์',  nameEn: 'Libra',       sectorAngle: 180 },
  { index: 6,  name: 'พิจิก',  nameEn: 'Scorpio',     sectorAngle: 150 },
  { index: 7,  name: 'ธนู',   nameEn: 'Sagittarius', sectorAngle: 120 },
  { index: 8,  name: 'มังกร',  nameEn: 'Capricorn',   sectorAngle: 90  },
  { index: 9,  name: 'กุมภ์',  nameEn: 'Aquarius',    sectorAngle: 60  },
  { index: 10, name: 'มีน',   nameEn: 'Pisces',       sectorAngle: 30  },
  { index: 11, name: 'เมษ',   nameEn: 'Aries',        sectorAngle: 0   },
]

/** ดาวเกษตร: zodiac index ที่ดาวแต่ละดวงปกครอง (อิง ZODIAC_ORDER ใหม่) */
export const PLANET_KASTERN: Record<number, number[]> = {
  1: [3],        // อาทิตย์ → สิงห์  (index 3)
  2: [2],        // จันทร์  → กรกฎ   (index 2)
  3: [11, 6],    // อังคาร  → เมษ (11), พิจิก (6)
  4: [1, 4],     // พุธ     → เมถุน (1), กันย์ (4)
  5: [7, 10],    // พฤหัส   → ธนู (7), มีน (10)
  6: [0, 5],     // ศุกร์    → พฤษภ (0), ตุลย์ (5)
  7: [8, 9],     // เสาร์    → มังกร (8), กุมภ์ (9)
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
      idx = ((idx - 1) + 8) % 8 // ถอยหลัง (wrap 0 → 7)
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
 * generateHoraTaynooSVG — สร้าง SVG ผังโหรทายหนู Canonical 4-Layer
 *
 * Layer 1: Outer Zodiac Ring   R1 = 100%  (ชื่อราศี 12 ช่อง)
 * Layer 2: House Ring          R2 = 82%   (ชื่อภพ 12 หลัง)
 * Layer 3: Planet Ring         R3 = 65%   (ดาวลอย 11 ดวง)
 * Layer 4: Core Grid           R4 = 37%   (แกนกลาง 8 ภาค + Anchor 1-8)
 *
 * พฤษภ อยู่ที่ 330° เรียง CCW (ตาม อ.กานดา)
 */
export function generateHoraTaynooSVG(
  result: HoraTaynooResult,
  config: ChartConfig = {}
): string {
  const SIZE = config.size ?? 520
  const CX   = SIZE / 2
  const CY   = SIZE / 2
  const s    = SIZE / 520  // scale factor

  // ── Radii ──────────────────────────────────────────────────────────────────
  const R1   = SIZE * 0.44              // Outer zodiac ring   (100%)
  const R2   = R1 * 0.82               // House ring boundary (82%)
  const R3   = R1 * 0.65               // Planet ring boundary(65%)
  const R4   = R1 * 0.37               // Core boundary       (~37%)

  const R_ZOD = (R1 + R2) / 2          // zodiac label midpoint
  const R_HOU = (R2 + R3) / 2          // house label midpoint
  const R_PLN = (R3 + R4) / 2          // planet label midpoint

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
    // outer arc CCW (sweep=0): from a1→a2 via angleMid (decreasing angle)
    // inner arc CW  (sweep=1): from a2→a1
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
  // Boundaries at 345°, 315°, 285°, … (= 345° − 30°*i)
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

  // ── Layer 3: Planet labels ────────────────────────────────────────────────────
  let planetLabels = ''
  for (const z of ZODIAC_ORDER) {
    const entries = byZodiac[z.index] ?? []
    if (entries.length === 0) continue
    const labels = entries.map(e => e.label).join(' ')
    const pos    = polar(z.sectorAngle, R_PLN)
    const first  = entries.find(e => e.planetNum != null && e.planetNum <= 7)
    const color  = first ? (PLANET_INFO[first.planetNum!]?.color ?? GOLD) : GOLD
    planetLabels += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${13*s}" font-family="sans-serif" fill="${color}" font-weight="700">${labels}</text>`
  }

  // ── Layer 4: Core grid ────────────────────────────────────────────────────────
  // 6 เส้นหลัก: แกนตั้ง (90/270) + แกนนอน (0/180) + ทแยง 4 ทิศ (45/225, 135/315)
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

  // Day planet in center
  const centerLabel = `<text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" font-size="${16*s}" font-family="sans-serif" fill="${GOLD}" font-weight="700">${result.dayPlanet}</text>`

  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
${highlights}
${circles}
${dividers}
${zodiacLabels}
${houseLabels}
${planetLabels}
${coreLines}
${anchorLabels}
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
