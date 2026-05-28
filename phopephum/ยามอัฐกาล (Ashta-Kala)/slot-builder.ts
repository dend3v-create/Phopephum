/**
 * hora-engine/core/slot-builder.ts
 * สร้าง HoraMajorSlot[] และ HoraSlot[] จากข้อมูลดาวเจ้าของวัน
 *
 * @module core/slot-builder
 */

import type { HoraMajorSlot, HoraSlot, HourPeriod, PlanetId } from "../types";
import {
  DAY_START_MINUTES,
  MAJOR_SLOT_MINUTES,
  SUB_SLOT_MINUTES,
  MAJOR_SLOTS_PER_DAY,
  SUB_SLOTS_PER_MAJOR,
  MAJOR_HORA_NAMES,
} from "../constants/planets";
import { minutesToTimeStr } from "../utils/time";
import { getPlanetAtOffset, getPlanetChaldeanIndex } from "../utils/planet";

// ─────────────────────────────────────────────────────────────────────────────
// Sub Slot Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * สร้าง HoraSlot[] ทั้ง 8 ยามย่อยภายในยามใหญ่
 *
 * @param startChaldeanIndex  - Chaldean index ของดาวเจ้าวัน
 * @param majorIndex          - ลำดับยามใหญ่ (0-based)
 * @param majorStartMinute    - เวลาเริ่มยามใหญ่ (minutes)
 * @param period              - day | night
 */
export function buildSubSlots(
  startChaldeanIndex: number,
  majorIndex: number,
  majorStartMinute: number,
  period: HourPeriod
): HoraSlot[] {
  const subSlots: HoraSlot[] = [];

  for (let sub = 0; sub < SUB_SLOTS_PER_MAJOR; sub++) {
    // offset รวมของยามย่อยนี้จากจุดเริ่มวัน
    const globalOffset = majorIndex * SUB_SLOTS_PER_MAJOR + sub;
    const subPlanet = getPlanetAtOffset(startChaldeanIndex, globalOffset);

    const subStartMinute = majorStartMinute + sub * SUB_SLOT_MINUTES;
    const subEndMinute = subStartMinute + SUB_SLOT_MINUTES;

    subSlots.push({
      slot: sub + 1,
      planet: subPlanet,
      startMinute: subStartMinute,
      endMinute: subEndMinute,
      startTime: minutesToTimeStr(subStartMinute),
      endTime: minutesToTimeStr(subEndMinute),
      period,
    });
  }

  return subSlots;
}

// ─────────────────────────────────────────────────────────────────────────────
// Major Slot Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * สร้าง HoraMajorSlot[] ทั้ง 8 ยามใหญ่
 *
 * ยามใหญ่ 1–4 = กลางวัน (06:00–18:00)
 * ยามใหญ่ 5–8 = กลางคืน (18:00–06:00)
 *
 * @param dayRulerId - PlanetId ของดาวเจ้าวัน
 */
export function buildMajorSlots(dayRulerId: PlanetId): HoraMajorSlot[] {
  const startChaldeanIndex: number = getPlanetChaldeanIndex(dayRulerId);

  const majorSlots: HoraMajorSlot[] = [];

  for (let major = 0; major < MAJOR_SLOTS_PER_DAY; major++) {
    const period: HourPeriod = major < 4 ? "day" : "night";
    const majorStartMinute = DAY_START_MINUTES + major * MAJOR_SLOT_MINUTES;
    const majorEndMinute = majorStartMinute + MAJOR_SLOT_MINUTES;

    // ดาวเจ้าของยามใหญ่ = ดาวยามย่อยแรกของยามใหญ่นั้น
    const rulerPlanet = getPlanetAtOffset(
      startChaldeanIndex,
      major * SUB_SLOTS_PER_MAJOR
    );

    const subSlots = buildSubSlots(
      startChaldeanIndex,
      major,
      majorStartMinute,
      period
    );

    majorSlots.push({
      majorSlot: major + 1,
      name: MAJOR_HORA_NAMES[major],
      period,
      rulerPlanet,
      subSlots,
      startTime: minutesToTimeStr(majorStartMinute),
      endTime: minutesToTimeStr(majorEndMinute),
    });
  }

  return majorSlots;
}
