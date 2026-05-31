/**
 * mahabhuti-calculator.ts
 * Hora AI — Engine คำนวณผังมหาภูติ (กำเนิด + จร)
 *
 * Algorithm:
 *   1. remainder = cs % 7  (ถ้า = 0 ให้เป็น 7)
 *   2. วาง remainder ที่ตำแหน่ง "โลกาวินาศ"
 *   3. เดิน sequence: โลกาวินาศ → อริ → ขุมทรัพย์ → มรณะ
 *                   → อธิบดี → ราชา → ธงชัย (วนกลับ)
 *   4. เลข +1 ทุกช่อง (ถ้าเกิน 7 → วนกลับ 1)
 *
 * @module mahabhuti-calculator
 * @version 1.0.0
 */

import {
  StarNumber,
  MahaBhop,
  MahaMap,
  MahaBhutiResult,
  MAHA_SEQUENCE,
} from "./taksa-mahabhuti.types";

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * วนเลข 1–7 (wrap around)
 * @param n - เลขใดๆ
 */
function r7(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// คำนวณผังมหาภูติ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณผังมหาภูติจากจุลศักราช (จ.ศ.)
 *
 * สูตร:
 *   remainder = cs % 7  (0 → 7)
 *   map[MAHA_SEQUENCE[i]] = r7(remainder + i)
 *
 * @param cs - จุลศักราช (เช่น 1323 สำหรับกำเนิด, 1388 สำหรับปัจจุบัน)
 * @returns MahaBhutiResult
 *
 * @example
 * // จ.ศ. 1323 → remainder = 1323 % 7 = 0 → ปรับเป็น 7
 * const natal = calcMahabhuti(1323);
 * // natal.map["โลกาวินาศ"] === 7
 * // natal.map["อริ"]       === 1
 * // natal.map["ขุมทรัพย์"] === 2
 * // natal.map["มรณะ"]      === 3
 * // natal.map["อธิบดี"]    === 4
 * // natal.map["ราชา"]      === 5
 * // natal.map["ธงชัย"]     === 6
 *
 * @example
 * // จ.ศ. 1388 → remainder = 1388 % 7 = 2
 * const transit = calcMahabhuti(1388);
 * // transit.map["โลกาวินาศ"] === 2
 * // transit.map["อริ"]       === 3
 * // transit.map["ขุมทรัพย์"] === 4
 * // transit.map["มรณะ"]      === 5
 * // transit.map["อธิบดี"]    === 6
 * // transit.map["ราชา"]      === 7
 * // transit.map["ธงชัย"]     === 1
 */
export function calcMahabhuti(cs: number): MahaBhutiResult {
  if (cs < 1000 || cs > 2000) {
    throw new Error(`จุลศักราชควรอยู่ระหว่าง 1000–2000 (ได้รับ: ${cs})`);
  }

  let remainder = cs % 7;
  if (remainder === 0) remainder = 7;

  const map = {} as MahaMap;
  for (let i = 0; i < 7; i++) {
    const bhop = MAHA_SEQUENCE[i];
    const star = r7(remainder + i) as StarNumber;
    map[bhop] = star;
  }

  return { cs, remainder, map };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: แปลง พ.ศ. → จ.ศ.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลงปี พ.ศ. เป็น จ.ศ.
 * สูตร: จ.ศ. = พ.ศ. - 1181
 *
 * @param buddhistYear - ปี พ.ศ.
 * @returns จุลศักราช
 *
 * @example
 * buddhToCS(2525) // → 1344
 * buddhToCS(2569) // → 1388
 */
export function buddhToCS(buddhistYear: number): number {
  return buddhistYear - 1181;
}

/**
 * แปลง จ.ศ. เป็น พ.ศ.
 * @param cs - จุลศักราช
 */
export function csTobuddh(cs: number): number {
  return cs + 1181;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: หาภพของดาวใน MahaMap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * หาว่าดาวดวงหนึ่งอยู่ในภพใดของ MahaMap
 * @param map  - MahaMap
 * @param star - เลขดาว
 */
export function getMahaBhopOfStar(
  map: MahaMap,
  star: StarNumber
): MahaBhop | undefined {
  const entry = Object.entries(map).find(([, v]) => v === star);
  return entry ? (entry[0] as MahaBhop) : undefined;
}

/**
 * ภพ "อัปมงคล" ที่ต้องระวัง
 */
export const MAHA_DANGER_BHOP: MahaBhop[] = ["โลกาวินาศ", "มรณะ", "อริ"];

/**
 * ภพ "มงคล" ที่เป็นบวก
 */
export const MAHA_GOOD_BHOP: MahaBhop[] = ["ราชา", "ธงชัย", "ขุมทรัพย์"];

/**
 * ตรวจสอบว่าดาวอยู่ในภพอันตรายหรือไม่
 */
export function isStarInDanger(map: MahaMap, star: StarNumber): boolean {
  const bhop = getMahaBhopOfStar(map, star);
  return bhop ? MAHA_DANGER_BHOP.includes(bhop) : false;
}

/**
 * ตรวจสอบว่าดาวอยู่ในภพมงคลหรือไม่
 */
export function isStarInGood(map: MahaMap, star: StarNumber): boolean {
  const bhop = getMahaBhopOfStar(map, star);
  return bhop ? MAHA_GOOD_BHOP.includes(bhop) : false;
}
