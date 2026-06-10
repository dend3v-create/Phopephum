import { describe, it, expect } from 'vitest'
import { getAtthakarnAt, getYamPrediction } from './services/yamService.js'

describe('Atthakarn Engine Logic - Astrological Day Verification', () => {
  
  it('should be Sunday at 07:00 AM on a calendar Sunday', () => {
    // 31 พฤษภาคม 2569 (Sunday) 07:00 AM -> Sunday
    const testDate = new Date('2026-05-31T07:00:00+07:00')
    const result = getAtthakarnAt(testDate)
    expect(result.day).toBe('sunday')
    expect(result.period).toBe('day')
  })

  it('should STILL be Sunday at 01:00 AM on a calendar Monday', () => {
    // 1 มิถุนายน 2569 (Monday) 01:00 AM
    // ตามหลักโหราศาสตร์ (เปลี่ยน 06:01) ต้องยังเป็น "วันอาทิตย์"
    const testDate = new Date('2026-06-01T01:00:00+07:00') 
    const result = getAtthakarnAt(testDate)
    
    expect(result.day).toBe('sunday') // ✅ ต้องเป็น sunday ไม่ใช่ monday
    expect(result.period).toBe('night')
    expect(result.yamNumber).toBe(5) 
  })

  it('should transition to Monday at 06:01 AM on a calendar Monday', () => {
    // 1 มิถุนายน 2569 (Monday) 06:05 AM
    // พ้นเวลา 06:01 แล้ว ต้องเปลี่ยนเป็น "วันจันทร์"
    const testDate = new Date('2026-06-01T06:05:00+07:00') 
    const result = getAtthakarnAt(testDate)
    
    expect(result.day).toBe('monday') // ✅ เปลี่ยนเป็นจันทร์แล้ว
    expect(result.period).toBe('day')
    expect(result.yamNumber).toBe(1)
  })

  it('should handle Saturday to Sunday transition correctly', () => {
    // เช้าวันอาทิตย์ (ตามปฏิทิน) เวลา 05:00 AM
    // ต้องยังเป็น "วันเสาร์"
    const testDate = new Date('2026-05-31T05:00:00+07:00')
    const result = getAtthakarnAt(testDate)
    expect(result.day).toBe('saturday')
    expect(result.period).toBe('night')
    expect(result.yamNumber).toBe(8)
  })

  it('should return valid prediction and travel description for all primary and alias yams', () => {
    // 1. สุริชะ (ยาม 1 กลางวัน อาทิตย์)
    const sunDate = new Date('2026-05-31T07:00:00+07:00')
    const resSun = getYamPrediction(sunDate)
    expect(resSun.yamName).toBe('สุริชะ')
    expect(resSun.prediction).toBeDefined()
    expect(resSun.travelAuspiciousness.description).not.toBe('ไม่พบคำพยากรณ์การเดินทาง')

    // 2. ศะศิ (ยาม 3 กลางคืน อาทิตย์)
    const sasiDate = new Date('2026-05-31T21:30:00+07:00')
    const resSasi = getYamPrediction(sasiDate)
    expect(resSasi.yamName).toBe('ศะศิ')
    expect(resSasi.prediction).toBeDefined()
    expect(resSasi.travelAuspiciousness.description).not.toBe('ไม่พบคำพยากรณ์การเดินทาง')

    // 3. พุธะ (ยาม 3 กลางวัน อาทิตย์)
    const putDate = new Date('2026-05-31T10:00:00+07:00')
    const resPut = getYamPrediction(putDate)
    expect(resPut.yamName).toBe('พุธะ')
    expect(resPut.prediction).toBeDefined()
    expect(resPut.travelAuspiciousness.description).not.toBe('ไม่พบคำพยากรณ์การเดินทาง')

    // 4. พุโธ (ยาม 7 กลางคืน อาทิตย์)
    // 03:30 น. ของเช้าวันจันทร์ตามปฏิทิน (1 มิถุนายน) = ยาม 7 คืนวันอาทิตย์
    const puthoDate = new Date('2026-06-01T03:30:00+07:00')
    const resPutho = getYamPrediction(puthoDate)
    expect(resPutho.yamName).toBe('พุโธ')
    expect(resPutho.prediction).toBeDefined()
    expect(resPutho.travelAuspiciousness.description).not.toBe('ไม่พบคำพยากรณ์การเดินทาง')
  })
})
