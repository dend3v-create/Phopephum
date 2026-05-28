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
// ── New modules (lunar-based + ephemeris) ──────────────────────────────────────
import { getThaiLunarDate } from '../core/lunarCalendar'
import { getProvinceCoords, getProvinceLatLng } from '../core/geoLocation'
import { convertBirthTime } from '../core/astroTime'
import { calculateSevenBaseFull } from '../calculators/sevenBase'
import { calculateNineBaseFull } from '../calculators/nineBase'
import { calculateTaksa as calculateTaksa8, getCurrentTaksa } from '../calculators/taksa'
import { calculateAgeCycle } from '../calculators/ageCycle'
import { buildEmperorChart } from '../calculators/emperorChart'
import { buildBirthChart } from './chartBuilder'

const DAY_NAMES_THAI = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']
const ZODIAC_YEARS = ['ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง', 'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน']

export async function horoscopeEngine(
  input: HoroscopeInput & { province?: string }
): Promise<Omit<HoroscopeResult, 'ragContext' | 'prediction'> & Record<string, unknown>> {
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
  void getHouseMeaning(base) // for future use
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

  // ─── Lunar + Ephemeris Layer (เพิ่มเติม) ──────────────────────────────
  const lunar          = getThaiLunarDate(input.birthDate)
  const astroTime      = input.birthTime ? convertBirthTime(input.birthTime) : null
  const sevenBase      = calculateSevenBaseFull(lunar.lunarDay, lunar.lunarMonth, lunar.lunarYear)
  const nineBase       = calculateNineBaseFull([sevenBase.dayBase, sevenBase.monthBase, sevenBase.yearBase])
  const taksa8         = calculateTaksa8(dayOfWeek)
  const currentTaksa8  = getCurrentTaksa(dayOfWeek)
  const ageCycle       = calculateAgeCycle(birth.getFullYear())
  const emperorChart   = buildEmperorChart(
    [sevenBase.dayBase, sevenBase.monthBase, sevenBase.yearBase],
    nineBase.bases,
    taksa8,
  )

  // Province + BirthChart (optional — ต้องมี province)
  const province    = (input as HoroscopeInput & { province?: string }).province
  const coords      = province ? getProvinceCoords(province) : null
  const birthChart  = (province && input.birthTime)
    ? await buildBirthChart(
        input.birthDate,
        input.birthTime,
        coords!.lat,
        coords!.lng,
      ).catch(() => null)
    : null

  return {
    input,
    data,
    rules,
    // Extended lunar layer
    lunar,
    astroTime,
    sevenBase,
    nineBase,
    taksa8,
    currentTaksa8,
    ageCycle,
    emperorChart,
    coordinates: coords ? { lat: coords.lat, lng: coords.lng, province: coords.province } : null,
    birthChart,
  }
}

export { getPowerMeaning, getHouseMeaning }
