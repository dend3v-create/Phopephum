import { yamDayTable }  from "../constants/yamDayTable.js";
import { yamNightTable } from "../constants/yamNightTable.js";
import { DAY_INDEX_MAP } from "../constants/dayMap.js";
import { getSunTimes, isDayTime, getYamIndex, getBKKHour, getBKKDay } from "./timeUtils.js";
import { YamInfo } from "../types/yam.types.js";

export interface CalculateYamOptions {
  lat?: number;
  lng?: number;
}

/**
 * คำนวณยามอัฏฐกาล ณ เวลาที่กำหนด
 * รองรับ Dynamic Sunrise/Sunset ผ่าน SunCalc
 */
export function calculateYam(
  date: Date,
  options: CalculateYamOptions = {}
): YamInfo & { sunTimes: ReturnType<typeof getSunTimes> } {
  // โคลน Date เพื่อหลีกเลี่ยง side effects
  const adjustedDate = new Date(date.getTime());
  
  // ยามอัฏฐกาลเปลี่ยนวันตอน 06:00
  if (getBKKHour(date) < 6) {
    adjustedDate.setDate(adjustedDate.getDate() - 1);
  }

  const sunTimes = getSunTimes(adjustedDate, options.lat, options.lng);
  const dayName  = DAY_INDEX_MAP[getBKKDay(adjustedDate)];
  const period   = isDayTime(date, sunTimes) ? "day" : "night";
  const yamIndex = getYamIndex(date, sunTimes);

  const table   = period === "day" ? yamDayTable[dayName] : yamNightTable[dayName];
  const yamName = table[yamIndex] ?? table[0];

  return {
    dayName,
    period,
    yamNumber: yamIndex + 1,
    yamName,
    sunTimes,
  };
}
