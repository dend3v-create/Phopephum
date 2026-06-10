import { DayName } from "../types/yam.types";

/**
 * ตารางยามกลางคืน 8 ยาม (ยามที่ 1–8)
 * เริ่มตั้งแต่เวลาพระอาทิตย์ตก ยามละ 1.5 ชั่วโมง
 */
export const yamNightTable: Record<DayName, string[]> = {
  sunday:    ["ระวิ",   "ชีโว",   "ศะศิ",   "ศุโกร",  "ภุมโม",  "โสโร",   "พุโธ",   "ระวิ"],
  monday:    ["ศะศิ",   "ศุโกร",  "ภุมโม",  "โสโร",   "พุโธ",   "ระวิ",   "ชีโว",   "ศะศิ"],
  tuesday:   ["ภุมโม",  "โสโร",   "พุโธ",   "ระวิ",   "ชีโว",   "ศะศิ",   "ศุโกร",  "ภุมโม"],
  wednesday: ["พุโธ",   "ระวิ",   "ชีโว",   "ศะศิ",   "ศุโกร",  "ภุมโม",  "โสโร",   "พุโธ"],
  thursday:  ["ชีโว",   "ศะศิ",   "ศุโกร",  "ภุมโม",  "โสโร",   "พุโธ",   "ระวิ",   "ชีโว"],
  friday:    ["ศุโกร",  "ภุมโม",  "โสโร",   "พุโธ",   "ระวิ",   "ชีโว",   "ศะศิ",   "ศุโกร"],
  saturday:  ["โสโร",   "พุโธ",   "ระวิ",   "ชีโว",   "ศะศิ",   "ศุโกร",  "ภุมโม",  "โสโร"],
};

/**
 * ตารางดี/ไม่ดี แยกย่อยตามวัน ยาม (1–8) และชั้น [ต้น, กลาง, ปลาย]
 * อ้างอิง: สรุปตารางอัฏฐกาลชั้นฉาย โดย อ.สุเทพ โลหณุต
 * true = ดี, false = ไม่ดี
 */
export const yamNightSubTable: Record<DayName, [boolean, boolean, boolean][]> = {
  sunday:    [[false,true,false],[true,false,false],[false,true,false],[false,false,true],[false,false,true],[false,true,true],[false,true,true],[false,true,false]],
  monday:    [[false,true,false],[false,false,true],[false,false,true],[false,true,true],[false,true,true],[false,true,false],[true,false,false],[false,true,false]],
  tuesday:   [[false,false,true],[false,true,true],[false,true,true],[false,true,false],[true,false,false],[false,true,false],[false,false,true],[false,false,true]],
  wednesday: [[false,true,true],[false,true,false],[true,false,false],[false,true,false],[false,false,true],[false,false,true],[false,true,true],[false,true,true]],
  thursday:  [[true,false,false],[false,true,false],[false,false,true],[false,false,true],[false,true,true],[false,true,true],[false,true,false],[true,false,false]],
  friday:    [[false,false,true],[false,false,true],[false,true,true],[false,true,true],[false,true,false],[true,false,false],[false,true,false],[false,false,true]],
  saturday:  [[false,true,true],[false,true,true],[false,true,false],[true,false,false],[false,true,false],[false,false,true],[false,false,true],[false,true,true]],
};

/**
 * ระดับความมงคลในการเดินทาง (กลางคืน) แยกตามวันและยาม (1–8)
 * คำนวณจาก yamNightSubTable — จำนวนช่วงที่เป็น "ดี" ใน [ต้น, กลาง, ปลาย]
 * 2 = ดีมาก (2 ช่วงดี), 1 = ดี (1 ช่วงดี), 0 = ไม่ดี/ติดขัด
 */
export const yamNightTicksTable: Record<DayName, number[]> = {
  sunday:    [1, 1, 1, 1, 1, 2, 2, 1],
  monday:    [1, 1, 1, 2, 2, 1, 1, 1],
  tuesday:   [1, 2, 2, 1, 1, 1, 1, 1],
  wednesday: [2, 1, 1, 1, 1, 1, 2, 2],
  thursday:  [1, 1, 1, 1, 2, 2, 1, 1],
  friday:    [1, 1, 2, 2, 1, 1, 1, 1],
  saturday:  [2, 2, 1, 1, 1, 1, 1, 2],
};

