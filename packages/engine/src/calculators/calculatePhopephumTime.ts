/**
 * packages/engine/src/calculators/calculatePhopephumTime.ts
 * คำนวณเวลาทางโหราศาสตร์สำหรับระบบ PhopePhum
 * ครอบคลุม ยามอัฏกาล (90 นาที), ยามซอย (3.45 นาที), ลัคนาเกิด, กาลชะตา
 */

import { FateMatrix } from '../types/fateMatrix.js';
import { PHOPEPHUM_HOUSES } from './calculateJorn.js';

// ลำดับยามอัฏกาล (Chaldean Order) ตามตำรา PhopePhum
// อาทิตย์ (1), ศุกร์ (6), พุธ (4), จันทร์ (2), เสาร์ (7), พฤหัส (5), อังคาร (3)
const YAM_ORDER = [1, 6, 4, 2, 7, 5, 3];

export interface TimeEngineResult {
  yamYai: number;      // ดาวประจำยามใหญ่ 90 นาที
  yamYaiNumber: number; // ลำดับยามที่ 1-8
  yamSoy: number;      // ดาวประจำยามซอย 3.45 นาที
  subPeriod: 'early' | 'middle' | 'end'; // 30-min sub period
  isDay: boolean;
}

/**
 * คำนวณยามและช่วงเวลา
 */
export function calculateTimeEngine(date: Date): TimeEngineResult {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const totalMinutes = h * 60 + m + s / 60;
  
  // ตัดวันใหม่ที่ 06:00
  let adjustedMinutes = totalMinutes - 360;
  if (adjustedMinutes < 0) adjustedMinutes += 1440;
  
  const isDay = adjustedMinutes < 720; // 06:00 - 18:00
  const minutesInPeriod = isDay ? adjustedMinutes : adjustedMinutes - 720;
  
  // ยามใหญ่ 90 นาที
  const yamYaiNumber = Math.floor(minutesInPeriod / 90) + 1;
  const minutesInYamYai = minutesInPeriod % 90;
  
  // ยามย่อย 30 นาที
  let subPeriod: 'early' | 'middle' | 'end' = 'early';
  if (minutesInYamYai >= 60) subPeriod = 'end';
  else if (minutesInYamYai >= 30) subPeriod = 'middle';
  
  // ยามซอย 3.45 นาที (225 วินาที)
  const yamSoyNumber = Math.floor((minutesInYamYai * 60) / 225) + 1;
  
  // หาดาวประจำวัน (อาทิตย์=1 ... เสาร์=7)
  let dayOfWeek = date.getDay();
  if (totalMinutes < 360) {
    dayOfWeek = (dayOfWeek + 6) % 7;
  }
  const dayStar = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
  
  // หาดาวประจำยามใหญ่
  const dayStartIndex = YAM_ORDER.indexOf(dayStar);
  const yamYaiStar = YAM_ORDER[(dayStartIndex + (yamYaiNumber - 1)) % 7];
  
  // หาดาวประจำยามซอย
  const yamSoyStar = YAM_ORDER[(YAM_ORDER.indexOf(yamYaiStar) + (yamSoyNumber - 1)) % 7];
  
  return {
    yamYai: yamYaiStar,
    yamYaiNumber: isDay ? yamYaiNumber : yamYaiNumber + 8,
    yamSoy: yamSoyStar,
    subPeriod,
    isDay
  };
}

// ฤกษ์ 9 หมวด (10 นาทีต่อฤกษ์ ใน 1 ยามใหญ่ 90 นาที)
export const REKS_NAMES = [
  "ทาสา", "ทาสี", "กาลกิณี", "สิทธิโชค", "มหาอุจ", "โโฬส", "ทลัทบท", "ธนบดินทร์", "นักพรต"
];

/**
 * คำนวณลัคนาเกิด (Birth Ascendant)
 *
 * Algorithm:
 * 1. หายามใหญ่ 90 นาที → ได้ดาวประจำยาม (yamYai)
 * 2. หาช่วงยาม 30 นาที → ยามต้น=ฐาน1(row0), ยามกลาง=ฐาน2(row1), ยามปลาย=ฐาน3(row2)
 * 3. หาฤกษ์ 10 นาที (9 ฤกษ์ใน 1 ยาม) → ได้ดาวประจำฤกษ์
 * 4. ดาวประจำฤกษ์ → column ในแถวนั้น
 */
export function calculateLagnaPhopephum(matrix: FateMatrix, date: Date): { row: number, col: number, houseName: string, star: number, reksName: string, reksIndex: number } {
  const time = calculateTimeEngine(date);

  // ช่วงยาม 30 นาที บอกฐาน (row)
  // ยามต้น (early) -> ฐาน 1 (Row 0)
  // ยามกลาง (middle) -> ฐาน 2 (Row 1)
  // ยามปลาย (end) -> ฐาน 3 (Row 2)
  const row = time.subPeriod === 'early' ? 0 : (time.subPeriod === 'middle' ? 1 : 2);

  // คำนวณฤกษ์ 10 นาที (0-8) และหาดาวประจำฤกษ์
  const totalMin = date.getHours() * 60 + date.getMinutes();
  let adjusted = (totalMin - 360 + 1440) % 1440;
  const isDay = adjusted < 720;
  const periodMin = isDay ? adjusted : adjusted - 720;
  const minInYam = periodMin % 90;
  const reksIndex = Math.floor(minInYam / 10);
  const reksName = REKS_NAMES[reksIndex] || "—";

  // ดาวประจำฤกษ์ = เริ่มจาก yamYai แล้วเดิน Chaldean reksIndex ก้าว
  const yamYaiIdx = YAM_ORDER.indexOf(time.yamYai);
  const reksStar = YAM_ORDER[(yamYaiIdx + reksIndex) % 7];

  // column = ตำแหน่งที่ดาวประจำฤกษ์ปรากฏในแถวนั้น
  const col = matrix[row].indexOf(reksStar);
  const safeCol = col === -1 ? 0 : col;

  return {
    row: row + 1,
    col: safeCol + 1,
    houseName: PHOPEPHUM_HOUSES[row][safeCol],
    star: reksStar,
    reksName,
    reksIndex
  };
}

/**
 * คำนวณลัคนาจร (Progressed Ascendant)
 * นับจากลัคนาเกิดไปตามเข็มนาฬิกา (หรือตามแนวนอน) ทีละภพตามอายุย่าง
 */
export function calculateLagnaJorn(matrix: FateMatrix, natalLagna: { row: number, col: number }, ageYang: number): { row: number, col: number, houseName: string, star: number } {
  // แปลงตำแหน่งลัคนาเกิดเป็น index 0-20 (R1, R2, R3)
  const natalIdx = (natalLagna.row - 1) * 7 + (natalLagna.col - 1);
  
  // คำนวณตำแหน่งจรตามอายุย่าง (นับจากตำแหน่งเกิดเป็นปีที่ 1)
  const transitIdx = ((natalIdx + (ageYang - 1)) % 21);
  
  const row = Math.floor(transitIdx / 7);
  const col = transitIdx % 7;
  
  return {
    row: row + 1,
    col: col + 1,
    houseName: PHOPEPHUM_HOUSES[row][col],
    star: matrix[row][col]
  };
}

/**
 * คำนวณผังกาลชะตา (Horary)
 */
export function calculateHorary(date: Date): FateMatrix {
  const time = calculateTimeEngine(date);
  
  // 1. ดาวประจำยามซอย (3.45 นาที) -> ภพอัตตะ (0, 0)
  const atta = time.yamSoy;
  
  // 2. ดาวประจำยามใหญ่ (90 นาที) -> ภพตนุ (1, 0)
  const tanu = time.yamYai;
  
  // 3. ดาวประจำวันที่ถาม -> ภพมรณะ (2, 0)
  let h = date.getHours();
  let m = date.getMinutes();
  let dayOfWeek = date.getDay();
  if ((h * 60 + m) < 360) {
    dayOfWeek = (dayOfWeek + 6) % 7;
  }
  const morana = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
  
  // สร้างผัง 3 ฐานหลัก (เวียน 1-7)
  const b1 = Array.from({ length: 7 }, (_, i) => ((atta + i - 1) % 7) + 1);
  const b2 = Array.from({ length: 7 }, (_, i) => ((tanu + i - 1) % 7) + 1);
  const b3 = Array.from({ length: 7 }, (_, i) => ((morana + i - 1) % 7) + 1);
  
  // สร้างฐานที่ 4 (ผลรวม)
  const b4 = b1.map((v, i) => v + b2[i] + b3[i]);
  
  // สร้างฐานที่ 5-9
  const b5 = b4.map(v => ((v - 1) % 7) + 1);
  const b6 = b5.map(v => ((v * 2 - 1) % 7) + 1);
  const b7 = b6.map(v => ((v * 2 - 1) % 7) + 1);
  
  const b8 = Array.from({ length: 7 }, (_, i) => ((((b5[0] - i * 2) - 1) % 7 + 7) % 7) + 1);
  const b9 = Array.from({ length: 7 }, (_, i) => ((((b5[0] - 1 + i * 2) - 1) % 7 + 7) % 7) + 1);
  
  return [b1, b2, b3, b4, b5, b6, b7, b8, b9];
}
