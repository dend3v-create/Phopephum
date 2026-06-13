import { describe, it, expect } from 'vitest'
import {
  getYam,
  buildBouncePath,
  buildFloatingStarMap,
  placeStarsInZodiac,
  assignHouses,
  assignTimes,
  calculatePhraKrasib,
  ATTHAKARN_DAY,
} from './phrai-krasib-engine'

// ─── Reference case: วันพุธ ยาม 4 กลางวัน 10:32 น. ───────────────────────────
// ยามอัฏฐกาลวันพุธ (กลางวัน): [4,2,7,5,3,1,6,4]
// ยามถาม = 4 → atthakarn = 5
// Bounce path: [4,5,6,7,8,8,7,6,5,4,3]
// ดาวลอย steps:  1→5 2→3 3→1 4→6 5→4 6→4 7→6 8→1 ลั→3 9→5 0→7
// ตำแหน่ง (new RasiIndex 0=เมษ 1=พฤษภ ...):
//   ๑ → กันย์ (5)    ๒ → พิจิก (7)   ๓ → พิจิก (7)
//   ๔ → เมษ (0)      ๕ → กรกฎ (3)    ๖ → ตุลย์ (6)
//   ๗ → มีน (11)     ๘ → มีน (11)    ลั → พฤษภ (1)
//   ๙ → กันย์ (5)    ๐ → มีน (11)
// ลัคนา = พฤษภ (1) → เกษตร = 6 (ศุกร์) → ดาวลอย ๖ สถิต ตุลย์ (6)
// เวลาเริ่ม = 10:30 + 7.5 = 10:37:30

const WED_YAM4 = new Date('2026-06-10T10:32:00+07:00')

describe('PhraKrasib Engine — วันพุธ ยาม 4 กลางวัน', () => {
  it('Step 1: getYam ระบุยาม วัน period ได้ถูกต้อง', () => {
    const r = getYam(WED_YAM4)
    expect(r.dayOfWeek).toBe(3)          // พุธ
    expect(r.period).toBe('day')
    expect(r.yamNumber).toBe(4)
    expect(r.startTime).toBe('10:30')
    expect(r.endTime).toBe('12:00')
    expect(r.atthakarnAtYam).toBe(5)     // อัฏฐกาลยาม 4 วันพุธ = 5
    expect(r.atthakarnSequence).toEqual(ATTHAKARN_DAY[3])
  })

  it('Step 3: buildBouncePath yamAsked=4 ให้ path ถูกต้อง', () => {
    const path = buildBouncePath(4)
    expect(path).toEqual([4,5,6,7,8, 8,7,6,5,4,3])
    //                    ๑ ๒ ๓ ๔ ๕  ๖ ๗ ๘ ลั ๙ ๐
  })

  it('Step 4: placeStarsInZodiac ตำแหน่งดาวลอยถูกต้อง', () => {
    const yr = getYam(WED_YAM4)
    const fm = buildFloatingStarMap(yr)
    const pos = placeStarsInZodiac(fm)

    expect(pos.get('1')).toBe(5)   // กันย์
    expect(pos.get('2')).toBe(7)   // พิจิก
    expect(pos.get('3')).toBe(7)   // พิจิก
    expect(pos.get('4')).toBe(0)   // เมษ
    expect(pos.get('5')).toBe(3)   // กรกฎ
    expect(pos.get('6')).toBe(6)   // ตุลย์
    expect(pos.get('7')).toBe(11)  // มีน
    expect(pos.get('8')).toBe(11)  // มีน
    expect(pos.get('la')).toBe(1)  // พฤษภ
    expect(pos.get('9')).toBe(5)   // กันย์
    expect(pos.get('0')).toBe(11)  // มีน
  })

  it('Step 5: assignHouses ลัคนา = พฤษภ → ตนุ', () => {
    const yr = getYam(WED_YAM4)
    const fm = buildFloatingStarMap(yr)
    const pos = placeStarsInZodiac(fm)
    const { lagnaRasi, houseMap } = assignHouses(pos)

    expect(lagnaRasi).toBe(1)               // พฤษภ
    expect(houseMap.get(1)).toBe('ตนุ')     // พฤษภ = ตนุ
    expect(houseMap.get(2)).toBe('กดุมภะ') // เมถุน = กดุมภะ
    expect(houseMap.get(6)).toBe('อริ')     // ตุลย์ = อริ
    expect(houseMap.get(0)).toBe('วินาศ')   // เมษ = วินาศ
  })

  it('Step 6: assignTimes เริ่มที่ ตุลย์ เวลา 10:37:30', () => {
    const yr = getYam(WED_YAM4)
    const fm = buildFloatingStarMap(yr)
    const pos = placeStarsInZodiac(fm)
    const { houseMap } = assignHouses(pos)
    const cells = assignTimes(yr, pos, houseMap)

    // เกษตรลัคนา (พฤษภ) = 6 (ศุกร์) → ดาว ๖ อยู่ ตุลย์ (6) → เริ่มที่ตุลย์
    expect(cells[0].rasi).toBe(6)            // ตุลย์
    expect(cells[0].time).toBe('10:37:30')

    expect(cells[1].rasi).toBe(7)            // พิจิก
    expect(cells[1].time).toBe('10:45:00')

    expect(cells[2].rasi).toBe(8)            // ธนู
    expect(cells[2].time).toBe('10:52:30')

    expect(cells[6].rasi).toBe(0)            // เมษ
    expect(cells[6].time).toBe('11:22:30')

    // ช่องสุดท้าย = กันย์ เวลา 12:00:00 (ปิดยาม)
    expect(cells[11].rasi).toBe(5)           // กันย์
    expect(cells[11].time).toBe('12:00:00')
  })

  it('calculatePhraKrasib: ผลรวมครบ 6 ขั้นตอน', () => {
    const chart = calculatePhraKrasib(WED_YAM4)

    expect(chart.yamAsked).toBe(4)
    expect(chart.period).toBe('day')
    expect(chart.lagnaCellIndex).toBe(1)     // พฤษภ
    expect(chart.kasetchCenter).toBe(6)      // ศุกร์
    expect(chart.timeStartCell).toBe(6)      // ตุลย์
    expect(chart.timeStartValue).toBe('10:37:30')

    // zodiacCell พฤษภ ต้องมีดาว ลั และเป็น ตนุ
    const taurusCell = chart.zodiacCells.find(c => c.rasiIndex === 1)
    expect(taurusCell?.houseName).toBe('ตนุ')
    expect(taurusCell?.floatingStars).toContain('la')

    // zodiacCell มีน ต้องมีดาว ๗, ๘, ๐
    const piscesCell = chart.zodiacCells.find(c => c.rasiIndex === 11)
    expect(piscesCell?.floatingStars).toContain(7)
    expect(piscesCell?.floatingStars).toContain(8)
    expect(piscesCell?.floatingStars).toContain(0)
  })
})

describe('PhraKrasib Engine — วันจันทร์ ยาม 2 กลางวัน (08:00)', () => {
  const MON_YAM2 = new Date('2026-06-08T08:00:00+07:00')

  it('Step 1: getYam ระบุยาม 2 วันจันทร์ ได้', () => {
    const r = getYam(MON_YAM2)
    expect(r.dayOfWeek).toBe(1)        // จันทร์
    expect(r.yamNumber).toBe(2)
    expect(r.atthakarnAtYam).toBe(7)   // อัฏฐกาลจันทร์ ยาม2 = 7
  })
})
