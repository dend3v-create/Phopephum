/**
 * hora-engine/core/current-hora.ts
 * หายามปัจจุบันจาก majorSlots + currentTime
 *
 * @module core/current-hora
 */

import type { CurrentHoraInfo, HoraMajorSlot } from "../types";
import { SUB_SLOT_MINUTES } from "../constants/planets";
import {
  dateToMinutes,
  isMinuteInRange,
  getElapsedMinutes,
  calcProgressPercent,
} from "../utils/time";

// ─────────────────────────────────────────────────────────────────────────────
// Find Current Hora
// ─────────────────────────────────────────────────────────────────────────────

/**
 * หายามปัจจุบัน (major + sub) จากเวลาที่กำหนด
 *
 * @param majorSlots  - HoraMajorSlot[] ทั้ง 8 ยาม
 * @param currentTime - Date ของเวลาปัจจุบัน
 * @returns CurrentHoraInfo | undefined
 */
export function findCurrentHora(
  majorSlots: HoraMajorSlot[],
  currentTime: Date
): CurrentHoraInfo | undefined {
  const currentMinute = dateToMinutes(currentTime);

  for (let mi = 0; mi < majorSlots.length; mi++) {
    const major = majorSlots[mi];

    for (let si = 0; si < major.subSlots.length; si++) {
      const sub = major.subSlots[si];

      if (
        isMinuteInRange(
          currentMinute,
          sub.startMinute,
          sub.endMinute
        )
      ) {
        const elapsed = getElapsedMinutes(
          currentMinute,
          sub.startMinute,
          sub.endMinute
        );
        const minutesRemaining = Math.max(0, SUB_SLOT_MINUTES - elapsed);
        const progressPercent = calcProgressPercent(elapsed, SUB_SLOT_MINUTES);

        return {
          majorSlot: major,
          subSlot: sub,
          majorIndex: mi + 1,
          subIndex: si + 1,
          minutesRemaining: Math.round(minutesRemaining * 10) / 10,
          progressPercent,
        };
      }
    }
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Next Hora Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * หายามย่อยถัดไปหลังจากยามปัจจุบัน
 */
export function findNextHora(
  majorSlots: HoraMajorSlot[],
  currentTime: Date
): CurrentHoraInfo | undefined {
  const current = findCurrentHora(majorSlots, currentTime);
  if (!current) return undefined;

  // หา sub index ถัดไป
  const { majorIndex, subIndex } = current;
  const mi = majorIndex - 1;
  const si = subIndex - 1;

  // ยามย่อยถัดไปในยามใหญ่เดียวกัน
  if (si + 1 < majorSlots[mi].subSlots.length) {
    return {
      majorSlot: majorSlots[mi],
      subSlot: majorSlots[mi].subSlots[si + 1],
      majorIndex,
      subIndex: subIndex + 1,
      minutesRemaining: 22.5,
      progressPercent: 0,
    };
  }

  // ยามใหญ่ถัดไป
  if (mi + 1 < majorSlots.length) {
    return {
      majorSlot: majorSlots[mi + 1],
      subSlot: majorSlots[mi + 1].subSlots[0],
      majorIndex: majorIndex + 1,
      subIndex: 1,
      minutesRemaining: 22.5,
      progressPercent: 0,
    };
  }

  return undefined; // ครบวัน
}
