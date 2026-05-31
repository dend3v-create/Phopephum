/**
 * ฐานข้อมูล ยามอัฏฐกาล (Atthakarn Yam Database)
 * อ้างอิง: ตำรายามอัฏฐกาล โดย "พลูหลวง" + ตารางสรุปอัฏฐกาลชั้นฉาย
 * เวอร์ชัน: 1.0.0
 */

// ============================================================
// 1. TYPE DEFINITIONS
// ============================================================

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
export type DayPeriod = 'day' | 'night'
export type YamNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type PlanetNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type SubYam = 'ton' | 'klang' | 'plai' // ต้น กลาง ปลาย
export type Quality = 'good' | 'bad' | 'neutral'

export interface TimeRange {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  label: string // "06:01-07:30"
}

export interface Planet {
  number: PlanetNumber
  nameDay: string        // ชื่อกลางวัน เช่น สุริชะ
  nameNight: string      // ชื่อกลางคืน เช่น ระวิ
  nameThai: string       // ชื่อไทย เช่น พระอาทิตย์
  nameEnum: string       // อาทิตย์ จันทร์ อังคาร พุธ พฤหัส ศุกร์ เสาร์
  color: string          // สีประจำดาว
  element: string        // ธาตุ
  description: string    // คำอธิบาย
}

export interface YamPrediction {
  day: DayOfWeek
  period: DayPeriod
  yamNumber: YamNumber
  planetNumber: PlanetNumber
  timeRange: TimeRange
  quality: Quality
  generalMeaning: string       // ความหมายทั่วไป
  travel: string               // การเดินทาง
  lostItems: string            // ของหาย
  sickness: string             // คนเจ็บไข้
  news: string                 // ข่าวที่ได้รับ
  subYamPredictions: {
    ton: { quality: Quality; meaning: string }
    klang: { quality: Quality; meaning: string }
    plai: { quality: Quality; meaning: string }
  }
  directionHint?: string       // ทิศ
  specialNote?: string         // หมายเหตุพิเศษ
}

export interface YamResult {
  datetime: Date
  day: DayOfWeek
  dayThai: string
  period: DayPeriod
  yamNumber: YamNumber
  subYam: SubYam
  planet: Planet
  timeRange: TimeRange
  quality: Quality
  prediction: YamPrediction
  isGoodTime: boolean
  summary: string
}

// ============================================================
// 2. PLANET DATA (ข้อมูลดาวพระเคราะห์)
// ============================================================

export const PLANETS: Record<PlanetNumber, Planet> = {
  1: {
    number: 1,
    nameDay: 'สุริชะ',
    nameNight: 'ระวิ',
    nameThai: 'พระอาทิตย์',
    nameEnum: 'อาทิตย์',
    color: '#FF6B35',
    element: 'ไฟ',
    description: 'ดาวแห่งอำนาจ เกียรติยศ และความสำเร็จ'
  },
  2: {
    number: 2,
    nameDay: 'จันเทา',
    nameNight: 'ศะศิ',
    nameThai: 'พระจันทร์',
    nameEnum: 'จันทร์',
    color: '#C0C0C0',
    element: 'น้ำ',
    description: 'ดาวแห่งอารมณ์ ความรู้สึก และความผันแปร'
  },
  3: {
    number: 3,
    nameDay: 'ภุมมะ',
    nameNight: 'ภุมโม',
    nameThai: 'พระอังคาร',
    nameEnum: 'อังคาร',
    color: '#DC143C',
    element: 'ไฟ',
    description: 'ดาวแห่งพลังงาน ความกล้า และความขัดแย้ง'
  },
  4: {
    number: 4,
    nameDay: 'พุธะ',
    nameNight: 'พุโธ',
    nameThai: 'พระพุธ',
    nameEnum: 'พุธ',
    color: '#228B22',
    element: 'ดิน',
    description: 'ดาวแห่งปัญญา การสื่อสาร และการค้าขาย'
  },
  5: {
    number: 5,
    nameDay: 'ครู',
    nameNight: 'ชีโว',
    nameThai: 'พระพฤหัสบดี',
    nameEnum: 'พฤหัส',
    color: '#FFD700',
    element: 'ลม',
    description: 'ดาวแห่งโชค การศึกษา และความเมตตา'
  },
  6: {
    number: 6,
    nameDay: 'ศุกระ',
    nameNight: 'ศุโกร',
    nameThai: 'พระศุกร์',
    nameEnum: 'ศุกร์',
    color: '#FF69B4',
    element: 'น้ำ',
    description: 'ดาวแห่งความรัก ความงาม และศิลปะ'
  },
  7: {
    number: 7,
    nameDay: 'เสารี',
    nameNight: 'โสโร',
    nameThai: 'พระเสาร์',
    nameEnum: 'เสาร์',
    color: '#4B0082',
    element: 'ดิน',
    description: 'ดาวแห่งความอดทน ชะตากรรม และการลงโทษ'
  }
}

// ============================================================
// 3. DAY NUMBER MAPPING (เลขประจำวัน)
// ============================================================

export const DAY_NUMBER: Record<DayOfWeek, PlanetNumber> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7
}

export const DAY_THAI: Record<DayOfWeek, string> = {
  sunday: 'วันอาทิตย์',
  monday: 'วันจันทร์',
  tuesday: 'วันอังคาร',
  wednesday: 'วันพุธ',
  thursday: 'วันพฤหัสบดี',
  friday: 'วันศุกร์',
  saturday: 'วันเสาร์'
}

// ============================================================
// 4. YAM TIME RANGES (ช่วงเวลาของแต่ละยาม)
// ============================================================

export const DAY_YAM_TIMES: Record<YamNumber, TimeRange> = {
  1: { startHour: 6,  startMinute: 1,  endHour: 7,  endMinute: 30,  label: '06:01-07:30' },
  2: { startHour: 7,  startMinute: 31, endHour: 9,  endMinute: 0,   label: '07:31-09:00' },
  3: { startHour: 9,  startMinute: 1,  endHour: 10, endMinute: 30,  label: '09:01-10:30' },
  4: { startHour: 10, startMinute: 31, endHour: 12, endMinute: 0,   label: '10:31-12:00' },
  5: { startHour: 12, startMinute: 1,  endHour: 13, endMinute: 30,  label: '12:01-13:30' },
  6: { startHour: 13, startMinute: 31, endHour: 15, endMinute: 0,   label: '13:31-15:00' },
  7: { startHour: 15, startMinute: 1,  endHour: 16, endMinute: 30,  label: '15:01-16:30' },
  8: { startHour: 16, startMinute: 31, endHour: 18, endMinute: 0,   label: '16:31-18:00' }
}

export const NIGHT_YAM_TIMES: Record<YamNumber, TimeRange> = {
  1: { startHour: 18, startMinute: 1,  endHour: 19, endMinute: 30,  label: '18:01-19:30' },
  2: { startHour: 19, startMinute: 31, endHour: 21, endMinute: 0,   label: '19:31-21:00' },
  3: { startHour: 21, startMinute: 1,  endHour: 22, endMinute: 30,  label: '21:01-22:30' },
  4: { startHour: 22, startMinute: 31, endHour: 24, endMinute: 0,   label: '22:31-24:00' },
  5: { startHour: 0,  startMinute: 1,  endHour: 1,  endMinute: 30,  label: '00:01-01:30' },
  6: { startHour: 1,  startMinute: 31, endHour: 3,  endMinute: 0,   label: '01:31-03:00' },
  7: { startHour: 3,  startMinute: 1,  endHour: 4,  endMinute: 30,  label: '03:01-04:30' },
  8: { startHour: 4,  startMinute: 31, endHour: 6,  endMinute: 0,   label: '04:31-06:00' }
}

// ============================================================
// 5. YAM SEQUENCE ALGORITHM (ลำดับดาวในแต่ละยาม)
// ============================================================

// ลำดับดาวกลางวัน: 1→6→4→2→7→5→3→1 (บวก 5, ถ้าเกิน 7 ลบ 7)
export const DAY_YAM_SEQUENCE: PlanetNumber[] = [1, 6, 4, 2, 7, 5, 3]

// ลำดับดาวกลางคืน: 1→5→2→6→3→7→4→1 (บวก 4, ถ้าเกิน 7 ลบ 7)
export const NIGHT_YAM_SEQUENCE: PlanetNumber[] = [1, 5, 2, 6, 3, 7, 4]

/**
 * คำนวณดาวประจำยาม
 * @param day - วันในสัปดาห์
 * @param period - กลางวัน/กลางคืน
 * @param yamNumber - ยามที่ 1-8
 */
export function getPlanetForYam(
  day: DayOfWeek,
  period: DayPeriod,
  yamNumber: YamNumber
): PlanetNumber {
  const dayNum = DAY_NUMBER[day]
  const sequence = period === 'day' ? DAY_YAM_SEQUENCE : NIGHT_YAM_SEQUENCE

  // หาตำแหน่งเริ่มต้นของวันในลำดับดาว
  const startIndex = sequence.indexOf(dayNum as PlanetNumber)

  // เดินลำดับไปตาม yamNumber (ยาม 1 = index เริ่มต้น)
  const targetIndex = (startIndex + yamNumber - 1) % 7
  return sequence[targetIndex] as PlanetNumber
}

// ============================================================
// 6. COMPLETE YAM PREDICTION DATABASE
// คำทำนายยามอัฏฐกาลครบทุกวัน ทุกยาม (อ้างอิงตำรา)
// ============================================================

export const YAM_PREDICTIONS: YamPrediction[] = [

  // ===== วันอาทิตย์ กลางวัน =====
  {
    day: 'sunday', period: 'day', yamNumber: 1, planetNumber: 1,
    timeRange: DAY_YAM_TIMES[1],
    quality: 'neutral',
    generalMeaning: 'ยามนี้ต้องระวังคนจร จะนำพาเรื่องเดือดร้อนมาให้',
    travel: 'ยามต้น: อันตราย มีเคราะห์ร้าย | ยามกลาง: ได้ลาภ | ยามปลาย: มีเคราะห์ร้าย เสื่อมเสียศักดิ์ศรี',
    lostItems: 'จะได้คืน ของอยู่ในที่สูง ใกล้กับสิ่งสีแดง หรือมีแสงสว่าง',
    sickness: 'อาการหนัก ถึงขั้นจะตาย',
    news: 'เชื่อถือได้ เป็นเรื่องจริง',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ระวังคนจร จะนำพาเรื่องเดือดร้อนมาให้' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ได้ลาภ ได้ข่าวดี ปลอดภัย' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — เคราะห์บรรเทา แต่ยังต้องระวัง' }
    },
    directionHint: 'ทิศตะวันออก',
    specialNote: 'สุริชะ — ดาวอาทิตย์ครองยาม'
  },
  {
    day: 'sunday', period: 'day', yamNumber: 2, planetNumber: 6,
    timeRange: DAY_YAM_TIMES[2],
    quality: 'bad',
    generalMeaning: 'ทำดีแต่ถูกนินทาว่าร้าย ทำอะไรโดนเอาเปรียบ มักจะมีคนมาพูดจาหลอกลวง เชื่อถือไม่ได้',
    travel: 'ยามต้น: ห้ามเดินทางไกล สูญเสียบุตรภรรยา | ยามกลาง: ได้ลาภแต่หมดไปหรือถูกขโมย | ยามปลาย: ได้ลาภมาก พบมิตรต่างเพศช่วยเหลือ',
    lostItems: 'ไม่ได้คืน อาจถูกเปลี่ยนเป็นเงิน หรือให้คนอื่นไปแล้ว',
    sickness: 'ไม่ตาย หายได้เร็ว ขึ้นอยู่กับกำลังใจ',
    news: 'เป็นเรื่องไม่จริง เชื่อถือไม่ได้',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ทำดีแต่ถูกนินทา โดนเอาเปรียบ' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ได้ลาภแต่ไม่มั่นคง มีคนคิดจะขโมย' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ได้ลาภมาก พบมิตรช่วยเหลือ' }
    }
  },
  {
    day: 'sunday', period: 'day', yamNumber: 3, planetNumber: 4,
    timeRange: DAY_YAM_TIMES[3],
    quality: 'neutral',
    generalMeaning: 'ความสำคัญผิดในข้อเท็จจริง จนทำให้เดือดร้อน ถ้าถามข่าวบอกว่ามีความหวัง',
    travel: 'ยามต้น: มีเคราะห์ร้าย ติดขัดไปหมด | ยามกลาง: ได้ลาภเงินทองมาก เจรจาบรรลุผล | ยามปลาย: ได้ลาภมาก เจรจากับผู้ใหญ่สมประสงค์',
    lostItems: 'จะได้คืน อยู่แถวเสื้อผ้า กองกระดาษ เครื่องมือสื่อสาร',
    sickness: 'จะตาย ถ้ารักษาด้วยยาสมุนไพรมีโอกาสรอดบ้าง',
    news: 'เป็นเรื่องจริง เชื่อถือได้',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — เคราะห์ร้าย ติดขัดทุกด้าน' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ได้ลาภ เจรจาสำเร็จ' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ได้ลาภมาก ผู้ใหญ่ช่วยเหลือ' }
    }
  },
  {
    day: 'sunday', period: 'day', yamNumber: 4, planetNumber: 2,
    timeRange: DAY_YAM_TIMES[4],
    quality: 'neutral',
    generalMeaning: 'ระวังคนอาศัยอยู่ทรยศหักหลัง ถ้าของหายทายว่าคนในบ้านเอาไป',
    travel: 'ยามต้น: ระวังอุบัติเหตุ | ยามกลาง: ได้ลาภ แต่ระวังเคราะห์คู่ | ยามปลาย: ห้ามเดินทางไกล จะมีเคราะห์เสียทรัพย์',
    lostItems: 'อาจได้คืนช้า หรือไม่ได้คืน อยู่ในน้ำ หรือที่ชื้นแฉะ',
    sickness: 'รักษานาน เป็นๆ หายๆ ไม่หายขาด',
    news: 'จริงครึ่งเท็จครึ่ง พูดกลับไปกลับมา',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ระวังคนในบ้านทรยศ' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ได้ลาภ แต่ระวังเคราะห์คู่' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — ห้ามเดินทาง จะเสียทรัพย์' }
    }
  },
  {
    day: 'sunday', period: 'day', yamNumber: 5, planetNumber: 7,
    timeRange: DAY_YAM_TIMES[5],
    quality: 'bad',
    generalMeaning: 'ของหายยังจับมือใครดีมิได้ จะเกิดทุ่มเถียง เรื่องอาฆาตมาดร้าย การยื้อแย่งทรัพย์สมบัติ',
    travel: 'ยามต้น: ห้ามเดินทางไกล พบศัตรู เดือดร้อน | ยามกลาง: เดินทางดีมาก ได้ลาภมาก | ยามปลาย: ได้ลาภเงินทอง ของกำนัล',
    lostItems: 'จะได้คืน ให้ค้นหาตามที่มืดๆ ใกล้ของสีดำ ท่อระบายน้ำ',
    sickness: 'จะตาย หรือต้องรักษานานมาก',
    news: 'เป็นเรื่องจริง เชื่อถือได้',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เสารีแรก ห้ามเดิน มีภัย' },
      klang: { quality: 'good', meaning: 'ยามกลาง — เดินทางดี ได้ลาภมาก' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ได้ลาภ ได้ของกำนัล' }
    }
  },
  {
    day: 'sunday', period: 'day', yamNumber: 6, planetNumber: 5,
    timeRange: DAY_YAM_TIMES[6],
    quality: 'neutral',
    generalMeaning: 'แม้จะรู้ตัวคนทำผิด ก็ยังตามของมิได้ ทายว่าจะรู้ตัวแต่ไม่ได้ของ ยามนี้เกี่ยวข้องกับการอาสานาย',
    travel: 'ยามต้น: ได้ลาภมากมาย มิตรนำลาภมาให้ | ยามกลาง: เสียผลประโยชน์ ติดขัด | ยามปลาย: เสียผลประโยชน์ เจอศัตรู',
    lostItems: 'ได้คืนหรือไม่ได้เท่ากัน อยู่ใกล้ตู้ยา ตำรา สิ่งศักดิ์สิทธิ์',
    sickness: 'เป็นๆ หายๆ ต้องใช้ยาประจำ',
    news: 'จริงเท่าเทียมกัน อย่าเพิ่งเชื่อ',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ได้ลาภ มิตรนำโชคมาให้' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — เสียผลประโยชน์ ติดขัด' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — เจอศัตรู เสียหาย' }
    }
  },
  {
    day: 'sunday', period: 'day', yamNumber: 7, planetNumber: 3,
    timeRange: DAY_YAM_TIMES[7],
    quality: 'good',
    generalMeaning: 'ทายว่าจะได้ของคืน การลงทุนที่ได้ผลกำไรเกินคาด การแปรรูปคดี',
    travel: 'ยามต้น: เกิดอุบัติเหตุมีเคราะห์ร้าย | ยามกลาง: เดินทางไกลอาจเกิดไฟไหม้ | ยามปลาย: ได้ลาภมาก พบมิตรคบกันได้นาน',
    lostItems: 'ไม่ได้คืน ใกล้เครื่องใช้ไฟฟ้า ศาสตราวุธ ของมีคม',
    sickness: 'จะหาย เป็นเร็วหายเร็ว',
    news: 'เป็นเรื่องเท็จ เชื่อถือไม่ได้',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย มีอุบัติเหตุ' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ระวังไฟไหม้ โจรปล้น' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ได้ลาภ พบมิตรดี' }
    }
  },
  {
    day: 'sunday', period: 'day', yamNumber: 8, planetNumber: 1,
    timeRange: DAY_YAM_TIMES[8],
    quality: 'good',
    generalMeaning: 'จะรอดตัวได้ ถ้ามีเรื่องยุ่งยากก็จะสงบลง เป็นความจะชนะ',
    travel: 'เดินทางดี มีชัยชนะ ปลอดภัย',
    lostItems: 'จะได้คืน',
    sickness: 'อาการหนัก แต่มีโอกาสรอด',
    news: 'เชื่อถือได้',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — สถานการณ์ยังไม่ชัดเจน' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด ชนะทุกอย่าง' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง ต้องระวัง' }
    }
  },

  // ===== วันอาทิตย์ กลางคืน =====
  {
    day: 'sunday', period: 'night', yamNumber: 1, planetNumber: 1,
    timeRange: NIGHT_YAM_TIMES[1],
    quality: 'good',
    generalMeaning: 'วางโครงการใดๆ จะสำเร็จดังคาดหมาย ยามนี้ดีที่สุด การลงทุน และการวางแผนจะสำเร็จ',
    travel: 'เดินทางได้ลาภ ส่วนของหายจะได้คืน',
    lostItems: 'จะได้คืน',
    sickness: 'อาการหนัก ถึงขั้นจะตาย แต่รักษาได้',
    news: 'เชื่อถือได้ เป็นเรื่องจริง มีเรื่องร้อนใจ',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — วางแผนดี จะสำเร็จ' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด โชคลาภ' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง ต้องระวัง' }
    },
    specialNote: 'ระวิ — ดาวอาทิตย์กลางคืน ยามดีที่สุดของวันอาทิตย์'
  },
  {
    day: 'sunday', period: 'night', yamNumber: 2, planetNumber: 5,
    timeRange: NIGHT_YAM_TIMES[2],
    quality: 'good',
    generalMeaning: 'ออกเดินทางดี คนที่จากไปจะกลับมา',
    travel: 'เดินทางดี ปลอดภัย ได้ลาภ',
    lostItems: 'ได้คืนหรือไม่ได้เท่ากัน',
    sickness: 'เป็นๆ หายๆ รักษาได้',
    news: 'จริงบ้างเท็จบ้าง',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — เดินทางดี คนจากไปกลับมา' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ปานกลาง ระมัดระวัง' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — ระวังศัตรูหมู่มาร' }
    }
  },
  {
    day: 'sunday', period: 'night', yamNumber: 3, planetNumber: 2,
    timeRange: NIGHT_YAM_TIMES[3],
    quality: 'neutral',
    generalMeaning: 'ดีรายกึ่งกัน พิจารณาตามสถานการณ์',
    travel: 'ระวังอุบัติเหตุ ไม่ควรเดินทางไกล',
    lostItems: 'ได้คืนช้า หรือได้ครึ่งเสียครึ่ง',
    sickness: 'รักษานาน เป็นตายเท่ากัน',
    news: 'จริงครึ่งเท็จครึ่ง',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ก้ำกึ่ง ดูสถานการณ์' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีกว่าตอนอื่น' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — ระวังเรื่องร้าย' }
    }
  },
  {
    day: 'sunday', period: 'night', yamNumber: 4, planetNumber: 6,
    timeRange: NIGHT_YAM_TIMES[4],
    quality: 'bad',
    generalMeaning: 'ผู้พลัดพรากไปไม่ได้ข่าว ของหายไม่ได้เค้า',
    travel: 'ไม่ควรเดินทาง อาจเกิดเรื่องร้าย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'ไม่ตาย แต่รักษานาน',
    news: 'เท็จ ไม่น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เรื่องร้ายมาเยือน' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังคงร้าย' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดีขึ้นบ้าง ได้ลาภ' }
    }
  },
  {
    day: 'sunday', period: 'night', yamNumber: 5, planetNumber: 3,
    timeRange: NIGHT_YAM_TIMES[5],
    quality: 'good',
    generalMeaning: 'เดินทางดี สำเร็จ ผู้จากไปจะกลับมา',
    travel: 'เดินทางได้ดี สำเร็จประสงค์',
    lostItems: 'จะได้คืน',
    sickness: 'จะหาย',
    news: 'จะได้ข่าวดี',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ระวังเคราะห์' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังมีอุปสรรค' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดีที่สุด สำเร็จ' }
    }
  },
  {
    day: 'sunday', period: 'night', yamNumber: 6, planetNumber: 7,
    timeRange: NIGHT_YAM_TIMES[6],
    quality: 'good',
    generalMeaning: 'จะได้ลาภข้าวของอนันต์ ไปรบจะชนะ ของหายจะได้คืน การงานจะสำเร็จ',
    travel: 'เดินทางดีมาก ได้ลาภ',
    lostItems: 'จะได้คืน',
    sickness: 'จะตาย หรือรักษานานมาก',
    news: 'จริง เชื่อถือได้',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ก้ำกึ่ง' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีมาก ได้ลาภ' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ชนะ สำเร็จ' }
    }
  },
  {
    day: 'sunday', period: 'night', yamNumber: 7, planetNumber: 4,
    timeRange: NIGHT_YAM_TIMES[7],
    quality: 'bad',
    generalMeaning: 'เป็นความจะแพ้ ของหายไม่ได้คืน ลาภไม่มี',
    travel: 'อย่าเดินทาง จะมีอันตรายภายหน้า',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะตาย',
    news: 'ไม่ดี มีทุกข์',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย แพ้ความ' },
      klang: { quality: 'good', meaning: 'ยามกลาง — จะสำเร็จ ได้คู่' },
      plai:  { quality: 'bad',  meaning: 'ยามปลาย — ร้าย ต้นดีปลายร้าย' }
    }
  },
  {
    day: 'sunday', period: 'night', yamNumber: 8, planetNumber: 1,
    timeRange: NIGHT_YAM_TIMES[8],
    quality: 'bad',
    generalMeaning: 'ผิดหวัง ไม่มีลาภ ทำอะไรยังไม่สำเร็จ',
    travel: 'ไม่ควรเดินทาง',
    lostItems: 'ไม่ได้คืน',
    sickness: 'หนัก ต้องระวัง',
    news: 'ไม่ดี ผิดหวัง',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ผิดหวัง ไม่สำเร็จ' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — พอได้ ยังมีหวัง' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — ร้าย ระวัง' }
    }
  },

  // ===== วันจันทร์ กลางวัน =====
  {
    day: 'monday', period: 'day', yamNumber: 1, planetNumber: 2,
    timeRange: DAY_YAM_TIMES[1],
    quality: 'neutral',
    generalMeaning: 'ของที่ได้มาไม่ดี ได้ครึ่งเสียครึ่ง',
    travel: 'ระวังอุบัติเหตุ ไม่ควรเดินทางไกล',
    lostItems: 'ได้คืนช้า หรือได้ครึ่งเสียครึ่ง',
    sickness: 'รักษานาน เป็นตายเท่ากัน',
    news: 'จริงครึ่งเท็จครึ่ง',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ได้ครึ่งเสียครึ่ง ไม่ดี' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — พอได้ ก้ำกึ่ง' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ระวัง ยังมีหวัง' }
    }
  },
  {
    day: 'monday', period: 'day', yamNumber: 2, planetNumber: 7,
    timeRange: DAY_YAM_TIMES[2],
    quality: 'bad',
    generalMeaning: 'เป็นยามร้าย ระวังการพูดจาจะนำพาความเดือดร้อน',
    travel: 'ห้ามเดินทาง จะพบเคราะห์ร้าย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะตาย หรือรักษานานมาก',
    news: 'ข่าวร้าย ไม่น่าไว้วางใจ',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ร้ายมาก ห้ามทำการ' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — ยังคงร้าย' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — บรรเทาลงบ้าง' }
    }
  },
  {
    day: 'monday', period: 'day', yamNumber: 3, planetNumber: 5,
    timeRange: DAY_YAM_TIMES[3],
    quality: 'good',
    generalMeaning: 'จะได้ผู้อุปถัมภ์ มีลาภ จะมีลาภลอย',
    travel: 'เดินทางดี ได้รับการช่วยเหลือ',
    lostItems: 'ได้คืน ผู้ใหญ่ช่วยเหลือ',
    sickness: 'รักษาหาย ผู้ใหญ่ดูแล',
    news: 'ข่าวดี จะได้รับการช่วยเหลือ',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ดี ได้ผู้อุปถัมภ์' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — ระวัง ไฟไหม้หาง' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'monday', period: 'day', yamNumber: 4, planetNumber: 3,
    timeRange: DAY_YAM_TIMES[4],
    quality: 'bad',
    generalMeaning: 'จะถูกลงโทษ เป็นความแพ้ บริวารให้โทษ',
    travel: 'ไม่ควรเดินทาง มีอุปสรรค',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะหาย เป็นเร็วหายเร็ว',
    news: 'ข่าวเท็จ เชื่อไม่ได้',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ถูกลงโทษ แพ้ความ' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — บริวารให้โทษ' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดีขึ้น สำเร็จ' }
    }
  },
  {
    day: 'monday', period: 'day', yamNumber: 5, planetNumber: 1,
    timeRange: DAY_YAM_TIMES[5],
    quality: 'bad',
    generalMeaning: 'จะมีผู้คิดปองร้าย มีผู้วางแผนการเร้นลับให้ร้าย ห้ามเดินทาง',
    travel: 'ห้ามเดินทาง จะเกิดอันตราย',
    lostItems: 'จะได้คืน แต่ยังมีอุปสรรค',
    sickness: 'หนัก ต้องระวัง',
    news: 'ข่าวร้าย มีคนคิดทำร้าย',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ห้ามเดินทาง มีคนคิดร้าย' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดีที่สุด ปลอดภัย' },
      plai:  { quality: 'bad',  meaning: 'ยามปลาย — ระวัง ยังมีภัย' }
    }
  },
  {
    day: 'monday', period: 'day', yamNumber: 6, planetNumber: 6,
    timeRange: DAY_YAM_TIMES[6],
    quality: 'good',
    generalMeaning: 'ดี จะมีผู้ช่วยชีวิตไว้ อย่าได้คิดไปช่วยธุระคนอื่น ตัวเองจะลำบาก',
    travel: 'เดินทางปลอดภัย มีผู้ช่วย',
    lostItems: 'ไม่ได้คืน ระวังถูกเปลี่ยน',
    sickness: 'ไม่ตาย รักษาได้',
    news: 'ข่าวเท็จ อย่าเพิ่งเชื่อ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ระวังศัตรู' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ได้ลาภแต่ระวัง' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี มีผู้ช่วย' }
    }
  },
  {
    day: 'monday', period: 'day', yamNumber: 7, planetNumber: 4,
    timeRange: DAY_YAM_TIMES[7],
    quality: 'bad',
    generalMeaning: 'ห้ามจากที่อยู่ จะลำบาก จะสูญเสียข้าวของ จากของรัก',
    travel: 'ห้ามเดินทาง จะสูญเสีย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะตาย',
    news: 'ไม่ดี มีทุกข์ อุปสรรค',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ร้าย ห้ามทำการ' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดี ได้คู่ สำราญ' },
      plai:  { quality: 'bad',  meaning: 'ยามปลาย — ร้าย สูญเสีย' }
    }
  },
  {
    day: 'monday', period: 'day', yamNumber: 8, planetNumber: 2,
    timeRange: DAY_YAM_TIMES[8],
    quality: 'good',
    generalMeaning: 'จะมีลาภลอย ได้ลาภอันไม่คาดฝน มีผู้อุปการะ',
    travel: 'เดินทางดี ได้ลาภไม่คาดฝน',
    lostItems: 'จะได้คืน',
    sickness: 'รักษาได้ มีผู้ดูแล',
    news: 'ข่าวดี มีลาภมาไม่คาดฝน',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ได้ครึ่งเสียครึ่ง' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด ลาภลอย' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — มีผู้อุปการะ' }
    }
  },

  // ===== วันจันทร์ กลางคืน =====
  {
    day: 'monday', period: 'night', yamNumber: 1, planetNumber: 2,
    timeRange: NIGHT_YAM_TIMES[1],
    quality: 'good',
    generalMeaning: 'ยามดี ปลอดโปร่ง',
    travel: 'เดินทางปลอดภัย',
    lostItems: 'จะได้คืน',
    sickness: 'รักษาได้',
    news: 'ข่าวดี',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ระวัง' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ปลอดโปร่ง' }
    }
  },
  {
    day: 'monday', period: 'night', yamNumber: 2, planetNumber: 6,
    timeRange: NIGHT_YAM_TIMES[2],
    quality: 'good',
    generalMeaning: 'ทำการใดจะสำเร็จ',
    travel: 'เดินทางดี สำเร็จ',
    lostItems: 'จะได้คืน',
    sickness: 'หาย',
    news: 'ดี สำเร็จ',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ทำการสำเร็จ' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดี' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'monday', period: 'night', yamNumber: 3, planetNumber: 3,
    timeRange: NIGHT_YAM_TIMES[3],
    quality: 'bad',
    generalMeaning: 'มีเหตุขัดของ',
    travel: 'ระวังอุปสรรค',
    lostItems: 'ไม่ได้คืน',
    sickness: 'หาย',
    news: 'มีเหตุขัดข้อง',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — มีเหตุขัดของ' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — ยังมีอุปสรรค' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ดีขึ้นบ้าง' }
    }
  },
  {
    day: 'monday', period: 'night', yamNumber: 4, planetNumber: 7,
    timeRange: NIGHT_YAM_TIMES[4],
    quality: 'neutral',
    generalMeaning: 'จะมีผู้คิดปองร้าย แต่ทำอะไรไม่ได้ ดีรายกึ่งกัน',
    travel: 'ระวัง แต่ยังพอผ่านได้',
    lostItems: 'ได้คืนช้า',
    sickness: 'เป็นตายเท่ากัน',
    news: 'ดีรายกึ่งกัน',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ระวังคนคิดร้าย' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ก้ำกึ่ง' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ดีขึ้น ปลอดภัย' }
    }
  },
  {
    day: 'monday', period: 'night', yamNumber: 5, planetNumber: 4,
    timeRange: NIGHT_YAM_TIMES[5],
    quality: 'bad',
    generalMeaning: 'จะถูกลงโทษ เป็นความจะแพ้ ยามร้ายมาก',
    travel: 'ห้ามเดินทาง',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะตาย',
    news: 'ร้าย ไม่ดี',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ถูกลงโทษ แพ้ความ' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ผีคะนอง อย่าทำการ' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ต้นร้ายปลายดี' }
    }
  },
  {
    day: 'monday', period: 'night', yamNumber: 6, planetNumber: 1,
    timeRange: NIGHT_YAM_TIMES[6],
    quality: 'good',
    generalMeaning: 'ดี มีอำนาจ',
    travel: 'เดินทางดี มีอำนาจ',
    lostItems: 'จะได้คืน',
    sickness: 'รักษาได้',
    news: 'ดี มีอำนาจ',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ดี มีอำนาจ' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'monday', period: 'night', yamNumber: 7, planetNumber: 5,
    timeRange: NIGHT_YAM_TIMES[7],
    quality: 'good',
    generalMeaning: 'จะสำเร็จผลทุกประการ',
    travel: 'เดินทางดี สำเร็จ',
    lostItems: 'จะได้คืน',
    sickness: 'หาย',
    news: 'สำเร็จ ดี',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — สำเร็จ' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'monday', period: 'night', yamNumber: 8, planetNumber: 2,
    timeRange: NIGHT_YAM_TIMES[8],
    quality: 'good',
    generalMeaning: 'ดีมาก',
    travel: 'เดินทางดีมาก',
    lostItems: 'จะได้คืน',
    sickness: 'หาย',
    news: 'ดีมาก',
    subYamPredictions: {
      ton:   { quality: 'good', meaning: 'ยามต้น — ดีมาก' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี' }
    }
  },

  // ===== วันอังคาร กลางวัน =====
  {
    day: 'tuesday', period: 'day', yamNumber: 1, planetNumber: 3,
    timeRange: DAY_YAM_TIMES[1],
    quality: 'neutral',
    generalMeaning: 'ดีราย กึ่งกัน',
    travel: 'ระวังอุบัติเหตุ ก้ำกึ่ง',
    lostItems: 'ไม่แน่ใจ',
    sickness: 'จะหาย เป็นเร็วหายเร็ว',
    news: 'ข่าวเท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — เคราะห์ร้าย มีอุบัติเหตุ' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — ระวังไฟไหม้ โจรปล้น' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ได้ลาภ พบมิตรดี' }
    }
  },
  {
    day: 'tuesday', period: 'day', yamNumber: 2, planetNumber: 1,
    timeRange: DAY_YAM_TIMES[2],
    quality: 'good',
    generalMeaning: 'จะชนะ มีผู้ยกย่อง',
    travel: 'เดินทางดี ชนะ มีผู้ยกย่อง',
    lostItems: 'จะได้คืน',
    sickness: 'หนัก แต่รักษาได้',
    news: 'จริง น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ระวังคนจร' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด ชนะ' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'tuesday', period: 'day', yamNumber: 3, planetNumber: 6,
    timeRange: DAY_YAM_TIMES[3],
    quality: 'bad',
    generalMeaning: 'จะมีผู้ปองร้าย ข่าวที่ได้รับเป็นข่าวเท็จ การหลบซ่อนตัวปลอดภัย',
    travel: 'ห้ามเดินทาง มีผู้ปองร้าย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'ไม่ตาย',
    news: 'เท็จ ไม่น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ห้ามเดินทาง สูญเสีย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ได้ลาภแต่ไม่มั่นคง' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ได้ลาภ พบมิตร' }
    }
  },
  {
    day: 'tuesday', period: 'day', yamNumber: 4, planetNumber: 4,
    timeRange: DAY_YAM_TIMES[4],
    quality: 'good',
    generalMeaning: 'ดีทางการหลบซ่อนตัวจะปลอดภัย',
    travel: 'หลบซ่อนตัวปลอดภัย',
    lostItems: 'จะได้คืน',
    sickness: 'จะตาย',
    news: 'จริง น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดี ได้ลาภ' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ได้ลาภ' }
    }
  },
  {
    day: 'tuesday', period: 'day', yamNumber: 5, planetNumber: 2,
    timeRange: DAY_YAM_TIMES[5],
    quality: 'bad',
    generalMeaning: 'ระวังคนจะคิดร้าย ในปลายมือ',
    travel: 'ระวัง มีคนคิดร้าย',
    lostItems: 'ได้คืนช้า',
    sickness: 'รักษานาน',
    news: 'จริงครึ่งเท็จครึ่ง',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ระวังคนคิดร้าย' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ก้ำกึ่ง' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — ยังมีภัย' }
    }
  },
  {
    day: 'tuesday', period: 'day', yamNumber: 6, planetNumber: 7,
    timeRange: DAY_YAM_TIMES[6],
    quality: 'bad',
    generalMeaning: 'ยามร้าย ร้อนใจ จะแพ้คนพาล',
    travel: 'ห้ามเดินทาง มีภัย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะตาย หรือรักษานาน',
    news: 'ร้าย น่ากลัว',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ร้ายมาก มีภัย' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — พอได้ ยังมีหวัง' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ได้ลาภเงินทอง' }
    }
  },
  {
    day: 'tuesday', period: 'day', yamNumber: 7, planetNumber: 5,
    timeRange: DAY_YAM_TIMES[7],
    quality: 'bad',
    generalMeaning: 'ยามร้าย อย่าทำการใดๆ จะล้มเหลว เจ็บไข้จะตาย บริวารทรยศ',
    travel: 'ห้ามเดินทาง ล้มเหลว',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะตาย',
    news: 'ร้าย',
    subYamPredictions: {
      ton:   { quality: 'good', meaning: 'ยามต้น — ดี ได้ลาภ' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ร้ายมาก ไฟไหม้หาง' },
      plai:  { quality: 'bad',  meaning: 'ยามปลาย — ร้าย เข้าเมืองโจร' }
    }
  },
  {
    day: 'tuesday', period: 'day', yamNumber: 8, planetNumber: 3,
    timeRange: DAY_YAM_TIMES[8],
    quality: 'good',
    generalMeaning: 'จะได้เป็นใหญ่ ชนะศัตรู',
    travel: 'เดินทางดี ชนะศัตรู',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะหาย',
    news: 'ข่าวดี ชนะ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังมีอุปสรรค' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — คิดการสำเร็จ' }
    }
  },

  // ===== วันอังคาร กลางคืน =====
  {
    day: 'tuesday', period: 'night', yamNumber: 1, planetNumber: 3,
    timeRange: NIGHT_YAM_TIMES[1],
    quality: 'good',
    generalMeaning: 'ดีแท้ สำเร็จผล',
    travel: 'เดินทางดี สำเร็จ',
    lostItems: 'จะได้คืน',
    sickness: 'หาย',
    news: 'ดี สำเร็จ',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ดี สำเร็จ' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'tuesday', period: 'night', yamNumber: 2, planetNumber: 7,
    timeRange: NIGHT_YAM_TIMES[2],
    quality: 'good',
    generalMeaning: 'จะชนะพนัน',
    travel: 'เดินทางดี ชนะ',
    lostItems: 'จะได้คืน',
    sickness: 'รักษานาน',
    news: 'จริง น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ร้ายมาก มีภัย' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — พอได้' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ได้ลาภ' }
    }
  },
  {
    day: 'tuesday', period: 'night', yamNumber: 3, planetNumber: 4,
    timeRange: NIGHT_YAM_TIMES[3],
    quality: 'good',
    generalMeaning: 'ยามดี',
    travel: 'เดินทางดี',
    lostItems: 'จะได้คืน',
    sickness: 'รักษาได้',
    news: 'ดี น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ร้าย ติดขัด' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดี ได้คู่ สำราญ' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — สำเร็จ ได้คู่' }
    }
  },
  {
    day: 'tuesday', period: 'night', yamNumber: 4, planetNumber: 1,
    timeRange: NIGHT_YAM_TIMES[4],
    quality: 'bad',
    generalMeaning: 'จะมีผู้ลอบปองร้าย ไม่ดี',
    travel: 'ห้ามเดินทาง มีผู้ลอบทำร้าย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'หนัก',
    news: 'ร้าย มีผู้ลอบทำร้าย',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — มีผู้ลอบทำร้าย' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ก้ำกึ่ง' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — ยังมีภัย' }
    }
  },
  {
    day: 'tuesday', period: 'night', yamNumber: 5, planetNumber: 5,
    timeRange: NIGHT_YAM_TIMES[5],
    quality: 'good',
    generalMeaning: 'เป็นยามดี จะมีผู้ช่วยเหลือ',
    travel: 'เดินทางดี มีผู้ช่วย',
    lostItems: 'จะได้คืน',
    sickness: 'รักษาได้',
    news: 'ดี มีผู้ช่วยเหลือ',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — มีผู้ช่วยเหลือ' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'tuesday', period: 'night', yamNumber: 6, planetNumber: 2,
    timeRange: NIGHT_YAM_TIMES[6],
    quality: 'good',
    generalMeaning: 'จะหนีรอดศัตรู เป็นความจะชนะ ต่อสู้จะชนะ',
    travel: 'เดินทางดี หนีรอดศัตรู ชนะ',
    lostItems: 'จะได้คืน',
    sickness: 'รักษาได้',
    news: 'ดี ชนะ',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ชนะ หนีรอดศัตรู' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'tuesday', period: 'night', yamNumber: 7, planetNumber: 6,
    timeRange: NIGHT_YAM_TIMES[7],
    quality: 'bad',
    generalMeaning: 'ของหายไม่ได้คืน ห้ามจร มีภัย',
    travel: 'ห้ามเดินทาง มีภัย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'ไม่ตาย',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ห้ามจร มีภัย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังมีภัย' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดีขึ้น ได้คืนเคหา' }
    }
  },
  {
    day: 'tuesday', period: 'night', yamNumber: 8, planetNumber: 3,
    timeRange: NIGHT_YAM_TIMES[8],
    quality: 'good',
    generalMeaning: 'คิดการใดๆ จะสำเร็จ',
    travel: 'เดินทางดี สำเร็จ',
    lostItems: 'จะได้คืน',
    sickness: 'หาย',
    news: 'ดี สำเร็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังมีอุปสรรค' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — คิดการสำเร็จ' }
    }
  },

  // ===== วันพุธ กลางวัน =====
  {
    day: 'wednesday', period: 'day', yamNumber: 1, planetNumber: 4,
    timeRange: DAY_YAM_TIMES[1],
    quality: 'good',
    generalMeaning: 'ดีทุกอย่าง',
    travel: 'เดินทางดี ปลอดภัย',
    lostItems: 'จะได้คืน',
    sickness: 'จะตาย แต่รักษาด้วยสมุนไพรมีหวัง',
    news: 'จริง น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ร้าย ติดขัด' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดีที่สุด ได้ลาภ' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ได้ลาภ' }
    }
  },
  {
    day: 'wednesday', period: 'day', yamNumber: 2, planetNumber: 2,
    timeRange: DAY_YAM_TIMES[2],
    quality: 'good',
    generalMeaning: 'ดี มีบริวารดี ไม่มีอันตราย',
    travel: 'เดินทางดี ปลอดภัย',
    lostItems: 'จะได้คืน',
    sickness: 'รักษาได้',
    news: 'ดี น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ระวัง ก้ำกึ่ง' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดี ได้ลาภ' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ดี ปลอดภัย' }
    }
  },
  {
    day: 'wednesday', period: 'day', yamNumber: 3, planetNumber: 7,
    timeRange: DAY_YAM_TIMES[3],
    quality: 'bad',
    generalMeaning: 'เป็นยามร้าย มีผู้ปองร้าย',
    travel: 'ห้ามเดินทาง มีภัย',
    lostItems: 'จะได้คืน ค้นหาในที่มืด',
    sickness: 'จะตาย หรือรักษานานมาก',
    news: 'จริง แต่เป็นข่าวร้าย',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ร้ายมาก มีภัย' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ต้นร้ายปลายดี' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ได้ลาภ' }
    }
  },
  {
    day: 'wednesday', period: 'day', yamNumber: 4, planetNumber: 5,
    timeRange: DAY_YAM_TIMES[4],
    quality: 'bad',
    generalMeaning: 'ถามไข้จะตาย ยามร้ายมาก',
    travel: 'ห้ามเดินทาง จะเสียทรัพย์',
    lostItems: 'ได้คืนหรือไม่เท่ากัน',
    sickness: 'จะตาย ยามร้ายมาก',
    news: 'จริงบ้างเท็จบ้าง',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ดี ได้ลาภ' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — ร้าย เสียผลประโยชน์' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — ร้าย เจอศัตรู' }
    }
  },
  {
    day: 'wednesday', period: 'day', yamNumber: 5, planetNumber: 3,
    timeRange: DAY_YAM_TIMES[5],
    quality: 'good',
    generalMeaning: 'ยามดี จะได้ลาภ',
    travel: 'เดินทางดี ได้ลาภ',
    lostItems: 'ไม่ได้คืน ใกล้เครื่องมือ ของมีคม',
    sickness: 'จะหาย',
    news: 'เท็จ ไม่น่าเชื่อ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังมีอุปสรรค' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ได้ลาภ' }
    }
  },
  {
    day: 'wednesday', period: 'day', yamNumber: 6, planetNumber: 1,
    timeRange: DAY_YAM_TIMES[6],
    quality: 'bad',
    generalMeaning: 'ไม่ดี',
    travel: 'ไม่ดี ระวัง',
    lostItems: 'จะได้คืน แต่ยาก',
    sickness: 'หนัก',
    news: 'ไม่น่าไว้วางใจ',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ระวังคนจร' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — ยามตาย' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'wednesday', period: 'day', yamNumber: 7, planetNumber: 6,
    timeRange: DAY_YAM_TIMES[7],
    quality: 'good',
    generalMeaning: 'เดินทางจะมีลาภ การงานสำเร็จ',
    travel: 'เดินทางดี ได้ลาภ งานสำเร็จ',
    lostItems: 'ไม่ได้คืน ระวังถูกเปลี่ยน',
    sickness: 'ไม่ตาย รักษาได้',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ห้ามเดิน สูญเสีย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ได้แต่ไม่มั่นคง' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ได้ลาภ' }
    }
  },
  {
    day: 'wednesday', period: 'day', yamNumber: 8, planetNumber: 4,
    timeRange: DAY_YAM_TIMES[8],
    quality: 'bad',
    generalMeaning: 'เป็นยามตาย ต้องห้าม',
    travel: 'ห้ามเดินทาง ยามตาย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะตาย',
    news: 'ร้าย',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ยามตาย ห้ามทำการ' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังคงร้าย' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — สำเร็จ ได้คู่' }
    }
  },

  // ===== วันพฤหัสบดี กลางวัน =====
  {
    day: 'thursday', period: 'day', yamNumber: 1, planetNumber: 5,
    timeRange: DAY_YAM_TIMES[1],
    quality: 'good',
    generalMeaning: 'ดี เป็นยามของบัณฑิต',
    travel: 'เดินทางดี ได้ลาภ',
    lostItems: 'จะได้คืน ผู้ใหญ่ช่วย',
    sickness: 'เป็นๆ หายๆ',
    news: 'จริง ดี',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ดีมาก เป็นยามบัณฑิต' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — ร้าย ไฟไหม้หาง' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — เข้าเมืองโจร ระวัง' }
    }
  },
  {
    day: 'thursday', period: 'day', yamNumber: 2, planetNumber: 3,
    timeRange: DAY_YAM_TIMES[2],
    quality: 'good',
    generalMeaning: 'จะมีลาภ ได้ยศศักดิ์',
    travel: 'เดินทางดี ได้ยศ',
    lostItems: 'ไม่ได้คืน',
    sickness: 'หาย เร็ว',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังมีอุปสรรค' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ได้ลาภ' }
    }
  },
  {
    day: 'thursday', period: 'day', yamNumber: 3, planetNumber: 1,
    timeRange: DAY_YAM_TIMES[3],
    quality: 'good',
    generalMeaning: 'ดี มีลาภ',
    travel: 'เดินทางดี ได้ลาภ',
    lostItems: 'จะได้คืน',
    sickness: 'หนัก',
    news: 'จริง น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ระวังคนจร' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด ได้ลาภ' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'thursday', period: 'day', yamNumber: 4, planetNumber: 6,
    timeRange: DAY_YAM_TIMES[4],
    quality: 'bad',
    generalMeaning: 'เป็นยามร้าย ของหายไม่ได้ข่าว',
    travel: 'ห้ามเดินทาง',
    lostItems: 'ไม่ได้คืน',
    sickness: 'ไม่ตาย รักษาได้',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ห้ามเดิน สูญเสีย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ได้ลาภแต่ไม่มั่นคง' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดีมาก ได้ลาภ' }
    }
  },
  {
    day: 'thursday', period: 'day', yamNumber: 5, planetNumber: 4,
    timeRange: DAY_YAM_TIMES[5],
    quality: 'neutral',
    generalMeaning: 'ของหายจะตามพบ ได้ข่าวแต่ยังไม่ได้คืน',
    travel: 'ระวัง มีอุปสรรค',
    lostItems: 'ตามพบแต่ยังไม่ได้คืน',
    sickness: 'จะตาย',
    news: 'จริง น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ร้าย ติดขัด' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดี ได้คู่ สำราญ' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ประสบความสำเร็จ' }
    }
  },
  {
    day: 'thursday', period: 'day', yamNumber: 6, planetNumber: 2,
    timeRange: DAY_YAM_TIMES[6],
    quality: 'neutral',
    generalMeaning: 'ยามปานกลาง จะพลัดพราก',
    travel: 'ระวัง อาจพลัดพราก',
    lostItems: 'ได้คืนช้า',
    sickness: 'รักษานาน',
    news: 'จริงครึ่งเท็จครึ่ง',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ระวัง พลัดพราก' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ก้ำกึ่ง' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'thursday', period: 'day', yamNumber: 7, planetNumber: 7,
    timeRange: DAY_YAM_TIMES[7],
    quality: 'good',
    generalMeaning: 'เป็นความชนะ งานสำเร็จ ออกรบชนะ',
    travel: 'เดินทางดี ชนะ',
    lostItems: 'จะได้คืน',
    sickness: 'จะตาย หรือรักษานาน',
    news: 'จริง ดี',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ร้ายมาก ห้ามเดิน' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดีขึ้น ต้นร้ายปลายดี' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ได้ลาภ' }
    }
  },
  {
    day: 'thursday', period: 'day', yamNumber: 8, planetNumber: 5,
    timeRange: DAY_YAM_TIMES[8],
    quality: 'good',
    generalMeaning: 'ดีมาก',
    travel: 'เดินทางดีมาก',
    lostItems: 'จะได้คืน',
    sickness: 'รักษาได้',
    news: 'ดีมาก',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ดีมาก' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },

  // ===== วันศุกร์ กลางวัน =====
  {
    day: 'friday', period: 'day', yamNumber: 1, planetNumber: 6,
    timeRange: DAY_YAM_TIMES[1],
    quality: 'good',
    generalMeaning: 'ดีมาก',
    travel: 'เดินทางดีมาก',
    lostItems: 'ไม่ได้คืน',
    sickness: 'ไม่ตาย รักษาได้',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ห้ามเดิน สูญเสีย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ได้ลาภแต่ถูกขโมย' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ได้ลาภ พบมิตร' }
    }
  },
  {
    day: 'friday', period: 'day', yamNumber: 2, planetNumber: 4,
    timeRange: DAY_YAM_TIMES[2],
    quality: 'good',
    generalMeaning: 'ดี สำเร็จผล',
    travel: 'เดินทางดี สำเร็จ',
    lostItems: 'จะได้คืน',
    sickness: 'จะตาย',
    news: 'จริง น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ร้าย ติดขัด' },
      klang: { quality: 'good', meaning: 'ยามกลาง — ดี ได้ลาภ' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี สำเร็จ' }
    }
  },
  {
    day: 'friday', period: 'day', yamNumber: 3, planetNumber: 2,
    timeRange: DAY_YAM_TIMES[3],
    quality: 'bad',
    generalMeaning: 'ไม่ดี มีทุกข์',
    travel: 'ระวัง ไม่ควรเดินทาง',
    lostItems: 'ได้คืนช้า',
    sickness: 'รักษานาน',
    news: 'จริงครึ่งเท็จครึ่ง',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ไม่ดี มีทุกข์' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ก้ำกึ่ง' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — ยังมีทุกข์' }
    }
  },
  {
    day: 'friday', period: 'day', yamNumber: 4, planetNumber: 7,
    timeRange: DAY_YAM_TIMES[4],
    quality: 'bad',
    generalMeaning: 'ของหายยังไม่ได้คืน ยังทุกข์',
    travel: 'ห้ามเดินทาง',
    lostItems: 'ยังไม่ได้คืน',
    sickness: 'จะตาย หรือรักษานาน',
    news: 'จริง แต่เป็นข่าวร้าย',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ห้ามเดิน มีภัย' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ต้นร้ายปลายดี' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ดีขึ้น ได้ลาภ' }
    }
  },
  {
    day: 'friday', period: 'day', yamNumber: 5, planetNumber: 5,
    timeRange: DAY_YAM_TIMES[5],
    quality: 'neutral',
    generalMeaning: 'จะได้ข่าว แต่กว่าจะได้มาลำบาก',
    travel: 'เดินทางได้ แต่ลำบาก',
    lostItems: 'ได้คืนหรือไม่เท่ากัน',
    sickness: 'เป็นๆ หายๆ',
    news: 'จริงบ้างเท็จบ้าง',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ดี ได้ลาภ' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — เสียผลประโยชน์' },
      plai:  { quality: 'bad',     meaning: 'ยามปลาย — เจอศัตรู' }
    }
  },
  {
    day: 'friday', period: 'day', yamNumber: 6, planetNumber: 3,
    timeRange: DAY_YAM_TIMES[6],
    quality: 'good',
    generalMeaning: 'ดี เดินทางสะดวก ปลอดโปร่ง',
    travel: 'เดินทางสะดวก ปลอดโปร่ง',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะหาย',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังมีอุปสรรค' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ปลอดโปร่ง' }
    }
  },
  {
    day: 'friday', period: 'day', yamNumber: 7, planetNumber: 1,
    timeRange: DAY_YAM_TIMES[7],
    quality: 'good',
    generalMeaning: 'ดีทางเข้าหาผู้หญิง',
    travel: 'เดินทางดี มีลาภ',
    lostItems: 'จะได้คืน',
    sickness: 'หนัก',
    news: 'จริง ดี',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ระวังคนจร' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'friday', period: 'day', yamNumber: 8, planetNumber: 6,
    timeRange: DAY_YAM_TIMES[8],
    quality: 'good',
    generalMeaning: 'ดี ได้ดังปรารถนา',
    travel: 'เดินทางดี ได้ดังปรารถนา',
    lostItems: 'ไม่ได้คืน',
    sickness: 'ไม่ตาย',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ห้ามเดิน' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ระวัง' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดีมาก' }
    }
  },

  // ===== วันเสาร์ กลางวัน =====
  {
    day: 'saturday', period: 'day', yamNumber: 1, planetNumber: 7,
    timeRange: DAY_YAM_TIMES[1],
    quality: 'good',
    generalMeaning: 'จะมีฤทธิ์',
    travel: 'ห้ามเดินทาง มีภัยร้ายแรง',
    lostItems: 'จะได้คืน แต่ค้นหาในที่มืด',
    sickness: 'จะตาย หรือรักษานานมาก',
    news: 'จริง น่าเชื่อถือ',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ร้ายมาก ห้ามเดิน' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ต้นร้ายปลายดี' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ดี ได้ลาภ' }
    }
  },
  {
    day: 'saturday', period: 'day', yamNumber: 2, planetNumber: 5,
    timeRange: DAY_YAM_TIMES[2],
    quality: 'neutral',
    generalMeaning: 'ดีทางหาคู่ แต่จะโดนคนลวง',
    travel: 'ระวัง มีคนหลอกลวง',
    lostItems: 'ได้คืนหรือไม่เท่ากัน',
    sickness: 'เป็นๆ หายๆ',
    news: 'จริงบ้างเท็จบ้าง',
    subYamPredictions: {
      ton:   { quality: 'good',    meaning: 'ยามต้น — ดี ได้ลาภ' },
      klang: { quality: 'bad',     meaning: 'ยามกลาง — ร้าย ไฟไหม้หาง' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — เข้าเมืองโจร ระวัง' }
    }
  },
  {
    day: 'saturday', period: 'day', yamNumber: 3, planetNumber: 3,
    timeRange: DAY_YAM_TIMES[3],
    quality: 'good',
    generalMeaning: 'จะมีลาภสตัวสองเท่า ได้บริวาร',
    travel: 'เดินทางดี ได้ลาภสองเท่า',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะหาย',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — เคราะห์ร้าย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยังมีอุปสรรค' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดี ได้ลาภสองเท่า' }
    }
  },
  {
    day: 'saturday', period: 'day', yamNumber: 4, planetNumber: 1,
    timeRange: DAY_YAM_TIMES[4],
    quality: 'good',
    generalMeaning: 'หนีรอดปลอดภัย ดีปลอดโปร่ง',
    travel: 'เดินทางดี หนีรอดปลอดภัย',
    lostItems: 'จะได้คืน',
    sickness: 'หนัก แต่รักษาได้',
    news: 'จริง ดี',
    subYamPredictions: {
      ton:   { quality: 'neutral', meaning: 'ยามต้น — ระวังคนจร' },
      klang: { quality: 'good',    meaning: 'ยามกลาง — ดีที่สุด ปลอดโปร่ง' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — ปานกลาง' }
    }
  },
  {
    day: 'saturday', period: 'day', yamNumber: 5, planetNumber: 6,
    timeRange: DAY_YAM_TIMES[5],
    quality: 'good',
    generalMeaning: 'ดีหนีรอด ปราศจากภัย',
    travel: 'เดินทางดี ปราศจากภัย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'ไม่ตาย',
    news: 'เท็จ',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ห้ามเดิน มีภัย' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ได้แต่ไม่มั่นคง' },
      plai:  { quality: 'good', meaning: 'ยามปลาย — ดีมาก ปราศจากภัย' }
    }
  },
  {
    day: 'saturday', period: 'day', yamNumber: 6, planetNumber: 4,
    timeRange: DAY_YAM_TIMES[6],
    quality: 'bad',
    generalMeaning: 'ของหายไม่ได้คืน จะสูญเสียของรัก โศกเศร้า',
    travel: 'ห้ามเดินทาง จะสูญเสีย',
    lostItems: 'ไม่ได้คืน สูญเสียถาวร',
    sickness: 'จะตาย',
    news: 'จริง แต่เป็นข่าวร้าย',
    subYamPredictions: {
      ton:   { quality: 'bad',  meaning: 'ยามต้น — ร้าย ติดขัด' },
      klang: { quality: 'bad',  meaning: 'ยามกลาง — ยามตาย' },
      plai:  { quality: 'bad',  meaning: 'ยามปลาย — ร้าย โศกเศร้า' }
    }
  },
  {
    day: 'saturday', period: 'day', yamNumber: 7, planetNumber: 2,
    timeRange: DAY_YAM_TIMES[7],
    quality: 'bad',
    generalMeaning: 'ยามตาย ระวังชีวิต',
    travel: 'ห้ามเดินทาง ยามตาย',
    lostItems: 'ไม่ได้คืน',
    sickness: 'จะตาย',
    news: 'ร้าย',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ยามตาย ห้ามทำการ' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ก้ำกึ่ง' },
      plai:  { quality: 'neutral', meaning: 'ยามปลาย — พอได้' }
    }
  },
  {
    day: 'saturday', period: 'day', yamNumber: 8, planetNumber: 7,
    timeRange: DAY_YAM_TIMES[8],
    quality: 'good',
    generalMeaning: 'ดี มีโชค',
    travel: 'เดินทางดี มีโชค',
    lostItems: 'จะได้คืน',
    sickness: 'จะตาย หรือรักษานาน',
    news: 'จริง ดี',
    subYamPredictions: {
      ton:   { quality: 'bad',     meaning: 'ยามต้น — ร้ายมาก ห้ามเดิน' },
      klang: { quality: 'neutral', meaning: 'ยามกลาง — ต้นร้ายปลายดี' },
      plai:  { quality: 'good',    meaning: 'ยามปลาย — ดี มีโชค' }
    }
  }
]

// ============================================================
// 7. CORE CALCULATION FUNCTIONS
// ============================================================

/**
 * หาวันในสัปดาห์จาก Date object (ทางโหราศาสตร์)
 * กฎ: เปลี่ยนวันเวลา 06:01 น.
 * ถ้าเป็นเวลา 00:00 - 06:00 จะถือว่าเป็น "วันก่อนหน้า"
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const hour = date.getHours()
  const minute = date.getMinutes()
  const totalMinutes = hour * 60 + minute

  // ถ้าเวลาก่อน 06:01 น. (361 นาที)
  if (totalMinutes < 361) {
    // ถอยหลังไป 1 วัน
    const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000)
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[yesterday.getDay()]
  }

  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

/**
 * หาว่าเวลานั้นเป็นกลางวันหรือกลางคืน
 * กลางวัน: 06:01 - 18:00
 * กลางคืน: 18:01 - 06:00 (ของเช้าวันถัดไป)
 */
export function getDayPeriod(date: Date): DayPeriod {
  const hour = date.getHours()
  const minute = date.getMinutes()
  const totalMinutes = hour * 60 + minute

  // กลางวัน: 06:01 (361) ถึง 18:00 (1080)
  if (totalMinutes >= 361 && totalMinutes <= 1080) {
    return 'day'
  }
  // นอกช่วงเวลาดังกล่าว (18:01 เป็นต้นไปจนถึง 06:00 ของวันถัดไป) เป็นกลางคืน
  return 'night'
}

/**
 * หาเลขยามและยามย่อยจากเวลา
 */
export function getYamNumberFromTime(date: Date, period: DayPeriod): { yamNumber: YamNumber; subYam: SubYam } {
  const hour = date.getHours()
  const minute = date.getMinutes()
  const totalMinutes = hour * 60 + minute

  const timeTables = period === 'day' ? DAY_YAM_TIMES : NIGHT_YAM_TIMES

  for (let yam = 1; yam <= 8; yam++) {
    const t = timeTables[yam as YamNumber]
    let startTotal = t.startHour * 60 + t.startMinute
    let endTotal = t.endHour * 60 + t.endMinute

    // handle midnight crossover for night yam 4 (22:31-24:00) and yam 5-8 (00:01-06:00)
    if (period === 'night') {
      if (yam === 4) {
        // ยาม 4: 22:31 - 24:00
        if (totalMinutes >= 22 * 60 + 31 || totalMinutes === 0) {
          const yamStart = 22 * 60 + 31
          const pos = (totalMinutes >= yamStart ? totalMinutes - yamStart : totalMinutes + 24*60 - yamStart)
          return { yamNumber: yam as YamNumber, subYam: getSubYam(pos, 90) }
        }
      } else if (yam >= 5) {
        // ยาม 5-8: หลังเที่ยงคืนถึงเช้า
        if (totalMinutes >= startTotal && totalMinutes <= (endTotal === 0 ? 360 : endTotal)) {
          const pos = totalMinutes - startTotal
          return { yamNumber: yam as YamNumber, subYam: getSubYam(pos, 90) }
        }
      }
    }

    if (totalMinutes >= startTotal && totalMinutes <= endTotal) {
      const pos = totalMinutes - startTotal
      return { yamNumber: yam as YamNumber, subYam: getSubYam(pos, 90) }
    }
  }

  return { yamNumber: 1, subYam: 'ton' }
}

function getSubYam(position: number, totalDuration: number): SubYam {
  const third = totalDuration / 3
  if (position < third) return 'ton'
  if (position < third * 2) return 'klang'
  return 'plai'
}

/**
 * ฟังก์ชันหลัก: คำนวณยามอัฏฐกาลจาก Date และ Time
 */
export function calculateYam(date: Date): YamResult {
  const day = getDayOfWeek(date)
  const dayThai = DAY_THAI[day]
  const period = getDayPeriod(date)
  const { yamNumber, subYam } = getYamNumberFromTime(date, period)
  const planetNumber = getPlanetForYam(day, period, yamNumber)
  const planet = PLANETS[planetNumber]
  const timeRange = period === 'day' ? DAY_YAM_TIMES[yamNumber] : NIGHT_YAM_TIMES[yamNumber]

  // หา prediction จาก database
  const prediction = YAM_PREDICTIONS.find(
    p => p.day === day && p.period === period && p.yamNumber === yamNumber
  )

  if (!prediction) {
    // fallback prediction
    const fallback: YamPrediction = {
      day, period, yamNumber, planetNumber, timeRange,
      quality: 'neutral',
      generalMeaning: `ยามที่ ${yamNumber} วัน${dayThai} ${period === 'day' ? 'กลางวัน' : 'กลางคืน'}`,
      travel: 'พิจารณาตามดาวประจำยาม',
      lostItems: 'พิจารณาตามดาวประจำยาม',
      sickness: 'พิจารณาตามดาวประจำยาม',
      news: 'พิจารณาตามดาวประจำยาม',
      subYamPredictions: {
        ton: { quality: 'neutral', meaning: 'ยามต้น — พิจารณาตามสถานการณ์' },
        klang: { quality: 'neutral', meaning: 'ยามกลาง — ดีกว่าตอนอื่น' },
        plai: { quality: 'neutral', meaning: 'ยามปลาย — พิจารณาตามสถานการณ์' }
      }
    }

    return {
      datetime: date,
      day,
      dayThai,
      period,
      yamNumber,
      subYam,
      planet,
      timeRange,
      quality: 'neutral',
      prediction: fallback,
      isGoodTime: false,
      summary: `ยามที่ ${yamNumber} ${period === 'day' ? planet.nameDay : planet.nameNight}`
    }
  }

  const subYamPred = prediction.subYamPredictions[subYam]
  const isGoodTime = subYamPred.quality === 'good'

  const subYamThai = { ton: 'ต้น', klang: 'กลาง', plai: 'ปลาย' }[subYam]
  const periodThai = period === 'day' ? 'กลางวัน' : 'กลางคืน'
  const planetName = period === 'day' ? planet.nameDay : planet.nameNight

  return {
    datetime: date,
    day,
    dayThai,
    period,
    yamNumber,
    subYam,
    planet,
    timeRange,
    quality: prediction.quality,
    prediction,
    isGoodTime,
    summary: `ยามที่ ${yamNumber} (${planetName}) ${periodThai} — ยาม${subYamThai}: ${subYamPred.meaning}`
  }
}

// ============================================================
// 8. UTILITY FUNCTIONS
// ============================================================

export function getQualityLabel(quality: Quality): string {
  return { good: '✅ ดี', bad: '❌ ไม่ดี', neutral: '⚖️ ปานกลาง' }[quality]
}

export function getQualityColor(quality: Quality): string {
  return { good: '#22c55e', bad: '#ef4444', neutral: '#f59e0b' }[quality]
}

export function formatTimeRange(tr: TimeRange): string {
  return tr.label
}

export function getPlanetName(planetNumber: PlanetNumber, period: DayPeriod): string {
  const planet = PLANETS[planetNumber]
  return period === 'day' ? planet.nameDay : planet.nameNight
}

/**
 * หาเวลาที่ดีที่สุดในวันนั้น
 */
export function getBestTimesOfDay(day: DayOfWeek, date: Date): Array<{
  period: DayPeriod
  yamNumber: YamNumber
  timeRange: TimeRange
  planetName: string
  meaning: string
}> {
  const results = []

  for (const period of ['day', 'night'] as DayPeriod[]) {
    for (let yam = 1; yam <= 8; yam++) {
      const pred = YAM_PREDICTIONS.find(
        p => p.day === day && p.period === period && p.yamNumber === (yam as YamNumber)
      )
      if (pred && pred.quality === 'good') {
        const timeRange = period === 'day' ? DAY_YAM_TIMES[yam as YamNumber] : NIGHT_YAM_TIMES[yam as YamNumber]
        const planetNumber = getPlanetForYam(day, period, yam as YamNumber)
        results.push({
          period,
          yamNumber: yam as YamNumber,
          timeRange,
          planetName: getPlanetName(planetNumber, period),
          meaning: pred.generalMeaning
        })
      }
    }
  }

  return results
}

export default {
  PLANETS,
  DAY_NUMBER,
  DAY_THAI,
  DAY_YAM_TIMES,
  NIGHT_YAM_TIMES,
  YAM_PREDICTIONS,
  calculateYam,
  getPlanetForYam,
  getDayOfWeek,
  getDayPeriod,
  getYamNumberFromTime,
  getBestTimesOfDay,
  getQualityLabel,
  getQualityColor
}
