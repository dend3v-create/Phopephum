/**
 * seven-numbers.ts  — v2.0 (BUG FIXED)
 * Hora AI — ระบบเลข 7 ตัว 9 ฐาน
 *
 * 🔧 BUGS FIXED:
 * 1. approximateThaiMonth() → แทนด้วย getThaiMonthFull() จาก thai-lunar-calendar.ts
 *    (off-by-2 เดือน → exact lookup table)
 * 2. zodiacToNumber() — ยังถูกต้อง (ปีจอ = 4)
 * 3. DAY_TO_NUMBER — ยังถูกต้อง (ศุกร์=6)
 * 4. เพิ่ม timezone-safe date parsing (ใช้ local date ไม่ใช่ UTC)
 *
 * ✅ ตรวจสอบแล้ว: 23 ก.ค. 2525 (ศุกร์ เดือน 9 จอ) → ฐาน1: 6-7-1-2-3-4-5
 */

import { getThaiMonthFull, gregorianToThaiLunar } from "./thai-lunar-calendar";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ZodiacAnimal =
  | "rat" | "ox" | "tiger" | "rabbit" | "dragon" | "snake"
  | "horse" | "goat" | "monkey" | "rooster" | "dog" | "pig";

export interface ThaiLunarDate {
  dayOfWeek: number;
  thaiMonth: number;
  thaiYear: number;
  zodiacAnimal: ZodiacAnimal;
  dayNumber: number;
  monthNumber: number;
  yearNumber: number;
  dayNameThai: string;
  zodiacNameThai: string;
  /** แสดงว่าเดือนไทยมาจาก exact lookup หรือ approximate */
  isMonthApproximate: boolean;
}

export interface NineBaseRow {
  baseName: string;
  description: string;
  values: number[];
}

export interface NineBaseResult {
  lunarDate: ThaiLunarDate;
  bases: NineBaseRow[];
}

export interface SevenNumbersInput {
  /** วันเกิด — ต้องเป็น CE date (Gregorian) */
  birthDate: Date;
  /** override เดือนไทย (ถ้าทราบจากปฏิทิน 100 ปี ใส่มาตรงๆ) */
  thaiMonthOverride?: number;
  /** override ปีนักษัตร */
  zodiacOverride?: ZodiacAnimal;
}

// Backward Compatibility Types
export interface PreciseLunarInfo {
  thaiMonth: number;
  thaiMonthName: string;
  thaiYear: number;
  zodiacAnimal: ZodiacAnimal;
  dayNumber: number;
  monthNumber: number;
  yearNumber: number;
  phaseText: string;
  isMonthApproximate?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DAY_NAMES_THAI = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์",
];

/**
 * วันในสัปดาห์ → เลข 1–7
 * อาทิตย์(0)=1, จันทร์(1)=2, ... เสาร์(6)=7
 */
export const DAY_TO_NUMBER: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7,
};

export const ZODIAC_ORDER: ZodiacAnimal[] = [
  "rat",     // ชวด  = 1 (index 0)
  "ox",      // ฉลู  = 2
  "tiger",   // ขาล  = 3
  "rabbit",  // เถาะ = 4
  "dragon",  // มะโรง = 5
  "snake",   // มะเส็ง = 6
  "horse",   // มะเมีย = 7
  "goat",    // มะแม  = 8 → 1
  "monkey",  // วอก  = 9 → 2
  "rooster", // ระกา = 10 → 3
  "dog",     // จอ   = 11 → 4
  "pig",     // กุน  = 12 → 5
];

export const ZODIAC_NAMES_THAI: Record<ZodiacAnimal, string> = {
  rat: "ชวด", ox: "ฉลู", tiger: "ขาล", rabbit: "เถาะ",
  dragon: "มะโรง", snake: "มะเส็ง", horse: "มะเมีย", goat: "มะแม",
  monkey: "วอก", rooster: "ระกา", dog: "จอ", pig: "กุน",
};

export const HOUSE_NAMES_THAI = [
  "อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา",
];

export const HOUSE_NAMES_PALI = [
  "ตนุ", "กุมพะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ",
];

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 FIX 1: Timezone-safe date parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลง ISO date string "YYYY-MM-DD" → Date object ที่ใช้ local timezone
 * แก้ปัญหา: new Date("1982-07-23") parse เป็น UTC midnight
 * ทำให้ browser ใน timezone ตะวันตก get day ผิด
 */
export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  // ใช้ Date constructor แบบ local (ไม่ใช่ UTC)
  return new Date(year, month - 1, day, 12, 0, 0); // เที่ยงวัน local time
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 FIX 2: Zodiac Calculator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลง Thai BE year → ปีนักษัตร
 * พ.ศ. 2503 = ชวด (reference)
 */
export function thaiYearToZodiac(thaiYear: number): ZodiacAnimal {
  const index = ((thaiYear - 2503) % 12 + 12) % 12;
  return ZODIAC_ORDER[index];
}

/**
 * ปีนักษัตร → เลข 1–7
 * ชวด=1 … มะเมีย=7, มะแม=1 (8-7), วอก=2 (9-7), ระกา=3 (10-7), จอ=4 (11-7), กุน=5 (12-7)
 */
export function zodiacToNumber(animal: ZodiacAnimal): number {
  const idx = ZODIAC_ORDER.indexOf(animal) + 1; // 1-based (1–12)
  return idx > 7 ? idx - 7 : idx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: reduce to 1–7
// ─────────────────────────────────────────────────────────────────────────────

export function r7(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1;
}

export const reduceToBase7 = r7;

// ─────────────────────────────────────────────────────────────────────────────
// Core: Row generators (ตรวจสอบแล้ว ถูกต้องทั้งหมด)
// ─────────────────────────────────────────────────────────────────────────────

export function genBase1to3(seed: number): number[] {
  return Array.from({ length: 7 }, (_, i) => r7(seed + i));
}
export function genBase4(b1: number[], b2: number[], b3: number[]): number[] {
  return b1.map((v, i) => v + b2[i] + b3[i]);
}
export function genBase5(b4: number[]): number[] { return b4.map(r7); }
export function genBase6(b5: number[]): number[] { return b5.map(v => r7(v * 2)); }
export function genBase7(b6: number[]): number[] { return b6.map(v => r7(v * 2)); }
export function genBase8(b5First: number): number[] {
  return Array.from({ length: 7 }, (_, i) => r7(b5First - i * 2));
}
export function genBase9(b5First: number): number[] {
  const start = r7(b5First - 1);
  return Array.from({ length: 7 }, (_, i) => r7(start + i * 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 FIX 3: Main Calculator — แก้ไขการดึงเดือนไทย
// ─────────────────────────────────────────────────────────────────────────────

export function calculateNineBases(input: SevenNumbersInput): NineBaseResult {
  const { birthDate, thaiMonthOverride, zodiacOverride } = input;

  // ── 🔧 FIX: ใช้ local date ไม่ใช่ UTC ──
  // ถ้า birthDate เป็น Date object แล้ว ให้ดึง local day
  const dayOfWeek = birthDate.getDay(); // 0=อาทิตย์
  const dayNumber = DAY_TO_NUMBER[dayOfWeek];

  // ── 🔧 FIX: ใช้ getThaiMonthFull() แทน approximateThaiMonth() ──
  let thaiMonth: number;
  let isMonthApproximate: boolean;

  if (thaiMonthOverride !== undefined) {
    thaiMonth = thaiMonthOverride;
    isMonthApproximate = false;
  } else {
    const lunarInfo = getThaiMonthFull(birthDate);
    thaiMonth = lunarInfo.month;
    isMonthApproximate = lunarInfo.isApproximate;
  }

  const monthNumber = thaiMonth > 7 ? thaiMonth - 7 : thaiMonth;

  // ── ปีนักษัตร ──
  const thaiYear = birthDate.getFullYear() + 543;
  const zodiacAnimal = zodiacOverride ?? thaiYearToZodiac(thaiYear);
  const yearNumber = zodiacToNumber(zodiacAnimal);

  const lunarDate: ThaiLunarDate = {
    dayOfWeek,
    thaiMonth,
    thaiYear,
    zodiacAnimal,
    dayNumber,
    monthNumber,
    yearNumber,
    dayNameThai: DAY_NAMES_THAI[dayOfWeek],
    zodiacNameThai: ZODIAC_NAMES_THAI[zodiacAnimal],
    isMonthApproximate,
  };

  // ── คำนวณ 9 ฐาน ──
  const b1 = genBase1to3(dayNumber);
  const b2 = genBase1to3(monthNumber);
  const b3 = genBase1to3(yearNumber);
  const b4 = genBase4(b1, b2, b3);
  const b5 = genBase5(b4);
  const b6 = genBase6(b5);
  const b7 = genBase7(b6);
  const b8 = genBase8(b5[0]);
  const b9 = genBase9(b5[0]);

  const bases: NineBaseRow[] = [
    { baseName: "ฐานวัน",       description: `วัน${DAY_NAMES_THAI[dayOfWeek]} = เลข ${dayNumber}`,    values: b1 },
    { baseName: "ฐานเดือน",     description: `เดือนไทย ${thaiMonth} = เลข ${monthNumber}${isMonthApproximate ? " (approx)" : ""}`, values: b2 },
    { baseName: "ฐานปี",        description: `ปี${ZODIAC_NAMES_THAI[zodiacAnimal]} = เลข ${yearNumber}`, values: b3 },
    { baseName: "ฐานรวมกำลัง",  description: "ผลรวม ฐาน 1+2+3",                                    values: b4 },
    { baseName: "เอา ๗ ลบ",     description: "ฐาน 4 ลบด้วย 7 ให้เหลือ 1–7",                         values: b5 },
    { baseName: "เอา ๒ คูณ",    description: "ฐาน 5 × 2 (ลบ 7 ถ้าเกิน)",                             values: b6 },
    { baseName: "เอา ๒ คูณ",    description: "ฐาน 6 × 2 (ลบ 7 ถ้าเกิน)",                             values: b7 },
    { baseName: "อาตมา",         description: `เดินยาม -2 จาก ${b5[0]}`,                              values: b8 },
    { baseName: "ภริยัง",        description: `เดินยาม +2 จาก ${r7(b5[0] - 1)}`,                      values: b9 },
  ];

  return { lunarDate, bases };
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward Compatibility Functions
// ─────────────────────────────────────────────────────────────────────────────

export function thaiMonthToNumber(thaiMonth: number): number {
  if (thaiMonth === 13) return 1;
  return thaiMonth > 7 ? thaiMonth - 7 : thaiMonth;
}

export function getPreciseLunarInfo(date: Date, overrideMonth?: number, overrideZodiac?: ZodiacAnimal): PreciseLunarInfo {
  const lunarInfo = gregorianToThaiLunar(date);
  const thaiYear = date.getFullYear() + 543;
  const dayNumber = DAY_TO_NUMBER[date.getDay()];
  
  // ปีนักษัตร
  let zodiacAnimal = overrideZodiac ?? thaiYearToZodiac(thaiYear);
  const m = date.getMonth(); // 0-11
  const d = date.getDate();
  if (m < 2 || (m === 2 && d < 15)) {
    zodiacAnimal = overrideZodiac ?? thaiYearToZodiac(thaiYear - 1);
  }

  const thaiMonth = overrideMonth ?? lunarInfo.month;
  const monthNumber = thaiMonth > 7 ? thaiMonth - 7 : thaiMonth;
  const yearNumber = zodiacToNumber(zodiacAnimal);
  const phaseText = `${lunarInfo.isWaxing ? "ขึ้น" : "แรม"} ${lunarInfo.lunarDay} ค่ำ${lunarInfo.isApproximate ? " (โดยประมาณ)" : ""}`;

  return {
    thaiMonth,
    thaiMonthName: lunarInfo.monthNameThai,
    thaiYear,
    zodiacAnimal,
    dayNumber,
    monthNumber,
    yearNumber,
    phaseText,
    isMonthApproximate: lunarInfo.isApproximate,
  };
}

export default calculateNineBases;
