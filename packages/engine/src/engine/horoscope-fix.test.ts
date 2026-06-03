import { describe, it, expect } from 'vitest';
import { calculateNineBases } from '../engine/seven-numbers-v2';

describe('Horoscope Matrix - Feb 27 2024 (Example Case)', () => {
  it('should calculate the correct seeds for Feb 27, 2024 07:17 AM', async () => {
    const input = {
      birthDate: "2024-02-27",
      birthTime: "07:17"
    };
    
    const result = calculateNineBases(input);
    
    // Feb 27, 2024 is Tuesday (Day 3)
    // Month is Thai Month 2 (Ref project numbering: Jan=1, Feb=2)
    // Year is 2566 Rabbit (4)
    
    console.log("Thai Date Text:", result.lunarDate.thaiDateText);
    
    expect(result.lunarDate.dayName).toBe('อังคาร');
    expect(result.lunarDate.lunarMonth).toBe(2);
    expect(result.lunarDate.zodiacName).toBe('เถาะ');
    
    // Seeds
    expect(result.bases[0][0]).toBe(3); // B1 First
    expect(result.bases[1][0]).toBe(2); // B2 First
    expect(result.bases[2][0]).toBe(4); // B3 First
  });
});
