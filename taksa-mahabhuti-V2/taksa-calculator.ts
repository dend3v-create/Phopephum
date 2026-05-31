/**
 * taksa-calculator.ts
 * Hora AI — Engine คำนวณทักษากำเนิด + ทักษาจร (9 ช่อง)
 *
 * ════════════════════════════════════════════════════════════
 *  v3.0 — ALGORITHM OVERHAUL: 9-Slot PATH (รวมช่องกลาง)
 * ════════════════════════════════════════════════════════════
 *
 * หลักการนับทักษาจรที่ถูกต้อง:
 *
 *   Grid 3×3 มี 9 ช่อง:
 *     [TL=1] [TC=2] [TR=3]
 *     [ML=6] [MC=CENTER] [MR=4]
 *     [BL=8] [BC=5]  [BR=7]
 *
 *   PATH นับวน 9 ช่อง (เริ่มจาก birthStar = บริวาร):
 *     6 → 1 → CENTER → 2 → 3 → 4 → 7 → 5 → 8 → (วนกลับ 6)
 *
 *   กฎสำคัญ: "ทุกครั้งที่นับผ่านดาว 1 (ช่อง TL) ต้องนับช่องกลาง (CENTER) ก่อน
 *             ค่อยไปดาว 2" → วงจรจึงมี 9 ช่อง ไม่ใช่ 8
 *
 *   สูตรทักษาจร:
 *     บริวารจร = PATH_9[(ageYang - 1) % 9]
 *
 *   ตัวอย่างตรวจสอบ (เกิดวันศุกร์ ดาว 6):
 *     PATH_9 = [6, 1, CENTER, 2, 3, 4, 7, 5, 8]
 *     ageYang 44: (44-1)%9 = 43%9 = 7 → PATH_9[7] = 5 (พฤหัส) ✅
 *     ageYang 45: (45-1)%9 = 44%9 = 8 → PATH_9[8] = 8 (ราหู)
 *
 *   อายุย่าง:
 *     ก่อนวันเกิดครบรอบ 44 ปี (23 ก.ค. 2569): อายุย่าง = 44
 *     วันที่ 24 ก.ค. 2569 เป็นต้นไป: อายุย่าง = 45
 *
 * @module taksa-calculator
 * @version 3.0.0
 */

import {
  StarNumber,
  TaksaBhop,
  TaksaMap,
  TaksaNatalResult,
  TaksaTransitResult,
  ElementPairFlag,
  DAY_TO_STAR,
  TAKSA_BHOP,
  ELEMENT_PAIRS,
  STAR_NAMES,
} from "./taksa-mahabhuti.types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sentinel value สำหรับ "ช่องกลาง" (CENTER)
 * ไม่ใช่ดาว ไม่มีภพทักษา แต่ต้องนับในวงจร 9 ช่อง
 */
export const CENTER = -1 as const;
export type SlotValue = StarNumber | typeof CENTER;

/**
 * ลำดับดาว 8 ดวง (ไม่มี CENTER) สำหรับ rotate
 * วิ่งตามเข็มนาฬิกาของ Grid 3×3:
 *   ML(6) → TL(1) → TC(2) → TR(3) → MR(4) → BR(7) → BC(5) → BL(8)
 */
export const SEQ_STARS_8: StarNumber[] = [6, 1, 2, 3, 4, 7, 5, 8];

/**
 * ตำแหน่งคงที่ของดาวใน Grid 3×3
 *   TL=ซ้ายบน  TC=กลางบน  TR=ขวาบน
 *   ML=ซ้ายกลาง  MC=กลาง  MR=ขวากลาง
 *   BL=ซ้ายล่าง  BC=กลางล่าง  BR=ขวาล่าง
 */
export const STAR_GRID_POSITION: Record<StarNumber, string> = {
  1: "TL",
  2: "TC",
  3: "TR",
  6: "ML",
  4: "MR",
  8: "BL",
  5: "BC",
  7: "BR",
};

// ─────────────────────────────────────────────────────────────────────────────
// Path 9 Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * สร้าง PATH_9 (9 ช่อง) เริ่มจาก birthStar
 *
 * กฎ: ทุกครั้งที่ถึงดาว 1 (TL) → แทรก CENTER ต่อท้ายทันที
 *
 * @example
 * buildPath9(6)
 * // [6, 1, CENTER, 2, 3, 4, 7, 5, 8]
 * //  ↑บริวาร              ↑หลัง 1 มี CENTER
 *
 * buildPath9(1)
 * // [1, CENTER, 2, 3, 4, 7, 5, 8, 6]
 * //  ↑บริวาร ↑CENTER อยู่ที่ index 1
 *
 * buildPath9(2)
 * // [2, 3, 4, 7, 5, 8, 6, 1, CENTER]
 * //                          ↑ 1 อยู่ท้าย และมี CENTER ตาม
 */
export function buildPath9(birthStar: StarNumber): SlotValue[] {
  const startIdx = SEQ_STARS_8.indexOf(birthStar);
  if (startIdx === -1) throw new Error(`birthStar ${birthStar} ไม่อยู่ใน SEQ_STARS_8`);

  const result: SlotValue[] = [];
  for (let i = 0; i < 8; i++) {
    const star = SEQ_STARS_8[(startIdx + i) % 8];
    result.push(star);
    if (star === 1) {
      result.push(CENTER);
    }
  }
  return result; // length = 9 เสมอ (8 ดาว + 1 CENTER)
}

// ─────────────────────────────────────────────────────────────────────────────
// อายุย่าง (Age Yang)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณอายุย่างจากวันเกิดและวันที่ตรวจดวง
 *
 * นิยาม "ย่าง":
 *   - วันเกิด → ย่างเข้าปีที่ 1 ทันที
 *   - วันที่ครบรอบวันเกิด = อายุเต็มปีนั้น (ยัง "ย่าง" อยู่ปีเดิม)
 *   - วันถัดจากวันเกิดครบรอบ = เริ่มย่างเข้าปีใหม่
 *
 * ตัวอย่าง (เกิด 23 ก.ค. 2525):
 *   - 24/07/68 → 22/07/69 : ย่าง 44  (อายุเต็ม 43 ปี)
 *   - 23/07/69             : วันเกิดครบ 44 ปีเต็ม → ยัง "ย่าง 44" อยู่
 *   - 24/07/69 → 22/07/70 : ย่าง 45  (อายุเต็ม 44 ปี)
 *
 * @param birthDate - วันเกิด
 * @param checkDate - วันที่ตรวจดวง
 */
export function calcAgeYang(birthDate: Date, checkDate: Date): number {
  const by = birthDate.getFullYear();
  const cy = checkDate.getFullYear();
  let fullAge = cy - by;

  const bm = birthDate.getMonth();
  const bd = birthDate.getDate();
  const cm = checkDate.getMonth();
  const cd = checkDate.getDate();

  // ผ่านวันเกิด = วันที่หลังจากวันเกิดครบรอบ (> ไม่ใช่ >=)
  const passedBirthday = cm > bm || (cm === bm && cd > bd);
  if (!passedBirthday) fullAge--;

  return fullAge + 1; // +1 เพราะ "ย่าง" เริ่มนับ 1 ตั้งแต่วันเกิด
}

// ─────────────────────────────────────────────────────────────────────────────
// ทักษากำเนิด (Natal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณทักษากำเนิด
 * 8 ดาว → 8 ภพ 1:1 ตาม SEQ_STARS_8
 *
 * @example
 * calcTaksaNatal(5) // เกิดวันศุกร์ (dayOfWeek=5) → birthStar=6
 * // map[6]="บริวาร", map[1]="อายุ", map[2]="เดช", map[3]="ศรี",
 * // map[4]="มูละ", map[7]="อุตสาหะ", map[5]="มนตรี", map[8]="กาลกิณี"
 */
export function calcTaksaNatal(dayOfWeek: number): TaksaNatalResult {
  const birthStar = DAY_TO_STAR[dayOfWeek] as StarNumber;
  if (!birthStar) throw new Error(`dayOfWeek ต้องอยู่ระหว่าง 0–6`);

  const startIdx = SEQ_STARS_8.indexOf(birthStar);
  const map = {} as TaksaMap;
  for (let i = 0; i < 8; i++) {
    const star = SEQ_STARS_8[(startIdx + i) % 8];
    map[star] = TAKSA_BHOP[i];
  }
  const kalakiniStar = SEQ_STARS_8[(startIdx + 7) % 8];

  return { map, bariStar: birthStar, kalakiniStar };
}

// ─────────────────────────────────────────────────────────────────────────────
// ทักษาจร (Transit) — 9-Slot Algorithm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณทักษาจร ด้วย PATH 9 ช่อง
 *
 * สูตร:
 *   path9 = buildPath9(birthStar)  [9 elements]
 *   transitSlot = path9[(ageYang - 1) % 9]
 *   ถ้า transitSlot === CENTER → บริวารจรตกช่องกลาง (ไม่มีดาว)
 *   ถ้า transitSlot เป็นดาว → สร้าง TaksaMap ใหม่จาก transitSlot เป็นบริวาร
 *
 * @param birthDate - วันเกิด
 * @param checkDate - วันที่ตรวจดวง
 *
 * @example
 * // เกิดวันศุกร์ 23/07/2525, ตรวจวันที่ 31/05/2569
 * const r = calcTaksaTransit(new Date("1982-07-23"), new Date("2026-05-31"))
 * // r.ageYang = 44
 * // r.path9 = [6, 1, CENTER, 2, 3, 4, 7, 5, 8]
 * // r.transitIdx = (44-1)%9 = 7
 * // r.bariStar = path9[7] = 5 (พฤหัส) ✅
 * // r.map[5] = "บริวาร"
 * // r.kalakiniStar = 4 (พุธ) ← seqIdx(5+7)%8
 */
export interface TaksaTransitResult9 extends TaksaTransitResult {
  /** PATH 9 ช่อง (รวม CENTER) เริ่มจาก birthStar */
  path9: SlotValue[];
  /** index ที่ใช้ใน path9 */
  transitIdx: number;
  /** true ถ้าบริวารจรตกช่องกลาง */
  isCenter: boolean;
}

export function calcTaksaTransit(
  birthDate: Date,
  checkDate: Date
): TaksaTransitResult9 {
  const dayOfWeek = birthDate.getDay();
  const birthStar = DAY_TO_STAR[dayOfWeek] as StarNumber;

  const ageYang = calcAgeYang(birthDate, checkDate);
  const path9 = buildPath9(birthStar);
  const transitIdx = (ageYang - 1) % 9;
  const slot = path9[transitIdx];

  if (slot === CENTER) {
    return {
      map: {} as TaksaMap,
      bariStar: birthStar, // fallback
      kalakiniStar: birthStar,
      ageYang,
      path9,
      transitIdx,
      isCenter: true,
    };
  }

  const bariTransit = slot as StarNumber;
  const startIdx = SEQ_STARS_8.indexOf(bariTransit);
  const map = {} as TaksaMap;
  for (let i = 0; i < 8; i++) {
    const star = SEQ_STARS_8[(startIdx + i) % 8];
    map[star] = TAKSA_BHOP[i];
  }
  const kalakiniStar = SEQ_STARS_8[(startIdx + 7) % 8];

  return {
    map,
    bariStar: bariTransit,
    kalakiniStar,
    ageYang,
    path9,
    transitIdx,
    isCenter: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// คู่ธาตุ
// ─────────────────────────────────────────────────────────────────────────────

export function checkElementPairs(
  natalMap: TaksaMap,
  transitMap: TaksaMap
): ElementPairFlag[] {
  return ELEMENT_PAIRS.map((pair) => {
    const [s1, s2] = pair.stars;
    const natalActive =
      natalMap[s1] !== "กาลกิณี" && natalMap[s2] !== "กาลกิณี";
    const transitActive =
      !!transitMap[s1] &&
      !!transitMap[s2] &&
      transitMap[s1] !== "กาลกิณี" &&
      transitMap[s2] !== "กาลกิณี";
    return {
      element: pair.element,
      stars: pair.stars,
      nature: pair.nature,
      inNatal: natalActive,
      inTransit: transitActive,
      isPermanent: natalActive && transitActive,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

export function getBhopOfStar(map: TaksaMap, star: StarNumber): TaksaBhop {
  return map[star];
}

export function getStarOfBhop(
  map: TaksaMap,
  bhop: TaksaBhop
): StarNumber | undefined {
  const entry = Object.entries(map).find(([, v]) => v === bhop);
  return entry ? (Number(entry[0]) as StarNumber) : undefined;
}

/**
 * Debug helper: แสดง PATH_9 เป็น string อ่านง่าย
 * @example pathToString([6, 1, -1, 2, 3, 4, 7, 5, 8], 7)
 * // "6 → 1 → [กลาง] → 2 → 3 → 4 → 7 → →[5]← → 8"
 */
export function pathToString(path9: SlotValue[], highlightIdx?: number): string {
  return path9
    .map((s, i) => {
      const label = s === CENTER ? "[กลาง]" : STAR_NAMES[s as StarNumber] + `(${s})`;
      return i === highlightIdx ? `→[${label}]←` : label;
    })
    .join(" → ");
}
