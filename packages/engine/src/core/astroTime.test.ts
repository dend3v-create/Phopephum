import { describe, it, expect } from 'vitest'
import {
  getAstrologicalDate,
  getAstrologicalDateStr,
  getAstrologicalThaiFormattedDate,
  getDayCutoffOffset,
} from './astroTime.js'

describe('Astrological Date & 06:01 AM Cutoff Logic', () => {
  it('should treat 03:15 AM on Saturday Sept 5, 2026 as Friday Sept 4, 2026', () => {
    // 2026-09-05 03:15:36 (UTC+7) -> before 06:01 AM -> Friday Sept 4, 2026
    const date = new Date('2026-09-05T03:15:36+07:00')
    const dateStr = getAstrologicalDateStr(date)
    expect(dateStr).toBe('2026-09-04')

    const thaiLabel = getAstrologicalThaiFormattedDate(date, 'th-TH')
    expect(thaiLabel).toBe('วันศุกร์ที่ 4 กันยายน 2569')
  })

  it('should treat 06:00:59 AM as the previous day', () => {
    // 2026-09-05 06:00:59 (UTC+7) -> before 06:01 -> Friday Sept 4, 2026
    const date = new Date('2026-09-05T06:00:59+07:00')
    const dateStr = getAstrologicalDateStr(date)
    expect(dateStr).toBe('2026-09-04')
  })

  it('should transition to new day at exactly 06:01:00 AM', () => {
    // 2026-09-05 06:01:00 (UTC+7) -> new day -> Saturday Sept 5, 2026
    const date = new Date('2026-09-05T06:01:00+07:00')
    const dateStr = getAstrologicalDateStr(date)
    expect(dateStr).toBe('2026-09-05')

    const thaiLabel = getAstrologicalThaiFormattedDate(date, 'th-TH')
    expect(thaiLabel).toBe('วันเสาร์ที่ 5 กันยายน 2569')
  })

  it('should treat 12:00 PM as current calendar day', () => {
    const date = new Date('2026-09-05T12:00:00+07:00')
    const dateStr = getAstrologicalDateStr(date)
    expect(dateStr).toBe('2026-09-05')
  })

  it('should compute getDayCutoffOffset accurately for birth times', () => {
    expect(getDayCutoffOffset('03:15')).toBe(-1)
    expect(getDayCutoffOffset('06:00')).toBe(-1)
    expect(getDayCutoffOffset('06:01')).toBe(0)
    expect(getDayCutoffOffset('07:30')).toBe(0)
  })
})
