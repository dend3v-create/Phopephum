/**
 * rules/sevenBaseRules.ts
 * Rule Engine — Logic-based interpretation ก่อนส่งให้ AI
 * "ภพบอกเรื่องราว ดาวบอกอาการ ฐานบอกผลลัพธ์"
 */

import { HoroscopeData, RuleMatch } from '../types/horoscope'

interface Rule {
  id: string
  category: RuleMatch['category']
  priority: number
  condition: (data: HoroscopeData) => boolean
  insight: string
}

const RULES: Rule[] = [
  // ─── กำลังดวงสูง (Power) ──────────────────────────────────────────────
  {
    id: 'power_mahaniyon',
    category: 'opportunity',
    priority: 1,
    condition: (d) => d.power >= 15 && d.power <= 16,
    insight: 'กำลังดวงระดับ "เสน่ห์มหานิยม" — คุณมีออร่าดึงดูดผู้คนโดยธรรมชาติ เหมาะสร้าง Personal Brand และงานที่ต้องพบปะผู้คน',
  },
  {
    id: 'power_negotiator',
    category: 'career',
    priority: 1,
    condition: (d) => d.power === 17,
    insight: 'กำลังดวง 17 — "นักเจรจาแห่งชีวิต" พูดเก่ง ขายเก่ง เหมาะกับธุรกิจ การค้า และการสร้างเครือข่าย',
  },
  {
    id: 'power_leader',
    category: 'career',
    priority: 1,
    condition: (d) => d.power === 18,
    insight: 'กำลังดวง 18 — "พลังผู้นำแห่งจักรวาล" เกิดมาเพื่อนำ เหมาะเป็นผู้บริหาร ผู้ก่อตั้ง หรือผู้สร้างการเปลี่ยนแปลง',
  },
  {
    id: 'power_fulfillment',
    category: 'opportunity',
    priority: 1,
    condition: (d) => d.power >= 20 && d.power <= 21,
    insight: 'กำลังดวง 20-21 — "ความสมหวังและความอดทน" ยิ่งอดทน ยิ่งสำเร็จ เส้นทางนี้ให้ผลตอบแทนที่แท้จริงในระยะยาว',
  },

  // ─── ฐานวันเกิด (Base) ────────────────────────────────────────────────
  {
    id: 'base_1_leader',
    category: 'career',
    priority: 2,
    condition: (d) => d.base === 1,
    insight: 'ฐาน 1 "ผู้นำแห่งอาทิตย์" — มีศักดิ์ศรีและบารมีในตัวเอง เหมาะเป็นผู้บริหาร นักการเมือง หรือผู้เชี่ยวชาญที่คนนับถือ',
  },
  {
    id: 'base_2_empathy',
    category: 'branding',
    priority: 2,
    condition: (d) => d.base === 2,
    insight: 'ฐาน 2 "นักประสานงานแห่งจันทร์" — เสน่ห์อยู่ที่ความเข้าใจมนุษย์ เหมาะสร้าง Brand ที่ให้ความรู้สึกปลอดภัยและไว้วางใจ',
  },
  {
    id: 'base_4_communicator',
    category: 'branding',
    priority: 2,
    condition: (d) => d.base === 4,
    insight: 'ฐาน 4 "นักสื่อสารแห่งพุธ" — พลังการพูดและการเขียนคือจุดแข็ง เหมาะสร้างรายได้จาก Content, Podcast หรือการสอน',
  },
  {
    id: 'base_7_analyst',
    category: 'career',
    priority: 2,
    condition: (d) => d.base === 7,
    insight: 'ฐาน 7 "นักวางระบบแห่งเสาร์" — คิดลึก วิเคราะห์เก่ง เหมาะสร้างระบบ วางกลยุทธ์ หรือเป็น Consultant ด้านการวางแผนชีวิต',
  },
  {
    id: 'base_9_healer',
    category: 'branding',
    priority: 2,
    condition: (d) => d.base === 9,
    insight: 'ฐาน 9 "นักบำบัดแห่งจิตวิญญาณ" — มีพรสวรรค์ในการช่วยเหลือผู้อื่น เหมาะเป็นโค้ช นักบำบัด หรือผู้นำทางจิตใจ',
  },

  // ─── ทักษา ─────────────────────────────────────────────────────────────
  {
    id: 'taksa_mahaniyon',
    category: 'opportunity',
    priority: 1,
    condition: (d) => d.taksa.position === 1,
    insight: 'ทักษา "มหานิยม" — จังหวะชีวิตนี้คือช่วงทอง ผู้คนเปิดรับและสนับสนุนคุณ เริ่มสิ่งใหม่ได้เลย',
  },
  {
    id: 'taksa_auspicious',
    category: 'opportunity',
    priority: 2,
    condition: (d) => d.taksa.isAuspicious && d.taksa.position !== 1,
    insight: `ทักษาเป็นมงคล — จังหวะชีวิตเอื้อต่อความก้าวหน้า ใช้พลังงานนี้สร้างสิ่งที่ต้องการ`,
  },
  {
    id: 'taksa_warning',
    category: 'warning',
    priority: 1,
    condition: (d) => !d.taksa.isAuspicious,
    insight: 'ทักษาเป็นช่วงเรียนรู้ — ไม่ใช่ช่วงเริ่มสิ่งใหม่ใหญ่ แต่เป็นช่วงสะสมปัญญา เตรียมพร้อม และปล่อยวางสิ่งที่ไม่จำเป็น',
  },

  // ─── Power + Base Combinations (Premium Insights) ─────────────────────
  {
    id: 'combo_7_power_high',
    category: 'career',
    priority: 1,
    condition: (d) => d.base === 7 && d.power > 15,
    insight: 'ฐาน 7 + กำลังสูง — นักคิดผู้ยิ่งใหญ่ ระบบที่คุณสร้างจะนำรายได้แบบ Passive Income และผู้คนจะมาจ่ายเงินเพื่อปัญญาของคุณ',
  },
  {
    id: 'combo_1_power_high',
    category: 'branding',
    priority: 1,
    condition: (d) => d.base === 1 && d.power >= 18,
    insight: 'ฐาน 1 + กำลัง 18+ — ผู้นำระดับตำนาน คุณสร้าง Brand ได้จากบุคลิกภาพล้วนๆ ไม่ต้องการ Marketing มาก เพราะคนจำคุณเองได้',
  },
  {
    id: 'combo_6_power_15',
    category: 'finance',
    priority: 1,
    condition: (d) => d.base === 6 && d.power === 15,
    insight: 'ฐาน 6 + เสน่ห์มหานิยม — พลังงานศิลปะและเสน่ห์รวมกัน รายได้จะมาจากงานสร้างสรรค์ ความงาม และการแสดงออกตัวตน',
  },

  // ─── สุขภาพ ─────────────────────────────────────────────────────────────
  {
    id: 'health_saturn_base',
    category: 'health',
    priority: 3,
    condition: (d) => d.base === 7 || d.base === 8,
    insight: 'ดวงนี้ต้องระวังความเครียดสะสม — ฝึกการพักผ่อนและปล่อยวางอย่างสม่ำเสมอ การทำสมาธิ 10 นาทีต่อวันจะเปลี่ยนชีวิตคุณ',
  },
  {
    id: 'health_venus_base',
    category: 'health',
    priority: 3,
    condition: (d) => d.base === 2 || d.base === 6,
    insight: 'ดวงนี้ต้องระวังพลังงานอารมณ์ — ความรู้สึกของคนอื่นกระทบคุณมาก ต้องฝึกสร้างขอบเขต (Boundaries) เพื่อรักษาพลังงานตัวเอง',
  },
]

/**
 * ประมวลผล rules ทั้งหมดและคืนค่า insights ที่ match
 */
export function applyRules(data: HoroscopeData): RuleMatch[] {
  return RULES
    .filter(rule => rule.condition(data))
    .sort((a, b) => a.priority - b.priority)
    .map(rule => ({
      id: rule.id,
      category: rule.category,
      insight: rule.insight,
      priority: rule.priority,
    }))
}
