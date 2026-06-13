/**
 * success-yam-database.ts — ฐานข้อมูลดวงยามสำเร็จ 112 ผัง
 *
 * คำนวณล่วงหน้าทุกผัง (7 วัน × 2 ช่วง × 8 ยาม = 112) จาก hora-taynoo-engine
 * แล้ว cache ไว้ใน module-level variable (lazy-init)
 *
 * Usage:
 *   import { findSuccessYam, getSuccessYamDatabase } from './charts/success-yam-database.js'
 *   const chart = findSuccessYam('mon', 'day', 3)
 */

import {
  loadSuccessYam,
  getYamTimeRange,
  BHAVA_NAMES,
} from '../hora-taynoo-engine.js'
import type { SuccessYamChart } from '../types/horaNu.types.js'
import type { HoraTaynooResult } from '../hora-taynoo-engine.js'

// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAY_ID = ['sun','mon','tue','wed','thu','fri','sat'] as const
type WeekdayId = typeof WEEKDAY_ID[number]

// ─── Bhava label → key map ───────────────────────────────────────────────────
// BHAVA_NAMES index 0-11 → SuccessYamChart.houses key
const BHAVA_KEY_MAP: Record<number, keyof SuccessYamChart['houses']> = {
  0:  'tanu',
  1:  'dhan',
  2:  'saha',
  3:  'bandhu',
  4:  'putta',
  5:  'ari',
  6:  'patni',
  7:  'marana',
  8:  'subha',
  9:  'karma',
  10: 'labha',
  11: 'vinasa',
}

// ─── PlanetEntry label → SuccessYamChart.planets key ────────────────────────
const PLANET_KEY_MAP: Record<string, keyof SuccessYamChart['planets']> = {
  '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8',
  '9': '9', '0': '0', 'ล': 'la',
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลง HoraTaynooResult → SuccessYamChart
 */
function toSuccessYamChart(
  weekday: number,
  period: 'day' | 'night',
  yamNo: number,
  result: HoraTaynooResult,
): SuccessYamChart {
  const id = `${WEEKDAY_ID[weekday]}-${period}-${yamNo}`
  const { start, end } = getYamTimeRange(period, yamNo)

  // ── planets: label → zodiacIndex ──────────────────────────────────────────
  const planets = {} as SuccessYamChart['planets']
  for (const entry of result.planetEntries) {
    const key = PLANET_KEY_MAP[entry.label]
    if (key !== undefined) {
      planets[key] = entry.zodiacIndex
    }
  }

  // ── houses: bhavaName → zodiacIndex ──────────────────────────────────────
  // bhavaMap = { zodiacIndex: bhavaName }
  // We need to invert: bhavaName → zodiacIndex
  const houses = {} as SuccessYamChart['houses']
  for (const [zodiacIdxStr, bhavaName] of Object.entries(result.bhavaMap)) {
    const zodiacIdx = Number(zodiacIdxStr)
    // find bhava slot index from BHAVA_NAMES
    const bhavaSlot = BHAVA_NAMES.indexOf(bhavaName)
    if (bhavaSlot >= 0) {
      const houseKey = BHAVA_KEY_MAP[bhavaSlot]
      if (houseKey) {
        houses[houseKey] = zodiacIdx
      }
    }
  }

  // ── timeSlots: 12 sub-slot start times ───────────────────────────────────
  const timeSlots = result.subTimeSlots.map(s => s.startStr)

  return {
    id,
    weekday: WEEKDAY_ID[weekday] as WeekdayId,
    period,
    yamNo,
    startTime: start,
    endTime: end,
    planets,
    houses,
    timeSlots,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache

let _cache: SuccessYamChart[] | null = null

/**
 * getSuccessYamDatabase — ดึงฐานข้อมูลทั้ง 112 ผัง (lazy-computed, module-cached)
 */
export function getSuccessYamDatabase(): SuccessYamChart[] {
  if (_cache) return _cache

  const db: SuccessYamChart[] = []
  for (let w = 0; w < 7; w++) {
    for (const period of ['day', 'night'] as const) {
      for (let y = 1; y <= 8; y++) {
        const result = loadSuccessYam(w, period, y)
        db.push(toSuccessYamChart(w, period, y, result))
      }
    }
  }

  _cache = db
  return db
}

/**
 * findSuccessYam — ค้นหาผังยามสำเร็จตาม weekday / period / yamNo
 *
 * @param weekday   'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat'  หรือ number 0-6
 * @param period    'day' | 'night'
 * @param yamNo     1–8
 */
export function findSuccessYam(
  weekday: WeekdayId | number,
  period: 'day' | 'night',
  yamNo: number,
): SuccessYamChart | undefined {
  const w = typeof weekday === 'number' ? weekday : WEEKDAY_ID.indexOf(weekday)
  const id = `${WEEKDAY_ID[w]}-${period}-${yamNo}`
  return getSuccessYamDatabase().find(c => c.id === id)
}

export type { SuccessYamChart, WeekdayId }
