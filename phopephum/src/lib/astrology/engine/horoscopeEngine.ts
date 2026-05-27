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

import { calculateBase, calculateMasterBase, calculateYearBase } from '../calculators/calculateBase'
import { calculatePower, getPowerMeaning } from '../calculators/calculatePower'
import { calculateHouse, getHouseMeaning } from '../calculators/calculateHouse'
import { calculateTransit, calculateVayaChorn, calculateTaksa } from '../calculators/calculateTransit'
import { calculateAtthakarn } from '../calculators/calculateAtthakarn'
import { calculateNavamsa } from '../calculators/calculateNavamsa'
import { applyRules } from '../rules/sevenBaseRules'
import { HoroscopeInput, HoroscopeData, HoroscopeResult } from '../types/horoscope'

const DAY_NAMES_THAI = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']
const ZODIAC_YEARS = ['ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง', 'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน']

export async function horoscopeEngine(
  input: HoroscopeInput
): Promise<Omit<HoroscopeResult, 'ragContext' | 'prediction'>> {
  const birth = new Date(input.birthDate)

  const day   = birth.getDate()
  const month = birth.getMonth() + 1
  const year  = birth.getFullYear()
  const dayOfWeek = birth.getDay() // 0=อาทิตย์

  // ─── Core Calculations ─────────────────────────────────────────────────
  const base    = calculateMasterBase(day, month, year)
  const dayBase = calculateBase(day)
  const monBase = calculateBase(month)
  const yearBase = calculateYearBase(year)
  const power   = calculatePower([dayBase, monBase, yearBase, base])

  const house      = calculateHouse(base)
  const houseFull  = getHouseMeaning(base)
  const transit    = calculateTransit(month)
  const vayaChorn  = calculateVayaChorn(input.birthDate)
  const taksa      = calculateTaksa(dayOfWeek, base)
  const zodiacYear = ZODIAC_YEARS[year % 12]

  // ─── อัฏฐกาล + นวางค์ ────────────────────────────────────────────────────
  const atthakarn = input.birthTime
    ? calculateAtthakarn(input.birthDate, input.birthTime)
    : undefined
  const navamsa = calculateNavamsa(day, month, year)

  const data: HoroscopeData = {
    base,
    power,
    house,
    transit,
    dayOfWeek,
    dayName: DAY_NAMES_THAI[dayOfWeek],
    zodiacYear,
    vayaChorn,
    taksa,
    atthakarn,
    navamsa,
  }

  // ─── Rule Engine ───────────────────────────────────────────────────────
  const rules = applyRules(data)

  return { input, data, rules }
}

export { getPowerMeaning, getHouseMeaning }
