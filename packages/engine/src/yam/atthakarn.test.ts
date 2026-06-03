import { describe, it, expect } from 'vitest'
import { getAtthakarnAt } from './services/yamService.js'

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
})
