/**
 * engine/horoscopeEngine.ts
 * Core Astrology Engine — รวม calculators ทั้งหมด
 *
 * Architecture:
 * User Input → horoscopeEngine → HoroscopeData
 *                                     ↓
 *                               Rule Engine → RuleMatch[]
 *                                     ↓
 *                               RAG Context → string
 *                                     ↓
 *                               AI Narrative → string
 */

import { calculateMasterBase } from '../calculators/calculateBase'
import { calculatePower, getPowerMeaning } from '../calculators/calculatePower'
import { calculateHouse, getHouseMeaning } from '../calculators/calculateHouse'
import { calculateTransit, calculateVayaChorn, calculateTaksa } from '../calculators/calculateTransit'
import { calculateAtthakarn } from '../calculators/calculateAtthakarn'
import { calculateNavamsa } from '../calculators/calculateNavamsa'
import { applyRules } from '../rules/sevenBaseRules'
import { HoroscopeInput, HoroscopeData } from '../types/horoscope'
// ── New modules (lunar-based + ephemeris) ──────────────────────────────────────
import { getThaiLunarDate } from '../core/lunarCalendar'
import { 
  r7, 
  genBase1to3, 
  genBase4, 
  genBase5, 
  genBase6, 
  genBase7, 
  genBase8, 
  genBase9,
  HOUSE_NAMES_THAI,
  HOUSE_NAMES_PALI
} from '@/engine/seven-numbers'
import { calculateAgeCycle } from '../calculators/ageCycle'
import { buildEmperorChart } from '../calculators/emperorChart'

const DAY_NAMES_THAI = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']
const ZODIAC_YEARS = ['ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง', 'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน']

const HOUSE_NAMES_ROW3 = ["มรณะ", "สุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"]

export async function horoscopeEngine(
  input: HoroscopeInput & { province?: string }
): Promise<any> {
  const birth = new Date(input.birthDate)

  const day   = birth.getDate()
  const month = birth.getMonth() + 1
  const year  = birth.getFullYear()
  const dayOfWeek = birth.getDay() // 0=อาทิตย์

  // ─── Lunar Data ────────────────────────────────────────────────────────
  const lunar = getThaiLunarDate(input.birthDate)
  // ✅ FIX: JS getDay() 0=Sun,1=Mon,...,5=Fri,6=Sat → Thai planet 1=Sun,...,6=Fri,7=Sat
  const dNum = dayOfWeek + 1
  const mNum = lunar.lunarMonth > 7 ? lunar.lunarMonth - 7 : lunar.lunarMonth
  // ✅ FIX: ใช้ zodiacNumber จาก thaiLunar แทน lunarYear % 7
  const thaiYr = birth.getFullYear() + 543
  const ZODIAC12 = ['ชวด','ฉลู','ขาล','เถาะ','มะโรง','มะเส็ง','มะเมีย','มะแม','วอก','ระกา','จอ','กุน']
  const zodIdx = ((thaiYr - 2503) % 12 + 12) % 12  // 0=ชวด
  const zodNum1to12 = zodIdx + 1
  const yNum = zodNum1to12 > 7 ? zodNum1to12 - 7 : zodNum1to12

  // ─── Core Calculations (Full Matrix) ───────────────────────────────────
  const b1 = genBase1to3(dNum)
  const b2 = genBase1to3(mNum)
  const b3 = genBase1to3(yNum)
  const b4 = genBase4(b1, b2, b3)
  const b5 = genBase5(b4)
  const b6 = genBase6(b5)
  const b7 = genBase7(b6)
  const b8 = genBase8(b5[0])
  const b9 = genBase9(b5[0])

  const matrix = {
    row1: { name: "ฐานวัน", houses: HOUSE_NAMES_THAI, values: b1 },
    row2: { name: "ฐานเดือน", houses: HOUSE_NAMES_PALI, values: b2 },
    row3: { name: "ฐานปี", houses: HOUSE_NAMES_ROW3, values: b3 },
    row4: { name: "ฐานรวมกำลัง", values: b4 },
    row5: { name: "ฐานสรุปพลัง", values: b5 },
    row6: { name: "ฐาน Solution 1", values: b6 },
    row7: { name: "ฐาน Solution 2", values: b7 },
    row8: { name: "อาตมา", values: b8 },
    row9: { name: "ภริยัง", values: b9 },
  }

  // ─── Other Calculations ────────────────────────────────────────────────
  const base    = calculateMasterBase(day, month, year)
  const power   = calculatePower([b1[0], b2[0], b3[0], base])
  const house   = calculateHouse(base)
  const transit = calculateTransit(month)
  const vayaChorn = calculateVayaChorn(input.birthDate)
  const taksa   = calculateTaksa(dayOfWeek, base)
  const navamsa = calculateNavamsa(day, month, year)
  const atthakarn = input.birthTime ? calculateAtthakarn(input.birthDate, input.birthTime) : undefined

  const data: HoroscopeData = {
    base,
    power,
    house,
    transit,
    dayOfWeek,
    dayName: DAY_NAMES_THAI[dayOfWeek],
    zodiacYear: ZODIAC12[zodIdx],
    vayaChorn,
    taksa,
    atthakarn,
    navamsa,
  }

  const rules = applyRules(data)

  // เตรียม Taksa List สำหรับ Emperor Chart
  const taksaNames = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี']
  const taksaList = taksaNames.map((_, i) => taksaNames[(taksa.position - 1 + i) % 8]!)

  return {
    input,
    data,
    matrix,
    rules,
    lunar,
    ageCycle: calculateAgeCycle(birth.getFullYear()),
    emperorChart: buildEmperorChart(
      [b1[0], b2[0], b3[0]],
      [b5[0], b6[0], b7[0]],
      taksaList
    )
  }
}

export { getPowerMeaning, getHouseMeaning }
