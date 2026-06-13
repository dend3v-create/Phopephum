import { describe, it, expect } from 'vitest'
import { calculateHoraTaynoo } from './hora-taynoo-engine'

describe('Monday Daytime Yarm Correction', () => {
  it('ควรคำนวณยามอัฐกาลวันจันทร์ กลางวัน ได้ถูกต้องตามลำดับตำรา อ.กานดา [2, 7, 5, 3, 1, 6, 4, 2]', () => {
    const mondayDay = new Date('2026-06-08T08:00:00+07:00') // วันจันทร์ 8 มิ.ย. 2569
    
    // ยามที่ 1: 06:00 - 07:30
    const res1 = calculateHoraTaynoo({ dateAsked: new Date('2026-06-08T07:00:00+07:00') })
    expect(res1.yamAsked).toBe(1)
    expect(res1.yamPlanet).toBe(2)

    // ยามที่ 2: 07:30 - 09:00 (เจ้ายามคือ 7)
    const res2 = calculateHoraTaynoo({ dateAsked: new Date('2026-06-08T08:00:00+07:00') })
    expect(res2.yamAsked).toBe(2)
    expect(res2.yamPlanet).toBe(7)

    // ยามที่ 3: 09:00 - 10:30 (เจ้ายามคือ 5)
    const res3 = calculateHoraTaynoo({ dateAsked: new Date('2026-06-08T10:00:00+07:00') })
    expect(res3.yamAsked).toBe(3)
    expect(res3.yamPlanet).toBe(5)

    // ยามที่ 4: 10:30 - 12:00 (เจ้ายามคือ 3)
    const res4 = calculateHoraTaynoo({ dateAsked: new Date('2026-06-08T11:00:00+07:00') })
    expect(res4.yamAsked).toBe(4)
    expect(res4.yamPlanet).toBe(3)

    // ยามที่ 5: 12:00 - 13:30 (เจ้ายามคือ 1)
    const res5 = calculateHoraTaynoo({ dateAsked: new Date('2026-06-08T13:00:00+07:00') })
    expect(res5.yamAsked).toBe(5)
    expect(res5.yamPlanet).toBe(1)

    // ยามที่ 6: 13:30 - 15:00 (เจ้ายามคือ 6)
    const res6 = calculateHoraTaynoo({ dateAsked: new Date('2026-06-08T14:00:00+07:00') })
    expect(res6.yamAsked).toBe(6)
    expect(res6.yamPlanet).toBe(6)

    // ยามที่ 7: 15:00 - 16:30 (เจ้ายามคือ 4)
    const res7 = calculateHoraTaynoo({ dateAsked: new Date('2026-06-08T16:00:00+07:00') })
    expect(res7.yamAsked).toBe(7)
    expect(res7.yamPlanet).toBe(4)

    // ยามที่ 8: 16:30 - 18:00 (เจ้ายามคือ 2)
    const res8 = calculateHoraTaynoo({ dateAsked: new Date('2026-06-08T17:00:00+07:00') })
    expect(res8.yamAsked).toBe(8)
    expect(res8.yamPlanet).toBe(2)
  })
})
