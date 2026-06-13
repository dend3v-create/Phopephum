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
export type PlanetNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type FloatingStar = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'la' | 9 | 0
// ลำดับ: ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ลั ๙ ๐ (มฤตยู)

export type RasiIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
// 0=เมษ 1=พฤษภ 2=เมถุน 3=กรกฎ 4=สิงห์ 5=กันย์ 6=ตุลย์ 7=พิจิก 8=ธนู 9=มกร 10=กุมภ์ 11=มีน

export interface ThreeAxisRow {
  yamNumber: YamNumber       // แกน 1: ยาม 1-8
  atthakarnPlanet: number    // แกน 2: ดาวอัฏฐกาลวัน (1-7)
  floatingStar: FloatingStar | null  // แกน 3: ดาวลอย (null = ว่าง)
}

export interface ZodiacCell {
  rasiIndex: RasiIndex
  rasiName: string
  floatingStars: FloatingStar[]
  houseName: string | null   // ภพชื่อ (ตนุ, กดุมภะ, ...)
  timeLabel: string | null   // เวลา เช่น "10:37:30"
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

  // Step 2-3
  threeAxisTable: ThreeAxisRow[]

  // Step 4
  zodiacCells: ZodiacCell[]    // 12 ช่อง
  kasetchonCenter: number      // ดาวเกษตรตรงกลาง (ค่าคงที่จากวัน)

  // Step 5
  lagnaCellIndex: RasiIndex    // ลัคนาอยู่ที่ราศีไหน

  // Step 6
  timeStartCell: RasiIndex     // เริ่มลงเวลาที่ช่องไหน
  timeStartValue: string       // เวลาเริ่ม (หลังบวก 7.5 นาที)
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** ราศี 12 ช่อง เรียงตามเข็มนาฬิกา เริ่มที่ดวงอาทิตย์บน (เมษ = index 0) */
export const RASI_NAMES: Record<RasiIndex, string> = {
  0: 'เมษ', 1: 'พฤษภ', 2: 'เมถุน', 3: 'กรกฎ',
  4: 'สิงห์', 5: 'กันย์', 6: 'ตุลย์', 7: 'พิจิก',
  8: 'ธนู', 9: 'มกร', 10: 'กุมภ์', 11: 'มีน'
}

/**
 * จุดเริ่มต้นลงดาวคือ "พฤษภ" (index 1) เสมอ
 * แล้วนับตามเข็มนาฬิกา: พฤษภ→เมษ→มีน→กุมภ์→... (ทวนเข็ม = วนขวา)
 * ตามรูปผัง: วนทวนเข็มนาฬิกา
 *
 * ลำดับในผัง (ทวนเข็ม) จาก พฤษภ:
 * พฤษภ(1)→เมถุน(2)→กรกฎ(3)→สิงห์(4)→กันย์(5)→ตุลย์(6)→พิจิก(7)→ธนู(8)→มกร(9)→กุมภ์(10)→มีน(11)→เมษ(0)
 *
 * เมื่อนับก้าว ให้นับวนทวนเข็มนาฬิกาในจักรราศี:
 * ช่องปัจจุบัน → +1 step ทวนเข็ม
 */
export const RASI_COUNTER_CLOCKWISE: RasiIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]
// ลำดับเดินในจักรราศี (ทวนเข็มนาฬิกา) เริ่มจากพฤษภ

/** ลำดับภพ 12 ภพ (เริ่มที่ตนุ ไล่ทวนเข็มนาฬิกา) */
export const HOUSE_NAMES: string[] = [
  'ตนุ', 'กดุมภะ', 'สหัชชะ', 'พันธุ',
  'ปุตตะ', 'อริ', 'ปัตนิ', 'มรณะ',
  'ศุภะ', 'กัมมะ', 'ลาภะ', 'วินาศ'
]

/**
 * ตารางอัฏฐกาลประจำวัน (กลางวัน)
 * key = วัน (0=อาทิตย์ ... 6=เสาร์)
 * value = อาร์เรย์ 8 ตัว สำหรับยาม 1-8
 */
export const ATTHAKARN_DAY: Record<DayOfWeek, number[]> = {
  0: [1, 6, 4, 2, 7, 5, 3, 1],  // อาทิตย์
  1: [2, 7, 5, 3, 1, 6, 4, 2],  // จันทร์
  2: [3, 1, 6, 4, 2, 7, 5, 3],  // อังคาร
  3: [4, 2, 7, 5, 3, 1, 6, 4],  // พุธ
  4: [5, 3, 1, 6, 4, 2, 7, 5],  // พฤหัส
  5: [6, 4, 2, 7, 5, 3, 1, 6],  // ศุกร์
  6: [7, 5, 3, 1, 6, 4, 2, 7],  // เสาร์
}

/**
 * ตารางอัฏฐกาลประจำวัน (กลางคืน)
 */
export const ATTHAKARN_NIGHT: Record<DayOfWeek, number[]> = {
  0: [1, 5, 2, 6, 3, 7, 4, 1],  // อาทิตย์
  1: [2, 6, 3, 7, 4, 1, 5, 2],  // จันทร์
  2: [3, 7, 4, 1, 5, 2, 6, 3],  // อังคาร
  3: [4, 1, 5, 2, 6, 3, 7, 4],  // พุธ
  4: [5, 2, 6, 3, 7, 4, 1, 5],  // พฤหัส
  5: [6, 3, 7, 4, 1, 5, 2, 6],  // ศุกร์
  6: [7, 4, 1, 5, 2, 6, 3, 7],  // เสาร์
}

/**
 * ดาวเกษตร (เจ้าเรือนราศี) สำหรับแต่ละวัน
 * ใช้เป็นค่าคงที่วางตรงกลางผัง โดยวางเริ่มที่ "พฤษภ" เสมอ
 * 6-4-2-1-4-6-3-5-7-8-5-3 (ทวนเข็มนาฬิกา)
 *  "ตัวเลขดาวเกษตร" (ดาวเจ้าเรือนเดิม) ซึ่งเป็นค่าคงที่ประจำราศีทั้ง 12 ราศีในผังดวง
 * ที่มาของตัวเลข: ตัวเลขเหล่านี้คือดาวเจ้าเรือนที่ครองราศีต่างๆ ตามหลักโหราศาสตร์ โดยในผังดวงยามจะจัดวางไว้ในช่องราศีทั้ง 12 ช่องเพื่อใช้เป็นพื้นฐานในการอ่านดวง
,
ลำดับการวาง: ชุดตัวเลขที่คุณระบุมาเป็นการไล่ลำดับดาวเกษตรโดยเริ่มจาก "ราศีเมถุน" แล้วนับ "วนขวา" (ตามเข็มนาฬิกา) ไปจนครบ 12 ราศี ดังนี้ครับ:
4 (ราศีเมถุน)
6 (ราศีพฤษภ)
3 (ราศีเมษ)
5 (ราศีมีน)
8 (ราศีกุมภ์)
7 (ราศีมังกร)
5 (ราศีธนู)
3 (ราศีพิจิก)
6 (ราศีตุลย์)
4 (ราศีกันย์)
1 (ราศีสิงห์)
2 (ราศีกรกฎ)
,
จุดเริ่มต้นลงดาว (ดาวลอย): แม้จะมีดาวเกษตรประจำราศีอยู่แล้ว แต่เมื่อต้องเริ่มคำนวณเพื่อวาง "ดาวลอย" (ดาวดวงที่ ๑ ถึง ๐ และ ลัคนา) ตามสูตรยามอัฐกาล จุดเริ่มต้นในการนับช่องแรกเพื่อวางดาวดวงแรก (ดาว ๑) จะต้องเริ่มที่ "ราศีพฤษภ" เสมอ
,
,
สรุป: ตัวเลขชุดนั้นคือ ดาวเจ้าเรือนเกษตร ที่ถูกกำหนดไว้ตายตัวในผังจักรราศี โดยมี ราศีพฤษภ (ซึ่งมีเลข 6 เป็นดาวเกษตร) เป็นชัยภูมิหรือ จุดเริ่มต้น สำคัญในการนับก้าวเพื่อวางดาวลอยดวงแรกตามกำลังยามที่คำนวณได้ครับ
 */



/** ลำดับดาวลอย 11 ดวง */
export const FLOATING_STARS: FloatingStar[] = [1, 2, 3, 4, 5, 6, 7, 8, 'la', 9, 0]

// ─── Step 1: หายามถาม ─────────────────────────────────────────────────────────

export interface YamResult {
  yamNumber: YamNumber
  period: DayPeriod
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  atthakarnSequence: number[]  // อาร์เรย์ 8 ตัวของวันนั้น
  atthakarnAtYam: number       // ค่าอัฏฐกาลที่ยามถาม
}

/**
 * คำนวณยาม จากวัน + เวลา (ใช้เวลาท้องถิ่น)
 * หมายเหตุ: วันโหร เปลี่ยนที่ 06:00 น. ไม่ใช่ 00:00
 *
 * @param date - วัน/เวลาที่ต้องการถาม
 * @returns YamResult
 */
export function getYam(date: Date): YamResult {
  const h = date.getHours()
  const m = date.getMinutes()
  const totalMin = h * 60 + m

  // กำหนด period และ dayOfWeek (โหร)
  let period: DayPeriod
  let dayOfWeek: DayOfWeek

  if (totalMin >= 6 * 60 && totalMin < 18 * 60) {
    // กลางวัน 06:00-17:59
    period = 'day'
    dayOfWeek = date.getDay() as DayOfWeek
  } else if (totalMin >= 18 * 60) {
    // หลัง 18:00 คืนวันปัจจุบัน
    period = 'night'
    dayOfWeek = date.getDay() as DayOfWeek
  } else {
    // 00:00-05:59 ยังเป็นคืนของวันก่อน
    period = 'night'
    const prevDay = new Date(date)
    prevDay.setDate(prevDay.getDate() - 1)
    dayOfWeek = prevDay.getDay() as DayOfWeek
  }

  // คำนวณยาม (90 นาที/ยาม)
  let yamNumber: YamNumber
  let startMin: number
  let endMin: number

  if (period === 'day') {
    const offset = totalMin - 6 * 60  // นาทีนับจาก 06:00
    yamNumber = (Math.floor(offset / 90) + 1) as YamNumber
    if (yamNumber > 8) yamNumber = 8
    startMin = 6 * 60 + (yamNumber - 1) * 90
    endMin = startMin + 90
  } else {
    // กลางคืน: ยาม 1 เริ่ม 18:00
    let nightOffset: number
    if (totalMin >= 18 * 60) {
      nightOffset = totalMin - 18 * 60
    } else {
      nightOffset = totalMin + (24 - 18) * 60  // wrap ข้ามเที่ยงคืน
    }
    yamNumber = (Math.floor(nightOffset / 90) + 1) as YamNumber
    if (yamNumber > 8) yamNumber = 8
    const nightStart = 18 * 60 + (yamNumber - 1) * 90
    startMin = nightStart % (24 * 60)
    endMin = (nightStart + 90) % (24 * 60)
  }

  const fmt = (min: number) => {
    const hh = Math.floor(min / 60) % 24
    const mm = min % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const seq = period === 'day' ? ATTHAKARN_DAY[dayOfWeek] : ATTHAKARN_NIGHT[dayOfWeek]

  return {
    yamNumber,
    period,
    dayOfWeek,
    startTime: fmt(startMin),
    endTime: fmt(endMin === 0 ? 24 * 60 : endMin),
    atthakarnSequence: seq,
    atthakarnAtYam: seq[yamNumber - 1]
  }
}

// ─── Step 2-3: สร้างตาราง 3 แกน + วางดาวลอย ─────────────────────────────────

/**
 * วางดาวลอย 11 ดวง ลงในยาม 1-8
 * กฎ "Bounce":
 *   - เริ่มวาง ดาว[0]=๑ ที่ยาม yamAsked → ไล่ลงยาม+1, +2, ...
 *   - เมื่อถึงยาม 8 แล้วดาวยังไม่หมด → กลับทิศขึ้น ยาม 8, 7, 6, ...
 *   - กฎจาก Step 3: ดาวลอย[0]=๑ วางที่ yamAsked
 *     ดาวลอย[1]=๒ ลงต่อ (yamAsked+1), ...จนถึงยาม8
 *     พอสุดที่ 8 ให้ย้อน: ยาม8 อีกครั้ง, 7, 6, 5, 4, 3, ...
 *
 * หมายเหตุ: ยามหนึ่งสามารถมีดาวลอยได้มากกว่า 1 ดวง (ช่วงกลับทิศ)
 */
export function buildThreeAxisTable(yamResult: YamResult): ThreeAxisRow[] {
  const { yamNumber: yamAsked, atthakarnSequence } = yamResult

  // สร้าง mapping: yamNumber → ดาวลอย[]
  const yamToDaow: Map<YamNumber, FloatingStar[]> = new Map()
  for (let y = 1; y <= 8; y++) {
    yamToDaow.set(y as YamNumber, [])
  }

  // สร้าง path การเดินของ 11 ดาว
  // เริ่มที่ yamAsked เดินลงถึง 8 แล้ว bounce กลับขึ้น
  const path: YamNumber[] = []
  let current = yamAsked
  let going = 'down' // ทิศทาง: down หรือ up

  for (let i = 0; i < FLOATING_STARS.length; i++) {
    path.push(current as YamNumber)

    if (i < FLOATING_STARS.length - 1) {
      if (going === 'down') {
        if (current < 8) {
          current++
        } else {
          // ถึง 8 แล้ว bounce: ยาม 8 รับดาวถัดไปด้วย แล้วขึ้น
          going = 'up'
          // current ยังคง = 8 สำหรับดาวถัดไป (ยาม 8 รับทั้งก่อนและหลัง bounce)
          // แต่จากตัวอย่าง: ดาว 5 อยู่ยาม8, ดาว 6 ก็อยู่ยาม8, แล้ว 7,8,ลั,9,0 ขึ้นไป
          // จากรูปภาพ: ดาว5=ยาม8, ดาว6=ยาม8, แล้วขึ้น ดาว7=ยาม7, ดาว8=ยาม6, ลั=ยาม5, 9=ยาม4, 0=ยาม3
          // ดังนั้นเมื่อ going เปลี่ยนเป็น up: current เริ่มลดจาก 8 ในรอบถัดไป
        }
      } else {
        // going up
        current--
        if (current < 1) current = 1
      }
    }
  }

  // วางดาวลงใน map
  for (let i = 0; i < FLOATING_STARS.length; i++) {
    const yam = path[i]
    const star = FLOATING_STARS[i]
    yamToDaow.get(yam)!.push(star)
  }

  // สร้าง ThreeAxisRow
  return Array.from({ length: 8 }, (_, i) => ({
    yamNumber: (i + 1) as YamNumber,
    atthakarnPlanet: atthakarnSequence[i],
    floatingStar: yamToDaow.get((i + 1) as YamNumber)![0] ?? null
    // หมายเหตุ: ยามที่มี 2 ดาลอย ให้ใช้ทั้งคู่ในการวางผัง
  }))
}

/**
 * คืนค่าดาวลอยทั้งหมดพร้อมยามที่สถิต (สำหรับ Step 4)
 * @returns Map<FloatingStar, { yamNumber, atthakarnValue }>
 */
export function buildFloatingStarMap(
  yamResult: YamResult,
  table: ThreeAxisRow[]
): Map<string, { yamNumber: YamNumber; atthakarnValue: number }> {
  const m = new Map<string, { yamNumber: YamNumber; atthakarnValue: number }>()

  // ทำ path อีกครั้งให้ครบ (รวมยามที่มีหลายดาว)
  const { yamNumber: yamAsked, atthakarnSequence } = yamResult
  const path: YamNumber[] = []
  let current = yamAsked
  let going = 'down'

  for (let i = 0; i < FLOATING_STARS.length; i++) {
    path.push(current as YamNumber)
    if (i < FLOATING_STARS.length - 1) {
      if (going === 'down') {
        if (current < 8) {
          current++
        } else {
          going = 'up'
          // ยัง stay ที่ 8 ก่อน 1 รอบ (bounce)
        }
      } else {
        current--
        if (current < 1) current = 1
      }
    }
  }

  for (let i = 0; i < FLOATING_STARS.length; i++) {
    const yam = path[i]
    const star = FLOATING_STARS[i]
    const key = String(star)
    m.set(key, {
      yamNumber: yam,
      atthakarnValue: atthakarnSequence[yam - 1]
    })
  }

  return m
}

// ─── Step 4: วางดาวในจักรราศี ─────────────────────────────────────────────────

/**
 * วางดาวลอย 11 ดวงในจักรราศี
 * กฎ:
 *   - เริ่มต้นที่ พฤษภ (index 1)
 *   - ดาวลอย ๑: นับก้าวตาม atthakarnValue ของดาว ๑ (นับทวนเข็ม)
 *   - ดาวลอย ๒: เริ่มนับก้าวจากช่องที่ดาว ๑ อยู่
 *   - ... ไล่ต่อจนครบ 11 ดวง
 *
 * การนับก้าว:
 *   ก้าวที่ 1 = ช่องปัจจุบัน (ช่อง "start")
 *   ก้าวที่ 2 = ช่องถัดไปทวนเข็ม
 *   ... ไล่ไปตามจำนวนก้าว
 */
export function placeStarsInZodiac(
  floatMap: Map<string, { yamNumber: YamNumber; atthakarnValue: number }>
): Map<string, RasiIndex> {
  const result = new Map<string, RasiIndex>()

  // จักรราศี 12 ช่อง วนทวนเข็มนาฬิกา เริ่มจาก พฤษภ (index 1)
  const rasiOrder: RasiIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0] as RasiIndex[]
  // พฤษภ เมถุน กรกฎ สิงห์ กันย์ ตุลย์ พิจิก ธนู มกร กุมภ์ มีน เมษ

  let currentRasiOrderIndex = 0  // เริ่มที่ พฤษภ

  for (const star of FLOATING_STARS) {
    const key = String(star)
    const info = floatMap.get(key)!
    const steps = info.atthakarnValue  // จำนวนก้าว

    // นับ steps ก้าว (ก้าวแรก = ช่องปัจจุบัน)
    const targetOrderIndex = (currentRasiOrderIndex + steps - 1) % 12
    const rasiIndex = rasiOrder[targetOrderIndex]

    result.set(key, rasiIndex)
    currentRasiOrderIndex = targetOrderIndex  // ดาวถัดไปเริ่มจากช่องนี้
  }

  return result
}

// ─── Step 5: ลงภพ 12 ภพ ───────────────────────────────────────────────────────

/**
 * หา ลัคนา "ลั" อยู่ที่ราศีใด แล้วลงภพ 12 ทวนเข็มนาฬิกา
 *
 * @param starPositions - Map<starKey, RasiIndex>
 * @returns Map<RasiIndex, houseName>
 */
export function assignHouses(
  starPositions: Map<string, RasiIndex>
): { houseMap: Map<RasiIndex, string>; lagnaRasi: RasiIndex } {
  const lagnaRasi = starPositions.get('la')!

  const rasiOrder: RasiIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0] as RasiIndex[]
  // หา index ของ lagnaRasi ใน rasiOrder
  const startIdx = rasiOrder.indexOf(lagnaRasi)

  const houseMap = new Map<RasiIndex, string>()
  for (let i = 0; i < 12; i++) {
    const rasi = rasiOrder[(startIdx + i) % 12]
    houseMap.set(rasi, HOUSE_NAMES[i])
  }

  return { houseMap, lagnaRasi }
}

// ─── Step 6: ลงเวลา ────────────────────────────────────────────────────────────

/**
 * ลงเวลา 12 ช่อง
 * กฎ:
 *   1. ดาวเจ้าเรือนลัคนา = KASETCH_BY_DAY[dayOfWeek]
 *   2. หาว่าดาวนั้น (ดาวลอย) อยู่ที่ราศีใด → นั่นคือช่องเริ่มลงเวลา
 *   3. เวลาเริ่ม = yamStartTime + 7.5 นาที
 *   4. แต่ละช่องถัดไป +7.5 นาที วนทวนเข็มนาฬิกา
 *   5. ช่องสุดท้าย (ครบ 12) = yamEndTime พอดี
 *
 * @param yamResult - ผลจาก getYam()
 * @param starPositions - Map<starKey, RasiIndex>
 * @param houseMap - Map<RasiIndex, houseName>
 * @returns อาร์เรย์ 12 ช่อง พร้อมเวลา
 */
export function assignTimes(
  yamResult: YamResult,
  starPositions: Map<string, RasiIndex>,
  houseMap: Map<RasiIndex, string>
): { rasi: RasiIndex; house: string | null; time: string }[] {
  const { dayOfWeek, startTime } = yamResult
  const kasetch = KASETCH_BY_DAY[dayOfWeek]

  // หาดาวเจ้าเรือนลัคนา = ดาวลอยเลข kasetch
  const startRasi = starPositions.get(String(kasetch))!

  // เวลาเริ่ม = yamStartTime + 7.5 นาที
  const [sh, sm] = startTime.split(':').map(Number)
  let currentMin = sh * 60 + sm + 7.5  // นาทีลอยตัว

  const rasiOrder: RasiIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0] as RasiIndex[]
  const startIdx = rasiOrder.indexOf(startRasi)

  const cells: { rasi: RasiIndex; house: string | null; time: string }[] = []

  for (let i = 0; i < 12; i++) {
    const rasi = rasiOrder[(startIdx + i) % 12] as RasiIndex
    const time = formatTimeWithSeconds(currentMin)
    cells.push({
      rasi,
      house: houseMap.get(rasi) ?? null,
      time
    })
    currentMin += 7.5
  }

  return cells
}

/**
 * แปลงนาทีลอยตัว (เช่น 637.5) เป็น "HH:MM:SS"
 */
function formatTimeWithSeconds(totalMinutes: number): string {
  const totalSeconds = Math.round(totalMinutes * 60)
  const h = Math.floor(totalSeconds / 3600) % 24
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Main: calculatePhraKrasib ─────────────────────────────────────────────────

/**
 * คำนวณผังดวงยามพรายกระซิบ ครบทุก 6 ขั้นตอน
 *
 * @param date - วัน/เวลาที่ต้องการถาม (default = ตอนนี้)
 * @returns PhraKrasibChart ผลลัพธ์ครบถ้วน
 */
export function calculatePhraKrasib(date: Date = new Date()): PhraKrasibChart {
  // Step 1
  const yamResult = getYam(date)

  // Step 2-3
  const threeAxisTable = buildThreeAxisTable(yamResult)
  const floatMap = buildFloatingStarMap(yamResult, threeAxisTable)

  // Step 4
  const starPositions = placeStarsInZodiac(floatMap)

  // Build zodiac cells base
  const zodiacCells: ZodiacCell[] = (Array.from({ length: 12 }, (_, i) => {
    const rasiIndex = i as RasiIndex
    const floatingStars: FloatingStar[] = []
    for (const [key, rasi] of starPositions.entries()) {
      if (rasi === rasiIndex) {
        floatingStars.push(key === 'la' ? 'la' : Number(key) as FloatingStar)
      }
    }
    return {
      rasiIndex,
      rasiName: RASI_NAMES[rasiIndex],
      floatingStars,
      houseName: null,
      timeLabel: null
    }
  }))

  // Step 5
  const { houseMap, lagnaRasi } = assignHouses(starPositions)
  for (const cell of zodiacCells) {
    cell.houseName = houseMap.get(cell.rasiIndex) ?? null
  }

  // Step 6
  const timeCells = assignTimes(yamResult, starPositions, houseMap)
  for (const tc of timeCells) {
    const cell = zodiacCells.find(c => c.rasiIndex === tc.rasi)
    if (cell) cell.timeLabel = tc.time
  }

  return {
    queryTime: date,
    queryDay: yamResult.dayOfWeek,
    period: yamResult.period,
    yamAsked: yamResult.yamNumber,
    yamStartTime: yamResult.startTime,
    yamEndTime: yamResult.endTime,
    threeAxisTable,
    zodiacCells,
    kasetchonCenter: KASETCH_BY_DAY[yamResult.dayOfWeek],
    lagnaCellIndex: lagnaRasi,
    timeStartCell: starPositions.get(String(KASETCH_BY_DAY[yamResult.dayOfWeek]))!,
    timeStartValue: timeCells[0]?.time ?? ''
  }
}

// ─── Helpers: แปลงผลลัพธ์เป็น Text ───────────────────────────────────────────

export function chartToText(chart: PhraKrasibChart): string {
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']
  const periodTh = chart.period === 'day' ? 'กลางวัน' : 'กลางคืน'
  const starLabel = (s: FloatingStar | null): string => {
    if (s === null) return '-'
    if (s === 'la') return 'ลั'
    if (s === 0) return '๐'
    return String(s)
  }

  let out = ''
  out += `=== ผังดวงยามพรายกระซิบ ===\n`
  out += `เวลาถาม: ${chart.queryTime.toLocaleTimeString('th-TH')} วัน${dayNames[chart.queryDay]} (${periodTh})\n`
  out += `ยามถาม: ยาม ${chart.yamAsked} (${chart.yamStartTime}–${chart.yamEndTime})\n`
  out += `ดาวเกษตร (กลาง): ${chart.kasetchonCenter}\n\n`

  out += `--- ตาราง 3 แกน ---\n`
  out += `ยาม | อัฏฐกาล | ดาวลอย\n`
  for (const row of chart.threeAxisTable) {
    const mark = row.yamNumber === chart.yamAsked ? ' ◀ ยามถาม' : ''
    out += `  ${row.yamNumber}  |    ${row.atthakarnPlanet}    |  ${starLabel(row.floatingStar)}${mark}\n`
  }

  out += `\n--- ผังจักรราศี ---\n`
  for (const cell of chart.zodiacCells) {
    const stars = cell.floatingStars.map(starLabel).join(',') || '-'
    const house = cell.houseName ?? '-'
    const time = cell.timeLabel ?? '-'
    out += `${cell.rasiName.padEnd(6)} | ภพ: ${house.padEnd(8)} | ดาว: ${stars.padEnd(8)} | เวลา: ${time}\n`
  }

  return out
}
