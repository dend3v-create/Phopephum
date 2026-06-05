/**
 * @module @phopephum/engine/taksa-mahabhuti
 * Barrel export v2.0 — ทักษา + มหาภูติ Engine (8 ดาว + 9-Slot Algorithm)
 */

// Types
export type {
  StarNumber,
  TaksaBhop,
  TaksaMap,
  TaksaNatalResult,
  TaksaTransitResult,
  SawaiResult,
  ElementType,
  ElementPair,
  ElementPairFlag,
  MahaBhop,
  MahaMap,
  MahaBhutiResult,
  AlertLevel,
  StarAlert,
  TaksaMahaInput,
  TaksaMahaResult,
} from "./taksa-mahabhuti.types";

export {
  DAY_TO_STAR,
  TAKSA_SEQUENCE,
  TAKSA_BHOP,
  STAR_POWER,
  ELEMENT_PAIRS,
  MAHA_SEQUENCE,
} from "./taksa-mahabhuti.types";

// Taksa Calculator (v3 — 9-slot algorithm)
export {
  CENTER,
  SEQ_STARS_8,
  STAR_GRID_POSITION,
  buildPath9,
  calcAgeYang,
  calcTaksaNatal,
  calcTaksaTransit,
  calcSawai,
  checkElementPairs,
  getBhopOfStar,
  getStarOfBhop,
} from "./taksa-calculator";
export type { SlotValue, TaksaTransitResult9 } from "./taksa-calculator";

// Mahabhuti Calculator
export {
  calcMahabhuti,
  buddhToCS,
  csTobuddh,
  csFromDate,
  getMahaBhopOfStar,
  isStarInDanger,
  isStarInGood,
  MAHA_DANGER_BHOP,
  MAHA_GOOD_BHOP,
} from "./mahabhuti-calculator";

// Cross-Check Engine (Main Facade)
export { calcTaksaMaha, generateAlerts } from "./cross-check-engine";
