/**
 * taksa-calculator.ts
 * Hora AI — Engine คำนวณทักษากำเนิด + ทักษาจร (9 ช่อง)
 *
 * ════════════════════════════════════════════════════════════
 *  v3.0 — ALGORITHM OVERHAUL: 9-Slot PATH (รวมช่องกลาง)
 * ════════════════════════════════════════════════════════════
 *
 * Grid 3×3 มี 9 ช่อง:
 *   [TL=1] [TC=2] [TR=3]
 *   [ML=6] [MC=CENTER] [MR=4]
 *   [BL=8] [BC=5] [BR=7]
 *
 * PATH_9 นับวน 9 ช่อง (เริ่มจาก birthStar):
 *   6 → 1 → CENTER → 2 → 3 → 4 → 7 → 5 → 8 → (วนกลับ)
 *
 * สูตรทักษาจร:
 *   บริวารจร = PATH_9[(ageYang - 1) % 9]
 *
 * ตรวจสอบ (เกิดวันศุกร์ ดาว 6):
 *   PATH_9 = [6, 1, CENTER, 2, 3, 4, 7, 5, 8]
 *   ageYang 44: (44-1)%9 = 7 → PATH_9[7] = 5 (พฤหัส) ✅
 *   ageYang 45: (45-1)%9 = 8 → PATH_9[8] = 8 (ราหู)
 *
 * อายุย่าง:
 *   วันครบรอบวันเกิด 44 ปี = ยังย่าง 44 อยู่
 *   วันถัดไป = เริ่มย่าง 45
 *
 * @module taksa-calculator
 * @version 3.0.0
 */

import type {
  StarNumber,
  TaksaBhop,
  TaksaMap,
  TaksaNatalResult,
  TaksaTransitResult,
  ElementPairFlag,
  SawaiResult,
} from "./taksa-mahabhuti.types";
import {
  DAY_TO_STAR,
  TAKSA_SEQUENCE,
  TAKSA_BHOP,
  ELEMENT_PAIRS,
  STAR_NAMES,
  STAR_POWER,
} from "./taksa-mahabhuti.types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sentinel value สำหรับ "ช่องกลาง" (CENTER)
 * ไม่ใช่ดาว แต่ต้องนับในวงจร 9 ช่อง
 */
export const CENTER = -1 as const;
export type SlotValue = StarNumber | typeof CENTER;

/**
 * ลำดับดาว 8 ดวงบน Grid 3×3 (ไม่มี CENTER)
 * วิ่งตามเข็มนาฬิกาจาก ML:
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
 * กฎ: ทุกครั้งที่ถึงดาว 1 (TL) → แทรก CENTER ต่อท้ายทันที
 *
 * @example
 * buildPath9(6) // [6, 1, CENTER, 2, 3, 4, 7, 5, 8]
 * buildPath9(1) // [1, CENTER, 2, 3, 4, 7, 5, 8, 6]
 * buildPath9(2) // [2, 3, 4, 7, 5, 8, 6, 1, CENTER]
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
 *   - วันครบรอบวันเกิด = อายุเต็มปีนั้น (ยัง "ย่าง" ปีเดิม)
 *   - วันถัดจากวันเกิดครบรอบ = เริ่มย่างเข้าปีใหม่
 *
 * @example
 * calcAgeYang(new Date("1982-07-23"), new Date("2026-05-31")) // → 44
 * calcAgeYang(new Date("1982-07-23"), new Date("2026-07-23")) // → 44 (วันเกิดครบรอบ ยัง 44)
 * calcAgeYang(new Date("1982-07-23"), new Date("2026-07-24")) // → 45 (วันถัดไป เริ่ม 45)
 */
export function calcAgeYang(birthDate: Date, checkDate: Date): number {
  const by = birthDate.getFullYear();
  const cy = checkDate.getFullYear();
  let fullAge = cy - by;

  const bm = birthDate.getMonth();
  const bd = birthDate.getDate();
  const cm = checkDate.getMonth();
  const cd = checkDate.getDate();

  // ผ่านวันเกิดครบรอบ = วันหลังจากวันเกิด (> ไม่ใช่ >=)
  const passedBirthday = cm > bm || (cm === bm && cd > bd);
  if (!passedBirthday) fullAge--;

  return fullAge + 1; // +1 เพราะ "ย่าง" เริ่มนับ 1 ตั้งแต่วันเกิด
}

// ─────────────────────────────────────────────────────────────────────────────
// ทักษากำเนิด (Natal Taksa)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณทักษากำเนิด (8 ดาว → 8 ภพ 1:1 ตาม SEQ_STARS_8)
 */
export function calcTaksaNatal_V3(birthStar: StarNumber): TaksaNatalResult {
  const startIdx = SEQ_STARS_8.indexOf(birthStar);
  if (startIdx === -1) throw new Error(`birthStar ${birthStar} ไม่อยู่ใน SEQ_STARS_8`);

  const map = {} as TaksaMap;
  for (let i = 0; i < 8; i++) {
    const star = SEQ_STARS_8[(startIdx + i) % 8];
    map[star] = TAKSA_BHOP[i];
  }
  const kalakiniStar = SEQ_STARS_8[(startIdx + 7) % 8];

  return { map, bariStar: birthStar, kalakiniStar };
}

export function calcTaksaNatal(dayOfWeek: number): TaksaNatalResult {
  const birthStar = DAY_TO_STAR[dayOfWeek] as StarNumber;
  return calcTaksaNatal_V3(birthStar);
}

// ─────────────────────────────────────────────────────────────────────────────
// ทักษาจร (Transit Taksa) — 9-Slot Algorithm
// ─────────────────────────────────────────────────────────────────────────────

export interface TaksaTransitResult9 extends TaksaTransitResult {
  /** PATH 9 ช่อง (รวม CENTER) เริ่มจาก birthStar */
  path9: SlotValue[];
  /** index ที่ใช้ใน path9 */
  transitIdx: number;
  /** true ถ้าบริวารจรตกช่องกลาง */
  isCenter: boolean;
}

/**
 * คำนวณทักษาจร ด้วย PATH 9 ช่อง (V3)
 */
export function calcTaksaTransit_V3(
  birthStar: StarNumber,
  birthDate: Date,
  checkDate: Date
): TaksaTransitResult9 {
  const ageYang = calcAgeYang(birthDate, checkDate);
  const path9 = buildPath9(birthStar);
  const transitIdx = (ageYang - 1) % 9;
  const slot = path9[transitIdx];

  if (slot === CENTER) {
    return {
      map: {} as TaksaMap,
      bariStar: birthStar,
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

export function calcTaksaTransit(
  birthDate: Date,
  checkDate: Date
): TaksaTransitResult9 {
  const dayOfWeek = birthDate.getDay();
  const birthStar = DAY_TO_STAR[dayOfWeek] as StarNumber;
  return calcTaksaTransit_V3(birthStar, birthDate, checkDate);
}

// ─────────────────────────────────────────────────────────────────────────────
// ดาวเสวยอายุ (Sawai)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณดาวเสวยอายุ + ดาวแทรก (V3)
 */
export function calcSawai_V3(
  birthStar: StarNumber,
  birthDate: Date,
  checkDate: Date
): SawaiResult {
  const startSeqIdx = TAKSA_SEQUENCE.indexOf(birthStar);

  const msAge = checkDate.getTime() - birthDate.getTime();
  const yearAge = msAge / (365.25 * 24 * 3600 * 1000);

  // หา sawai period ปัจจุบัน
  let cumYears = 0;
  let sawaiSeqOffset = 0;
  let periodStartYears = 0;

  for (let i = 0; i < 8; i++) {
    const star = TAKSA_SEQUENCE[(startSeqIdx + i) % 8];
    const power = STAR_POWER[star];
    if (cumYears + power > yearAge || i === 7) {
      sawaiSeqOffset = i;
      periodStartYears = cumYears;
      break;
    }
    cumYears += power;
  }

  const sawaiSeqIdx = (startSeqIdx + sawaiSeqOffset) % 8;
  const sawaiStar = TAKSA_SEQUENCE[sawaiSeqIdx];
  const sawaiPower = STAR_POWER[sawaiStar];
  const sawaiAgeStart = Math.floor(periodStartYears) + 1;
  const sawaiAgeEnd = sawaiAgeStart + sawaiPower - 1;

  const by = birthDate.getFullYear();
  const bm = birthDate.getMonth();
  const bd = birthDate.getDate();
  const sawaiDateStart = new Date(by + Math.floor(periodStartYears), bm, bd + 1);
  const sawaiDateEnd = new Date(by + sawaiAgeEnd, bm, bd);

  // หา sub-period ปัจจุบัน
  const totalSawaiMs = sawaiDateEnd.getTime() - sawaiDateStart.getTime();
  const elapsedInSawaiMs = Math.max(0, checkDate.getTime() - sawaiDateStart.getTime());

  let subCumMs = 0;
  let subStar: StarNumber = sawaiStar;
  let subDateStart: Date = sawaiDateStart;
  let subDateEnd: Date = sawaiDateEnd;
  let subDurationDays = Math.round(totalSawaiMs / 86400000);

  for (let i = 0; i < 8; i++) {
    const star = TAKSA_SEQUENCE[(sawaiSeqIdx + i) % 8];
    const subMs = (STAR_POWER[star] / 108) * totalSawaiMs;
    if (subCumMs + subMs > elapsedInSawaiMs || i === 7) {
      subStar = star;
      subDateStart = new Date(sawaiDateStart.getTime() + subCumMs);
      subDateEnd = new Date(sawaiDateStart.getTime() + subCumMs + subMs);
      subDurationDays = Math.round(subMs / 86400000);
      break;
    }
    subCumMs += subMs;
  }

  return {
    sawaiStar,
    sawaiStarName: STAR_NAMES[sawaiStar],
    sawaiAgeStart,
    sawaiAgeEnd,
    sawaiDateStart,
    sawaiDateEnd,
    subStar,
    subStarName: STAR_NAMES[subStar],
    subDateStart,
    subDateEnd,
    subDurationDays,
  };
}

export function calcSawai(birthDate: Date, checkDate: Date): SawaiResult {
  const dayOfWeek = birthDate.getDay();
  const birthStar = DAY_TO_STAR[dayOfWeek] as StarNumber;
  return calcSawai_V3(birthStar, birthDate, checkDate);
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
// Utilities
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
