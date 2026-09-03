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

export interface KarnchataResult {
  date: Date;
  yamYaiName: string;
  yamYaiNumber: number;
  yamSoyName: string;
  yamSoyNumber: number;
  dayStarNumber: number;
  lunarMonth: number;
  lunarMonthName: string;
  chart: number[][]; // 9 rows of 7 numbers
  hourlyChart: number[][]; // กาลชะตารายชั่วโมง: ยาม × วัน × เดือน
}

/**
 * Calculates Karnchata (กาลชะตา) based on current time.
 */
export function calculateKarnchata(date: Date): KarnchataResult {
  // 1. Thai Day (cutoff 06:00 AM)
  const adjustedDate = new Date(date.getTime());
  if (getBKKHour(date) < 6) {
    adjustedDate.setDate(adjustedDate.getDate() - 1);
  }
  const bkkDay = getBKKDay(adjustedDate);
  const dayName = DAY_INDEX_MAP[bkkDay];
  // Sunday = 0 in JS Date, but in Thai astrology Sunday = 1
  const dayStarNumber = bkkDay === 0 ? 1 : bkkDay + 1;

  // 2. Yam Yai (ยามใหญ่)
  const yamInfo = calculateYam(date);
  const yamYaiName = yamInfo.yamName;
  const yamYaiNumber = YAM_TO_PLANET[yamYaiName];

  // 3. Yam Soy (ยามซอย) — แบ่ง 8 ซอย ต่อ 30 นาที (3.75 นาที/ซอย)
  // ลำดับยามซอยเริ่มต้นจากดาวยามใหญ่ แล้วเดินตามลำดับกาลเทวี (Chaldean)
  const minuteOfHour = date.getUTCMinutes();
  const soyIndex = Math.floor((minuteOfHour % 30) / 3.75); // 0–7

  const yamYaiChalIdx = CHALDEAN_ARR.indexOf(yamYaiNumber as typeof CHALDEAN_ARR[number]);
  const yamSoyNumber = yamYaiChalIdx !== -1
    ? CHALDEAN_ARR[(yamYaiChalIdx + soyIndex) % 7]
    : yamYaiNumber;
  const yamSoyName = PLANET_NAME_DAY[yamSoyNumber] ?? "สุริชะ";

  // 4. Build the Seven Base Chart (9 Bases)
  // Rule for Karnchata:
  // Base 1 (Atta) = Yam Soy
  // Base 2 (Tanu) = Yam Yai
  // Base 3 (Morana) = Day Star
  const b1 = Array.from({ length: 7 }, (_, i) => r7_local(yamSoyNumber + i));
  const b2 = Array.from({ length: 7 }, (_, i) => r7_local(yamYaiNumber + i));
  const b3 = Array.from({ length: 7 }, (_, i) => r7_local(dayStarNumber + i));

  const chart = calculateNineBase(b1, b2, b3);

  // 5. กาลชะตารายชั่วโมง (Hourly Horary)
  // อัตตะ = เลขยามใหญ่ (yamYai planet number)
  // ตนุ   = เลขดาวประจำวัน
  // มรณะ  = เลขเดือนจันทรคติ
  const lunar = gregorianToThaiLunarV3(adjustedDate);
  const lunarMonth = lunar.thaiMonth === 88 ? 8 : lunar.thaiMonth; // intercalary → treat as 8
  const lunarMonthName = lunar.thaiMonthName;

  const h1 = Array.from({ length: 7 }, (_, i) => r7_local(yamYaiNumber + i));
  const h2 = Array.from({ length: 7 }, (_, i) => r7_local(dayStarNumber + i));
  const h3 = Array.from({ length: 7 }, (_, i) => r7_local(lunarMonth + i));

  const hourlyChart = calculateNineBase(h1, h2, h3);

  return {
    date,
    yamYaiName,
    yamYaiNumber,
    yamSoyName,
    yamSoyNumber,
    dayStarNumber,
    lunarMonth,
    lunarMonthName,
    chart,
    hourlyChart,
  };
}
