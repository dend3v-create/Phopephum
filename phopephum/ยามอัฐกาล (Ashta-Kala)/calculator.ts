/**
 * hora-engine/core/calculator.ts
 * ฟังก์ชันหลัก calculateHora + convenience wrappers
 *
 * @module core/calculator
 */

import type {
  HoraInput,
  HoraResult,
  HoraSlot,
  AuspiciousHora,
  DailyHoraSummary,
  PlanetId,
  DayOfWeek,
} from "../types";
import {
  PLANETS,
  DAY_RULERS,
  DAY_NAMES_THAI,
} from "../constants/planets";
import { buildMajorSlots } from "./slot-builder";
import { findCurrentHora } from "./current-hora";
import { getPlanetActivityScore } from "../utils/planet";

// ─────────────────────────────────────────────────────────────────────────────
// Main Calculator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณยามอัฐกาลทั้งหมดสำหรับวันที่กำหนด
 *
 * กฎการคำนวณ:
 * - 1 วัน = 8 ยามใหญ่ (กลางวัน 4 + กลางคืน 4)
 * - 1 ยามใหญ่ = 180 นาที = 8 ยามย่อย × 22.5 นาที
 * - ยามกลางวัน: 06:00–18:00
 * - ยามกลางคืน: 18:00–06:00+1
 * - ดาวเจ้าของยามใหญ่แรก = ดาวเจ้าของวัน
 * - ดาวถัดไปเดินตาม Chaldean order (เวียนซ้ำ 7)
 *
 * @param input - HoraInput { date, currentTime? }
 * @returns HoraResult
 */
export function calculateHora(input: HoraInput): HoraResult {
  const { date, currentTime } = input;

  const dayOfWeek = date.getDay() as DayOfWeek;
  const dayRulerId = DAY_RULERS[dayOfWeek];
  const dayRuler = PLANETS[dayRulerId];

  const majorSlots = buildMajorSlots(dayRulerId);

  const result: HoraResult = {
    date,
    dayOfWeek,
    dayNameThai: DAY_NAMES_THAI[dayOfWeek],
    dayRuler,
    majorSlots,
  };

  if (currentTime) {
    result.currentHora = findCurrentHora(majorSlots, currentTime);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Wrappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณยามปัจจุบัน ณ ตอนนี้
 */
export function getCurrentHora(now?: Date): HoraResult {
  const d = now ?? new Date();
  return calculateHora({ date: d, currentTime: d });
}

/**
 * คำนวณยาม ณ วันและเวลาที่กำหนด
 */
export function getHoraAt(date: Date, time: Date): HoraResult {
  return calculateHora({ date, currentTime: time });
}

/**
 * สรุปยามย่อยทั้งหมดในวัน (64 ยาม)
 */
export function getHoraSummary(date: Date): HoraSlot[] {
  const result = calculateHora({ date });
  return result.majorSlots.flatMap((m) => m.subSlots);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auspicious Hora Finder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * หายามมงคลสำหรับดาวที่กำหนด
 *
 * @param date         - วันที่ต้องการ
 * @param preferredIds - PlanetId[] ที่ต้องการ
 * @returns HoraSlot[] ที่ตรงกับดาวที่ต้องการ
 */
export function findAuspiciousHoras(
  date: Date,
  preferredIds: PlanetId[]
): HoraSlot[] {
  const result = calculateHora({ date });
  const auspicious: HoraSlot[] = [];

  for (const major of result.majorSlots) {
    for (const sub of major.subSlots) {
      if (preferredIds.includes(sub.planet.id)) {
        auspicious.push(sub);
      }
    }
  }

  return auspicious;
}

/**
 * หายามมงคลตามกิจกรรม พร้อม score
 *
 * @param date     - วันที่ต้องการ
 * @param activity - ชื่อกิจกรรม (ดู PLANET_ACTIVITIES ใน utils/planet.ts)
 * @param minScore - score ขั้นต่ำ (default 60)
 */
export function findAuspiciousHorasByActivity(
  date: Date,
  activity: string,
  minScore = 60
): AuspiciousHora[] {
  const result = calculateHora({ date });
  const auspicious: AuspiciousHora[] = [];

  for (const major of result.majorSlots) {
    for (const sub of major.subSlots) {
      const score = getPlanetActivityScore(sub.planet.id, activity);
      if (score >= minScore) {
        auspicious.push({
          slot: sub,
          majorSlotName: major.name,
          majorSlotNumber: major.majorSlot,
          score,
        });
      }
    }
  }

  // เรียงตาม score สูง → ต่ำ แล้วตามเวลา
  return auspicious.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.slot.startMinute - b.slot.startMinute;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * สรุปสถิติยามรายวัน
 */
export function getDailyHoraSummary(date: Date): DailyHoraSummary {
  const result = calculateHora({ date });
  const allSlots = result.majorSlots.flatMap((m) => m.subSlots);

  const beneficSlots = allSlots.filter((s) => s.planet.nature === "benefic").length;
  const maleficSlots = allSlots.filter((s) => s.planet.nature === "malefic").length;
  const neutralSlots = allSlots.filter((s) => s.planet.nature === "neutral").length;

  return {
    date,
    dayNameThai: result.dayNameThai,
    dayRuler: result.dayRuler,
    totalSlots: allSlots.length,
    beneficSlots,
    maleficSlots,
    neutralSlots,
    slots: allSlots,
  };
}

/**
 * หายามที่ดีที่สุดของวัน (top N ยามมงคล)
 */
export function getTopAuspiciousSlots(
  date: Date,
  activity: string,
  topN = 5
): AuspiciousHora[] {
  return findAuspiciousHorasByActivity(date, activity).slice(0, topN);
}
