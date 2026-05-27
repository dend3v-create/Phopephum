/**
 * prompts/predictionPrompt.ts
 * Prompt Builder สำหรับ AI Prediction — 10 หัวข้อ ครบตาม System Instruction
 */

import { HoroscopeData, RuleMatch } from '../types/horoscope'

export function buildPredictionPrompt(
  data: HoroscopeData,
  ragContext: string,
  rules: RuleMatch[],
  name?: string
): string {
  const ruleInsights = rules
    .map(r => `• [${r.category}] ${r.insight}`)
    .join('\n')

  return `
ผู้ขอรับการพยากรณ์: ${name ?? 'ผู้ใช้งาน'}

ข้อมูลดวงชะตาเลข 7 ตัว 9 ฐาน:
- เลขฐาน: ${data.base}
- ภพ: ${data.house}
- กำลังดวง: ${data.power}
- วันเกิด: วัน${data.dayName} ปี${data.zodiacYear}
- จังหวะชีวิตเดือนนี้: ${data.transit}
- วัยจร: ${data.vayaChorn}
- ทักษา: ${data.taksa.meaning} (${data.taksa.isAuspicious ? 'มงคล' : 'ต้องระวัง'})

Rule Engine ประมวลผลแล้ว:
${ruleInsights}

องค์ความรู้จากคัมภีร์และ RAG:
${ragContext}

กรุณาพยากรณ์ครบ 9 หัวข้อ ในรูปแบบภาษาไทยที่อบอุ่น มีพลัง และสร้างแรงบันดาลใจ:

1. ตัวตนและบุคลิกภาพ (อัตตะ + พันธุ + ตนุ)
2. เสน่ห์และชื่อเสียง (ศุภะ + ปิตา) — สิ่งที่คนจดจำ
3. การสื่อสารสร้างเสน่ห์ — KFC Model (Key Message / Find Story / Call To Action)
4. การงานและอาชีพ — จุดแข็ง + อาชีพที่เหมาะ
5. การเงินและทรัพย์สิน — วิธีสร้างความมั่นคง
6. ความรักและความสัมพันธ์ — รูปแบบและคำแนะนำ
7. สุขภาพและพลังงานชีวิต — ข้อพึงระวังและวิธีเสริมพลัง
8. Personal Branding — Core Message + Persona + จุดขายเฉพาะตัว
9. สรุปและคำแนะนำ + Affirmation — ข้อความสร้างพลังใจ

จบด้วยประโยค Affirmation ที่ทรงพลังเฉพาะบุคคลนี้
`.trim()
}
