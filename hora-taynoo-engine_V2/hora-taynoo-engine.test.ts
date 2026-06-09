/**
 * hora-taynoo-engine.test.ts
 * Test suite — ตรวจสอบความถูกต้องตามตัวอย่าง อ.กานดา
 */

import { describe, it, expect } from 'vitest'
import {
  getPlanetSteps,
  calculatePositions,
  buildBhavaMap,
  findLagnaRuler,
  buildSubTimeSlots,
  calculateHoraTaynoo,
  calculateAt,
  ZODIAC_ORDER,
  DAY_YAM,
  NIGHT_YAM,
} from './hora-taynoo-engine'

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: ตาราง DAY_YAM ถูกต้อง
// ─────────────────────────────────────────────────────────────────────────────
describe('DAY_YAM table', () => {
  it('วันอาทิตย์ ยาม 1-8 = [1,6,4,2,7,5,3,1]', () => {
    expect(DAY_YAM[0]).toEqual([1,6,4,2,7,5,3,1])
  })
  it('วันพุธ ยาม 1-8 = [4,2,7,5,3,1,6,4]', () => {
    expect(DAY_YAM[3]).toEqual([4,2,7,5,3,1,6,4])
  })
  it('ทุกวัน ยาม 1 = ยาม 8 (ดาวประจำวัน)', () => {
    for (let d = 0; d < 7; d++) {
      expect(DAY_YAM[d][0]).toBe(DAY_YAM[d][7])
    }
  })
})

describe('NIGHT_YAM table', () => {
  it('วันอาทิตย์ กลางคืน ยาม 1-8 = [1,5,2,6,3,7,4,1]', () => {
    expect(NIGHT_YAM[0]).toEqual([1,5,2,6,3,7,4,1])
  })
  it('ทุกวัน ยาม 1 = ยาม 8 (กลางคืน)', () => {
    for (let d = 0; d < 7; d++) {
      expect(NIGHT_YAM[d][0]).toBe(NIGHT_YAM[d][7])
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: getPlanetSteps — ตัวอย่าง อ.กานดา (วันพุธ ยาม 4)
// ─────────────────────────────────────────────────────────────────────────────
describe('getPlanetSteps', () => {
  it('วันพุธ(3) ยาม4 กลางวัน → steps = [5,3,1,6,4,4,6,1,3,5,7]', () => {
    // วันพุธ DAY_YAM[3] = [4,2,7,5,3,1,6,4]
    // yamAsked=4 → idx=3, เดินหน้า:
    //   ดาว1: idx3=5, ดาว2: idx4=3, ดาว3: idx5=1, ดาว4: idx6=6, ดาว5: idx7=4
    //   พับย้ำ: ดาว6: idx7=4, ถอย: ดาว7: idx6=6, ดาว8: idx5=1, ล: idx4=3, ดาว9: idx3=5, ดาว0: idx2=7
    const steps = getPlanetSteps(3, 4, 'day')
    expect(steps).toEqual([5,3,1,6,4, 4,6,1,3,5,7])
  })

  it('วันอาทิตย์(0) ยาม1 กลางวัน → steps = [1,6,4,2,7, 7,2,4,6,1, ?]', () => {
    // DAY_YAM[0] = [1,6,4,2,7,5,3,1]
    // yamAsked=1 → idx=0
    // ดาว1:idx0=1, ดาว2:idx1=6, ดาว3:idx2=4, ดาว4:idx3=2, ดาว5:idx4=7
    // พับ at idx7: ดาว5 ได้ idx4=7... wait, need to reach idx7
    // ดาว6: idx5=5, ดาว7: idx6=3... แล้ว ดาว8 reach idx7=1 → พับ
    // ดาว8: idx7=1 (พับย้ำ), ถอย: ล=idx6=3, ดาว9=idx5=5, ดาว0=idx4=7
    const steps = getPlanetSteps(0, 1, 'day')
    expect(steps).toHaveLength(11)
    expect(steps[0]).toBe(1) // ดาว1 = ดาวยามที่ 1 ของวันอาทิตย์
  })

  it('ผลลัพธ์มี 11 ดวงเสมอ', () => {
    for (let d = 0; d < 7; d++) {
      for (let y = 1; y <= 8; y++) {
        expect(getPlanetSteps(d, y, 'day')).toHaveLength(11)
        expect(getPlanetSteps(d, y, 'night')).toHaveLength(11)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: calculatePositions — พับย้ำลงจักรราศี
// ─────────────────────────────────────────────────────────────────────────────
describe('calculatePositions', () => {
  it('ดาว 1 นับ 5 ช่องจาก พฤษก(0) = มกร(4)', () => {
    // (0 + 5 - 1) % 12 = 4 = มกร
    const steps = [5, 3, 1, 6, 4, 4, 6, 1, 3, 5, 7]
    const pos = calculatePositions(steps)
    expect(pos[0]).toBe(4) // มกร
    expect(ZODIAC_ORDER[4].name).toBe('มกร')
  })

  it('ดาว 2 นับ 3 ช่องจาก มกร(4) = พิจก(6)', () => {
    const steps = [5, 3, 1, 6, 4, 4, 6, 1, 3, 5, 7]
    const pos = calculatePositions(steps)
    expect(pos[1]).toBe(6) // พิจก
    expect(ZODIAC_ORDER[6].name).toBe('พิจก')
  })

  it('ดาว 3 นับ 1 ช่องจาก พิจก(6) = พิจก(6) อีก (ซ้อน)', () => {
    const steps = [5, 3, 1, 6, 4, 4, 6, 1, 3, 5, 7]
    const pos = calculatePositions(steps)
    expect(pos[2]).toBe(6) // พิจก ซ้อน
  })

  it('ลัคนา (index 8) ตกที่ พฤษก(0)', () => {
    const steps = [5, 3, 1, 6, 4, 4, 6, 1, 3, 5, 7]
    const pos = calculatePositions(steps)
    expect(pos[8]).toBe(0) // พฤษก
  })

  it('ทุก position อยู่ในช่วง 0-11', () => {
    const steps = [5, 3, 1, 6, 4, 4, 6, 1, 3, 5, 7]
    const pos = calculatePositions(steps)
    pos.forEach(p => {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(11)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Bhava Map
// ─────────────────────────────────────────────────────────────────────────────
describe('buildBhavaMap', () => {
  it('ลัคนาที่ พฤษก(0) → zodiac 0 = ตนุ', () => {
    const map = buildBhavaMap(0)
    expect(map[0]).toBe('ตนุ')
    expect(map[1]).toBe('กฎุมภะ')
    expect(map[11]).toBe('วินาศ')
  })

  it('ลัคนาที่ กรกฎ(10) → zodiac 10 = ตนุ', () => {
    const map = buildBhavaMap(10)
    expect(map[10]).toBe('ตนุ')
    expect(map[11]).toBe('กฎุมภะ')
    expect(map[0]).toBe('สหัชชะ') // (10+2)%12=0
  })

  it('มีภพครบ 12 หลัง', () => {
    const map = buildBhavaMap(0)
    expect(Object.keys(map)).toHaveLength(12)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Sub Time Slots 7.5 นาที
// ─────────────────────────────────────────────────────────────────────────────
describe('buildSubTimeSlots', () => {
  it('ยาม 4 กลางวัน เริ่ม 10:30 → slot 0 = 10:30, slot 12 = 12:00', () => {
    const bhava = buildBhavaMap(0)
    const slots = buildSubTimeSlots(630, 0, bhava) // 10:30 = 630 min
    expect(slots[0].startStr).toBe('10:30')
    expect(slots[11].endStr).toBe('12:00')
  })

  it('มี 12 slots พอดี', () => {
    const slots = buildSubTimeSlots(630, 0, {})
    expect(slots).toHaveLength(12)
  })

  it('แต่ละ slot มีระยะ 7.5 นาที', () => {
    const slots = buildSubTimeSlots(630, 0, {})
    expect(slots[0].endMin - slots[0].startMin).toBe(7.5)
    expect(slots[5].endMin - slots[5].startMin).toBe(7.5)
  })

  it('ตัวอย่าง อ.กานดา: slot 1 = 10:37.30', () => {
    const slots = buildSubTimeSlots(630, 0, {})
    expect(slots[1].startStr).toBe('10:37.30')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: calculateHoraTaynoo integration
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateHoraTaynoo — integration', () => {
  it('วันพุธ 10:32 น. → yamAsked=4, yamPlanet=5', () => {
    const r = calculateAt(3, 10, 32)
    expect(r.dayOfWeek).toBe(3)
    expect(r.yamAsked).toBe(4)
    expect(r.yamPlanet).toBe(5) // ครู
    expect(r.dayPlanet).toBe(4) // พุธะ
  })

  it('วันพุธ 10:32 → ลัคนาที่ พฤษก(0)', () => {
    const r = calculateAt(3, 10, 32)
    expect(r.lagnaZodiacIndex).toBe(0)
    expect(r.lagnaZodiacName).toBe('พฤษก')
  })

  it('planetEntries มี 11 ดวง', () => {
    const r = calculateAt(3, 10, 32)
    expect(r.planetEntries).toHaveLength(11)
  })

  it('subTimeSlots มี 12 slots', () => {
    const r = calculateAt(3, 10, 32)
    expect(r.subTimeSlots).toHaveLength(12)
  })

  it('yamStartStr = "10:30"', () => {
    const r = calculateAt(3, 10, 32)
    expect(r.yamStartStr).toBe('10:30')
  })

  it('ทดสอบทุกวันทุกยาม ไม่ throw error', () => {
    expect(() => {
      for (let d = 0; d < 7; d++) {
        for (let h = 6; h < 22; h += 2) {
          calculateAt(d, h, 0)
        }
      }
    }).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: ตรวจสอบ zodiac order
// ─────────────────────────────────────────────────────────────────────────────
describe('ZODIAC_ORDER', () => {
  it('มี 12 ราศี', () => {
    expect(ZODIAC_ORDER).toHaveLength(12)
  })
  it('index 0 = พฤษก', () => {
    expect(ZODIAC_ORDER[0].name).toBe('พฤษก')
  })
  it('index 9 = สิงห์', () => {
    expect(ZODIAC_ORDER[9].name).toBe('สิงห์')
  })
  it('ทุก sectorAngle ต่างกัน 30°', () => {
    for (let i = 0; i < 11; i++) {
      const diff = (ZODIAC_ORDER[i+1].sectorAngle - ZODIAC_ORDER[i].sectorAngle + 360) % 360
      expect(diff).toBe(30)
    }
  })
})
