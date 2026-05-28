/**
 * seven-numbers-v3.ts — Thai Astrology เลข 7 ตัว 9 ฐาน Engine (v3 Production)
 *
 * ✅ FIX: Zodiac year cutoff ถูกต้อง — ใช้ ขึ้น 1 ค่ำ เดือน 5 (ไม่ใช่ Feb 15)
 * ✅ FIX: Thai lunar calendar จาก 72-year verified lookup table (1957–2028)
 * ✅ NEW: Province/birthplace support (77 จังหวัด พร้อม lat/lng)
 * ✅ NEW: มหาภูต element mapping ถูกต้อง
 * ✅ NEW: ทักษา 8 หมวด rotate จาก birth-day planet ถูกต้อง
 * ✅ COMPAT: คืน SevenBaseResult interface เดิม (dashboard ไม่ต้องแก้)
 *
 * Reference: Jean Meeus "Astronomical Algorithms" Ch.49
 * Reference: myhora.com verified lunar calendar data
 */

import { gregorianToThaiLunarV3, getZodiacYear } from "@/lib/astrology/core/thaiLunar";
import { getProvinceOrDefault, type ProvinceInfo } from "@/lib/astrology/datasets/provinces";
import type {
  SevenBaseChart,
  SevenBaseResult,
  TransitInfo,
  TaksaCategory,
  MahaPhuteResult,
} from "./seven-base-calculator";
import {
  r7,
  genBase1to3,
  genBase4,
  genBase5,
  genBase6,
  genBase7,
  genBase8,
  genBase9,
  ZODIAC_NAMES_THAI,
} from "./seven-numbers";

// ─────────────────────────────────────────────────────────────────────────────
// Re-export interfaces for consumers
// ─────────────────────────────────────────────────────────────────────────────

export type {
  SevenBaseChart,
  SevenBaseResult,
  TransitInfo,
  TaksaCategory,
  MahaPhuteResult,
} from "./seven-base-calculator";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PLANET_NAMES = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "ราหู",
];

const ZODIAC_YEARS = [
  "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน",
];

/** มหาภูต — Chula Sakarat % 7 → [name, element, description] */
const MAHA_PHUTE_TABLE: [string, string, string][] = [
  ["อธิบดี",    "ดิน",  "ตำแหน่งอธิบดี — มีอำนาจวาสนา"],
  ["ธงชัย",    "น้ำ",  "ธงชัย — ชัยชนะ ความสำเร็จ"],
  ["มรณะ",     "ไฟ",   "มรณะ — ระวังอุบัติเหตุ โรคภัย"],
  ["ราชา",     "ลม",   "ราชา — มีบารมี ผู้นำ"],
  ["เสนา",     "ดิน",  "เสนา — บริวารดี มีผู้สนับสนุน"],
  ["ขุมทรัพย์", "น้ำ", "ขุมทรัพย์ — ทรัพย์สินมั่นคง"],
  ["อุบาทว์",  "ไฟ",   "อุบาทว์ — ระวังความสูญเสีย"],
];

const TAKSA_CATEGORIES = [
  "บริวาร", "อายุ", "เดช", "ศรี", "มูละ", "อุตสาหะ", "มนตรี", "กาลกิณี",
] as const;

const TAKSA_DESC = [
  "ผู้ใต้บังคับบัญชา คนรอบข้าง",
  "สุขภาพ ความเป็นอยู่",
  "อำนาจ บารมี",
  "โชคลาภ ความสำเร็จ",
  "ทรัพย์สิน หลักฐาน",
  "ความขยัน หน้าที่การงาน",
  "ผู้อุปถัมภ์ การช่วยเหลือ",
  "อุปสรรค ศัตรู",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Extended Result Interface (v3)
// ─────────────────────────────────────────────────────────────────────────────

export interface SevenBaseResultV3 extends SevenBaseResult {
  /** จังหวัดเกิด พร้อม lat/lng */
  province: ProvinceInfo;
  /** แหล่งข้อมูลปฏิทิน: "lookup" = verified table, "astronomical" = Meeus algorithm */
  calendarSource: "lookup" | "astronomical";
  /** เดือนไทยดิบ (88 = เดือนแปดสอง) */
  lunarMonthRaw: number;
  /** ปีไทย (พ.ศ.) ที่ถูกต้องตาม เดือน 5 cutoff */
  thaiYearCorrected: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main V3 Calculator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณเลข 7 ตัว 9 ฐาน ด้วย engine v3
 *
 * @param birthDateStr  — "YYYY-MM-DD"
 * @param birthTimeStr  — "HH:MM" (default "12:00")
 * @param provinceName  — ชื่อจังหวัดเกิด (default กรุงเทพ)
 */
export function calculateSevenBaseV3(
  birthDateStr: string,
  birthTimeStr = "12:00",
  provinceName?: string,
): SevenBaseResultV3 {

  // ── 1. Parse inputs ──────────────────────────────────────────────────────
  const parts = birthDateStr.split("-").map(Number);
  const [hy, hm, hd] = [parts[0]!, parts[1]!, parts[2]!];
  const birthDate = new Date(hy, hm - 1, hd, 12, 0, 0); // local noon — ป้องกัน UTC offset

  const hourStr = birthTimeStr.split(":")[0];
  const hour = parseInt(hourStr ?? "12", 10);

  const province = getProvinceOrDefault(provinceName);

  // ── 2. Birth day adjustment (กฎ 06:00 น.) ────────────────────────────────
  const originalDayOfWeek = birthDate.getDay(); // 0=อาทิตย์

  let effectiveDate = birthDate;
  let effectiveDow  = originalDayOfWeek;

  if (hour < 6) {
    // เกิดก่อน 06:00 → นับเป็นวันก่อนหน้า
    effectiveDate = new Date(hy, hm - 1, hd - 1, 12, 0, 0);
    effectiveDow  = effectiveDate.getDay();
  }

  // วันพุธกลางคืน (18:00–23:59) → ราหู (เลข 8)
  const isWednesdayNight =
    (effectiveDow === 3 && hour >= 18) ||   // พุธ 18:00+
    (originalDayOfWeek === 4 && hour < 6);   // เกิดพฤหัส ก่อน 06:00 → นับเป็นพุธกลางคืน

  // adjustedDayOfWeek: 1=อาทิตย์ … 7=เสาร์ (base-1)
  const adjustedDayOfWeek = effectiveDow === 0 ? 7 : effectiveDow;
  // dayNumber สำหรับ taksa/ทักษา (1–7, ราหู=8)
  const dayNumber = isWednesdayNight ? 8 : adjustedDayOfWeek;
  const dayName   = isWednesdayNight ? "พุธกลางคืน (ราหู)" : PLANET_NAMES[adjustedDayOfWeek - 1]!;

  // ── 3. Thai Lunar Calendar v3 ─────────────────────────────────────────────
  const lunarResult = gregorianToThaiLunarV3(effectiveDate);
  const thaiMonth   = lunarResult.thaiMonth;   // 1–12, or 88 for intercalary
  const monthNumber = lunarResult.monthNumber; // 1–7

  // ── 4. Zodiac Year (Fixed cutoff: ขึ้น 1 ค่ำ เดือน 5) ────────────────────
  const zodiacResult = getZodiacYear(effectiveDate);
  const zodiacName   = zodiacResult.zodiacName;
  const yearNumber   = zodiacResult.zodiacNumber;

  // ── 5. Nine Bases (ฐาน 1–9) ──────────────────────────────────────────────
  // ราหู (8) → ใช้เลข 1 เป็น seed (ราหู มีค่าเลขเดียวกับ อาทิตย์ ในระบบ 7 ตัว)
  const seedDay = dayNumber === 8 ? 1 : dayNumber;

  const b1 = genBase1to3(seedDay);
  const b2 = genBase1to3(monthNumber);
  const b3 = genBase1to3(yearNumber);
  const b4 = genBase4(b1, b2, b3);
  const b5 = genBase5(b4);
  const b6 = genBase6(b5);
  const b7 = genBase7(b6);
  const b8 = genBase8(b5[0]!);
  const b9 = genBase9(b5[0]!);

  // ── 6. มหาภูต ────────────────────────────────────────────────────────────
  const chulaSakarat = zodiacResult.thaiYear - 1181;
  const mahaPhuteRem = ((chulaSakarat % 7) + 7) % 7;
  const mpRow        = MAHA_PHUTE_TABLE[mahaPhuteRem]!;
  const [mpName, mpElement, mpDesc] = mpRow;

  // ── 7. ทักษา (8 categories, rotate from birth-day planet) ──────────────
  // Planet index: อาทิตย์=0, จันทร์=1, … เสาร์=6, ราหู=7
  const birthPlanetIdx = dayNumber - 1; // 0-based (ราหู = index 7)

  const taksa: TaksaCategory[] = TAKSA_CATEGORIES.map((category, i) => {
    const planetIdx = (birthPlanetIdx + i) % 8;
    return {
      category,
      planet:      PLANET_NAMES[planetIdx]!,
      number:      planetIdx + 1,
      description: TAKSA_DESC[i]!,
    };
  });

  // ── 8. Transit (current year analysis) ──────────────────────────────────
  const today       = new Date();
  const age         = today.getFullYear() - hy;
  const thaiNow     = getZodiacYear(today);
  const yearsElapsed = thaiNow.thaiYear - zodiacResult.thaiYear;
  const transitMajor = PLANET_NAMES[((yearsElapsed) % 7 + 7) % 7]!;
  const transitMinor = PLANET_NAMES[((yearsElapsed + 1) % 7 + 7) % 7]!;

  // ── 9. Thai lunar date text ──────────────────────────────────────────────
  const thaiLunarDateText =
    `วัน${dayName} ${lunarResult.thaiMonthName} ปี${zodiacName} (${lunarResult.moonPhaseText})`;

  const zodiacIndex = ZODIAC_YEARS.indexOf(zodiacName) + 1;

  // ── 10. Assemble result ─────────────────────────────────────────────────
  return {
    // Core identification
    birthDate:   birthDateStr,
    birthTime:   birthTimeStr,

    // Day-of-week (adjusted)
    dayOfWeek:         dayNumber,
    originalDayOfWeek,
    adjustedDayOfWeek,
    dayName,
    isWednesdayNight,

    // Lunar month (UI: แสดง 8 สำหรับ intercalary เดือนแปดสอง)
    lunarMonth:     thaiMonth === 88 ? 8 : thaiMonth,
    lunarMonthName: lunarResult.thaiMonthName,
    phaseText:      lunarResult.moonPhaseText,

    // Zodiac year
    zodiacIndex,
    zodiacName,

    // Nine base chart
    chart: {
      row1: b1, row2: b2, row3: b3,
      row4: b4, row5: b5, row6: b6,
      row7: b7, row8: b8, row9: b9,
    },

    // Transit
    transit: {
      currentAge:        age,
      transitAge:        age + 1,
      zodiacYear:        zodiacName,
      majorCycle:        transitMajor,
      minorCycle:        transitMinor,
      auspiciousAspects: [],
      warningAspects:    [],
    },

    // Strengths / weaknesses
    strengths:  [],
    weaknesses: [],

    thaiLunarDateText,
    taksa,

    // มหาภูต
    mahaPhute: {
      remainder:   mahaPhuteRem,
      name:        mpName!,
      element:     mpElement!,
      description: mpDesc!,
    },

    // ── v3-specific fields ──────────────────────────────────────────────
    province,
    calendarSource:    lunarResult.source,
    lunarMonthRaw:     thaiMonth,
    thaiYearCorrected: zodiacResult.thaiYear,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement — same signature as seven-base-calculator.calculateSevenBase
// Switch import in dashboard/page.tsx: change "./seven-base-calculator" → "./seven-numbers-v3"
// ─────────────────────────────────────────────────────────────────────────────

export function calculateSevenBase(
  birthDateStr: string,
  birthTimeStr = "12:00",
): SevenBaseResultV3 {
  return calculateSevenBaseV3(birthDateStr, birthTimeStr);
}

export default calculateSevenBaseV3;
