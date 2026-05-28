/**
 * hora-engine/helpers/dashboard.ts
 * Helper ฟังก์ชันเฉพาะสำหรับ Dashboard Web App
 * (แปลงข้อมูลเป็น format ที่ UI ใช้ได้โดยตรง)
 *
 * @module helpers/dashboard
 */

import type {
  HoraResult,
  CurrentHoraInfo,
  HoraMajorSlot,
  HoraSlot,
  Planet,
  PlanetId,
} from "../types";
import { calculateHora, getCurrentHora, findAuspiciousHorasByActivity } from "../core/calculator";
import { findNextHora } from "../core/current-hora";
import { isBenefic, isMalefic } from "../utils/planet";

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Card Data
// ─────────────────────────────────────────────────────────────────────────────

/** ข้อมูลสำหรับ Current Hora Card บน Dashboard */
export interface CurrentHoraCardData {
  isActive: boolean;
  planet: Planet;
  majorSlotNumber: number;
  majorSlotName: string;
  subSlotNumber: number;
  startTime: string;
  endTime: string;
  progressPercent: number;
  minutesRemaining: number;
  period: "day" | "night";
  isBenefic: boolean;
  isMalefic: boolean;
  /** สีพื้นหลัง card (จากสีดาว) */
  cardColor: string;
  /** badge text */
  badge: string;
}

/**
 * แปลง HoraResult → ข้อมูล Card สำหรับ UI
 */
export function toCurrentHoraCard(result: HoraResult): CurrentHoraCardData | null {
  const { currentHora } = result;
  if (!currentHora) return null;

  const { majorSlot, subSlot, majorIndex, subIndex, progressPercent, minutesRemaining } = currentHora;
  const planet = subSlot.planet;

  return {
    isActive: true,
    planet,
    majorSlotNumber: majorIndex,
    majorSlotName: majorSlot.name,
    subSlotNumber: subIndex,
    startTime: subSlot.startTime,
    endTime: subSlot.endTime,
    progressPercent,
    minutesRemaining,
    period: subSlot.period,
    isBenefic: isBenefic(planet.id),
    isMalefic: isMalefic(planet.id),
    cardColor: planet.color,
    badge: planet.nature === "benefic" ? "มงคล" : planet.nature === "malefic" ? "ระวัง" : "กลาง",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Data (สำหรับแสดงตาราง/timeline)
// ─────────────────────────────────────────────────────────────────────────────

/** ข้อมูล Row สำหรับตารางยามใน Dashboard */
export interface HoraTableRow {
  majorSlot: number;
  majorName: string;
  period: "day" | "night";
  rulerPlanetId: PlanetId;
  rulerPlanetName: string;
  rulerSymbol: string;
  rulerColor: string;
  startTime: string;
  endTime: string;
  subSlots: HoraSlotCell[];
  isCurrentMajor: boolean;
}

/** Cell ยามย่อยใน table */
export interface HoraSlotCell {
  slot: number;
  planetId: PlanetId;
  planetName: string;
  symbol: string;
  color: string;
  startTime: string;
  endTime: string;
  isCurrentSlot: boolean;
  isBenefic: boolean;
}

/**
 * แปลง HoraResult → ตาราง rows สำหรับ UI
 */
export function toHoraTable(result: HoraResult): HoraTableRow[] {
  const currentMajorIndex = result.currentHora?.majorIndex;
  const currentSubIndex = result.currentHora?.subIndex;
  const currentMajorSlot = result.currentHora?.majorSlot.majorSlot;

  return result.majorSlots.map((major) => ({
    majorSlot: major.majorSlot,
    majorName: major.name,
    period: major.period,
    rulerPlanetId: major.rulerPlanet.id,
    rulerPlanetName: major.rulerPlanet.nameThai,
    rulerSymbol: major.rulerPlanet.symbol,
    rulerColor: major.rulerPlanet.color,
    startTime: major.startTime,
    endTime: major.endTime,
    subSlots: major.subSlots.map((sub) => ({
      slot: sub.slot,
      planetId: sub.planet.id,
      planetName: sub.planet.nameThai,
      symbol: sub.planet.symbol,
      color: sub.planet.color,
      startTime: sub.startTime,
      endTime: sub.endTime,
      isCurrentSlot:
        major.majorSlot === currentMajorSlot &&
        sub.slot === currentSubIndex,
      isBenefic: isBenefic(sub.planet.id),
    })),
    isCurrentMajor: major.majorSlot === currentMajorSlot,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Overview (สำหรับหน้า Dashboard หลัก)
// ─────────────────────────────────────────────────────────────────────────────

/** Overview ข้อมูลวันนี้ */
export interface DailyOverview {
  dayNameThai: string;
  dayRulerName: string;
  dayRulerSymbol: string;
  dayRulerColor: string;
  currentHoraCard: CurrentHoraCardData | null;
  nextHoraCard: NextHoraPreview | null;
  topBusinessHoras: AuspiciousPreview[];
  topLoveHoras: AuspiciousPreview[];
  totalBeneficSlots: number;
  totalMaleficSlots: number;
}

export interface NextHoraPreview {
  planetName: string;
  planetSymbol: string;
  planetColor: string;
  startTime: string;
  isBenefic: boolean;
}

export interface AuspiciousPreview {
  startTime: string;
  endTime: string;
  planetName: string;
  planetSymbol: string;
  planetColor: string;
  score: number;
}

/**
 * สร้าง DailyOverview สำหรับ Dashboard หน้าแรก
 */
export function getDailyOverview(now?: Date): DailyOverview {
  const date = now ?? new Date();
  const result = calculateHora({ date, currentTime: date });
  const allSlots = result.majorSlots.flatMap((m) => m.subSlots);

  // Current Hora Card
  const currentHoraCard = toCurrentHoraCard(result);

  // Next Hora
  let nextHoraCard: NextHoraPreview | null = null;
  if (result.currentHora) {
    const next = findNextHora(result.majorSlots, date);
    if (next) {
      const p = next.subSlot.planet;
      nextHoraCard = {
        planetName: p.nameThai,
        planetSymbol: p.symbol,
        planetColor: p.color,
        startTime: next.subSlot.startTime,
        isBenefic: isBenefic(p.id),
      };
    }
  }

  // Top auspicious horas
  const businessHoras = findAuspiciousHorasByActivity(date, "business", 70)
    .slice(0, 3)
    .map((a) => ({
      startTime: a.slot.startTime,
      endTime: a.slot.endTime,
      planetName: a.slot.planet.nameThai,
      planetSymbol: a.slot.planet.symbol,
      planetColor: a.slot.planet.color,
      score: a.score,
    }));

  const loveHoras = findAuspiciousHorasByActivity(date, "love", 70)
    .slice(0, 3)
    .map((a) => ({
      startTime: a.slot.startTime,
      endTime: a.slot.endTime,
      planetName: a.slot.planet.nameThai,
      planetSymbol: a.slot.planet.symbol,
      planetColor: a.slot.planet.color,
      score: a.score,
    }));

  return {
    dayNameThai: result.dayNameThai,
    dayRulerName: result.dayRuler.nameThai,
    dayRulerSymbol: result.dayRuler.symbol,
    dayRulerColor: result.dayRuler.color,
    currentHoraCard,
    nextHoraCard,
    topBusinessHoras: businessHoras,
    topLoveHoras: loveHoras,
    totalBeneficSlots: allSlots.filter((s) => s.planet.nature === "benefic").length,
    totalMaleficSlots: allSlots.filter((s) => s.planet.nature === "malefic").length,
  };
}
