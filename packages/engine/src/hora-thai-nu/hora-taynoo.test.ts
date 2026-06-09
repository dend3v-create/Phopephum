import { describe, it, expect } from 'vitest'
import { calculateHoraTaynoo } from './hora-taynoo-engine'

describe('Hora Taynoo Engine (ยามอัฐกาล & ดาวลอย)', () => {
  it('ควรคำนวณเคสวันพุธ ยามที่ 4 (กลางวัน 10:32 น.) ได้ถูกต้องตามตำรา อ.กานดา', () => {
    // วันพุธที่ 10 มิถุนายน 2569 (2026-06-10) เวลา 10:32 น.
    // วันพุธ = day 3 (อาทิตย์=0, จันทร์=1, อังคาร=2, พุธ=3)
    const testDate = new Date('2026-06-10T10:32:00+07:00')
    const result = calculateHoraTaynoo({ dateAsked: testDate })

    expect(result.dayOfWeek).toBe(3) // วันพุธ
    expect(result.period).toBe('day') // กลางวัน
    expect(result.yamAsked).toBe(4) // ยามที่ 4 (10:30 - 12:00)

    // ดาวเจ้ายามพุธยาม 4 คือ 5 (พฤหัส)
    expect(result.yamPlanet).toBe(5)

    // ตรวจสอบตำแหน่งดาวลอย 11 ดวง (index ตาม ZODIAC_ORDER: 0=พฤษภ, 4=กันย์, 6=พิจิก, 11=เมษ...)
    // ดาว ๑: กันย์ (Virgo / index 4)
    expect(result.planetEntries[0].label).toBe('1')
    expect(result.planetEntries[0].zodiacIndex).toBe(4)

    // ดาว ๒: พิจิก (Scorpio / index 6)
    expect(result.planetEntries[1].label).toBe('2')
    expect(result.planetEntries[1].zodiacIndex).toBe(6)

    // ดาว ๓: พิจิก (Scorpio / index 6)
    expect(result.planetEntries[2].label).toBe('3')
    expect(result.planetEntries[2].zodiacIndex).toBe(6)

    // ดาว ๔: เมษ (Aries / index 11)
    expect(result.planetEntries[3].label).toBe('4')
    expect(result.planetEntries[3].zodiacIndex).toBe(11)

    // ดาว ๕: กรกฎ (Cancer / index 2)
    expect(result.planetEntries[4].label).toBe('5')
    expect(result.planetEntries[4].zodiacIndex).toBe(2)

    // ดาว ๖: ตุลย์ (Libra / index 5)
    expect(result.planetEntries[5].label).toBe('6')
    expect(result.planetEntries[5].zodiacIndex).toBe(5)

    // ดาว ๗: พิจิก (Scorpio / index 6)
    expect(result.planetEntries[6].label).toBe('7')
    expect(result.planetEntries[6].zodiacIndex).toBe(6)

    // ดาว ๘: พฤษภ (Taurus / index 0)
    expect(result.planetEntries[7].label).toBe('8')
    expect(result.planetEntries[7].zodiacIndex).toBe(0)

    // ดาว ลั: กันย์ (Virgo / index 4)
    expect(result.planetEntries[8].label).toBe('ล')
    expect(result.planetEntries[8].zodiacIndex).toBe(4)

    // ดาว ๙: พิจิก (Scorpio / index 6)
    expect(result.planetEntries[9].label).toBe('9')
    expect(result.planetEntries[9].zodiacIndex).toBe(6)

    // ดาว ๐: พิจิก (Scorpio / index 6)
    expect(result.planetEntries[10].label).toBe('0')
    expect(result.planetEntries[10].zodiacIndex).toBe(6)

    // ตรวจสอบลัคนาและดาวเจ้าเรือนลัคนา
    // ลัคนาอยู่ที่ กันย์ (Virgo / index 4)
    // ดาวเจ้าเรือนของกันย์คือ 4 (พุธ)
    expect(result.lagnaZodiacIndex).toBe(4)
    expect(result.lagnaRulerPlanet).toBe(4)

    // ดาว ๔ สถิตที่ เมษ (Aries / index 11)
    // ดังนั้นจุดลงเวลายามย่อยเริ่มต้นที่ เมษ
    expect(result.timeStartZodiacIndex).toBe(11)

    // ตรวจสอบทิศทางการวนยามย่อย (วนตามเข็มนาฬิกา / ย้อนลำดับราศี)
    const expectedSlots = [
      { name: 'เมษ', min: '10:30' },
      { name: 'มีน', min: '10:37.30' },
      { name: 'กุมภ์', min: '10:45' },
      { name: 'มังกร', min: '10:52.30' },
      { name: 'ธนู', min: '11:00' },
      { name: 'พิจิก', min: '11:07.30' },
      { name: 'ตุลย์', min: '11:15' },
      { name: 'กันย์', min: '11:22.30' },
      { name: 'สิงห์', min: '11:30' },
      { name: 'กรกฎ', min: '11:37.30' },
      { name: 'เมถุน', min: '11:45' },
      { name: 'พฤษภ', min: '11:52.30' }
    ]

    result.subTimeSlots.forEach((slot, index) => {
      expect(slot.zodiacName).toBe(expectedSlots[index].name)
      expect(slot.startStr).toBe(expectedSlots[index].min)
    })
  })
})
