import { r7_local } from "../engine/seven-numbers-v2.js";
import { calculateNineBase } from "./nineBase.js";
import { calculateYam } from "../yam/core/yamCalculator.js";
import { yamDayTable } from "../yam/constants/yamDayTable.js";
import { yamNightTable } from "../yam/constants/yamNightTable.js";
import { DAY_INDEX_MAP } from "../yam/constants/dayMap.js";
import { getBKKDay, getBKKHour, getMinutes, isDayTime, getSunTimes } from "../yam/core/timeUtils.js";

const YAM_TO_PLANET: Record<string, number> = {
  "สุริชะ": 1, "ระวิ": 1,
  "จันเทา": 2, "คะศิ": 2,
  "ภุมมะ": 3, "ภุมโม": 3,
  "พุธะ": 4,  "พุทโธ": 4,
  "ครู": 5,   "ชีโว": 5,
  "ศุกระ": 6, "ศุโกร": 6,
  "เสารี": 7, "โสโร": 7,
};

export interface KarnchataResult {
  date: Date;
  yamYaiName: string;
  yamYaiNumber: number;
  yamSoyName: string;
  yamSoyNumber: number;
  dayStarNumber: number;
  chart: number[][]; // 9 rows of 7 numbers
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

  // 3. Yam Soy (ยามซอย)
  // Get current minute
  const minuteOfHour = date.getUTCMinutes();
  // We use modulo 30, and each Yam Soy is 3.75 minutes (3m 45s)
  const mMod = minuteOfHour % 30;
  const soyIndex = Math.floor(mMod / 3.75); // 0 to 7
  
  // The sequence depends on whether it's currently day or night period
  const sunTimes = getSunTimes(adjustedDate);
  const period = isDayTime(date, sunTimes) ? "day" : "night";
  const sequence = period === "day" ? yamDayTable[dayName] : yamNightTable[dayName];
  
  // The Yam Soy sequence starts according to the current Thai Day
  const yamSoyName = sequence[soyIndex] ?? sequence[0];
  const yamSoyNumber = YAM_TO_PLANET[yamSoyName];

  // 4. Build the Seven Base Chart (9 Bases)
  // Rule for Karnchata:
  // Base 1 (Atta) = Yam Soy
  // Base 2 (Tanu) = Yam Yai
  // Base 3 (Morana) = Day Star
  const b1 = Array.from({ length: 7 }, (_, i) => r7_local(yamSoyNumber + i));
  const b2 = Array.from({ length: 7 }, (_, i) => r7_local(yamYaiNumber + i));
  const b3 = Array.from({ length: 7 }, (_, i) => r7_local(dayStarNumber + i));

  const chart = calculateNineBase(b1, b2, b3);

  return {
    date,
    yamYaiName,
    yamYaiNumber,
    yamSoyName,
    yamSoyNumber,
    dayStarNumber,
    chart,
  };
}
