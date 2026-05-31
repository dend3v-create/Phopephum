import { r7, getThaiBaseNumbers } from "../core/lunarCalendar.js";
import type { NineBaseResult, HoroscopeInput } from "@phopephum/types";

/**
 * 7 Numbers 9 Bases Engine (v2.0)
 * Calculates a 9x7 matrix for Thai Astrology.
 */

/** Circular reduce to 1-7 for base rows */
export function r7_local(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1;
}

/** Row generators for Base 1-3 */
export function genBase1to3(seed: number): number[] {
  return Array.from({ length: 7 }, (_, i) => r7_local(seed + i));
}

/** Row generator for Base 4 (Sum of B1, B2, B3) */
export function genBase4(b1: number[], b2: number[], b3: number[]): number[] {
  return b1.map((v, i) => v + b2[i] + b3[i]);
}

/** Row generator for Base 5 (B4 % 7) */
export function genBase5(b4: number[]): number[] {
  return b4.map(r7_local);
}

/** Row generator for Base 6 (B5 * 2) */
export function genBase6(b5: number[]): number[] {
  return b5.map((v) => r7_local(v * 2));
}

/** Row generator for Base 7 (B6 * 2) */
export function genBase7(b6: number[]): number[] {
  return b6.map((v) => r7_local(v * 2));
}

/** Row generator for Base 8 (อาตมา) - Walk -2 */
export function genBase8(b5First: number): number[] {
  return Array.from({ length: 7 }, (_, i) => r7_local(b5First - i * 2));
}

/** Row generator for Base 9 (ภริยัง) - Walk +2 */
export function genBase9(b5First: number): number[] {
  const start = r7_local(b5First - 1);
  return Array.from({ length: 7 }, (_, i) => r7_local(start + i * 2));
}

/**
 * Main Calculator for 7 Numbers 9 Bases
 */
export function calculateNineBases(input: HoroscopeInput): NineBaseResult {
  const { birthDate, birthTime } = input;
  
  // 1. Get Thai Lunar Base Numbers
  const thai = getThaiBaseNumbers(birthDate, birthTime);
  
  const d = thai.dayNum;
  const m = thai.monthNum;
  const y = thai.yearNum;

  // 2. Generate Rows
  const b1 = genBase1to3(d);
  const b2 = genBase1to3(m);
  const b3 = genBase1to3(y);
  const b4 = genBase4(b1, b2, b3);
  const b5 = genBase5(b4);
  const b6 = genBase6(b5);
  const b7 = genBase7(b6);
  const b8 = genBase8(b5[0]);
  const b9 = genBase9(b5[0]);

  return {
    lunarDate: {
      dayName: thai.dayName,
      dayPlanet: thai.dayPlanet,
      lunarMonth: thai.lunarMonth,
      lunarMonthName: thai.lunarMonthName,
      lunarDay: thai.lunarDay,
      moonPhase: thai.moonPhase,
      zodiacName: thai.zodiacName,
      thaiDateText: thai.thaiDateText,
      isApproximate: thai.isApproximate,
    },
    bases: [b1, b2, b3, b4, b5, b6, b7, b8, b9],
  };
}
