/**
 * hora-engine/index.ts
 * Barrel Export — import ทุกอย่างจากไฟล์เดียว
 *
 * Usage:
 *   import { calculateHora, getCurrentHora, getDailyOverview } from "@/engine"
 *   import type { HoraResult, Planet, CurrentHoraInfo } from "@/engine"
 *
 * @module hora-engine
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types (re-export ทั้งหมด)
// ─────────────────────────────────────────────────────────────────────────────
export type {
  DayOfWeek,
  PlanetId,
  HourPeriod,
  PlanetNature,
  Planet,
  HoraSlot,
  HoraMajorSlot,
  CurrentHoraInfo,
  HoraInput,
  HoraResult,
  AuspiciousHora,
  DailyHoraSummary,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
export {
  PLANETS,
  PLANET_CHALDEAN_ORDER,
  DAY_RULERS,
  DAY_NAMES_THAI,
  DAY_NAMES_EN,
  MAJOR_HORA_NAMES,
  DAY_START_MINUTES,
  MAJOR_SLOT_MINUTES,
  SUB_SLOT_MINUTES,
  MAJOR_SLOTS_PER_DAY,
  SUB_SLOTS_PER_MAJOR,
  MINUTES_PER_DAY,
} from "./constants/planets";

// ─────────────────────────────────────────────────────────────────────────────
// Utils — Time
// ─────────────────────────────────────────────────────────────────────────────
export {
  minutesToTimeStr,
  dateToMinutes,
  timeStrToMinutes,
  normalizeMinutes,
  isMinuteInRange,
  getElapsedMinutes,
  calcProgressPercent,
  dateToISO,
  buildDate,
  isSameDay,
} from "./utils/time";

// ─────────────────────────────────────────────────────────────────────────────
// Utils — Planet
// ─────────────────────────────────────────────────────────────────────────────
export {
  getPlanetChaldeanIndex,
  getPlanetAtOffset,
  getNextPlanet,
  BENEFIC_PLANETS,
  MALEFIC_PLANETS,
  NEUTRAL_PLANETS,
  isBenefic,
  isMalefic,
  PLANET_ACTIVITIES,
  getPlanetActivityScore,
} from "./utils/planet";

// ─────────────────────────────────────────────────────────────────────────────
// Core — Builders
// ─────────────────────────────────────────────────────────────────────────────
export { buildSubSlots, buildMajorSlots } from "./core/slot-builder";

// ─────────────────────────────────────────────────────────────────────────────
// Core — Current Hora
// ─────────────────────────────────────────────────────────────────────────────
export { findCurrentHora, findNextHora } from "./core/current-hora";

// ─────────────────────────────────────────────────────────────────────────────
// Core — Calculator (Main API)
// ─────────────────────────────────────────────────────────────────────────────
export {
  calculateHora,
  getCurrentHora,
  getHoraAt,
  getHoraSummary,
  findAuspiciousHoras,
  findAuspiciousHorasByActivity,
  getDailyHoraSummary,
  getTopAuspiciousSlots,
} from "./core/calculator";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export type {
  CurrentHoraCardData,
  HoraTableRow,
  HoraSlotCell,
  DailyOverview,
  NextHoraPreview,
  AuspiciousPreview,
} from "./helpers/dashboard";

export {
  toCurrentHoraCard,
  toHoraTable,
  getDailyOverview,
} from "./helpers/dashboard";
