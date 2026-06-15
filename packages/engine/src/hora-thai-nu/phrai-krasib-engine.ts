/**
 * ผังดวงยามพรายกระซิบ — Phrai Krasib Chart Engine
 * อ้างอิง: อ.กานดา + ตำรายามอัฏฐกาล (พลูหลวง)
 *
 * 6 ขั้นตอนหลัก:
 *   Step 1 — หายามถาม (ยามกี่, กลางวัน/คืน, ดาวอัฏฐกาล)
 *   Step 2 — สร้างตาราง 3 แกน (ยาม 1-8 / อัฏฐกาลวัน / ดาวลอย)
 *   Step 3 — วางดาวลอย 11 ดวงแบบ "Bounce" (↓ ยาม4→8 แล้ว ↑ กลับ)
 *   Step 4 — วางดาวในจักรราศี 12 ช่อง (เดินยามนับก้าว)
 *   Step 5 — ลงภพ 12 เริ่มจาก ลัคนา ทวนเข็มนาฬิกา
 *   Step 6 — ลงเวลา 12 ช่อง (ดาวเจ้าเรือนลัคนา + ทุก 7.5 นาที)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6
// 0=อาทิตย์ 1=จันทร์ 2=อังคาร 3=พุธ 4=พฤหัส 5=ศุกร์ 6=เสาร์

export type YamNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type DayPeriod = 'day' | 'night'
export type FloatingStar = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'la' | 9 | 0
// ลำดับ: ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ลั ๙ ๐ (มฤตยู)

export type RasiIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
// 0=เมษ 1=พฤษภ 2=เมถุน 3=กรกฎ 4=สิงห์ 5=กันย์ 6=ตุลย์ 7=พิจิก 8=ธนู 9=มกร 10=กุมภ์ 11=มีน

export interface ThreeAxisRow {
  yamNumber: YamNumber        // แกน 1: ยาม 1-8
  atthakarnPlanet: number     // แกน 2: ดาวอัฏฐกาลวัน (1-7)
  floatingStar: FloatingStar | null  // แกน 3: ดาวลอย (null = ว่าง)
}

export interface ZodiacCell {
  rasiIndex: RasiIndex
  rasiName: string
  floatingStars: FloatingStar[]
  houseName: string | null    // ภพชื่อ (ตนุ, กดุมภะ, ...)
  timeLabel: string | null    // เวลา เช่น "10:37:30"
}

import { DIGNITY_MAP } from './datasets/tables.js'

export interface StarWithStatus {
  star: FloatingStar
  status: string
  statusSymbol: string
}

export interface PredictionPoint {
  house: string
  stars: StarWithStatus[]
  rasi: RasiIndex
  rasiName: string
  lord: number
  lordStatus: string
}

export interface PhraKrasibChart {
  // Input
  queryTime: Date
  queryDay: DayOfWeek
  period: DayPeriod

  // Step 1
  yamAsked: YamNumber
  yamStartTime: string
  yamEndTime: string
  atthakarnAtYam: number      // ดาวอัฏฐกาลที่ยามถาม

  // Step 2-3
  threeAxisTable: ThreeAxisRow[]

  // Step 4
  zodiacCells: ZodiacCell[]   // 12 ช่อง
  kasetchCenter: number       // ดาวเกษตรของราศีลัคนา (ค่าคงที่)

  // Step 5
  lagnaCellIndex: RasiIndex   // ลัคนาอยู่ที่ราศีไหน

  // Step 6
  timeStartCell: RasiIndex    // เริ่มลงเวลาที่ช่องไหน
  timeStartValue: string      // เวลาเริ่ม (หลังบวก 7.5 นาที)

  // Prediction Path
  predictionPath: {
    x: PredictionPoint
    y: PredictionPoint
    z: PredictionPoint
  } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** ราศี 12 ช่อง: 0=เมษ ... 11=มีน */
export const RASI_NAMES: Record<RasiIndex, string> = {
  0: 'เมษ',   1: 'พฤษภ',  2: 'เมถุน',  3: 'กรกฎ',
  4: 'สิงห์', 5: 'กันย์', 6: 'ตุลย์',  7: 'พิจิก',
  8: 'ธนู',   9: 'มกร',   10: 'กุมภ์', 11: 'มีน',
}

/**
 * ลำดับเดินในจักรราศี ทวนเข็มนาฬิกา เริ่มจากพฤษภ
 * พฤษภ(1) → เมถุน(2) → ... → มีน(11) → เมษ(0)
 * ใช้เป็น lookup สำหรับนับก้าวและลงภพ/เวลา
 */
export const RASI_CCW_FROM_TAURUS: RasiIndex[] = [1,2,3,4,5,6,7,8,9,10,11,0]

/** ลำดับภพ 12 ภพ เริ่มที่ตนุ */
export const HOUSE_NAMES: string[] = [
  'ตนุ', 'กดุมภะ', 'สหัชชะ', 'พันธุ',
  'ปุตตะ', 'อริ', 'ปัตนิ', 'มรณะ',
  'ศุภะ', 'กัมมะ', 'ลาภะ', 'วินาศ',
]

/**
 * ดาวเกษตร (เจ้าเรือนราศี) — ค่าคงที่ประจำราศีทั้ง 12
 * ลำดับ: เมษ(0) พฤษภ(1) เมถุน(2) ... มีน(11)
 * ลำดับจากพฤษภ CCW = 6,4,2,1,4,6,3,5,7,8,5,3
 */
export const KASETCH_FIXED_BY_RASI: Record<RasiIndex, number> = {
  0: 3,   // เมษ   → อังคาร (3)
  1: 6,   // พฤษภ  → ศุกร์ (6)
  2: 4,   // เมถุน  → พุธ (4)
  3: 2,   // กรกฎ  → จันทร์ (2)
  4: 1,   // สิงห์  → อาทิตย์ (1)
  5: 4,   // กันย์  → พุธ (4)
  6: 6,   // ตุลย์  → ศุกร์ (6)
  7: 3,   // พิจิก  → อังคาร (3)
  8: 5,   // ธนู   → พฤหัส (5)
  9: 7,   // มกร   → เสาร์ (7)
  10: 8,  // กุมภ์  → ราหู (8)
  11: 5,  // มีน   → พฤหัส (5)
}

/**
 * ตารางอัฏฐกาลประจำวัน (กลางวัน)
 * key = วัน (0=อาทิตย์ ... 6=เสาร์)
 * value = ดาวประจำยาม 1-8
 */
export const ATTHAKARN_DAY: Record<DayOfWeek, number[]> = {
  0: [1,6,4,2,7,5,3,1],  // อาทิตย์
  1: [2,7,5,3,1,6,4,2],  // จันทร์
  2: [3,1,6,4,2,7,5,3],  // อังคาร
  3: [4,2,7,5,3,1,6,4],  // พุธ
  4: [5,3,1,6,4,2,7,5],  // พฤหัส
  5: [6,4,2,7,5,3,1,6],  // ศุกร์
  6: [7,5,3,1,6,4,2,7],  // เสาร์
}

/**
 * ตารางอัฏฐกาลประจำวัน (กลางคืน)
 */
export const ATTHAKARN_NIGHT: Record<DayOfWeek, number[]> = {
  0: [1,5,2,6,3,7,4,1],  // อาทิตย์
  1: [2,6,3,7,4,1,5,2],  // จันทร์
  2: [3,7,4,1,5,2,6,3],  // อังคาร
  3: [4,1,5,2,6,3,7,4],  // พุธ
  4: [5,2,6,3,7,4,1,5],  // พฤหัส
  5: [6,3,7,4,1,5,2,6],  // ศุกร์
  6: [7,4,1,5,2,6,3,7],  // เสาร์
}

/** ลำดับดาวลอย 11 ดวง */
export const FLOATING_STARS: FloatingStar[] = [1,2,3,4,5,6,7,8,'la',9,0]

// ─── Step 1: หายามถาม ─────────────────────────────────────────────────────────

export interface YamResult {
  yamNumber: YamNumber
  period: DayPeriod
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  atthakarnSequence: number[]
  atthakarnAtYam: number
}

/**
 * คำนวณยาม จากวัน + เวลา
 * หมายเหตุ:
 *   - แปลงเป็นเวลาไทย (UTC+7) เสมอ
 *   - วันโหร เปลี่ยนที่ 06:00 น. ไม่ใช่ 00:00
 */
export function getYam(date: Date): YamResult {
  // แปลงเป็นเวลาไทย UTC+7
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000
  const thai = new Date(utcMs + 7 * 3_600_000)

  const h = thai.getHours()
  const m = thai.getMinutes()
  const totalMin = h * 60 + m

  let period: DayPeriod
  let dayOfWeek: DayOfWeek

  if (totalMin >= 6 * 60 && totalMin < 18 * 60) {
    period = 'day'
    dayOfWeek = thai.getDay() as DayOfWeek
  } else if (totalMin >= 18 * 60) {
    period = 'night'
    dayOfWeek = thai.getDay() as DayOfWeek
  } else {
    // 00:00–05:59 ยังเป็นคืนของวันก่อน
    period = 'night'
    const prev = new Date(thai)
    prev.setDate(prev.getDate() - 1)
    dayOfWeek = prev.getDay() as DayOfWeek
  }

  let yamNumber: YamNumber
  let startMin: number

  if (period === 'day') {
    const offset = totalMin - 6 * 60
    yamNumber = (Math.min(Math.floor(offset / 90) + 1, 8)) as YamNumber
    startMin = 6 * 60 + (yamNumber - 1) * 90
  } else {
    const nightOffset = totalMin >= 18 * 60
      ? totalMin - 18 * 60
      : totalMin + (24 - 18) * 60
    yamNumber = (Math.min(Math.floor(nightOffset / 90) + 1, 8)) as YamNumber
    startMin = (18 * 60 + (yamNumber - 1) * 90) % (24 * 60)
  }

  const endMin = (startMin + 90) % (24 * 60)

  const fmt = (min: number): string => {
    const hh = Math.floor(min / 60) % 24
    const mm = min % 60
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
  }

  const seq = period === 'day' ? ATTHAKARN_DAY[dayOfWeek] : ATTHAKARN_NIGHT[dayOfWeek]

  return {
    yamNumber,
    period,
    dayOfWeek,
    startTime: fmt(startMin),
    endTime: endMin === 0 ? '24:00' : fmt(endMin),
    atthakarnSequence: seq,
    atthakarnAtYam: seq[yamNumber - 1],
  }
}

// ─── Step 2-3: ตาราง 3 แกน + path ดาวลอย ─────────────────────────────────────

/**
 * สร้าง path ยาม 1-8 ของดาวลอย 11 ดวง แบบ Bounce
 *
 * กฎ: เริ่มที่ yamAsked → ลงถึง yam8 → ย้อนกลับขึ้น
 * ตัวอย่าง yamAsked=4:
 *   ๑→4  ๒→5  ๓→6  ๔→7  ๕→8  ๖→8  ๗→7  ๘→6  ลั→5  ๙→4  ๐→3
 */
export function buildBouncePath(yamAsked: YamNumber): YamNumber[] {
  const path: YamNumber[] = []
  let current = yamAsked as number
  let going: 'down' | 'up' = 'down'

  for (let i = 0; i < FLOATING_STARS.length; i++) {
    path.push(current as YamNumber)
    if (i < FLOATING_STARS.length - 1) {
      if (going === 'down') {
        if (current < 8) {
          current++
        } else {
          going = 'up' // bounce: current ยัง = 8 รอบถัดไป
        }
      } else {
        current = Math.max(1, current - 1)
      }
    }
  }

  return path
}

/** สร้างตาราง 3 แกน (ยาม | อัฏฐกาล | ดาวลอย) */
export function buildThreeAxisTable(yamResult: YamResult): ThreeAxisRow[] {
  const { yamNumber: yamAsked, atthakarnSequence } = yamResult
  const path = buildBouncePath(yamAsked)

  // map: yamNumber → ดาวลอย (เก็บทุกดวงในยามนั้น)
  const yamToDaow = new Map<number, FloatingStar[]>()
  for (let y = 1; y <= 8; y++) yamToDaow.set(y, [])
  for (let i = 0; i < FLOATING_STARS.length; i++) {
    yamToDaow.get(path[i])!.push(FLOATING_STARS[i])
  }

  return Array.from({ length: 8 }, (_, i) => {
    const y = (i + 1) as YamNumber
    const stars = yamToDaow.get(y)!
    return {
      yamNumber: y,
      atthakarnPlanet: atthakarnSequence[i],
      floatingStar: stars[0] ?? null,  // ดวงแรกที่ยามนั้น (อาจมีหลายดวงช่วง bounce)
    }
  })
}

/**
 * คืนค่า Map<starKey, { yamNumber, atthakarnValue }>
 * starKey: '1'..'8', 'la', '9', '0'
 */
export function buildFloatingStarMap(
  yamResult: YamResult
): Map<string, { yamNumber: YamNumber; atthakarnValue: number }> {
  const { yamNumber: yamAsked, atthakarnSequence } = yamResult
  const path = buildBouncePath(yamAsked)
  const result = new Map<string, { yamNumber: YamNumber; atthakarnValue: number }>()

  for (let i = 0; i < FLOATING_STARS.length; i++) {
    const star = FLOATING_STARS[i]
    const key = String(star)
    const yam = path[i]
    result.set(key, {
      yamNumber: yam,
      atthakarnValue: atthakarnSequence[yam - 1],
    })
  }

  return result
}

// ─── Step 4: วางดาวในจักรราศี ─────────────────────────────────────────────────

/**
 * วางดาวลอย 11 ดวงในจักรราศี 12 ช่อง
 *
 * กฎ:
 *   - จุดเริ่ม: พฤษภ (RasiIndex = 1) เสมอ
 *   - ดาวแต่ละดวง: นับก้าวตาม atthakarnValue (ทวนเข็ม)
 *   - ก้าวแรก = ช่องปัจจุบัน (inclusive counting)
 *   - ดาวถัดไปนับต่อจากช่องที่ดวงก่อนตก
 *
 * @returns Map<starKey, RasiIndex>
 */
export function placeStarsInZodiac(
  floatMap: Map<string, { yamNumber: YamNumber; atthakarnValue: number }>
): Map<string, RasiIndex> {
  const result = new Map<string, RasiIndex>()
  // ลำดับทวนเข็มนาฬิกา เริ่มจากพฤษภ
  const rasiOrder: RasiIndex[] = [1,2,3,4,5,6,7,8,9,10,11,0]

  let currentOrderIdx = 0  // เริ่มที่ พฤษภ

  for (const star of FLOATING_STARS) {
    const key = String(star)
    const info = floatMap.get(key)!
    const steps = info.atthakarnValue

    // inclusive: ก้าวที่ 1 = ช่องปัจจุบัน
    const targetIdx = (currentOrderIdx + steps - 1) % 12
    result.set(key, rasiOrder[targetIdx])
    currentOrderIdx = targetIdx
  }

  return result
}

// ─── Step 5: ลงภพ 12 ภพ ───────────────────────────────────────────────────────

/**
 * กำหนดภพ 12 ภพ โดยเริ่มที่ราศีที่ ลัคนา (ลั) สถิต → ทวนเข็มนาฬิกา
 */
export function assignHouses(
  starPositions: Map<string, RasiIndex>
): { houseMap: Map<RasiIndex, string>; lagnaRasi: RasiIndex } {
  const lagnaRasi = starPositions.get('la')!
  const rasiOrder: RasiIndex[] = [1,2,3,4,5,6,7,8,9,10,11,0]
  const startIdx = rasiOrder.indexOf(lagnaRasi)

  const houseMap = new Map<RasiIndex, string>()
  for (let i = 0; i < 12; i++) {
    houseMap.set(rasiOrder[(startIdx + i) % 12], HOUSE_NAMES[i])
  }

  return { houseMap, lagnaRasi }
}

// ─── Step 6: ลงเวลา ────────────────────────────────────────────────────────────

/**
 * ลงเวลา 12 ช่อง ทวนเข็มนาฬิกา
 *
 * กฎ:
 *   1. ดาวเจ้าเรือนลัคนา = KASETCH_FIXED_BY_RASI[lagnaRasi]
 *   2. หาว่าดาวลอยดวงนั้นสถิตที่ราศีใด → ช่องเริ่มลงเวลา
 *   3. เวลาเริ่ม = yamStartTime + 7.5 นาที
 *   4. แต่ละช่องถัดไป +7.5 นาที (ทวนเข็มนาฬิกา)
 *   5. ครบ 12 ช่อง = ปิดยาม (90 นาที)
 */
export function assignTimes(
  yamResult: YamResult,
  starPositions: Map<string, RasiIndex>,
  houseMap: Map<RasiIndex, string>
): { rasi: RasiIndex; house: string | null; time: string }[] {
  const lagnaRasi = starPositions.get('la')!
  const kasetch = KASETCH_FIXED_BY_RASI[lagnaRasi]
  const startRasi = starPositions.get(String(kasetch))!

  // เวลาเริ่ม = yamStartTime + 7.5 นาที
  const [sh, sm] = yamResult.startTime.split(':').map(Number)
  let currentMin = sh * 60 + sm + 7.5

  const rasiOrder: RasiIndex[] = [1,2,3,4,5,6,7,8,9,10,11,0]
  const startIdx = rasiOrder.indexOf(startRasi)

  return Array.from({ length: 12 }, (_, i) => {
    const rasi = rasiOrder[(startIdx + i) % 12]
    const time = minutesToTimeStr(currentMin)
    currentMin += 7.5
    return { rasi, house: houseMap.get(rasi) ?? null, time }
  })
}

/** แปลงนาที (อาจมีทศนิยม) เป็น "HH:MM:SS" */
function minutesToTimeStr(totalMinutes: number): string {
  const totalSec = Math.round(totalMinutes * 60)
  const h = Math.floor(totalSec / 3600) % 24
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

/**
 * วิเคราะห์เส้นทางการพยากรณ์ X+Y+Z
 */
export function getPredictionPath(
  chart: Omit<PhraKrasibChart, 'predictionPath'>,
  starPositions: Map<string, RasiIndex>,
  houseMap: Map<RasiIndex, string>
): { x: PredictionPoint; y: PredictionPoint; z: PredictionPoint } | null {
  const queryTime = chart.queryTime
  // แปลงเป็นเวลาไทย UTC+7 สำหรับการเปรียบเทียบ
  const utcMs = queryTime.getTime() + queryTime.getTimezoneOffset() * 60_000
  const thai = new Date(utcMs + 7 * 3_600_000)
  const totalMin = thai.getHours() * 60 + thai.getMinutes() + thai.getSeconds() / 60

  // หา cell ที่เวลาครอบคลุม
  const targetCell = chart.zodiacCells.find(cell => {
    if (!cell.timeLabel) return false
    const [h, m, s] = cell.timeLabel.split(':').map(Number)
    const cellEndMin = h * 60 + m + s / 60
    const cellStartMin = cellEndMin - 7.5
    
    // จัดการกรณีข้ามเที่ยงคืน
    let qMin = totalMin
    if (cellEndMin < 6 * 60 && totalMin >= 18 * 60) qMin -= 1440
    if (cellEndMin >= 18 * 60 && totalMin < 6 * 60) qMin += 1440

    return qMin >= cellStartMin && qMin < cellEndMin
  })

  if (!targetCell) return null

  const getPoint = (rasi: RasiIndex): PredictionPoint => {
    const stars: StarWithStatus[] = []
    
    const getStatusStr = (planet: number, rIdx: number): { label: string; symbol: string } => {
      const d = DIGNITY_MAP[planet]
      if (!d) return { label: 'ปกติ', symbol: '·' }
      // DIGNITY_MAP uses Taurus=0 indexing. Our rIdx uses Aries=0 indexing.
      // Convert rIdx to Taurus-first index:
      const mappedIdx = (rIdx + 11) % 12
      
      if (d.kaset.includes(mappedIdx))    return { label: 'เกษตร', symbol: '△' }
      if (d.maha_uch.includes(mappedIdx)) return { label: 'มหาอุจจ์', symbol: '○' }
      if (d.neech.includes(mappedIdx))    return { label: 'นิจ', symbol: '✳' }
      if (d.pra.includes(mappedIdx))      return { label: 'ประ', symbol: '⋮' }
      return { label: 'ปกติ', symbol: '·' }
    }

    for (const [s, pos] of starPositions.entries()) {
      if (pos === rasi) {
        const starNum = s === 'la' ? -1 : Number(s)
        const { label, symbol } = starNum >= 1 && starNum <= 7 
          ? getStatusStr(starNum, rasi) 
          : { label: 'ปกติ', symbol: '·' }
          
        stars.push({
          star: s === 'la' ? 'la' : Number(s) as FloatingStar,
          status: label,
          statusSymbol: symbol
        })
      }
    }

    const lord = KASETCH_FIXED_BY_RASI[rasi]
    const lordStatus = getStatusStr(lord, rasi).label

    return {
      house: houseMap.get(rasi) || '?',
      stars,
      rasi,
      rasiName: RASI_NAMES[rasi],
      lord,
      lordStatus
    }
  }

  // X: ภพ ณ เวลาถาม
  const x = getPoint(targetCell.rasiIndex)

  // Y: ภพที่ดาวเจ้าเรือนของ X ลอยไปประทับ
  const yRasi = starPositions.get(String(x.lord))!
  const y = getPoint(yRasi)

  // Z: ภพที่ดาวเจ้าเรือนของ Y ลอยไปประทับ
  const zRasi = starPositions.get(String(y.lord))!
  const z = getPoint(zRasi)

  return { x, y, z }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

/**
 * คำนวณผังดวงยามพรายกระซิบ ครบทุก 6 ขั้นตอน
 */
export function calculatePhraKrasib(date: Date = new Date()): PhraKrasibChart {
  // Step 1
  const yamResult = getYam(date)

  // Step 2-3
  const threeAxisTable = buildThreeAxisTable(yamResult)
  const floatMap = buildFloatingStarMap(yamResult)

  // Step 4
  const starPositions = placeStarsInZodiac(floatMap)

  // Step 5
  const { houseMap, lagnaRasi } = assignHouses(starPositions)

  // Step 6
  const timeCells = assignTimes(yamResult, starPositions, houseMap)

  // Build zodiac cells
  const zodiacCells: ZodiacCell[] = Array.from({ length: 12 }, (_, i) => {
    const rasiIndex = i as RasiIndex
    const floatingStars: FloatingStar[] = []
    for (const [key, rasi] of starPositions.entries()) {
      if (rasi === rasiIndex) {
        floatingStars.push(key === 'la' ? 'la' : Number(key) as FloatingStar)
      }
    }
    const tc = timeCells.find(c => c.rasi === rasiIndex)
    return {
      rasiIndex,
      rasiName: RASI_NAMES[rasiIndex],
      floatingStars,
      houseName: houseMap.get(rasiIndex) ?? null,
      timeLabel: tc?.time ?? null,
    }
  })

  const kasetchCenter = KASETCH_FIXED_BY_RASI[lagnaRasi]
  const timeStartCell = starPositions.get(String(kasetchCenter))!

  const chartBase = {
    queryTime: date,
    queryDay: yamResult.dayOfWeek,
    period: yamResult.period,
    yamAsked: yamResult.yamNumber,
    yamStartTime: yamResult.startTime,
    yamEndTime: yamResult.endTime,
    atthakarnAtYam: yamResult.atthakarnAtYam,
    threeAxisTable,
    zodiacCells,
    kasetchCenter,
    lagnaCellIndex: lagnaRasi,
    timeStartCell,
    timeStartValue: timeCells[0]?.time ?? '',
  }

  const predictionPath = getPredictionPath(chartBase, starPositions, houseMap)

  return {
    ...chartBase,
    predictionPath,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function chartToText(chart: PhraKrasibChart): string {
  const dayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
  const periodTh = chart.period === 'day' ? 'กลางวัน' : 'กลางคืน'
  const sl = (s: FloatingStar | null): string => {
    if (s === null) return '-'
    if (s === 'la') return 'ลั'
    if (s === 0) return '๐'
    return String(s)
  }

  let out = `=== ผังดวงยามพรายกระซิบ ===\n`
  out += `เวลาถาม: วัน${dayNames[chart.queryDay]} (${periodTh}) ยาม ${chart.yamAsked} (${chart.yamStartTime}–${chart.yamEndTime})\n`
  out += `ดาวเกษตรลัคนา: ${chart.kasetchCenter}\n\n`

  out += `--- ตาราง 3 แกน ---\n`
  out += `ยาม | อัฏฐกาล | ดาวลอย\n`
  for (const row of chart.threeAxisTable) {
    const mark = row.yamNumber === chart.yamAsked ? ' ◀' : ''
    out += `  ${row.yamNumber}  |    ${row.atthakarnPlanet}    |  ${sl(row.floatingStar)}${mark}\n`
  }

  out += `\n--- ผังจักรราศี ---\n`
  for (const cell of chart.zodiacCells) {
    const stars = cell.floatingStars.map(sl).join(',') || '-'
    out += `${cell.rasiName.padEnd(6)} | ภพ: ${(cell.houseName ?? '-').padEnd(8)} | ดาว: ${stars.padEnd(8)} | เวลา: ${cell.timeLabel ?? '-'}\n`
  }

  return out
}
