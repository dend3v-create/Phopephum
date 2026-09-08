import { r7_local } from "../engine/seven-numbers-v2.js";
import { calculateNineBase } from "./nineBase.js";
import { calculateYam } from "../yam/core/yamCalculator.js";
import { DAY_INDEX_MAP } from "../yam/constants/dayMap.js";
import { getBKKDay, getBKKHour } from "../yam/core/timeUtils.js";
import { gregorianToThaiLunarV3 } from "../core/thaiLunar.js";

const YAM_TO_PLANET: Record<string, number> = {
  "สุริชะ": 1, "สุริยะ": 1, "ระวิ": 1,
  "จันเทา": 2, "ศะศิ": 2, "คะศิ": 2, "จันทา": 2, "จันทรา": 2,
  "ภุมมะ": 3, "ภุมโม": 3, "ภูมมะ": 3,
  "พุธะ": 4, "พุทธะ": 4, "พุธ": 4, "พุโธ": 4, "พุทโธ": 4,
  "ครู": 5, "ชีโว": 5, "พฤหัส": 5,
  "ศุกระ": 6, "ศุโกร": 6, "ศุกโร": 6,
  "เสารี": 7, "โสโร": 7, "เสาร์": 7,
};

/** Chaldean sequence: เสาร์→พฤหัส→อังคาร→อาทิตย์→ศุกร์→พุธ→จันทร์ */
const CHALDEAN_ARR = [7, 5, 3, 1, 6, 4, 2] as const;
const PLANET_NAME_DAY: Record<number, string> = {
  1: "สุริชะ", 2: "จันเทา", 3: "ภุมมะ", 4: "พุธะ", 5: "ครู", 6: "ศุกระ", 7: "เสารี",
};

/** 
 * แปลง dayOfWeek (JS: 0=อาทิตย์) → Thai star number (1=อาทิตย์)
 * JS Sunday=0 → Thai 1
 * JS Monday=1 → Thai 2
 * ...
 * JS Saturday=6 → Thai 7
 */
function jsDayToThaiStar(jsDay: number): number {
  return jsDay === 0 ? 1 : jsDay + 1;
}

export interface KarnchataResult {
  date: Date;
  // ─── ยามใหญ่ ───────────────────────────────────────────────
  yamYaiName: string;
  yamYaiNumber: number;
  // ─── ยามซอย (minute) ───────────────────────────────────────
  yamSoyName: string;
  yamSoyNumber: number;
  // ─── ดาวประจำวัน ────────────────────────────────────────────
  dayStarNumber: number;
  // ─── เดือนจันทรคติ ──────────────────────────────────────────
  lunarMonth: number;
  lunarMonthName: string;
  // ─── ผังดวง 3 ระบบ ─────────────────────────────────────────
  /**
   * กาลชะตารายวัน:
   * ฐาน1 = ดาวประจำวัน (วัน)
   * ฐาน2 = เดือนจันทรคติ
   * ฐาน3 = ปีนักษัตร (เลขปี พ.ศ. mod 7 → r7_local)
   */
  dailyChart: number[][];
  /**
   * กาลชะตารายชั่วโมง:
   * ฐาน1 = ยามใหญ่ (yamYai)
   * ฐาน2 = ดาวประจำวัน
   * ฐาน3 = เดือนจันทรคติ
   */
  hourlyChart: number[][];
  /**
   * กาลชะตารายนาที:
   * ฐาน1 = ยามซอย (yamSoy)
   * ฐาน2 = ยามใหญ่ (yamYai)
   * ฐาน3 = ดาวประจำวัน
   */
  chart: number[][];
}

/**
 * Calculates Karnchata (กาลชะตา) based on current time.
 * Three distinct calculation systems:
 * - Daily: uses Day star / Lunar month / Year cycle
 * - Hourly: uses YamYai / Day star / Lunar month
 * - Minute: uses YamSoy / YamYai / Day star
 */
export function calculateKarnchata(date: Date): KarnchataResult {
  // 1. Thai Day (cutoff 06:00 AM)
  const adjustedDate = new Date(date.getTime());
  if (getBKKHour(date) < 6) {
    adjustedDate.setDate(adjustedDate.getDate() - 1);
  }
  const bkkDay = getBKKDay(adjustedDate);
  const dayStarNumber = jsDayToThaiStar(bkkDay);

  // 2. Yam Yai (ยามใหญ่)
  const yamInfo = calculateYam(date);
  const yamYaiName = yamInfo.yamName;
  const yamYaiNumber = YAM_TO_PLANET[yamYaiName] ?? 1;

  // 3. Yam Soy (ยามซอย) — 8 ซอยต่อ 30 นาที → ซอยละ 3.75 นาที
  // แต่ละยามใหญ่ (90 นาที) มี 24 ซอย (ซอยละ 3.75 นาที) — ใช้ mod 30 นาที เพื่อ index 0–7
  const bkkMinuteOfDay = ((date.getUTCHours() + 7) % 24) * 60 + date.getUTCMinutes();
  const minuteInYam = bkkMinuteOfDay % 90; // นาทีที่ตกในยามปัจจุบัน (0–89)
  const soyIndex = Math.floor(minuteInYam / 3.75) % 8; // 0–7 (แบ่ง 8 ซอยต่อยาม)

  const yamYaiChalIdx = CHALDEAN_ARR.indexOf(yamYaiNumber as typeof CHALDEAN_ARR[number]);
  const yamSoyNumber = yamYaiChalIdx !== -1
    ? CHALDEAN_ARR[(yamYaiChalIdx + soyIndex) % 7]
    : yamYaiNumber;
  const yamSoyName = PLANET_NAME_DAY[yamSoyNumber] ?? "สุริชะ";

  // 4. เดือนจันทรคติ
  const lunar = gregorianToThaiLunarV3(adjustedDate);
  const lunarMonth = lunar.thaiMonth === 88 ? 8 : lunar.thaiMonth; // intercalary → treat as 8
  const lunarMonthName = lunar.thaiMonthName;

  // 5. ปีนักษัตร → r7_local ของปี พ.ศ.
  const beYear = adjustedDate.getUTCFullYear() + 543;
  const yearStarNumber = r7_local(beYear);

  // ══════════════════════════════════════════════════════════════
  // กาลชะตารายวัน (Daily Horary)
  // ฐาน1 = ดาวประจำวัน, ฐาน2 = เดือนจันทรคติ, ฐาน3 = ปีนักษัตร
  // ══════════════════════════════════════════════════════════════
  const d1 = Array.from({ length: 7 }, (_, i) => r7_local(dayStarNumber + i));
  const d2 = Array.from({ length: 7 }, (_, i) => r7_local(lunarMonth + i));
  const d3 = Array.from({ length: 7 }, (_, i) => r7_local(yearStarNumber + i));
  const dailyChart = calculateNineBase(d1, d2, d3);

  // ══════════════════════════════════════════════════════════════
  // กาลชะตารายชั่วโมง (Hourly Horary)
  // ฐาน1 = ยามใหญ่ (yamYai), ฐาน2 = ดาวประจำวัน, ฐาน3 = เดือนจันทรคติ
  // ══════════════════════════════════════════════════════════════
  const h1 = Array.from({ length: 7 }, (_, i) => r7_local(yamYaiNumber + i));
  const h2 = Array.from({ length: 7 }, (_, i) => r7_local(dayStarNumber + i));
  const h3 = Array.from({ length: 7 }, (_, i) => r7_local(lunarMonth + i));
  const hourlyChart = calculateNineBase(h1, h2, h3);

  // ══════════════════════════════════════════════════════════════
  // กาลชะตารายนาที (Minute Horary)
  // ฐาน1 = ยามซอย (yamSoy), ฐาน2 = ยามใหญ่ (yamYai), ฐาน3 = ดาวประจำวัน
  // ══════════════════════════════════════════════════════════════
  const m1 = Array.from({ length: 7 }, (_, i) => r7_local(yamSoyNumber + i));
  const m2 = Array.from({ length: 7 }, (_, i) => r7_local(yamYaiNumber + i));
  const m3 = Array.from({ length: 7 }, (_, i) => r7_local(dayStarNumber + i));
  const chart = calculateNineBase(m1, m2, m3);

  return {
    date,
    yamYaiName,
    yamYaiNumber,
    yamSoyName,
    yamSoyNumber,
    dayStarNumber,
    lunarMonth,
    lunarMonthName,
    dailyChart,
    hourlyChart,
    chart,
  };
}
