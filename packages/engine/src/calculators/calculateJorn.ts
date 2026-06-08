/**
 * packages/engine/src/calculators/calculateJorn.ts
 * คำนวณดวงจร (Progressed Calculations) สำหรับระบบ PhopePhum
 * ครอบคลุม วัยจร, ปีจร, เดือนจร, วันจร
 */

import { FateMatrix } from '../types/fateMatrix.js';

export interface JornResult {
  row: number;        // 1-based row
  col: number;        // 1-based col
  houseName: string;
  star: number;
  yumStar?: number;
  yumBase?: number;   // 1-based base index
  ageRange?: string;  // For Vaya Jorn
}

export const PHOPEPHUM_HOUSES: string[][] = [
  ['อัตตะ', 'หินะ', 'ธะนัง', 'ปิตา', 'มาตา', 'โภคา', 'มัชฌิมา'],
  ['ตนุ', 'กดุมภะ', 'สหัชชะ', 'พันธุ', 'ปุตตะ', 'อริ', 'ปัตนิ'],
  ['มรณะ', 'สุภะ', 'กัมมะ', 'ลาภะ', 'พยายะ', 'ทาสา', 'ทาสี'],
];

/**
 * คำนวณวัยจร (Life Age Period)
 * นับจากบนลงล่างทีละคอลัมน์ (Row 1 -> 2 -> 3)
 * แต่ละช่องกินระยะเวลาเท่ากับตัวเลขดาวในช่องนั้น
 */
export function calculateVayaJorn(matrix: FateMatrix, age: number): JornResult {
  let currentAgeStart = 1;
  
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 3; row++) {
      const star = matrix[row][col];
      const currentAgeEnd = currentAgeStart + star - 1;
      
      if (age >= currentAgeStart && age <= currentAgeEnd) {
        const yumBase = row === 0 ? 5 : (row === 1 ? 6 : 7);
        const yumStar = matrix[yumBase - 1][col];
        return {
          row: row + 1,
          col: col + 1,
          houseName: PHOPEPHUM_HOUSES[row][col],
          star: star,
          yumBase,
          yumStar,
          ageRange: `${currentAgeStart}-${currentAgeEnd}`
        };
      }

      currentAgeStart = currentAgeEnd + 1;
    }
  }

  return {
    row: 3,
    col: 7,
    houseName: PHOPEPHUM_HOUSES[2][6],
    star: matrix[2][6],
    yumBase: 7,
    yumStar: matrix[6][6],
    ageRange: "84+"
  };
}

/**
 * คำนวณปีจร (Yearly Forecast)
 * นับไล่แนวนอนทีละช่อง 1-7 (Row 1), 8-14 (Row 2), 15-21 (Row 3)
 */
export function calculateYearlyJorn(matrix: FateMatrix, age: number): JornResult {
  const position = (age - 1) % 21;
  const row = Math.floor(position / 7);
  const col = position % 7;
  
  const star = matrix[row][col];
  const yumBase = row === 0 ? 5 : (row === 1 ? 6 : 7);
  const yumStar = matrix[yumBase - 1][col];
  
  return {
    row: row + 1,
    col: col + 1,
    houseName: PHOPEPHUM_HOUSES[row][col],
    star: star,
    yumBase: yumBase,
    yumStar: yumStar
  };
}

/**
 * คำนวณเดือนจร (Monthly Forecast)
 * เริ่มที่ภพพันธุ (Row 2, Col 4) = เดือน 1
 */
export function calculateMonthlyJorn(matrix: FateMatrix, lunarMonth: number): JornResult {
  const startCol = 3; // Index 3 is Col 4 (พันธุ)
  const col = (startCol + (lunarMonth - 1)) % 7;
  const row = 1; // ฐานเดือน (Base 2)
  
  const star = matrix[row][col];
  const yumBase = 6;
  const yumStar = matrix[yumBase - 1][col];
  
  return {
    row: row + 1,
    col: col + 1,
    houseName: PHOPEPHUM_HOUSES[row][col],
    star: star,
    yumBase: yumBase,
    yumStar: yumStar
  };
}

/**
 * คำนวณวันจร (Daily Forecast)
 * เริ่มที่ภพอัตตะ (Row 1, Col 1) = วันเสาร์
 */
export function calculateDailyJorn(matrix: FateMatrix, dayOfWeek: number): JornResult {
  const dayMap: Record<number, number> = { 7: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
  const col = dayMap[dayOfWeek] ?? 0;
  const row = 0; // ฐานวัน (Base 1)
  
  const star = matrix[row][col];
  const yumBase = 5;
  const yumStar = matrix[yumBase - 1][col];
  
  return {
    row: row + 1,
    col: col + 1,
    houseName: PHOPEPHUM_HOUSES[row][col],
    star: star,
    yumBase: yumBase,
    yumStar: yumStar
  };
}
