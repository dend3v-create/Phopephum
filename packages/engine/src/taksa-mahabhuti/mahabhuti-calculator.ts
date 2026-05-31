/**
 * mahabhuti-calculator.ts
 * Hora AI — Engine คำนวณผังมหาภูติ (กำเนิด + จร)
 *
 * Algorithm:
 *   1. remainder = cs % 7  (ถ้า = 0 ให้เป็น 7)
 *   2. วาง remainder ที่ตำแหน่ง "โลกาวินาศ"
 *   3. เดิน sequence: โลกาวินาศ → อริ → ขุมทรัพย์ → มรณะ → อธิบดี → ราชา → ธงชัย
 *   4. เลข +1 ทุกช่อง (วน 1–7)
 *
 * @module mahabhuti-calculator
 * @version 1.0.0
 */

import type { StarNumber, MahaBhop, MahaMap, MahaBhutiResult } from "./taksa-mahabhuti.types";
import { MAHA_SEQUENCE } from "./taksa-mahabhuti.types";

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function r7(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// คำนวณผังมหาภูติ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณผังมหาภูติจากจุลศักราช (จ.ศ.)
 * @param cs - จุลศักราช (เช่น 1344 กำเนิด, 1388 ปัจจุบัน)
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
// Year Conversion Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** พ.ศ. → จ.ศ. (ลบ 1181) */
export function buddhToCS(buddhistYear: number): number {
  return buddhistYear - 1181;
}

/** จ.ศ. → พ.ศ. (บวก 1181) */
export function csTobuddh(cs: number): number {
  return cs + 1181;
}

/**
 * คำนวณ csTransit จาก checkDate อัตโนมัติ
 * สูตร: (getFullYear() + 543) - 1181
 * @example csFromDate(new Date("2026-05-31")) // → 1388
 */
export function csFromDate(date: Date): number {
  return date.getFullYear() + 543 - 1181;
}

// ─────────────────────────────────────────────────────────────────────────────
// ภพ Danger / Good
// ─────────────────────────────────────────────────────────────────────────────

export const MAHA_DANGER_BHOP: MahaBhop[] = ["โลกาวินาศ", "มรณะ", "อริ"];
export const MAHA_GOOD_BHOP: MahaBhop[] = ["ราชา", "ธงชัย", "ขุมทรัพย์"];

// ─────────────────────────────────────────────────────────────────────────────
// Lookup Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function getMahaBhopOfStar(
  map: MahaMap,
  star: StarNumber
): MahaBhop | undefined {
  const entry = Object.entries(map).find(([, v]) => v === star);
  return entry ? (entry[0] as MahaBhop) : undefined;
}

export function isStarInDanger(map: MahaMap, star: StarNumber): boolean {
  const bhop = getMahaBhopOfStar(map, star);
  return bhop ? MAHA_DANGER_BHOP.includes(bhop) : false;
}

export function isStarInGood(map: MahaMap, star: StarNumber): boolean {
  const bhop = getMahaBhopOfStar(map, star);
  return bhop ? MAHA_GOOD_BHOP.includes(bhop) : false;
}
