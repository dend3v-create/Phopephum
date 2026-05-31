/**
 * mahabhuti-calculator.ts
 * Hora AI — Engine คำนวณผังมหาภูติ (กำเนิด + จร)
 *
 * Algorithm (ไม่เปลี่ยนแปลง):
 *   1. remainder = cs % 7  (0 → 7)
 *   2. วาง remainder ที่ตำแหน่ง "โลกาวินาศ"
 *   3. เดิน sequence: โลกาวินาศ → อริ → ขุมทรัพย์ → มรณะ
 *                   → อธิบดี → ราชา → ธงชัย
 *   4. เลข +1 ทุกช่อง (wrap 1–7)
 *
 * v2.0: อัปเดต import path ให้ตรงกับ types v2
 *       เพิ่ม csFromBuddhistYear() helper
 *
 * ตรวจสอบ:
 *   จ.ศ. 1344 (เกิดปี 2525): 1344 % 7 = 6 → โลกาวินาศ=6, อริ=7, ขุมทรัพย์=1, มรณะ=2, อธิบดี=3, ราชา=4, ธงชัย=5
 *   จ.ศ. 1388 (ปี 2569):     1388 % 7 = 2 → โลกาวินาศ=2, อริ=3, ขุมทรัพย์=4, มรณะ=5, อธิบดี=6, ราชา=7, ธงชัย=1 ✅
 *
 * @module mahabhuti-calculator
 * @version 2.0.0
 */

import {
  MahaBhop,
  MahaMap,
  MahaBhutiResult,
  MAHA_SEQUENCE,
} from "./taksa-mahabhuti.types";

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

/** วนเลข 1–7 */
function r7(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// คำนวณผังมหาภูติ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณผังมหาภูติจากจุลศักราช (จ.ศ.)
 *
 * @param cs - จุลศักราช
 *
 * @example
 * calcMahabhuti(1344)
 * // { โลกาวินาศ:6, อริ:7, ขุมทรัพย์:1, มรณะ:2, อธิบดี:3, ราชา:4, ธงชัย:5 }
 *
 * calcMahabhuti(1388)
 * // { โลกาวินาศ:2, อริ:3, ขุมทรัพย์:4, มรณะ:5, อธิบดี:6, ราชา:7, ธงชัย:1 }
 */
export function calcMahabhuti(cs: number): MahaBhutiResult {
  if (cs < 1000 || cs > 2000) {
    throw new Error(`จุลศักราชควรอยู่ระหว่าง 1000–2000 (ได้รับ: ${cs})`);
  }

  let remainder = cs % 7;
  if (remainder === 0) remainder = 7;

  const map = {} as MahaMap;
  for (let i = 0; i < 7; i++) {
    map[MAHA_SEQUENCE[i]] = r7(remainder + i);
  }

  return { cs, remainder, map };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: แปลงปี
// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลง พ.ศ. → จ.ศ.
 * สูตร: จ.ศ. = พ.ศ. - 1181
 *
 * @example
 * buddhToCS(2525) // → 1344
 * buddhToCS(2569) // → 1388
 */
export function buddhToCS(buddhistYear: number): number {
  return buddhistYear - 1181;
}

/** แปลง จ.ศ. → พ.ศ. */
export function csTobuddh(cs: number): number {
  return cs + 1181;
}

/**
 * คำนวณ csTransit จาก checkDate อัตโนมัติ
 * สูตร: (getFullYear() + 543) - 1181
 *
 * @example
 * csFromDate(new Date("2026-05-31")) // → 1388
 */
export function csFromDate(date: Date): number {
  return date.getFullYear() + 543 - 1181;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Query ภพ
// ─────────────────────────────────────────────────────────────────────────────

/** ภพอัปมงคล */
export const MAHA_DANGER_BHOP: MahaBhop[] = ["โลกาวินาศ", "มรณะ", "อริ"];

/** ภพมงคล */
export const MAHA_GOOD_BHOP: MahaBhop[] = ["ราชา", "ธงชัย", "ขุมทรัพย์"];

/** หาว่าดาวอยู่ในภพใดของ MahaMap */
export function getMahaBhopOfStar(
  map: MahaMap,
  star: number
): MahaBhop | undefined {
  return (Object.entries(map).find(([, v]) => v === star)?.[0]) as MahaBhop | undefined;
}

export function isStarInDanger(map: MahaMap, star: number): boolean {
  const bhop = getMahaBhopOfStar(map, star);
  return bhop ? MAHA_DANGER_BHOP.includes(bhop) : false;
}

export function isStarInGood(map: MahaMap, star: number): boolean {
  const bhop = getMahaBhopOfStar(map, star);
  return bhop ? MAHA_GOOD_BHOP.includes(bhop) : false;
}
