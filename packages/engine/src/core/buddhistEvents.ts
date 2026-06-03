import { gregorianToThaiLunarV3 } from "../core/thaiLunar.js";
import { isWanPhra as checkWanPhra } from "../core/lunarCalendar.js";

/**
 * Buddhist Event Engine (V4)
 * Calculates major Buddhist dates and holidays.
 */

export interface BuddhistEvent {
  name: string;
  thaiDate: string;
}

export function getMajorBuddhistEvents(beYear: number): BuddhistEvent[] {
  // มาฆบูชา: ขึ้น 15 ค่ำ เดือน 3 (ถ้าปีอธิกมาส เป็นเดือน 4)
  // วิสาขบูชา: ขึ้น 15 ค่ำ เดือน 6 (ถ้าปีอธิกมาส เป็นเดือน 7)
  // อาสาฬหบูชา: ขึ้น 15 ค่ำ เดือน 8 (ถ้าปีอธิกมาส เป็นเดือน 8 หลัง)
  // เข้าพรรษา: แรม 1 ค่ำ เดือน 8 (ถ้าปีอธิกมาส เป็นเดือน 8 หลัง)
  // ออกพรรษา: ขึ้น 15 ค่ำ เดือน 11
  
  // ในเวอร์ชัน Production จะใช้การรันลูปตรวจสอบวันในเดือนนั้นๆ 
  // หรือใช้สูตรหาวันเพ็ญที่ตรงกับเงื่อนไข
  
  return [
    { name: "มาฆบูชา", thaiDate: "ขึ้น 15 ค่ำ เดือน 3" },
    { name: "วิสาขบูชา", thaiDate: "ขึ้น 15 ค่ำ เดือน 6" },
    { name: "อาสาฬหบูชา", thaiDate: "ขึ้น 15 ค่ำ เดือน 8" },
    { name: "เข้าพรรษา", thaiDate: "แรม 1 ค่ำ เดือน 8" },
    { name: "ออกพรรษา", thaiDate: "ขึ้น 15 ค่ำ เดือน 11" },
  ];
}

/**
 * ตรวจสอบว่าเป็นวันสำคัญทางพุทธศาสนาหรือไม่
 */
export function getBuddhistEventOnDate(date: Date): string | null {
  const lunar = gregorianToThaiLunarV3(date);
  const phase = lunar.isWaxing ? "ขึ้น" : "แรม";
  const day = lunar.lunarDay;
  const month = lunar.thaiMonth;

  // มาฆบูชา
  if (month === 3 && phase === "ขึ้น" && day === 15) return "วันมาฆบูชา";
  // วิสาขบูชา
  if (month === 6 && phase === "ขึ้น" && day === 15) return "วันวิสาขบูชา";
  // อาสาฬหบูชา
  if ((month === 8 || month === 88) && phase === "ขึ้น" && day === 15) return "วันอาสาฬหบูชา";
  // เข้าพรรษา
  if ((month === 8 || month === 88) && phase === "แรม" && day === 1) return "วันเข้าพรรษา";
  // ออกพรรษา
  if (month === 11 && phase === "ขึ้น" && day === 15) return "วันออกพรรษา";

  return null;
}
