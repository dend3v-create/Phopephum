import { PhaseType, SunTimes } from "../types/yam.types";
import { isDayTime, getMinutes } from "./timeUtils";

/**
 * คำนวณช่วงยาม (phase) ว่าอยู่ใน ต้น/กลาง/ปลาย ของยามนั้น
 * แบ่งตามสัดส่วน 1/3 ของความยาวยาม (dynamic จาก sunrise/sunset)
 */
export function calculatePhase(date: Date, sunTimes: SunTimes): PhaseType {
  const now  = getMinutes(date);
  const rise = getMinutes(sunTimes.sunrise);
  const set  = getMinutes(sunTimes.sunset);

  const dayDuration   = set - rise;
  const nightDuration = 1440 - dayDuration;

  const yamLen = isDayTime(date, sunTimes)
    ? dayDuration / 8
    : nightDuration / 8;

  // offset ภายในยามปัจจุบัน
  let offsetInYam: number;
  if (isDayTime(date, sunTimes)) {
    offsetInYam = ((now - rise) % yamLen + yamLen) % yamLen;
  } else {
    const minutesAfterSunset = now >= set ? now - set : now + (1440 - set);
    offsetInYam = minutesAfterSunset % yamLen;
  }

  const third = yamLen / 3;
  if (offsetInYam < third)          return "start";
  if (offsetInYam < third * 2)      return "middle";
  return "end";
}
