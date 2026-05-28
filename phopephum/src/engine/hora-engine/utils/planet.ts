/**
 * hora-engine/utils/planet.ts
 * Utility ดาว — Chaldean index, offset, scoring
 *
 * @module utils/planet
 */

import type { Planet, PlanetId } from "../types";
import { PLANETS, PLANET_CHALDEAN_ORDER } from "../constants/planets";

// ─────────────────────────────────────────────────────────────────────────────
// Chaldean Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * หา Chaldean index ของดาว (0–6)
 * @example getPlanetChaldeanIndex("sun") → 3
 */
export function getPlanetChaldeanIndex(id: PlanetId): number {
  return PLANET_CHALDEAN_ORDER.indexOf(id);
}

/**
 * หาดาวที่ offset ห่างจาก startIndex ตาม Chaldean order (เวียนซ้ำ 7)
 * @param startIndex - Chaldean index เริ่มต้น (ดาวเจ้าของวัน)
 * @param offset     - offset (0-based)
 * @returns Planet ที่ตำแหน่งนั้น
 */
export function getPlanetAtOffset(startIndex: number, offset: number): Planet {
  const idx = ((startIndex + offset) % 7 + 7) % 7;
  return PLANETS[PLANET_CHALDEAN_ORDER[idx]];
}

/**
 * หาดาวถัดไปใน Chaldean order
 */
export function getNextPlanet(id: PlanetId): Planet {
  const idx = getPlanetChaldeanIndex(id);
  return getPlanetAtOffset(idx, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Planet Classification
// ─────────────────────────────────────────────────────────────────────────────

/** ดาวมงคล (benefic) */
export const BENEFIC_PLANETS: PlanetId[] = ["sun", "moon", "jupiter", "venus"];

/** ดาวอัปมงคล (malefic) */
export const MALEFIC_PLANETS: PlanetId[] = ["mars", "saturn"];

/** ดาวกลาง (neutral) */
export const NEUTRAL_PLANETS: PlanetId[] = ["mercury"];

/**
 * ตรวจว่าดาวนั้นเป็นมงคลหรือไม่
 */
export function isBenefic(id: PlanetId): boolean {
  return BENEFIC_PLANETS.includes(id);
}

/**
 * ตรวจว่าดาวนั้นเป็นอัปมงคลหรือไม่
 */
export function isMalefic(id: PlanetId): boolean {
  return MALEFIC_PLANETS.includes(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Recommendations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * กิจกรรมที่เหมาะสมกับดาวแต่ละดวง
 * key = activity category
 */
export const PLANET_ACTIVITIES: Record<string, PlanetId[]> = {
  business:     ["jupiter", "mercury", "sun"],
  love:         ["venus", "moon"],
  finance:      ["jupiter", "venus", "mercury"],
  health:       ["sun", "moon"],
  travel:       ["mercury", "jupiter"],
  study:        ["mercury", "jupiter"],
  creative:     ["venus", "moon", "mercury"],
  spiritual:    ["jupiter", "moon"],
  negotiation:  ["mercury", "venus", "sun"],
  construction: ["mars", "saturn"],
  // ระวัง
  avoid_conflict: ["mars"],
  avoid_delay:    ["saturn"],
};

/**
 * หาระดับความเหมาะสมของดาวสำหรับกิจกรรม (0–100)
 */
export function getPlanetActivityScore(
  planetId: PlanetId,
  activity: string
): number {
  const preferred = PLANET_ACTIVITIES[activity];
  if (!preferred) return 50; // ไม่รู้จักกิจกรรม → กลางๆ

  const idx = preferred.indexOf(planetId);
  if (idx === -1) {
    // ไม่อยู่ใน preferred → คะแนนตาม nature
    const planet = PLANETS[planetId];
    if (planet.nature === "benefic") return 40;
    if (planet.nature === "malefic") return 20;
    return 30;
  }
  // อยู่ใน preferred → score สูงสุดที่ตำแหน่ง 0
  return Math.max(60, 100 - idx * 15);
}
