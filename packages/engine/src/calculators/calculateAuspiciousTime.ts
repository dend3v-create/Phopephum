/**
 * calculators/calculateAuspiciousTime.ts
 * คำนวณฤกษ์มงคล — ช่วงเวลาดีสำหรับกิจกรรมสำคัญ
 *
 * หลักการ:
 * 1. ทักษาจร (จากวันในสัปดาห์) — มงคล/อัปมงคล
 * 2. ยามดี (ยามอัฏฐกาล) — รวมกับยามกำเนิดดาวมงคล
 * 3. วันพระ — ไม่เหมาะเริ่มกิจกรรมใหม่
 * 4. วันข้างขึ้น 1-5 — ฤกษ์ดี สำหรับเริ่มต้น
 *
 * แยกออกจาก UI เพื่อรองรับการเชื่อมต่อ AI / RAG / Agent ในอนาคต
 */

import { calculateMoonPhase } from './calculateMoonPhase.js'

export interface AuspiciousSlot {
  /** ช่วงเวลา "HH:MM–HH:MM" */
  timeRange: string
  /** ระดับความมงคล */
  level: 'ดีมาก' | 'ดี' | 'ปานกลาง' | 'หลีกเลี่ยง'
  /** ดาวเจ้าของยาม */
  planeta: string
  /** เหมาะสำหรับ */
  suitableFor: string[]
  /** คำแนะนำ */
  advice: string
}

export interface AuspiciousTimeResult {
  date: Date
  dayName: string
  lunarInfo: string
  isWanPhra: boolean
  /** ช่วงเวลามงคลในวันนั้น (เรียงตามเวลา) */
  auspiciousSlots: AuspiciousSlot[]
  /** ช่วงเวลาดีที่สุดของวัน */
  bestSlot: AuspiciousSlot | null
  /** สรุปคำแนะนำสำหรับวัน */
  dailySummary: string
}

// ยามดาวมงคล (สำหรับทุกวัน)
const AUSPICIOUS_PLANETS = new Set(['อาทิตย์', 'จันทร์', 'พุธ', 'พฤหัส', 'ศุกร์'])
const INAUSPICIOUS_PLANETS = new Set(['อังคาร', 'เสาร์'])

const DAY_NAMES_THAI = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']

// Chaldean order: เสาร์(0) → พฤหัส(1) → อังคาร(2) → อาทิตย์(3) → ศุกร์(4) → พุธ(5) → จันทร์(6)
const CHALDEAN = ['เสาร์', 'พฤหัส', 'อังคาร', 'อาทิตย์', 'ศุกร์', 'พุธ', 'จันทร์'] as const
const DAY_RULER_IDX = [3, 6, 2, 5, 1, 4, 0] // อา,จ,อ,พ,พฤ,ศ,ส

// กิจกรรมที่เหมาะกับแต่ละดาว
const PLANET_ACTIVITIES: Record<string, string[]> = {
  'อาทิตย์': ['ประชุมสำคัญ', 'เข้าพบผู้ใหญ่', 'สัมภาษณ์งาน', 'เปิดตัวโปรเจกต์'],
  'จันทร์':  ['ค้าขาย', 'สร้างความสัมพันธ์', 'ทำธุรกิจบริการ', 'เดินทาง'],
  'พุธ':     ['เจรจา', 'ทำสัญญา', 'เรียนรู้', 'เขียนแผนธุรกิจ'],
  'พฤหัส':  ['ลงทุน', 'ขยายธุรกิจ', 'สมัครงาน', 'เริ่มต้นสิ่งดี'],
  'ศุกร์':   ['แต่งงาน', 'ซื้อสิ่งสวยงาม', 'งานศิลปะ', 'ความรัก'],
  'อังคาร':  ['กีฬา', 'ออกกำลัง', 'ไม่เหมาะธุรกิจ'],
  'เสาร์':   ['งานระยะยาว', 'ไม่เริ่มใหม่', 'พักผ่อน'],
}

/**
 * สร้าง 8 ยาม (slot) สำหรับวันนั้น (06:00–18:00 = กลางวัน)
 */
function buildDaySlots(dayOfWeek: number): AuspiciousSlot[] {
  const startRulerIdx = DAY_RULER_IDX[dayOfWeek] ?? 3
  const slots: AuspiciousSlot[] = []

  for (let i = 0; i < 8; i++) {
    const chaldeanIdx = (startRulerIdx + i) % 7
    const planet = CHALDEAN[chaldeanIdx] as string
    const startHour = 6 + i * 1.5
    const endHour   = startHour + 1.5
    const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 === 0.5 ? '30' : '00'}`

    const isAuspicious = AUSPICIOUS_PLANETS.has(planet)
    const isInauspicious = INAUSPICIOUS_PLANETS.has(planet)

    slots.push({
      timeRange:   `${fmt(startHour)}–${fmt(endHour)}`,
      level:       isAuspicious ? (i === 0 ? 'ดีมาก' : 'ดี') : (isInauspicious ? 'หลีกเลี่ยง' : 'ปานกลาง'),
      planeta:     planet,
      suitableFor: PLANET_ACTIVITIES[planet] ?? [],
      advice:      isAuspicious
        ? `ยาม${planet} — เหมาะสำหรับ${PLANET_ACTIVITIES[planet]?.[0] ?? 'กิจกรรมทั่วไป'}`
        : `ยาม${planet} — ระวัง ควรหลีกเลี่ยงการเริ่มสิ่งใหม่`,
    })
  }

  return slots
}

/**
 * คำนวณฤกษ์มงคลสำหรับวันที่กำหนด
 * @param date วันที่ต้องการ (default: วันนี้)
 */
export function calculateAuspiciousTime(date: Date = new Date()): AuspiciousTimeResult {
  const dayOfWeek = date.getDay()
  const dayName = DAY_NAMES_THAI[dayOfWeek] ?? 'อาทิตย์'
  const moonPhase = calculateMoonPhase(date)

  const slots = buildDaySlots(dayOfWeek)

  // ถ้าวันพระ: ลด level ทั้งหมดลง 1 ระดับ
  const adjustedSlots = moonPhase.isWanPhra
    ? slots.map(s => ({ ...s, level: 'ปานกลาง' as const, advice: s.advice + ' (วันพระ — ไม่เหมาะเริ่มสิ่งใหม่)' }))
    : slots

  // best slot = slot แรกที่ level = ดีมาก หรือ ดี
  const bestSlot = adjustedSlots.find(s => s.level === 'ดีมาก') ??
                   adjustedSlots.find(s => s.level === 'ดี') ?? null

  // สรุปวัน
  const goodCount = adjustedSlots.filter(s => s.level === 'ดีมาก' || s.level === 'ดี').length
  const dailySummary = moonPhase.isWanPhra
    ? `วันพระ — วันแห่งการทำบุญและสมาธิ ไม่เหมาะเริ่มธุรกิจใหม่`
    : `วัน${dayName} มี ${goodCount} ยามมงคล` +
      (bestSlot ? ` ยามดีที่สุด: ${bestSlot.timeRange} (ยาม${bestSlot.planeta})` : '')

  return {
    date,
    dayName,
    lunarInfo: moonPhase.moonPhase,
    isWanPhra: moonPhase.isWanPhra,
    auspiciousSlots: adjustedSlots,
    bestSlot,
    dailySummary,
  }
}

/**
 * หาวันฤกษ์ดีถัดไปสำหรับกิจกรรมที่ระบุ
 * @param activity กิจกรรม เช่น "ทำสัญญา", "เปิดตัวโปรเจกต์"
 * @param from วันเริ่มหา (default: วันนี้)
 * @param daysAhead จำนวนวันที่จะหา (default: 7)
 */
export function findAuspiciousDay(
  activity: string,
  from: Date = new Date(),
  daysAhead = 7
): Array<{ date: Date; slot: AuspiciousSlot }> {
  const results: Array<{ date: Date; slot: AuspiciousSlot }> = []

  for (let i = 0; i < daysAhead; i++) {
    const checkDate = new Date(from.getTime() + i * 86400000)
    const result = calculateAuspiciousTime(checkDate)

    const matchingSlot = result.auspiciousSlots.find(
      s => (s.level === 'ดีมาก' || s.level === 'ดี') &&
           s.suitableFor.some(act => act.includes(activity) || activity.includes(act))
    )

    if (matchingSlot && !result.isWanPhra) {
      results.push({ date: checkDate, slot: matchingSlot })
    }
  }

  return results
}
