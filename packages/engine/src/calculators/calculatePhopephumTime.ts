/**
 * packages/engine/src/calculators/calculatePhopephumTime.ts
 * คำนวณเวลาทางโหราศาสตร์สำหรับระบบ PhopePhum
 * ครอบคลุม ยามอัฏฐกาล 16 ยาม (กลางวัน 8 ยาม / กลางคืน 8 ยาม), ยามซอย (3.45 นาที), ลัคนาเกิด, กาลชะตา
 * อ้างอิง: ตำรายามอัฏฐกาลหอสมุดแห่งชาติ และ ตำรายามอัฏฐกาล อ.พลูหลวง
 */

import { FateMatrix } from '../types/fateMatrix.js';
import { PHOPEPHUM_HOUSES } from './calculateJorn.js';

// ลำดับยามอัฏฐกาล ภาคกลางวัน (สูตร +5): สุริชะ(1), ศุกระ(6), พุธะ(4), จันเทา(2), เสารี(7), ครู(5), ภุมมะ(3)
export const YAM_ORDER_DAY = [1, 6, 4, 2, 7, 5, 3];

// ลำดับยามอัฏฐกาล ภาคกลางคืน (สูตร +4): ระวิ(1), ชีโว(5), ศะศิ(2), ศุโกร(6), ภุมโม(3), โสโร(7), พุทโธ(4)
export const YAM_ORDER_NIGHT = [1, 5, 2, 6, 3, 7, 4];

// ชื่อยามประจำดาว ภาคกลางวัน
export const YAM_NAMES_DAY: Record<number, string> = {
  1: "สุริชะ",
  2: "จันเทา",
  3: "ภุมมะ",
  4: "พุธะ",
  5: "ครู",
  6: "ศุกระ",
  7: "เสารี",
};

// ชื่อยามประจำดาว ภาคกลางคืน
export const YAM_NAMES_NIGHT: Record<number, string> = {
  1: "ระวิ",
  2: "ศะศิ",
  3: "ภุมโม",
  4: "พุทโธ",
  5: "ชีโว",
  6: "ศุโกร",
  7: "โสโร",
};

// ฤกษ์ 9 หมวด (10 นาทีต่อฤกษ์ ใน 1 ยามใหญ่ 90 นาที)
export const REKS_NAMES = [
  "ทาสา", "ทาสี", "กาลกิณี", "สิทธิโชค", "มหาอุจ", "โสฬส", "ทลัทบท", "ธนบดินทร์", "นักพรต"
];

export interface TimeEngineResult {
  yamYai: number;              // ดาวประจำยามใหญ่ 90 นาที (1-7)
  yamYaiName: string;          // ชื่อยามตามตำรา
  yamYaiNumber: number;        // ลำดับยาม 1-16 (1-8 กลางวัน, 9-16 กลางคืน)
  yamPeriodNumber: number;     // ลำดับยามในภาคนั้น (1-8)
  yamSoy: number;              // ดาวประจำยามซอย 3.45 นาที (1-7)
  yamSoyNumber: number;        // ลำดับยามซอย 1-24
  subPeriod: 'early' | 'middle' | 'end'; // 30-min sub period (ยามต้น, ยามกลาง, ยามปลาย)
  minInYam: number;            // นาทีที่ผ่านไปในยามนั้น (0-90)
  reksIndex: number;           // 0-8 (ฤกษ์ 10 นาที)
  reksName: string;            // ชื่อฤกษ์ 9 หมวด
  isDay: boolean;              // true = กลางวัน, false = กลางคืน
  dayStar: number;             // ดาวประจำวัน (1=อาทิตย์ ... 7=เสาร์)
}

/**
 * ดึงเวลาในเขตเวลาไทย (Asia/Bangkok) อย่างแม่นยำ ไม่เพี้ยนตามสภาพแวดล้อม Server
 */
export function getThaiTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    h: parseInt(map.hour ?? '0', 10),
    m: parseInt(map.minute ?? '0', 10),
    s: parseInt(map.second ?? '0', 10),
    day: weekdayMap[map.weekday ?? 'Sun'] ?? 0,
  };
}

/**
 * คำนวณดาวประจำยามใหญ่ 8 ยาม ตามตำราหอสมุดแห่งชาติและพลูหลวง
 * กฎ: ยามที่ 1 และ ยามที่ 8 จะเป็นดาวประจำวันเสมอ ทั้งกลางวันและกลางคืน
 */
export function getYamStar(dayStar: number, yamNumber1to8: number, isDay: boolean): number {
  if (yamNumber1to8 === 8) {
    return dayStar; // ยามที่ 8 = ยามที่ 1 (ดาวประจำวัน)
  }
  const order = isDay ? YAM_ORDER_DAY : YAM_ORDER_NIGHT;
  const startIdx = order.indexOf(dayStar);
  return order[(startIdx + (yamNumber1to8 - 1)) % 7];
}

/**
 * คำนวณยามและช่วงเวลาตามระบบ 16 ยาม (กลางวัน 8 ยาม, กลางคืน 8 ยาม)
 */
export function calculateTimeEngine(date: Date): TimeEngineResult {
  const { h, m, s, day } = getThaiTime(date);
  const totalMinutes = h * 60 + m + s / 60;
  
  // วันโหราศาสตร์ไทย ตัดเปลี่ยนวันใหม่ที่ 06:00 น.
  let dayOfWeek = day;
  if (totalMinutes < 360) {
    dayOfWeek = (dayOfWeek + 6) % 7; // ช่วง 00:00 - 05:59 ถือเป็นวันก่อนหน้า
  }
  const dayStar = dayOfWeek === 0 ? 1 : dayOfWeek + 1; // 1=อาทิตย์, ..., 7=เสาร์

  // การแบ่งภาคกลางวันและกลางคืน (ภาคละ 12 ชม. = 720 นาที)
  // กลางวัน: 06:00:00 - 18:00:00
  // กลางคืน: 18:00:01 - 05:59:59
  const isDay = totalMinutes >= 360 && totalMinutes <= 1080;
  
  let mInP: number;
  if (isDay) {
    mInP = totalMinutes - 360; // 0 ถึง 720 นาที
  } else if (totalMinutes > 1080) {
    mInP = totalMinutes - 1080; // 18:00:01 ถึง 24:00 (1 ถึง 360 นาที)
  } else {
    mInP = totalMinutes + 360; // 00:00 ถึง 05:59:59 (360 ถึง 719.99 นาที)
  }

  // ลำดับยามในภาค (ยามที่ 1 - 8) ตามระบบเวลาแท้ของภพภูมิ (ตำรายามอัฏฐกาล 16 ยาม)
  // ภาคกลางวัน:
  // ยามที่ ๑: ๐๖.๐๑ – ๐๗.๓๐ น. (นาทีที่ 1 - 90)
  // ยามที่ ๒: ๐๗.๓๑ – ๐๙.๐๐ น. (นาทีที่ 91 - 180)
  // ยามที่ ๓: ๐๙.๐๑ – ๑๐.๓๐ น. (นาทีที่ 181 - 270)
  // ยามที่ ๔: ๑๐.๓๑ – ๑๒.๐๐ น. (นาทีที่ 271 - 360)
  // ยามที่ ๕: ๑๒.๐๑ – ๑๓.๓๐ น. (นาทีที่ 361 - 450)
  // ยามที่ ๖: ๑๓.๓๑ – ๑๕.๐๐ น. (นาทีที่ 451 - 540)
  // ยามที่ ๗: ๑๕.๐๑ – ๑๖.๓๐ น. (นาทีที่ 541 - 630)
  // ยามที่ ๘: ๑๖.๓๑ – ๑๘.๐๐ น. (นาทีที่ 631 - 720)
  const yamPeriodNumber = mInP === 0 ? 1 : Math.min(8, Math.ceil(mInP / 90));
  const yamYaiNumber = isDay ? yamPeriodNumber : yamPeriodNumber + 8;

  // นาทีที่ผ่านไปในยามนั้น (0 - 90 นาที)
  const minInYam = mInP === 0 ? 0 : (((mInP - 0.0001) % 90) + 0.0001);

  // ช่วงยามย่อย 30 นาที (สอดคล้องกับฐาน 1, ฐาน 2, ฐาน 3)
  // ยามต้น (early) = นาที 0 - 30 -> ฐาน 1 (ฐานวัน / Row 0)
  // ยามกลาง (middle) = นาที 30.01 - 60 -> ฐาน 2 (ฐานเดือน / Row 1)
  // ยามปลาย (end) = นาที 60.01 - 90 -> ฐาน 3 (ฐานปี / Row 2)
  let subPeriod: 'early' | 'middle' | 'end' = 'early';
  if (minInYam > 60) {
    subPeriod = 'end';
  } else if (minInYam > 30) {
    subPeriod = 'middle';
  }

  // ฤกษ์ 10 นาที (0 - 8) ใน 1 ยามใหญ่ 90 นาที
  const reksIndex = Math.min(8, Math.floor(minInYam / 10));
  const reksName = REKS_NAMES[reksIndex] || "—";

  // ดาวประจำยามใหญ่ 90 นาที
  const yamYaiStar = getYamStar(dayStar, yamPeriodNumber, isDay);
  const yamYaiName = isDay ? YAM_NAMES_DAY[yamYaiStar] : YAM_NAMES_NIGHT[yamYaiStar];

  // ยามซอย 3.45 นาที (225 วินาที = 3.75 นาที) มี 24 ยามซอยใน 1 ยามใหญ่
  const yamSoyNumber = Math.min(24, Math.floor((minInYam * 60) / 225) + 1);
  const currentOrder = isDay ? YAM_ORDER_DAY : YAM_ORDER_NIGHT;
  const yamSoyStar = currentOrder[(currentOrder.indexOf(yamYaiStar) + (yamSoyNumber - 1)) % 7];

  return {
    yamYai: yamYaiStar,
    yamYaiName,
    yamYaiNumber,
    yamPeriodNumber,
    yamSoy: yamSoyStar,
    yamSoyNumber,
    subPeriod,
    minInYam,
    reksIndex,
    reksName,
    isDay,
    dayStar,
  };
}

/**
 * คำนวณลัคนาเกิด (Birth Ascendant)
 *
 * Algorithm:
 * 1. หายามใหญ่ 90 นาที (ยามอัฏฐกาล) → ได้ดาวประจำยาม (yamYai)
 * 2. หาช่วงยาม 30 นาที → ยามต้น = ฐาน 1 (Row 0), ยามกลาง = ฐาน 2 (Row 1), ยามปลาย = ฐาน 3 (Row 2)
 * 3. หา column = ตำแหน่งที่ดาวประจำยาม (yamYai) สถิตอยู่ในแถวนั้น
 */
export function calculateLagnaPhopephum(matrix: FateMatrix, date: Date): { 
  row: number, 
  col: number, 
  houseName: string, 
  star: number, 
  reksName: string, 
  reksIndex: number, 
  yamYaiNumber: number, 
  yamPeriodNumber: number,
  yamYaiName: string,
  subPeriod: 'early' | 'middle' | 'end' 
} {
  const time = calculateTimeEngine(date);

  // ช่วงยาม 30 นาที กำหนดแถวฐาน (Row)
  // ยามต้น (early) -> ฐาน 1 (Row 0)
  // ยามกลาง (middle) -> ฐาน 2 (Row 1)
  // ยามปลาย (end) -> ฐาน 3 (Row 2)
  const row = time.subPeriod === 'early' ? 0 : (time.subPeriod === 'middle' ? 1 : 2);

  // column = ตำแหน่งที่ดาวประจำยาม (yamYai) ปรากฏในแถวฐานนั้น
  const col = matrix[row].indexOf(time.yamYai);
  const safeCol = col === -1 ? 0 : col;

  return {
    row: row + 1,
    col: safeCol + 1,
    houseName: PHOPEPHUM_HOUSES[row][safeCol],
    star: time.yamYai,
    reksName: time.reksName,
    reksIndex: time.reksIndex,
    yamYaiNumber: time.yamYaiNumber,
    yamPeriodNumber: time.yamPeriodNumber,
    yamYaiName: time.yamYaiName,
    subPeriod: time.subPeriod,
  };
}

/**
 * คำนวณลัคนาจร (Progressed Ascendant)
 * นับจากลัคนาเกิดไปตามเข็มนาฬิกา (หรือตามแนวนอน) ทีละภพตามอายุย่าง
 */
export function calculateLagnaJorn(matrix: FateMatrix, natalLagna: { row: number, col: number }, ageYang: number): { row: number, col: number, houseName: string, star: number, yumBase: number, yumStar: number } {
  // แปลงตำแหน่งลัคนาเกิดเป็น index 0-20 (R1, R2, R3)
  const natalIdx = (natalLagna.row - 1) * 7 + (natalLagna.col - 1);

  // คำนวณตำแหน่งจรตามอายุย่าง (นับจากตำแหน่งเกิดเป็นปีที่ 1)
  const transitIdx = ((natalIdx + (ageYang - 1)) % 21);

  const row = Math.floor(transitIdx / 7);
  const col = transitIdx % 7;

  // ดาวยํ้า: ตกฐานวัน→ฐาน5, ตกฐานเดือน→ฐาน6, ตกฐานปี→ฐาน7
  const yumBase = row === 0 ? 5 : (row === 1 ? 6 : 7);
  const yumStar = matrix[yumBase - 1][col];

  return {
    row: row + 1,
    col: col + 1,
    houseName: PHOPEPHUM_HOUSES[row][col],
    star: matrix[row][col],
    yumBase,
    yumStar,
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
  const { h: horaryH, m: horaryM, day: horaryDay } = getThaiTime(date);
  let dayOfWeek = horaryDay;
  if ((horaryH * 60 + horaryM) < 360) {
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
