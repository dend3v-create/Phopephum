/**
 * calculators/calculateLagna.ts
 * คำนวณลัคนา (Ascendant / Rising Sign) — จุดขึ้นของราศีที่ขอบฟ้าตะวันออก
 *
 * ในระบบโหราศาสตร์ไทย เลข 7 ตัว 9 ฐาน:
 * - ลัคนา = ราศีที่ปรากฏที่ขอบฟ้าตะวันออก ณ เวลาเกิด
 * - แบ่ง 12 ราศี × 2 ชั่วโมง = 24 ชั่วโมง (ราศีละ 2 ชั่วโมง)
 * - ราศีเริ่ม: กำหนดจากวันเกิด + เวลาเกิด
 *
 * หมายเหตุ: สูตรนี้เป็นการประมาณสำหรับระบบเลข 7 ตัว 9 ฐาน
 * การคำนวณลัคนาแบบแม่นยำต้องใช้ ephemeris table
 */

export interface LagnaResult {
  /** ราศีลัคนา (1=เมษ ... 12=มีน) */
  lagnaSign: number
  /** ชื่อราศีภาษาไทย */
  lagnaName: string
  /** สัญลักษณ์ราศี */
  lagnaSymbol: string
  /** ดาวเจ้าราศี */
  lagnaRuler: string
  /** ลักษณะเด่น */
  nature: string
  /** ธาตุ */
  element: '🔥 ไฟ' | '🌍 ดิน' | '💨 ลม' | '💧 น้ำ'
  /** คุณสมบัติ */
  quality: 'จร' | 'คงที่' | 'สองแบบ'
  /** ความหมายลัคนา */
  meaning: string
}

const RASI_DATA: Record<number, Omit<LagnaResult, 'lagnaSign'>> = {
  1:  { lagnaName: 'เมษ',    lagnaSymbol: '♈', lagnaRuler: 'อังคาร', nature: 'กล้าหาญ เป็นผู้นำ หัวร้อน',          element: '🔥 ไฟ', quality: 'จร',      meaning: 'ลัคนาเมษ — บุคลิกแข็งแกร่ง กล้าตัดสินใจ เกิดมาเพื่อเป็นผู้นำและบุกเบิก' },
  2:  { lagnaName: 'พฤษภ',  lagnaSymbol: '♉', lagnaRuler: 'ศุกร์',  nature: 'มั่นคง อดทน รักความสวยงาม',         element: '🌍 ดิน', quality: 'คงที่',   meaning: 'ลัคนาพฤษภ — สร้างความมั่งคั่งได้ดี รักสุขสบาย ต้องการความมั่นคง' },
  3:  { lagnaName: 'เมถุน', lagnaSymbol: '♊', lagnaRuler: 'พุธ',    nature: 'ฉลาด สื่อสารเก่ง อยากรู้อยากเห็น',  element: '💨 ลม', quality: 'สองแบบ', meaning: 'ลัคนาเมถุน — สื่อสารเป็นเลิศ หลายบทบาท ชอบเรียนรู้สิ่งใหม่' },
  4:  { lagnaName: 'กรกฎ',  lagnaSymbol: '♋', lagnaRuler: 'จันทร์', nature: 'อ่อนไหว เมตตา รักครอบครัว',          element: '💧 น้ำ', quality: 'จร',      meaning: 'ลัคนากรกฎ — จิตใจอ่อนโยน รักบ้าน สัญชาตญาณสูง เป็นที่พึ่งของคนรอบข้าง' },
  5:  { lagnaName: 'สิงห์',  lagnaSymbol: '♌', lagnaRuler: 'อาทิตย์', nature: 'โอ่อ่า มั่นใจ ชอบเป็นจุดสนใจ',     element: '🔥 ไฟ', quality: 'คงที่',   meaning: 'ลัคนาสิงห์ — เกิดมาเพื่อส่องแสง บุคลิกภาพโดดเด่น เป็นผู้นำที่ได้รับการยอมรับ' },
  6:  { lagnaName: 'กันย์',  lagnaSymbol: '♍', lagnaRuler: 'พุธ',    nature: 'ละเอียด วิเคราะห์เก่ง รักความสมบูรณ์', element: '🌍 ดิน', quality: 'สองแบบ', meaning: 'ลัคนากันย์ — ช่างสังเกต วางระบบเก่ง มีประสิทธิภาพสูง รักการช่วยเหลือผู้อื่น' },
  7:  { lagnaName: 'ตุลย์',  lagnaSymbol: '♎', lagnaRuler: 'ศุกร์',  nature: 'รักความยุติธรรม ชอบความสมดุล เสน่ห์สูง', element: '💨 ลม', quality: 'จร',      meaning: 'ลัคนาตุลย์ — สร้างความสัมพันธ์เก่ง รักความสวยงาม ต้องการความกลมกลืน' },
  8:  { lagnaName: 'พิจิก',  lagnaSymbol: '♏', lagnaRuler: 'อังคาร', nature: 'ลึกลับ เข้มข้น ดื้อรั้น แต่ซื่อสัตย์', element: '💧 น้ำ', quality: 'คงที่',   meaning: 'ลัคนาพิจิก — ลึกซึ้ง เข้มแข็ง มีพลังการเปลี่ยนแปลงสูง' },
  9:  { lagnaName: 'ธนู',   lagnaSymbol: '♐', lagnaRuler: 'พฤหัส', nature: 'เสรีนิยม ปรัชญา โชคดี รักการเดินทาง',  element: '🔥 ไฟ', quality: 'สองแบบ', meaning: 'ลัคนาธนู — ปัญญาสูง มองภาพใหญ่ โชคดีตลอดชีวิต' },
  10: { lagnaName: 'มกร',   lagnaSymbol: '♑', lagnaRuler: 'เสาร์',  nature: 'มีระเบียบ มุ่งมั่น สร้างสิ่งยิ่งใหญ่',  element: '🌍 ดิน', quality: 'จร',      meaning: 'ลัคนามกร — ทะเยอทะยาน อดทน สร้างอาณาจักรได้จริง' },
  11: { lagnaName: 'กุมภ์',  lagnaSymbol: '♒', lagnaRuler: 'เสาร์',  nature: 'ก้าวหน้า คิดนอกกรอบ รักมนุษยชาติ',   element: '💨 ลม', quality: 'คงที่',   meaning: 'ลัคนากุมภ์ — วิสัยทัศน์กว้างไกล นักปฏิวัติ คิดล้ำกว่ายุค' },
  12: { lagnaName: 'มีน',   lagnaSymbol: '♓', lagnaRuler: 'พฤหัส', nature: 'อ่อนไหว ศิลปะ จิตวิญญาณ เมตตา',       element: '💧 น้ำ', quality: 'สองแบบ', meaning: 'ลัคนามีน — จิตวิญญาณสูง ศิลปะโดดเด่น สัญชาตญาณลึกซึ้ง' },
}

/**
 * คำนวณลัคนาจากวันเกิดและเวลาเกิด
 *
 * หลักการ (ระบบโหราศาสตร์ไทยเบื้องต้น):
 * - แต่ละราศีครองท้องฟ้าประมาณ 2 ชั่วโมง
 * - ราศีเริ่มต้นวนตามวันเกิด (dayOfYear → offset)
 *
 * @param birthDate  "YYYY-MM-DD"
 * @param birthTime  "HH:MM" (เวลาเกิด)
 */
export function calculateLagna(birthDate: string, birthTime: string = '12:00'): LagnaResult {
  const date = new Date(birthDate)
  const [hStr, mStr] = birthTime.split(':')
  const hours = parseInt(hStr ?? '12') + parseInt(mStr ?? '0') / 60

  // dayOfYear เป็น offset เริ่มต้น (ราศีเมษ = ปีเริ่มต้น ≈ 21 มีนาคม)
  const startOfYear = new Date(date.getFullYear(), 2, 21) // 21 มีนาคม
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000)

  // แต่ละราศีครอง ≈ 30.44 วัน (365.25 / 12)
  const signOffset = Math.floor(((dayOfYear % 365) / 365) * 12)

  // เวลาเกิด: ทุก 2 ชั่วโมง = 1 ราศีหมุน (approximation)
  const hourOffset = Math.floor(hours / 2)

  const lagnaSign = ((signOffset + hourOffset) % 12) + 1

  return {
    lagnaSign,
    ...RASI_DATA[lagnaSign]!,
  }
}
