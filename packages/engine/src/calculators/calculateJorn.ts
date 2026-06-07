/**
 * packages/engine/src/calculators/calculateJorn.ts
 * คำนวณดวงจร (Progressed Calculations) สำหรับระบบ PhopePhum
 * ครอบคลุม วัยจร, ปีจร, เดือนจร, วันจร
 */

import { FateMatrix, BASE4_MEANINGS, POWER_TO_STAR, STAR_DIRECTIONS } from '../types/fateMatrix.js';
import { TaksaMap, TaksaBhop, StarNumber } from '@phopephum/types';

export interface JornResult {
  row: number;        // 1-based row
  col: number;        // 1-based col
  houseName: string;
  star: number;
  yumStar?: number;
  yumBase?: number;   // 1-based base index
  ageRange?: string;  // For Vaya Jorn
  base4Power?: number;
  base4Meaning?: string;
  base4Taksa?: TaksaBhop;
  base4Direction?: string;
}

export const PHOPEPHUM_HOUSES: string[][] = [
  ['อัตตะ', 'หินะ', 'ธะนัง', 'ปิตา', 'มาตา', 'โภคา', 'มัชฌิมา'],
  ['ตนุ', 'กดุมภะ', 'สหัชชะ', 'พันธุ', 'ปุตตะ', 'อริ', 'ปัตนิ'],
  ['มรณะ', 'สุภะ', 'กัมมะ', 'ลาภะ', 'พยายะ', 'ทาสา', 'ทาสี'],
];

function getBase4Info(matrix: FateMatrix, col: number, taksaMap?: TaksaMap) {
  const power = matrix[3] ? matrix[3][col] : undefined;
  if (power === undefined) return {};

  const meaning = BASE4_MEANINGS[power];
  const star = POWER_TO_STAR[power];
  const taksa = (star && taksaMap) ? taksaMap[star] : undefined;
  const direction = star ? STAR_DIRECTIONS[star] : undefined;

  return {
    base4Power: power,
    base4Meaning: meaning,
    base4Taksa: taksa,
    base4Direction: direction,
  };
}

/**
 * คำนวณช่วงอายุวัยจรทั้งหมด (All Vaya Jorn Ranges)
 * ใช้สำหรับแสดงผลทั้งกระดานทีละช่อง
 */
export function calculateVayaJornRanges(matrix: FateMatrix): { row: number; col: number; start: number; end: number }[] {
  const ranges: { row: number; col: number; start: number; end: number }[] = [];
  let currentAge = 1;

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 3; row++) {
      const duration = matrix[row][col];
      ranges.push({
        row: row + 1,
        col: col + 1,
        start: currentAge,
        end: currentAge + duration - 1
      });
      currentAge += duration;
    }
  }

  return ranges;
}

/**
 * คำนวณวัยจร (Life Age Period)
 * นับจากบนลงล่างทีละคอลัมน์ (Row 1 -> 2 -> 3)
 * แต่ละช่องกินระยะเวลาเท่ากับตัวเลขดาวในช่องนั้น
 */
export function calculateVayaJorn(matrix: FateMatrix, age: number, taksaMap?: TaksaMap): JornResult {
  let currentAgeStart = 1;
  
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 3; row++) {
      const star = matrix[row][col];
      const currentAgeEnd = currentAgeStart + star - 1;
      
      if (age >= currentAgeStart && age <= currentAgeEnd) {
        return {
          row: row + 1,
          col: col + 1,
          houseName: PHOPEPHUM_HOUSES[row][col],
          star: star,
          ageRange: `${currentAgeStart}-${currentAgeEnd}`,
          ...getBase4Info(matrix, col, taksaMap)
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
    ageRange: "84+",
    ...getBase4Info(matrix, 6, taksaMap)
  };
}

/**
 * คำนวณปีจร (Yearly Forecast)
 * นับไล่แนวนอนทีละช่อง 1-7 (Row 1), 8-14 (Row 2), 15-21 (Row 3)
 */
export function calculateYearlyJorn(matrix: FateMatrix, age: number, taksaMap?: TaksaMap): JornResult {
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
    yumStar: yumStar,
    ...getBase4Info(matrix, col, taksaMap)
  };
}

/**
 * คำนวณเดือนจร (Monthly Forecast)
 * เริ่มที่ภพพันธุ (Row 2, Col 4) = เดือน 1
 */
export function calculateMonthlyJorn(matrix: FateMatrix, lunarMonth: number, taksaMap?: TaksaMap): JornResult {
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
    yumStar: yumStar,
    ...getBase4Info(matrix, col, taksaMap)
  };
}

/**
 * คำนวณวันจร (Daily Forecast)
 * เริ่มที่ภพอัตตะ (Row 1, Col 1) = วันเสาร์
 */
export function calculateDailyJorn(matrix: FateMatrix, dayOfWeek: number, taksaMap?: TaksaMap): JornResult {
  // dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat
  // Manual: Sat=Atta(0), Sun=Hina(1), Mon=Thanang(2), ...
  const col = (dayOfWeek + 1) % 7;
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
    yumStar: yumStar,
    ...getBase4Info(matrix, col, taksaMap)
  };
}
