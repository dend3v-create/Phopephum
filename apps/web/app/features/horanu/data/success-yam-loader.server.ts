/**
 * success-yam-loader.server.ts
 * Single entry point for looking up any of the 112 SuccessYam charts.
 *
 * Usage:
 *   import { getSuccessYam } from '~/features/horanu/data/success-yam-loader.server'
 *   const chart = getSuccessYam('monday', 'day', 3)
 */

import { sundaySuccessCharts }    from './sunday.server.js';
import { mondaySuccessCharts }    from './monday.server.js';
import { tuesdaySuccessCharts }   from './tuesday.server.js';
import { wednesdaySuccessCharts } from './wednesday.server.js';
import { thursdaySuccessCharts }  from './thursday.server.js';
import { fridaySuccessCharts }    from './friday.server.js';
import { saturdaySuccessCharts }  from './saturday.server.js';
import type { WeekdayCharts, SuccessYamEntry } from './types.js';

// ─── index ────────────────────────────────────────────────────────────────────

const CHARTS: Record<string, WeekdayCharts> = {
  sunday:    sundaySuccessCharts,
  monday:    mondaySuccessCharts,
  tuesday:   tuesdaySuccessCharts,
  wednesday: wednesdaySuccessCharts,
  thursday:  thursdaySuccessCharts,
  friday:    fridaySuccessCharts,
  saturday:  saturdaySuccessCharts,
}

type ChartKey = `${'day'|'night'}${1|2|3|4|5|6|7|8}`

/**
 * getSuccessYam — look up a single chart by weekday / period / yamNo
 *
 * @param weekday  full English name: 'monday' | 'tuesday' | ...
 * @param period   'day' | 'night'
 * @param yamNo    1–8
 */
export function getSuccessYam(
  weekday: string,
  period: 'day' | 'night',
  yamNo: number,
): SuccessYamEntry | undefined {
  const charts = CHARTS[weekday.toLowerCase()]
  if (!charts) return undefined
  const key = `${period}${yamNo}` as ChartKey
  return charts[key]
}

/**
 * getAllSuccessYams — returns all 16 charts for a given weekday
 */
export function getAllSuccessYams(weekday: string): WeekdayCharts | undefined {
  return CHARTS[weekday.toLowerCase()]
}

export type { SuccessYamEntry, WeekdayCharts };
