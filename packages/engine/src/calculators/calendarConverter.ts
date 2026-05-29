/**
 * calculators/calendarConverter.ts
 * Module 1: แปลงวัน/เวลาเกิดสากล → เลขฐาน 1-7 (วัน/เดือน/ปี)
 *
 * Pipeline:
 *   BirthData (วัน/เวลาเกิด/จังหวัด)
 *     → CalendarConverter.convert()
 *       → AstroBaseNumbers { dayNum, monthNum, yearNum }
 */

import { BirthData, AstroBaseNumbers } from '../types/fateMatrix.js'

/**
 * ตาราง Map เดือนสุริยคติ (1-12) → เดือนจันทรคติโดยประมาณ (1-7)
 * NOTE: ค่าประมาณนี้ใช้สำหรับ fallback เท่านั้น
 *       ระบบจริงต้องดึงจากฐานข้อมูลปฏิทิน 100 ปี (supabase: thai_lunar_calendar)
 */
const SOLAR_TO_LUNAR_APPROX: Record<number, number> = {
  1: 2,  // มกราคม   → เดือน 2 จันทรคติ (ประมาณ)
  2: 3,  // กุมภาพันธ์ → เดือน 3
  3: 4,  // มีนาคม   → เดือน 4
  4: 5,  // เมษายน   → เดือน 5 (ขึ้นปีใหม่ไทย)
  5: 6,  // พฤษภาคม  → เดือน 6
  6: 7,  // มิถุนายน  → เดือน 7
  7: 8,  // กรกฎาคม  → เดือน 8
  8: 9,  // สิงหาคม  → เดือน 9
  9: 10, // กันยายน  → เดือน 10
  10: 11,// ตุลาคม   → เดือน 11
  11: 12,// พฤศจิกายน → เดือน 12
  12: 1, // ธันวาคม  → เดือน 1 (ปีใหม่จันทรคติถัดไป)
}

/** ลดทอนเลขเดือนจันทรคติ (1-12) → เลขฐาน 1-7 (วนซ้ำ) */
function lunarMonthToBase7(lunarMonth: number): number {
  const mod = lunarMonth % 7
  return mod === 0 ? 7 : mod
}

/**
 * คำนวณ yearNum (1-7) จากปีนักษัตร
 * วงจร 12 ปีนักษัตร map → 1-7 วนซ้ำ:
 *   ชวด=1 ฉลู=2 ขาล=3 เถาะ=4 มะโรง=5 มะเส็ง=6 มะเมีย=7
 *   มะแม=1 วอก=2 ระกา=3 จอ=4 กุน=5 (วนต่อ)
 * อ้างอิง: ปี ค.ศ. 2020 = ปีชวด (zodiacIndex 0)
 */
function yearToBase7(year: number): number {
  const zodiacIndex = ((year % 12) - 4 + 12) % 12 // 0 = ชวด
  return (zodiacIndex % 7) + 1
}

export class CalendarConverter {
  /**
   * แปลงข้อมูลเกิดสากล → เลขฐานโหราศาสตร์ 1-7 (วัน/เดือน/ปี)
   *
   * กฎตัดวัน: เกิดก่อน 06:00 น. ให้นับเป็นวันก่อนหน้า
   * (กฎเกณฑ์โหราศาสตร์ไทย — วันใหม่เริ่มเมื่อพระอาทิตย์ขึ้น)
   */
  public static convert(birth: BirthData): AstroBaseNumbers {
    let jsDay = birth.solarDate.getDay() // 0=อาทิตย์ … 6=เสาร์
    const solarMonth = birth.solarDate.getMonth() + 1 // 1-12
    const solarYear = birth.solarDate.getFullYear()

    // ── กฎตัดวัน 06:00 AM ─────────────────────────────────────────────────
    if (birth.birthTime) {
      const [hours] = birth.birthTime.split(':').map(Number)
      if (hours < 6) {
        jsDay = jsDay === 0 ? 6 : jsDay - 1
      }
    }

    // dayNum: 1=อาทิตย์ … 7=เสาร์
    const dayNum = jsDay + 1

    // monthNum: จันทรคติโดยประมาณ → ฐาน 1-7
    // TODO: แทนที่ด้วยการ query ฐานข้อมูลปฏิทิน 100 ปี (thai_lunar_calendar)
    //       โดยใช้ solarDate เป็น key เพื่อดึงเดือนจันทรคติที่แม่นยำ
    const lunarMonth = SOLAR_TO_LUNAR_APPROX[solarMonth] ?? solarMonth
    const monthNum = lunarMonthToBase7(lunarMonth)

    // yearNum: ปีนักษัตร → ฐาน 1-7
    const yearNum = yearToBase7(solarYear)

    return { dayNum, monthNum, yearNum }
  }
}
