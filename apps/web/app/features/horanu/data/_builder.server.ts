/**
 * _builder.server.ts — builds WeekdayCharts from the hora-taynoo engine
 * Server-only: do NOT import on the client.
 */

import {
  loadSuccessYam,
  getYamTimeRange,
  ZODIAC_ORDER,
  BHAVA_NAMES,
  PLANET_KASTERN,
} from '@phopephum/engine';
import type { HoraTaynooResult } from '@phopephum/engine';
import type { SuccessYamEntry, WeekdayCharts } from './types.js';

// ─── constants ───────────────────────────────────────────────────────────────

const WEEKDAY_FULL = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
const WEEKDAY_SHORT = ['sun','mon','tue','wed','thu','fri','sat'] as const;

/** Thai zodiac name from taynoo zodiac index (0=พฤษภ … 11=เมษ) */
function zodiacName(idx: number): string {
  return ZODIAC_ORDER[idx]?.name ?? '?'
}

// ─── Dignity maps (all indices use ZODIAC_ORDER: 0=พฤษภ…11=เมษ) ─────────────

/** มหาอุจจ์ (exaltation): planet → zodiac index */
const MAHA_UCH: Record<number, number> = {
  1: 11,  // อาทิตย์ → เมษ
  2: 0,   // จันทร์  → พฤษภ
  3: 8,   // อังคาร  → มังกร
  4: 4,   // พุธ     → กันย์
  5: 2,   // พฤหัส   → กรกฎ
  6: 10,  // ศุกร์   → มีน
  7: 5,   // เสาร์   → ตุลย์
}

/** นิจจ์ (fall/detriment): planet → zodiac index (opposite of exaltation) */
const NEECH: Record<number, number> = {
  1: 5,   // อาทิตย์ → ตุลย์
  2: 6,   // จันทร์  → พิจิก
  3: 2,   // อังคาร  → กรกฎ
  4: 10,  // พุธ     → มีน
  5: 8,   // พฤหัส   → มังกร
  6: 4,   // ศุกร์   → กันย์
  7: 11,  // เสาร์   → เมษ
}

/** BHAVA_NAMES index → houses key */
const BHAVA_KEY: Record<number, keyof SuccessYamEntry['houses']> = {
  0:'tanu', 1:'dhan', 2:'saha',    3:'bandhu',
  4:'putta', 5:'ari',  6:'patni',  7:'marana',
  8:'subha', 9:'karma', 10:'labha', 11:'vinasa',
}

/** PlanetEntry label → planets key */
const PLANET_KEY: Record<string, keyof SuccessYamEntry['planets']> = {
  '1':'1','2':'2','3':'3','4':'4','5':'5',
  '6':'6','7':'7','8':'8','9':'9','0':'0','ล':'ล',
}

// ─── converter ───────────────────────────────────────────────────────────────

function toEntry(
  weekday: number,
  period: 'day' | 'night',
  yamNo: number,
  r: HoraTaynooResult,
): SuccessYamEntry {
  const { start, end } = getYamTimeRange(period, yamNo)
  const id = `${WEEKDAY_SHORT[weekday]}-${period}-${yamNo}`

  // planets
  const planets = {} as SuccessYamEntry['planets']
  for (const e of r.planetEntries) {
    const key = PLANET_KEY[e.label]
    if (key !== undefined) planets[key] = zodiacName(e.zodiacIndex)
  }

  // houses — invert bhavaMap (zodiacIdx → bhavaName) to (bhavaKey → zodiacName)
  const houses = {} as SuccessYamEntry['houses']
  for (const [zIdxStr, bhavaName] of Object.entries(r.bhavaMap)) {
    const slot = BHAVA_NAMES.indexOf(bhavaName)
    const houseKey = BHAVA_KEY[slot]
    if (houseKey) houses[houseKey] = zodiacName(Number(zIdxStr))
  }

  // specialMarks — check each real planet (1-7) in its current zodiac position
  const specialMarks: SuccessYamEntry['specialMarks'] = []
  for (const e of r.planetEntries) {
    const pNum = e.planetNum
    if (!pNum) continue   // skip ล, 8, 9, 0

    const zIdx = e.zodiacIndex

    // เกษตร (domicile)
    if (PLANET_KASTERN[pNum]?.includes(zIdx)) {
      specialMarks.push({ planet: e.label, type: 'เกษตร' })
      continue
    }
    // มหาอุจจ์ (exaltation)
    if (MAHA_UCH[pNum] === zIdx) {
      specialMarks.push({ planet: e.label, type: 'มหาอุจจ์' })
      continue
    }
    // นิจจ์ (fall)
    if (NEECH[pNum] === zIdx) {
      specialMarks.push({ planet: e.label, type: 'นิจจ์' })
    }
  }

  return {
    id,
    weekday: WEEKDAY_FULL[weekday],
    period,
    yamNo,
    startTime: start,
    endTime: end,
    lagna: zodiacName(r.lagnaZodiacIndex),
    planets,
    houses,
    specialMarks,
  }
}

// ─── public builder ───────────────────────────────────────────────────────────

export function buildWeekdayCharts(weekday: number): WeekdayCharts {
  const get = (period: 'day' | 'night', y: number) =>
    toEntry(weekday, period, y, loadSuccessYam(weekday, period, y))

  return {
    day1: get('day', 1),   day2: get('day', 2),   day3: get('day', 3),   day4: get('day', 4),
    day5: get('day', 5),   day6: get('day', 6),   day7: get('day', 7),   day8: get('day', 8),
    night1: get('night', 1), night2: get('night', 2), night3: get('night', 3), night4: get('night', 4),
    night5: get('night', 5), night6: get('night', 6), night7: get('night', 7), night8: get('night', 8),
  }
}
