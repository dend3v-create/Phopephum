import { describe, it, expect } from 'vitest'
import { calculateAtthakarn } from './calculateAtthakarn.js'

describe('calculateAtthakarn - Phase and Boundary Verification', () => {
  const sampleDate = '2026-05-31' // Sunday

  describe('Daytime Yam 1 (06:00 - 07:30) Phase Boundaries', () => {
    it('06:00 (offset 0m) should be ยามต้น (ฐาน 1)', () => {
      const res = calculateAtthakarn(sampleDate, '06:00')
      expect(res.period).toBe('day')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('start')
      expect(res.phaseLabel).toBe('ยามต้น')
      expect(res.phaseBase).toBe(1)
      expect(res.minuteInYam).toBe(0)
    })

    it('06:29 (offset 29m) should be ยามต้น (ฐาน 1)', () => {
      const res = calculateAtthakarn(sampleDate, '06:29')
      expect(res.period).toBe('day')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('start')
      expect(res.phaseLabel).toBe('ยามต้น')
      expect(res.phaseBase).toBe(1)
      expect(res.minuteInYam).toBe(29)
    })

    it('06:30 (offset 30m) should be ยามกลาง (ฐาน 2)', () => {
      const res = calculateAtthakarn(sampleDate, '06:30')
      expect(res.period).toBe('day')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('middle')
      expect(res.phaseLabel).toBe('ยามกลาง')
      expect(res.phaseBase).toBe(2)
      expect(res.minuteInYam).toBe(30)
    })

    it('06:59 (offset 59m) should be ยามกลาง (ฐาน 2)', () => {
      const res = calculateAtthakarn(sampleDate, '06:59')
      expect(res.period).toBe('day')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('middle')
      expect(res.phaseLabel).toBe('ยามกลาง')
      expect(res.phaseBase).toBe(2)
      expect(res.minuteInYam).toBe(59)
    })

    it('07:00 (offset 60m) should be ยามปลาย (ฐาน 3)', () => {
      const res = calculateAtthakarn(sampleDate, '07:00')
      expect(res.period).toBe('day')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('end')
      expect(res.phaseLabel).toBe('ยามปลาย')
      expect(res.phaseBase).toBe(3)
      expect(res.minuteInYam).toBe(60)
    })

    it('07:29 (offset 89m) should be ยามปลาย (ฐาน 3)', () => {
      const res = calculateAtthakarn(sampleDate, '07:29')
      expect(res.period).toBe('day')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('end')
      expect(res.phaseLabel).toBe('ยามปลาย')
      expect(res.phaseBase).toBe(3)
      expect(res.minuteInYam).toBe(89)
    })
  })

  describe('Nighttime Yam 1 (18:00 - 19:30) Phase Boundaries', () => {
    it('18:00 (offset 0m) should be ยามต้น (ฐาน 1)', () => {
      const res = calculateAtthakarn(sampleDate, '18:00')
      expect(res.period).toBe('night')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('start')
      expect(res.phaseLabel).toBe('ยามต้น')
      expect(res.phaseBase).toBe(1)
      expect(res.minuteInYam).toBe(0)
    })

    it('18:29 (offset 29m) should be ยามต้น (ฐาน 1)', () => {
      const res = calculateAtthakarn(sampleDate, '18:29')
      expect(res.period).toBe('night')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('start')
      expect(res.phaseLabel).toBe('ยามต้น')
      expect(res.phaseBase).toBe(1)
      expect(res.minuteInYam).toBe(29)
    })

    it('18:30 (offset 30m) should be ยามกลาง (ฐาน 2)', () => {
      const res = calculateAtthakarn(sampleDate, '18:30')
      expect(res.period).toBe('night')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('middle')
      expect(res.phaseLabel).toBe('ยามกลาง')
      expect(res.phaseBase).toBe(2)
      expect(res.minuteInYam).toBe(30)
    })

    it('18:59 (offset 59m) should be ยามกลาง (ฐาน 2)', () => {
      const res = calculateAtthakarn(sampleDate, '18:59')
      expect(res.period).toBe('night')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('middle')
      expect(res.phaseLabel).toBe('ยามกลาง')
      expect(res.phaseBase).toBe(2)
      expect(res.minuteInYam).toBe(59)
    })

    it('19:00 (offset 60m) should be ยามปลาย (ฐาน 3)', () => {
      const res = calculateAtthakarn(sampleDate, '19:00')
      expect(res.period).toBe('night')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('end')
      expect(res.phaseLabel).toBe('ยามปลาย')
      expect(res.phaseBase).toBe(3)
      expect(res.minuteInYam).toBe(60)
    })

    it('19:29 (offset 89m) should be ยามปลาย (ฐาน 3)', () => {
      const res = calculateAtthakarn(sampleDate, '19:29')
      expect(res.period).toBe('night')
      expect(res.horaNumber).toBe(1)
      expect(res.phase).toBe('end')
      expect(res.phaseLabel).toBe('ยามปลาย')
      expect(res.phaseBase).toBe(3)
      expect(res.minuteInYam).toBe(89)
    })
  })

  describe('Midnight & Late Night (00:00 - 05:59) Boundaries', () => {
    it('00:00 (Yam 5 Night, offset 0m) should be ยามต้น (ฐาน 1)', () => {
      const res = calculateAtthakarn(sampleDate, '00:00')
      expect(res.period).toBe('night')
      expect(res.horaNumber).toBe(5)
      expect(res.phase).toBe('start')
      expect(res.phaseBase).toBe(1)
      expect(res.minuteInYam).toBe(0)
    })

    it('00:29 (offset 29m) should be ยามต้น (ฐาน 1)', () => {
      const res = calculateAtthakarn(sampleDate, '00:29')
      expect(res.phase).toBe('start')
      expect(res.phaseBase).toBe(1)
      expect(res.minuteInYam).toBe(29)
    })

    it('00:30 (offset 30m) should be ยามกลาง (ฐาน 2)', () => {
      const res = calculateAtthakarn(sampleDate, '00:30')
      expect(res.phase).toBe('middle')
      expect(res.phaseBase).toBe(2)
      expect(res.minuteInYam).toBe(30)
    })

    it('00:59 (offset 59m) should be ยามกลาง (ฐาน 2)', () => {
      const res = calculateAtthakarn(sampleDate, '00:59')
      expect(res.phase).toBe('middle')
      expect(res.phaseBase).toBe(2)
      expect(res.minuteInYam).toBe(59)
    })

    it('01:00 (offset 60m) should be ยามปลาย (ฐาน 3)', () => {
      const res = calculateAtthakarn(sampleDate, '01:00')
      expect(res.phase).toBe('end')
      expect(res.phaseBase).toBe(3)
      expect(res.minuteInYam).toBe(60)
    })

    it('01:29 (offset 89m) should be ยามปลาย (ฐาน 3)', () => {
      const res = calculateAtthakarn(sampleDate, '01:29')
      expect(res.phase).toBe('end')
      expect(res.phaseBase).toBe(3)
      expect(res.minuteInYam).toBe(89)
    })

    it('05:59 (Yam 8 Night final minute, offset 89m) should be ยามปลาย (ฐาน 3)', () => {
      const res = calculateAtthakarn(sampleDate, '05:59')
      expect(res.period).toBe('night')
      expect(res.horaNumber).toBe(8)
      expect(res.phase).toBe('end')
      expect(res.phaseBase).toBe(3)
      expect(res.minuteInYam).toBe(89)
    })
  })
})
