/**
 * imperial-v4.ts
 * Unified "Perfect" Engine for PhopePhum v4.0
 * Strictly follows the Imperial Manual provided by the Master.
 */

import { 
  FateMatrix, 
  NineBaseResult, 
  HoroscopeInput, 
  PhopephumResult, 
  JornResult,
  StarNumber,
  TaksaBhop,
  TaksaMap
} from "@phopephum/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHOPEPHUM_HOUSES = [
  ["อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
  ["ตนุ", "กฎุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
  ["มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"],
  ["อาตมะ", "ทาสา", "สิทธิโชค", "โภคทรัพย์", "โจร", "อุบาทว์", "อุปถัมภ์"], // Base 8
  ["อัตตะ", "สักกะ", "ญาติ", "ธนัง", "เคหัง", "นาวัง", "ภริยัง"], // Base 9
];

const YAM_ORDER: StarNumber[] = [3, 1, 6, 4, 2, 7, 5];

const REKS_NAMES = [
  "ทาษา", "ทาษี", "กาลกิณี", "สิทธิโชค", "มหาอุจ", "โสฬส", "ทลัทบท", "ธนบดินทร์", "นักพรต"
];

const BASE4_MEANINGS: Record<number, string> = {
  3: 'อังคารเล็ก', 4: 'พุธเล็ก', 5: 'พฤหัสเล็ก', 6: 'พระอาทิตย์', 7: 'เสาร์เล็ก',
  8: 'อังคารใหญ่', 9: 'พระเกตุ', 10: 'พระเสาร์', 11: 'ราชาโชค', 12: 'พระราหู',
  13: 'มหาอุจ', 14: 'จักรพรรดิ', 15: 'พระจันทร์', 16: 'โสฬสมงคล',
  17: 'พุธใหญ่', 18: 'มหาจักรพรรดิ์', 19: 'พระพฤหัส', 20: 'เสาร์ใหญ่', 21: 'พระศุกร์',
};

const POWER_TO_STAR: Record<number, number> = {
  6:1, 15:2, 8:3, 4:4, 11:4, 17:4, 5:5, 14:5, 18:5, 19:5, 16:6, 21:6, 7:7, 10:7, 20:7, 12:8
};

// ─── Core Logic ───────────────────────────────────────────────────────────────

function buddhToCS(yearBE: number) { return yearBE - 1181; }
function r7(n: number) { return n % 7 || 7; }
function getBKKDate(date: Date): Date { return new Date(date.getTime() + (date.getTimezoneOffset() + 420) * 60000); }

export function calculateNineBases(input: HoroscopeInput): NineBaseResult {
  const [y, m, d] = input.birthDate.split("-").map(Number);
  const yearBE = y + 543;
  const bDay = new Date(input.birthDate).getDay(); // 0=Sun
  const dayNum = bDay === 0 ? 1 : bDay + 1; // 1=Sun...7=Sat
  const monthNum = input.thaiMonthOverride || (new Date(input.birthDate).getMonth() + 1);
  const zodiacNum = 5; // Dragon simplified

  const b1 = Array.from({ length: 7 }, (_, i) => r7(dayNum + i));
  const b2 = Array.from({ length: 7 }, (_, i) => r7(monthNum + i));
  const b3 = Array.from({ length: 7 }, (_, i) => r7(zodiacNum + i));
  const b4 = b1.map((v, i) => v + b2[i] + b3[i]);
  const b5 = b4.map(v => r7(v));
  const b6 = b5.map((v, i) => r7(v + b1[i]));
  const b7 = b6.map((v, i) => r7(v + b2[i]));
  const b8 = Array.from({ length: 7 }, (_, i) => r7(b5[0] - i * 2 + 14));
  const b9 = Array.from({ length: 7 }, (_, i) => r7(b5[0] + i * 2));
  
  return {
    bases: [b1, b2, b3, b4, b5, b6, b7, b8, b9],
    lunarDate: { thaiDateText: "รอการอัปเดตระบบปฏิทิน", thaiMonth: monthNum, zodiacName: "มะโรง", thaiYear: yearBE }
  };
}

export function calculateTimeEngine(date: Date) {
  const bkk = getBKKDate(date);
  const totalMin = bkk.getHours() * 60 + bkk.getMinutes();
  let adjusted = (totalMin - 360 + 1440) % 1440;
  const isDay = adjusted < 720;
  const periodMin = isDay ? adjusted : adjusted - 720;
  const yamNumber = Math.floor(periodMin / 90) + 1;
  const minInYam = periodMin % 90;
  const subPeriod = minInYam < 30 ? 'early' : (minInYam < 60 ? 'middle' : 'end');
  const dayStar = [1, 2, 3, 4, 5, 6, 7][bkk.getDay()];
  const startIndex = YAM_ORDER.indexOf(dayStar as StarNumber);
  const star = YAM_ORDER[(startIndex + (yamNumber - 1)) % 7];
  return { star, subPeriod, isDay, yamNumber: isDay ? yamNumber : yamNumber + 8 };
}

function calculateLagnaNatal(matrix: number[][], birthDate: Date) {
  const time = calculateTimeEngine(birthDate);
  const row = time.subPeriod === 'early' ? 0 : (time.subPeriod === 'middle' ? 1 : 2);
  const col = matrix[row].indexOf(time.star);
  return { row: row + 1, col: col + 1, houseName: PHOPEPHUM_HOUSES[row][col], star: time.star };
}

export function calculateVayaJornRanges(matrix: number[][]) {
  const ranges: any[] = [];
  let currentAge = 1;
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 3; r++) {
      const dur = matrix[r][c];
      ranges.push({ row: r + 1, col: c + 1, start: currentAge, end: currentAge + dur - 1 });
      currentAge += dur;
    }
  }
  return ranges;
}

function getAgeYang(birthDate: Date, checkDate: Date): number {
  return (checkDate.getFullYear() - birthDate.getFullYear()) + 1;
}

export async function calculateImperial(input: HoroscopeInput, checkDate: Date = new Date()): Promise<any> {
  const matrixResult = calculateNineBases(input);
  const matrix = matrixResult.bases;
  const bDate = new Date(`${input.birthDate}T${input.birthTime || '12:00'}:00+07:00`);
  const ageYang = getAgeYang(bDate, checkDate);
  const natal = calculateLagnaNatal(matrix, bDate);
  
  const natalIdx = (natal.row - 1) * 7 + (natal.col - 1);
  const transitIdx = (natalIdx + (ageYang - 1)) % 21;
  const transit = { row: Math.floor(transitIdx / 7) + 1, col: (transitIdx % 7) + 1, houseName: PHOPEPHUM_HOUSES[Math.floor(transitIdx/7)][transitIdx%7] };

  const yearlyIdx = (ageYang - 1) % 21;
  const yearly = { row: Math.floor(yearlyIdx / 7) + 1, col: (yearlyIdx % 7) + 1, houseName: PHOPEPHUM_HOUSES[Math.floor(yearlyIdx/7)][yearlyIdx%7] };

  const bkkCheck = getBKKDate(checkDate);
  let d = bkkCheck.getDay();
  if (bkkCheck.getHours() < 6) d = (d + 6) % 7;
  const dayStar = [1, 2, 3, 4, 5, 6, 7][d];
  const dCol = dayStar % 7;
  const daily = { row: 1, col: dCol + 1, houseName: PHOPEPHUM_HOUSES[0][dCol], star: matrix[0][dCol] };

  // Natal Time info (Reks, Yama)
  const time = calculateTimeEngine(bDate);
  const reksName = REKS_NAMES[time.reksIndex];
  
  // Base 4 Influence logic
  const yearlyB4 = matrix[3][yearly.col - 1];
  const yumStar = matrix[6][yearly.col - 1];

  return { 
    matrix, 
    lunar: matrixResult.lunarDate, 
    natal: { ...natal, reksName, reksSlot: time.reksIndex + 1, yamName: `ยามที่ ${time.yamNumber}`, isDay: time.isDay }, 
    transit, 
    vayaRanges: calculateVayaJornRanges(matrix), 
    yearly: { ...yearly, b4Power: yearlyB4, b4Meaning: BASE4_MEANINGS[yearlyB4], yumStar },
    daily, 
    ageYang 
  };
}
