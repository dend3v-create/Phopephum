import { DayName } from "../types/yam.types";

/**
 * ตารางยามกลางวัน 8 ยาม (ยามที่ 1–8)
 * เริ่มตั้งแต่เวลาพระอาทิตย์ขึ้น ยามละ 1.5 ชั่วโมง
 */
export const yamDayTable: Record<DayName, string[]> = {
  sunday:    ["สุริยะ",  "ศุกระ",  "พุทธะ",  "จันเทา", "เสารี",  "ครู",    "ภุมมะ",  "สุริยะ"],
  monday:    ["จันเทา",  "เสารี",  "ครู",    "ภุมมะ",  "สุริยะ", "ศุกระ",  "พุทธะ",  "จันเทา"],
  tuesday:   ["ภุมมะ",   "สุริยะ", "ศุกระ",  "พุทธะ",  "จันเทา", "เสารี",  "ครู",    "ภุมมะ"],
  wednesday: ["พุทธะ",   "จันเทา", "เสารี",  "ครู",    "ภุมมะ",  "สุริยะ", "ศุกระ",  "พุทธะ"],
  thursday:  ["ครู",     "ภุมมะ",  "สุริยะ", "ศุกระ",  "พุทธะ",  "จันเทา", "เสารี",  "ครู"],
  friday:    ["ศุกระ",   "พุทธะ",  "จันเทา", "เสารี",  "ครู",    "ภุมมะ",  "สุริยะ", "ศุกระ"],
  saturday:  ["เสารี",   "ครู",    "ภุมมะ",  "สุริยะ", "ศุกระ",  "พุทธะ",  "จันเทา", "เสารี"],
};

/**
 * ตารางดี/ไม่ดี แยกย่อยตามวัน ยาม (1–8) และชั้น [ต้น, กลาง, ปลาย]
 * อ้างอิง: สรุปตารางอัฏฐกาลชั้นฉาย โดย อ.สุเทพ โลหณุต
 * true = ดี, false = ไม่ดี
 */
export const yamDaySubTable: Record<DayName, [boolean, boolean, boolean][]> = {
  sunday:    [[false,true,false],[false,false,true],[false,true,true],[false,true,false],[false,true,true],[true,false,false],[false,false,true],[false,true,false]],
  monday:    [[false,true,false],[false,true,true],[true,false,false],[false,false,true],[false,true,false],[false,false,true],[false,true,true],[false,true,false]],
  tuesday:   [[false,false,true],[false,true,false],[false,false,true],[false,true,true],[false,true,false],[false,true,true],[true,false,false],[false,false,true]],
  wednesday: [[false,true,true],[false,true,false],[false,true,true],[true,false,false],[false,false,true],[false,true,false],[false,false,true],[false,true,true]],
  thursday:  [[false,false,true],[false,false,true],[false,true,false],[false,false,true],[false,true,true],[false,true,false],[false,true,true],[false,false,true]],
  friday:    [[false,false,true],[false,true,true],[false,true,false],[false,true,true],[true,false,false],[false,false,true],[false,true,false],[false,false,true]],
  saturday:  [[false,true,true],[true,false,false],[false,false,true],[false,true,false],[false,false,true],[false,true,true],[false,true,false],[false,true,true]],
};

/**
 * ระดับความมงคลในการเดินทาง (กลางวัน) แยกตามวันและยาม (1–8)
 * คำนวณจาก yamDaySubTable — จำนวนช่วงที่เป็น "ดี" ใน [ต้น, กลาง, ปลาย]
 * 2 = ดีมาก (2 ช่วงดี), 1 = ดี (1 ช่วงดี)
 */
export const yamDayTicksTable: Record<DayName, number[]> = {
  sunday:    [1, 1, 2, 1, 2, 1, 1, 1],
  monday:    [1, 2, 1, 1, 1, 1, 2, 1],
  tuesday:   [1, 1, 1, 2, 1, 2, 1, 1],
  wednesday: [2, 1, 2, 1, 1, 1, 1, 2],
  thursday:  [1, 1, 1, 1, 2, 1, 2, 1],
  friday:    [1, 2, 1, 2, 1, 1, 1, 1],
  saturday:  [2, 1, 1, 1, 1, 2, 1, 2],
};
