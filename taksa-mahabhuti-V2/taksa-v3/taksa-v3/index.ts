/**
 * index.ts — Hora AI Taksa + Mahabhuti Engine v3.0
 *
 * ════════════════════════════════════════════════
 *  QUICK START
 * ════════════════════════════════════════════════
 *
 * import { calcTaksaTransit, calcAgeYang, buildPath9, CENTER, buddhToCS } from "@/engine/taksa-mahabhuti";
 *
 * const birthDate = new Date("1982-07-23");  // ศุกร์
 * const checkDate = new Date("2026-05-31");  // ก่อนวันเกิดปี 2569
 *
 * const transit = calcTaksaTransit(birthDate, checkDate);
 * transit.ageYang   // → 44
 * transit.bariStar  // → 5 (พฤหัส) ✅
 * transit.isCenter  // → false
 * transit.path9     // → [6, 1, -1, 2, 3, 4, 7, 5, 8]
 * transit.transitIdx // → 7
 *
 * ════════════════════════════════════════════════
 *  v3.0 CHANGES (vs v2)
 * ════════════════════════════════════════════════
 *
 * calcTaksaTransit():
 *   ❌ v2: (ageYang-1) % 8 → modulo 8 ช่อง
 *   ✅ v3: (ageYang-1) % 9 → modulo 9 ช่อง (รวม CENTER)
 *
 *   ❌ v2: SEQUENCE [1,2,3,4,7,5,8,6]
 *   ✅ v3: PATH_9 = buildPath9(birthStar) → [6,1,CENTER,2,3,4,7,5,8] (เริ่มจากวันเกิดศุกร์)
 *
 * calcAgeYang():
 *   ✅ ไม่เปลี่ยน — วันที่ครบรอบวันเกิด = ยัง "ย่าง" ปีเดิม
 *   ✅ วันถัดจากวันเกิดครบรอบ = เริ่มย่างปีใหม่
 *
 * @module taksa-mahabhuti v3
 */

export type { StarNumber, TaksaBhop, TaksaMap, TaksaNatalResult, TaksaTransitResult,
  ElementType, ElementPair, ElementPairFlag, MahaBhop, MahaMap, MahaBhutiResult,
  AlertLevel, StarAlert, SawaiResult, TaksaMahaInput, TaksaMahaResult } from "./taksa-mahabhuti.types";

export { STAR_NAMES, DAY_TO_STAR, TAKSA_BHOP, ELEMENT_PAIRS, MAHA_SEQUENCE,
  STAR_POWER, TAKSA_SEQUENCE } from "./taksa-mahabhuti.types";

export { CENTER, SEQ_STARS_8, STAR_GRID_POSITION, buildPath9,
  calcAgeYang, calcTaksaNatal, calcTaksaTransit,
  checkElementPairs, getBhopOfStar, getStarOfBhop, pathToString } from "./taksa-calculator";
export type { SlotValue, TaksaTransitResult9 } from "./taksa-calculator";

export { calcMahabhuti, buddhToCS, csTobuddh, csFromDate,
  getMahaBhopOfStar, isStarInDanger, isStarInGood,
  MAHA_DANGER_BHOP, MAHA_GOOD_BHOP } from "./mahabhuti-calculator";

export { calcTaksaMaha, generateAlerts } from "./cross-check-engine";
