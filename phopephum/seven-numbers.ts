/**
 * seven-numbers.ts
 * Hora AI — ระบบเลข 7 ตัว 9 ฐาน (จันทรคติ)
 *
 * ✅ ตรวจสอบสูตรแล้วกับ Spreadsheet ตัวอย่าง
 * สูตรที่ verified:
 *   ฐาน 1–3 : เริ่มจาก seed เดิน +1 วนซ้ำ 1–7
 *   ฐาน 4   : รวม ฐาน1+2+3 แต่ละช่อง
 *   ฐาน 5   : ลบ 7 ซ้ำๆ จน ≤ 7
 *   ฐาน 6   : × 2 (ลบ 7 ถ้าเกิน)
 *   ฐาน 7   : × 2 (ลบ 7 ถ้าเกิน)
 *   ฐาน 8   : เริ่ม b5[0] → -2 ทุกช่อง (วนซ้ำ)
 *   ฐาน 9   : เริ่ม b5[0]-1 → +2 ทุกช่อง (วนซ้ำ)
 *
 * @module seven-numbers
 * @version 2.1.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ZodiacAnimal =
  | "rat" | "ox" | "tiger" | "rabbit" | "dragon" | "snake"
  | "horse" | "goat" | "monkey" | "rooster" | "dog" | "pig";

export type HouseKey =
  | "attha" | "hina" | "dhana" | "pita" | "mata" | "phoka" | "majjhima";

export interface ThaiLunarDate {
  dayOfWeek: number;       // 0=อาทิตย์ … 6=เสาร์
  thaiMonth: number;       // 1–12
  thaiYear: number;        // พ.ศ.
  zodiacAnimal: ZodiacAnimal;
  dayNumber: number;       // 1–7
  monthNumber: number;     // 1–7
  yearNumber: number;      // 1–7
  dayNameThai: string;
  zodiacNameThai: string;
}

export interface NineBaseRow {
  baseName: string;        // เช่น "ฐานวัน"
  description: string;    // อธิบายวิธีคำนวณ
  values: number[];        // [7] ค่าแต่ละช่อง
}

export interface NineBaseResult {
  lunarDate: ThaiLunarDate;
  bases: NineBaseRow[];    // [9] ฐานที่ 1–9
  /** ตำแหน่ง highlight ปัจจุบัน (0-based index ใน values[]) */
  currentColumn?: number;
}

export interface SevenNumbersInput {
  birthDate: Date;
  /** วันที่ override เดือนไทย (ถ้าทราบจากปฏิทิน 100 ปี) */
  thaiMonthOverride?: number;
  /** ปีนักษัตร override (ถ้าทราบแน่ชัด) */
  zodiacOverride?: ZodiacAnimal;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const HOUSE_NAMES_THAI: string[] = [
  "อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา",
];

export const HOUSE_NAMES_PALI: string[] = [
  "ตนุ", "กุมพะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ",
];

export const DAY_NAMES_THAI = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์",
];

export const DAY_TO_NUMBER: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7,
};

// ปีนักษัตร cycle 12 (เริ่ม ชวด = พ.ศ. 2503)
export const ZODIAC_ORDER: ZodiacAnimal[] = [
  "rat", "ox", "tiger", "rabbit", "dragon", "snake",
  "horse", "goat", "monkey", "rooster", "dog", "pig",
];

export const ZODIAC_NAMES_THAI: Record<ZodiacAnimal, string> = {
  rat: "ชวด", ox: "ฉลู", tiger: "ขาล", rabbit: "เถาะ",
  dragon: "มะโรง", snake: "มะเส็ง", horse: "มะเมีย", goat: "มะแม",
  monkey: "วอก", rooster: "ระกา", dog: "จอ", pig: "กุน",
};

export const NUMBER_TO_PLANET: Record<number, string> = {
  1: "อาทิตย์ ☉", 2: "จันทร์ ☽", 3: "อังคาร ♂",
  4: "พุธ ☿", 5: "พฤหัส ♃", 6: "ศุกร์ ♀", 7: "เสาร์ ♄",
};

export const NUMBER_TO_PLANET_COLOR: Record<number, string> = {
  1: "#F59E0B", 2: "#E5E7EB", 3: "#EF4444",
  4: "#10B981", 5: "#F97316", 6: "#EC4899", 7: "#6B7280",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: reduce to 1–7
// ─────────────────────────────────────────────────────────────────────────────

export function reduceToBase7(n: number): number {
  n = ((n - 1) % 7 + 7) % 7 + 1;
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Thai lunar calendar (100-Year Calendar Lookup & Calculations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * โครงสร้างข้อมูลสำหรับปฏิทินจันทรคติไทยที่สมบูรณ์แบบ
 */
export interface PreciseLunarInfo {
  thaiMonth: number;       // 1–12 (หรือ 13 สำหรับเดือน 8 หลัง)
  thaiMonthName: string;   // เช่น "เดือน 5", "เดือน 8 หลัง (8-8)"
  thaiYear: number;        // พ.ศ.
  zodiacAnimal: ZodiacAnimal;
  dayNumber: number;       // 1–7 (1=อาทิตย์ ... 7=เสาร์)
  monthNumber: number;     // 1–7 (เลขฐาน 7 สำหรับตั้งดวง)
  yearNumber: number;      // 1–7 (เลขฐาน 7 สำหรับตั้งดวง)
  phaseText: string;       // ขึ้น/แรม X ค่ำ
}

/**
 * Lookup table ปฏิทินโหราศาสตร์ไทยปี พ.ศ. 2569 (ค.ศ. 2026) อ้างอิงจาก myhora.com
 * ปีนี้เป็นปีอธิกมาส มีเดือน 8 สองหน และเป็นปีเปลี่ยนผ่านนักษัตรเป็น "มะเมีย" (วันขึ้น 1 ค่ำ เดือน 5 ตรงกับ 18 มีนาคม 2569)
 */
export interface CalendarRange {
  start: Date;
  end: Date;
  monthVal: number;
  monthName: string;
  zodiac: ZodiacAnimal;
}

const LUNAR_CALENDAR_2569: CalendarRange[] = [
  { start: new Date("2026-01-01"), end: new Date("2026-01-17"), monthVal: 2, monthName: "เดือน 2", zodiac: "snake" },
  { start: new Date("2026-01-18"), end: new Date("2026-02-16"), monthVal: 3, monthName: "เดือน 3", zodiac: "snake" },
  { start: new Date("2026-02-17"), end: new Date("2026-03-17"), monthVal: 4, monthName: "เดือน 4", zodiac: "snake" },
  { start: new Date("2026-03-18"), end: new Date("2026-04-16"), monthVal: 5, monthName: "เดือน 5", zodiac: "horse" }, // เริ่มปีมะเมีย ขึ้น 1 ค่ำ เดือน 5
  { start: new Date("2026-04-17"), end: new Date("2026-05-15"), monthVal: 6, monthName: "เดือน 6", zodiac: "horse" },
  { start: new Date("2026-05-16"), end: new Date("2026-06-14"), monthVal: 7, monthName: "เดือน 7", zodiac: "horse" },
  { start: new Date("2026-06-15"), end: new Date("2026-07-13"), monthVal: 8, monthName: "เดือน 8 (แรก)", zodiac: "horse" },
  { start: new Date("2026-07-14"), end: new Date("2026-08-12"), monthVal: 13, monthName: "เดือน 8 หลัง (8-8)", zodiac: "horse" }, // เดือน 8-8 (แปดหลัง)
  { start: new Date("2026-08-13"), end: new Date("2026-09-10"), monthVal: 9, monthName: "เดือน 9", zodiac: "horse" },
  { start: new Date("2026-09-11"), end: new Date("2026-10-10"), monthVal: 10, monthName: "เดือน 10", zodiac: "horse" },
  { start: new Date("2026-10-11"), end: new Date("2026-11-08"), monthVal: 11, monthName: "เดือน 11", zodiac: "horse" },
  { start: new Date("2026-11-09"), end: new Date("2026-12-08"), monthVal: 12, monthName: "เดือน 12", zodiac: "horse" },
  { start: new Date("2026-12-09"), end: new Date("2026-12-31"), monthVal: 1, monthName: "เดือน 1 (อ้าย)", zodiac: "horse" }
];

export function getPreciseLunarInfo(date: Date, overrideMonth?: number, overrideZodiac?: ZodiacAnimal): PreciseLunarInfo {
  const time = date.getTime();
  const yearBE = date.getFullYear() + 543;
  
  // 1. ตรวจสอบในตารางปี 2569 ก่อน
  if (yearBE === 2569) {
    const matched = LUNAR_CALENDAR_2569.find(r => time >= r.start.getTime() && time <= r.end.getTime());
    if (matched) {
      const zAnimal = overrideZodiac ?? matched.zodiac;
      const mVal = overrideMonth ?? matched.monthVal;
      
      // คำนวณวันขึ้น/แรม แบบจำลองสำหรับปี 2569
      const diffDays = Math.floor((time - matched.start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      const isWaxing = diffDays <= 15;
      const dayNumInPhase = isWaxing ? diffDays : diffDays - 15;
      const phaseText = `${isWaxing ? "ขึ้น" : "แรม"} ${dayNumInPhase} ค่ำ`;
      
      return {
        thaiMonth: mVal,
        thaiMonthName: matched.monthName,
        thaiYear: yearBE,
        zodiacAnimal: zAnimal,
        dayNumber: DAY_TO_NUMBER[date.getDay()],
        monthNumber: mVal === 13 ? 1 : thaiMonthToNumber(mVal), // เดือน 8-8 (13) ตั้งฐาน 1
        yearNumber: zodiacToNumber(zAnimal),
        phaseText
      };
    }
  }

  // 2. ระบบคำนวณทั่วไป (Fallback System)
  // วันจันทรคติไทยเปลี่ยนปีนักษัตรในวันขึ้น 1 ค่ำ เดือน 5 (ประมาณเดือนมีนาคม-เมษายน)
  // สมมติว่าเปลี่ยนปีนักษัตรในวันที่ 1 เมษายนของทุกปีเป็นค่าประมาณ
  const m = date.getMonth(); // 0-11
  const d = date.getDate();
  
  let zodiacAnimal = overrideZodiac ?? thaiYearToZodiac(yearBE);
  if (m < 2 || (m === 2 && d < 15)) {
    // ถ้าเกิดก่อนกลางเดือนมีนาคม ให้นับเป็นปีเก่า
    zodiacAnimal = overrideZodiac ?? thaiYearToZodiac(yearBE - 1);
  }

  // เดือนจันทรคติประมาณการ
  const approxMonth = overrideMonth ?? approximateThaiMonth(date);
  
  // คำนวณวันจันทรคติแบบง่าย
  const dayInMonth = d;
  const isWaxing = dayInMonth <= 15;
  const phaseDay = isWaxing ? dayInMonth : dayInMonth - 15;
  const phaseText = `${isWaxing ? "ขึ้น" : "แรม"} ${phaseDay} ค่ำ (โดยประมาณ)`;

  return {
    thaiMonth: approxMonth,
    thaiMonthName: approxMonth === 13 ? "เดือน 8 หลัง (8-8)" : `เดือน ${approxMonth}`,
    thaiYear: yearBE,
    zodiacAnimal,
    dayNumber: DAY_TO_NUMBER[date.getDay()],
    monthNumber: approxMonth === 13 ? 1 : thaiMonthToNumber(approxMonth),
    yearNumber: zodiacToNumber(zodiacAnimal),
    phaseText
  };
}

export function thaiYearToZodiac(thaiYear: number): ZodiacAnimal {
  const index = ((thaiYear - 2503) % 12 + 12) % 12;
  return ZODIAC_ORDER[index];
}

export function zodiacToNumber(animal: ZodiacAnimal): number {
  const idx = ZODIAC_ORDER.indexOf(animal) + 1; // 1-based (1–12)
  return idx > 7 ? idx - 7 : idx;
}

export function thaiMonthToNumber(thaiMonth: number): number {
  // เดือน 8 หรือ 8-8 (13) หรือ 1
  if (thaiMonth === 13) return 1;
  return thaiMonth > 7 ? thaiMonth - 7 : thaiMonth;
}

export function approximateThaiMonth(date: Date): number {
  const m = date.getMonth() + 1;
  const map: Record<number, number> = {
    1:2, 2:3, 3:4, 4:5, 5:6, 6:7,
    7:8, 8:9, 9:10, 10:11, 11:12, 12:1,
  };
  return map[m] ?? m;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: Row generators
// ─────────────────────────────────────────────────────────────────────────────

/** ฐาน 1–3: เดิน +1 จาก seed, วนซ้ำ 1–7 */
export function genBase1to3(seed: number): number[] {
  return Array.from({ length: 7 }, (_, i) => reduceToBase7(seed + i));
}

/** ฐาน 4: รวม ฐาน 1+2+3 แต่ละช่อง */
export function genBase4(b1: number[], b2: number[], b3: number[]): number[] {
  return b1.map((v, i) => v + b2[i] + b3[i]);
}

/** ฐาน 5: ลบ 7 ซ้ำ */
export function genBase5(b4: number[]): number[] {
  return b4.map(reduceToBase7);
}

/** ฐาน 6: × 2 (mod 7) */
export function genBase6(b5: number[]): number[] {
  return b5.map(v => reduceToBase7(v * 2));
}

/** ฐาน 7: × 2 (mod 7) */
export function genBase7(b6: number[]): number[] {
  return b6.map(v => reduceToBase7(v * 2));
}

/**
 * ฐาน 8 — อาตมา
 * เริ่มจาก b5[0] → ลบ 2 ทุกช่อง (วนซ้ำ 1–7)
 * ✅ ตรวจสอบ: seed=5 → 5-3-1-6-4-2-7
 */
export function genBase8(b5FirstValue: number): number[] {
  return Array.from({ length: 7 }, (_, i) =>
    reduceToBase7(b5FirstValue - i * 2)
  );
}

/**
 * ฐาน 9 — ภริยัง
 * เริ่มจาก (b5[0] - 1) → บวก 2 ทุกช่อง (วนซ้ำ 1–7)
 * ✅ ตรวจสอบ: seed=5 → seed-1=4 → 4-6-1-3-5-7-2
 */
export function genBase9(b5FirstValue: number): number[] {
  const startSeed = reduceToBase7(b5FirstValue - 1);
  return Array.from({ length: 7 }, (_, i) =>
    reduceToBase7(startSeed + i * 2)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Calculator
// ─────────────────────────────────────────────────────────────────────────────

export function calculateNineBases(input: SevenNumbersInput): NineBaseResult {
  const { birthDate, thaiMonthOverride, zodiacOverride } = input;

  // ── ดึงข้อมูลจันทรคติไทยที่แม่นยำสูง ──
  const lunarInfo = getPreciseLunarInfo(birthDate, thaiMonthOverride, zodiacOverride);
  const dayOfWeek = birthDate.getDay();
  
  const lunarDate: ThaiLunarDate = {
    dayOfWeek,
    thaiMonth: lunarInfo.thaiMonth,
    thaiYear: lunarInfo.thaiYear,
    zodiacAnimal: lunarInfo.zodiacAnimal,
    dayNumber: lunarInfo.dayNumber,
    monthNumber: lunarInfo.monthNumber,
    yearNumber: lunarInfo.yearNumber,
    dayNameThai: DAY_NAMES_THAI[dayOfWeek],
    zodiacNameThai: ZODIAC_NAMES_THAI[lunarInfo.zodiacAnimal],
  };

  // ── คำนวณ ──
  const b1 = genBase1to3(lunarInfo.dayNumber);
  const b2 = genBase1to3(lunarInfo.monthNumber);
  const b3 = genBase1to3(lunarInfo.yearNumber);
  const b4 = genBase4(b1, b2, b3);
  const b5 = genBase5(b4);
  const b6 = genBase6(b5);
  const b7 = genBase7(b6);
  const b8 = genBase8(b5[0]);
  const b9 = genBase9(b5[0]);

  const bases: NineBaseRow[] = [
    { baseName: "ฐานวัน",        description: `วัน${DAY_NAMES_THAI[dayOfWeek]} = เลข ${dayNumber}`,                       values: b1 },
    { baseName: "ฐานเดือน",      description: `เดือนไทย ${thaiMonth} = เลข ${monthNumber}`,                               values: b2 },
    { baseName: "ฐานปี",         description: `ปี${ZODIAC_NAMES_THAI[zodiacAnimal]} พ.ศ.${thaiYear} = เลข ${yearNumber}`, values: b3 },
    { baseName: "ฐานรวมกำลัง",   description: "ผลรวม ฐาน 1+2+3",                                                         values: b4 },
    { baseName: "เอา ๗ ลบ",      description: "ฐาน 4 ลบด้วย 7 (หรือ 14) ให้เหลือ 1–7",                                  values: b5 },
    { baseName: "เอา ๒ คูณ",     description: "ฐาน 5 × 2 (ถ้าเกิน 7 ลบ 7)",                                              values: b6 },
    { baseName: "เอา ๒ คูณ",     description: "ฐาน 6 × 2 (ถ้าเกิน 7 ลบ 7)",                                              values: b7 },
    { baseName: "อาตมา",          description: `เดินยาม -2 จาก ${b5[0]} (ซ้ายไปขวา)`,                                    values: b8 },
    { baseName: "ภริยัง",         description: `เดินยาม +2 จาก ${reduceToBase7(b5[0]-1)} (ทวนเข็มนาฬิกา)`,              values: b9 },
  ];

  return { lunarDate, bases };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick validation export (for tests)
// ─────────────────────────────────────────────────────────────────────────────

export function runValidation(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;

  function check(name: string, got: number[], expected: number[]) {
    const ok = got.every((v, i) => v === expected[i]);
    if (ok) { passed++; details.push(`✅ ${name}: PASS`); }
    else { failed++; details.push(`❌ ${name}: got [${got}] expected [${expected}]`); }
  }

  // ตัวอย่าง: พฤหัส เดือน 6 ชวด
  const b1 = genBase1to3(5);
  const b2 = genBase1to3(6);
  const b3 = genBase1to3(1);
  const b4 = genBase4(b1, b2, b3);
  const b5 = genBase5(b4);
  const b6 = genBase6(b5);
  const b7 = genBase7(b6);
  const b8 = genBase8(b5[0]);
  const b9 = genBase9(b5[0]);

  check("ฐาน 1", b1, [5,6,7,1,2,3,4]);
  check("ฐาน 2", b2, [6,7,1,2,3,4,5]);
  check("ฐาน 3", b3, [1,2,3,4,5,6,7]);
  check("ฐาน 4", b4, [12,15,11,7,10,13,16]);
  check("ฐาน 5", b5, [5,1,4,7,3,6,2]);
  check("ฐาน 6", b6, [3,2,1,7,6,5,4]);
  check("ฐาน 7", b7, [6,4,2,7,5,3,1]);
  check("ฐาน 8", b8, [5,3,1,6,4,2,7]);
  check("ฐาน 9", b9, [4,6,1,3,5,7,2]);

  return { passed, failed, details };
}

export default calculateNineBases;
