import { yamDayTable }  from "../constants/yamDayTable";
import { yamNightTable } from "../constants/yamNightTable";
import { DAY_INDEX_MAP } from "../constants/dayMap";
import { getSunTimes, isDayTime, getYamIndex } from "./timeUtils";
import { YamInfo } from "../types/yam.types";

export interface CalculateYamOptions {
  lat?: number;
  lng?: number;
}

/**
 * คำนวณยามอัฐกาล ณ เวลาที่กำหนด
 * รองรับ Dynamic Sunrise/Sunset ผ่าน SunCalc
 */
export function calculateYam(
  date: Date,
  options: CalculateYamOptions = {}
): YamInfo & { sunTimes: ReturnType<typeof getSunTimes> } {
  const sunTimes = getSunTimes(date, options.lat, options.lng);
  const dayName  = DAY_INDEX_MAP[date.getDay()];
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
