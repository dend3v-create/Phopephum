import SunCalc from "suncalc";
import { SunTimes } from "../types/yam.types.js";

/** ละติจูด/ลองจิจูด กรุงเทพฯ (default) */
const DEFAULT_LAT = 13.7563;
const DEFAULT_LNG = 100.5018;

/**
 * คำนวณเวลาพระอาทิตย์ขึ้น-ตกจาก SunCalc
 * รองรับพิกัดเฉพาะเจาะจง (เช่น เชียงใหม่, ภูเก็ต)
 * หมายเหตุ: ระบบยามอัฏฐกาลมาตรฐานใช้เวลาคงที่ 06:00 และ 18:00
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

/** 
 * ตรวจสอบว่าเป็นเวลากลางวัน 
 * ใช้เวลาคงที่ตามตำรายามอัฏฐกาล (06:00 - 18:00)
 */
export function isDayTime(date: Date, sunTimes?: SunTimes): boolean {
  const now = getMinutes(date);
  // กลางวัน: 06:00 (360 นาที) ถึงก่อน 18:00 (1080 นาที)
  return now >= 360 && now < 1080;
}

/**
 * คำนวณดัชนียาม (0–7) จากเวลา
 * ใช้เวลาคงที่ตามตำรายามอัฏฐกาล ยามละ 90 นาที
 */
export function getYamIndex(date: Date, sunTimes?: SunTimes): number {
  const now = getMinutes(date);

  if (now >= 360 && now < 1080) {
    // กลางวัน: เริ่ม 06:00 (360)
    return Math.min(7, Math.floor((now - 360) / 90));
  } else {
    // กลางคืน: เริ่ม 18:00 (1080)
    // ถ้าน้อยกว่า 360 (หลังเที่ยงคืน) ให้บวก 1440 แล้วลบ 1080 = บวก 360
    const minutesAfterSunset = now >= 1080 ? now - 1080 : now + 360;
    return Math.min(7, Math.floor(minutesAfterSunset / 90));
  }
}
