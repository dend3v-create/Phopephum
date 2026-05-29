import SunCalc from "suncalc";
import { SunTimes } from "../types/yam.types.js";

/** ละติจูด/ลองจิจูด กรุงเทพฯ (default) */
const DEFAULT_LAT = 13.7563;
const DEFAULT_LNG = 100.5018;

/**
 * คำนวณเวลาพระอาทิตย์ขึ้น-ตกจาก SunCalc
 * รองรับพิกัดเฉพาะเจาะจง (เช่น เชียงใหม่, ภูเก็ต)
 */
export function getSunTimes(
  date: Date,
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG
): SunTimes {
  const times = SunCalc.getTimes(date, lat, lng);
  return {
    sunrise: times.sunrise,
    sunset:  times.sunset,
  };
}

/** แปลง Date เป็น minutes-since-midnight ตามเวลาประเทศไทย (UTC+7) */
export function getMinutes(date: Date): number {
  let h = date.getUTCHours() + 7;
  if (h >= 24) h -= 24;
  return h * 60 + date.getUTCMinutes();
}

/** ดึงชั่วโมง (0-23) ตามเวลาประเทศไทย */
export function getBKKHour(date: Date): number {
  let h = date.getUTCHours() + 7;
  if (h >= 24) h -= 24;
  return h;
}

/** ดึงวันในสัปดาห์ (0-6) ตามเวลาประเทศไทย */
export function getBKKDay(date: Date): number {
  // shift date by +7 hours to get the absolute time in BKK, then use getUTCDay()
  const bkkDate = new Date(date.getTime() + 7 * 3600 * 1000);
  return bkkDate.getUTCDay();
}

/** ตรวจสอบว่าเป็นเวลากลางวัน (sunrise → sunset) */
export function isDayTime(date: Date, sunTimes: SunTimes): boolean {
  const now     = getMinutes(date);
  const rise    = getMinutes(sunTimes.sunrise);
  const set     = getMinutes(sunTimes.sunset);
  return now >= rise && now < set;
}

/**
 * คำนวณดัชนียาม (0–7) จากเวลาและช่วงกลางวัน/กลางคืน
 *
 * กลางวัน  : 8 ยาม แบ่ง (sunset - sunrise) / 8
 * กลางคืน : 8 ยาม แบ่ง (24h - dayDuration) / 8
 */
export function getYamIndex(date: Date, sunTimes: SunTimes): number {
  const now  = getMinutes(date);
  const rise = getMinutes(sunTimes.sunrise);
  const set  = getMinutes(sunTimes.sunset);

  const dayDuration   = set - rise;           // นาทีกลางวัน
  const nightDuration = 1440 - dayDuration;   // นาทีกลางคืน

  const yamDayLen   = dayDuration / 8;
  const yamNightLen = nightDuration / 8;

  if (isDayTime(date, sunTimes)) {
    return Math.min(7, Math.floor((now - rise) / yamDayLen));
  } else {
    // กลางคืน: after sunset หรือ before sunrise
    const minutesAfterSunset =
      now >= set ? now - set : now + (1440 - set);
    return Math.min(7, Math.floor(minutesAfterSunset / yamNightLen));
  }
}
