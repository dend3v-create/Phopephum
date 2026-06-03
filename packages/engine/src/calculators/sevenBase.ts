import { r7_local } from "../engine/seven-numbers-v2.js";

/**
 * Seven Base Calculator (v3.1)
 * Strictly follows 7 Numbers 9 Bases rules.
 */
export function calculateSevenBase(
  dayNum: number,
  monthNum: number,
  yearNum: number
) {
  // ในระบบ 7 ตัว ราหู(8) ใช้เลขเดียวกับอาทิตย์(1)
  const d = dayNum === 8 ? 1 : dayNum;
  const m = monthNum;
  const y = yearNum;

  const b1 = Array.from({ length: 7 }, (_, i) => r7_local(d + i));
  const b2 = Array.from({ length: 7 }, (_, i) => r7_local(m + i));
  const b3 = Array.from({ length: 7 }, (_, i) => r7_local(y + i));
  
  return [b1, b2, b3];
}
