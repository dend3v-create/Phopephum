/**
 * calculators/calculateNakshatra.ts
 * การคำนวณ 27 นักษัตรฤกษ์ (27 Nakshatras) แบบประมาณการสำหรับระบบโหราศาสตร์
 */

export interface NakshatraResult {
  /** ลำดับฤกษ์ (1-27) */
  id: number
  /** ชื่อฤกษ์ */
  name: string
  /** หมวดฤกษ์ (ทลิทโท, มหัทธโน, โจโร, ฯลฯ) */
  category: string
  /** ดาวเจ้าฤกษ์ */
  ruler: string
  /** ความหมายของฤกษ์ */
  meaning: string
}

// ข้อมูล 27 ฤกษ์ พร้อมหมวดฤกษ์ (ทลิทโท, มหัทธโน, ฯลฯ)
const NAKSHATRAS: NakshatraResult[] = [
  { id: 1, name: 'อัศวินี', category: 'ทลิทโทฤกษ์', ruler: 'เกตุ', meaning: 'ฤกษ์ของผู้ขอ ริเริ่มสิ่งใหม่ การเดินทางรวดเร็ว' },
  { id: 2, name: 'ภรณี', category: 'มหัทธโนฤกษ์', ruler: 'ศุกร์', meaning: 'ฤกษ์เศรษฐี ความมั่งคั่ง การเงินและศิลปะ' },
  { id: 3, name: 'กฤติกา', category: 'โจโรฤกษ์', ruler: 'อาทิตย์', meaning: 'ฤกษ์โจร การแข่งขัน ช่วงชิง แตกหัก' },
  { id: 4, name: 'โรหิณี', category: 'ภูมิปาโลฤกษ์', ruler: 'จันทร์', meaning: 'ฤกษ์ผู้รักษาแผ่นดิน ความมั่นคง ที่ดิน อสังหาฯ' },
  { id: 5, name: 'มฤคศิระ', category: 'เทศาตรีฤกษ์', ruler: 'อังคาร', meaning: 'ฤกษ์พ่อค้า การเดินทาง ต่างถิ่นต่างแดน' },
  { id: 6, name: 'อารทรา', category: 'เทวีฤกษ์', ruler: 'ราหู', meaning: 'ฤกษ์นางพญา ความสวยงาม มีเสน่ห์ ชื่อเสียง' },
  { id: 7, name: 'ปุนัพสุ', category: 'เพชฌฆาตฤกษ์', ruler: 'พฤหัส', meaning: 'ฤกษ์เด็ดขาด การปราบปราม ตัดสินใจเฉียบขาด' },
  { id: 8, name: 'ปุษยะ', category: 'ราชาฤกษ์', ruler: 'เสาร์', meaning: 'ฤกษ์ผู้นำ ความยิ่งใหญ่ ได้รับความช่วยเหลือ' },
  { id: 9, name: 'อาศเลษา', category: 'สมโณฤกษ์', ruler: 'พุธ', meaning: 'ฤกษ์นักบวช สงบสุข ศาสนา ปรัชญา' },
  { id: 10, name: 'มฆะ', category: 'ทลิทโทฤกษ์', ruler: 'เกตุ', meaning: 'ฤกษ์บรรพบุรุษ บารมีเก่า ความเสียสละ' },
  { id: 11, name: 'บุรพผลคุนี', category: 'มหัทธโนฤกษ์', ruler: 'ศุกร์', meaning: 'ฤกษ์เศรษฐี ความรัก ความสุขสบาย' },
  { id: 12, name: 'อุตรผลคุนี', category: 'โจโรฤกษ์', ruler: 'อาทิตย์', meaning: 'ฤกษ์ผู้อุปถัมภ์ การทำสัญญา ความยุติธรรม' },
  { id: 13, name: 'หัฏฐะ', category: 'ภูมิปาโลฤกษ์', ruler: 'จันทร์', meaning: 'ฤกษ์ช่างฝีมือ การใช้ทักษะ ความเชี่ยวชาญ' },
  { id: 14, name: 'จิตรา', category: 'เทศาตรีฤกษ์', ruler: 'อังคาร', meaning: 'ฤกษ์ศิลปิน ความสว่างไสว เสน่ห์ดึงดูด' },
  { id: 15, name: 'สวาติ', category: 'เทวีฤกษ์', ruler: 'ราหู', meaning: 'ฤกษ์อิสระ การค้าขาย การติดต่อสื่อสาร' },
  { id: 16, name: 'วิสาขา', category: 'เพชฌฆาตฤกษ์', ruler: 'พฤหัส', meaning: 'ฤกษ์แห่งความสำเร็จหลังการต่อสู้ แข่งขัน' },
  { id: 17, name: 'อนุราธะ', category: 'ราชาฤกษ์', ruler: 'เสาร์', meaning: 'ฤกษ์มิตรภาพ ความสำเร็จในการร่วมมือ' },
  { id: 18, name: 'เชษฐา', category: 'สมโณฤกษ์', ruler: 'พุธ', meaning: 'ฤกษ์ผู้อาวุโส การปกป้อง อำนาจหน้าที่' },
  { id: 19, name: 'มูละ', category: 'ทลิทโทฤกษ์', ruler: 'เกตุ', meaning: 'ฤกษ์รากฐาน การขุดค้น การวิจัย' },
  { id: 20, name: 'ปุรพษาฒ', category: 'มหัทธโนฤกษ์', ruler: 'ศุกร์', meaning: 'ฤกษ์ชัยชนะเบื้องต้น ความกระตือรือร้น' },
  { id: 21, name: 'อุตราษาฒ', category: 'โจโรฤกษ์', ruler: 'อาทิตย์', meaning: 'ฤกษ์ชัยชนะเด็ดขาด ความสำเร็จยั่งยืน' },
  { id: 22, name: 'ศรวณะ', category: 'ภูมิปาโลฤกษ์', ruler: 'จันทร์', meaning: 'ฤกษ์แห่งการฟัง การเรียนรู้ การรับฟังคำสอน' },
  { id: 23, name: 'ธนิษฐา', category: 'เทศาตรีฤกษ์', ruler: 'อังคาร', meaning: 'ฤกษ์ความมั่งคั่ง ดนตรี จังหวะชีวิต' },
  { id: 24, name: 'ศตภิษัช', category: 'เทวีฤกษ์', ruler: 'ราหู', meaning: 'ฤกษ์แพทย์ การรักษาเยียวยา ปิดบังซ่อนเร้น' },
  { id: 25, name: 'บุรพภัทรบท', category: 'เพชฌฆาตฤกษ์', ruler: 'พฤหัส', meaning: 'ฤกษ์นักบำเพ็ญเพียร การเสียสละเพื่อส่วนรวม' },
  { id: 26, name: 'อุตรภัทรบท', category: 'ราชาฤกษ์', ruler: 'เสาร์', meaning: 'ฤกษ์รากฐานที่มั่นคง ปัญญาอันลึกซึ้ง' },
  { id: 27, name: 'เรวดี', category: 'สมโณฤกษ์', ruler: 'พุธ', meaning: 'ฤกษ์แห่งความมั่งคั่ง การเดินทางที่ปลอดภัย' },
]

/**
 * คำนวณฤกษ์ของลัคนาจากการประมาณองศา (Approximation Method)
 * @param birthDate "YYYY-MM-DD"
 * @param birthTime "HH:MM"
 */
export function calculateLagnaNakshatra(birthDate: string, birthTime: string = '12:00'): NakshatraResult {
  const date = new Date(birthDate)
  const [hStr, mStr] = birthTime.split(':')
  const hours = parseInt(hStr ?? '12') + parseInt(mStr ?? '0') / 60

  // 1. หาองศาพระอาทิตย์ (ประมาณการจากวัน)
  // เริ่มต้นราศีเมษ (0 องศา) ประมาณ 21 มีนาคม
  const startOfYear = new Date(date.getFullYear(), 2, 21) 
  const dayOfYear = (date.getTime() - startOfYear.getTime()) / 86400000
  
  // พระอาทิตย์เดินวันละประมาณ 1 องศา (360/365.25)
  const sunDegree = (dayOfYear * (360 / 365.25)) % 360

  // 2. หาองศาลัคนาจากการหมุนของโลก (1 วัน = 360 องศา)
  // ลัคนาเริ่มต้นที่จุดพระอาทิตย์ ณ เวลาพระอาทิตย์ขึ้น (ประมาณ 06:00 น.)
  const timeOffsetHours = hours - 6
  const earthRotationDegree = (timeOffsetHours / 24) * 360

  let lagnaDegree = (sunDegree + earthRotationDegree) % 360
  if (lagnaDegree < 0) lagnaDegree += 360

  // 3. หานักษัตร (1 นักษัตร = 13.3333 องศา)
  // ลำดับนักษัตรเริ่มที่ 0 (อัศวินี)
  const nakshatraIndex = Math.floor(lagnaDegree / (360 / 27))
  
  // ป้องกัน index out of bounds ในกรณีรอยต่อ
  const index = Math.max(0, Math.min(26, nakshatraIndex))

  return NAKSHATRAS[index]!
}
