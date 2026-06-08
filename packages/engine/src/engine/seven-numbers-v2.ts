import { getThaiBaseNumbers } from "../core/lunarCalendar.js";
import { calculateSevenBase } from "../calculators/sevenBase.js";
import { calculateNineBase } from "../calculators/nineBase.js";
import type { NineBaseResult, HoroscopeInput } from "@phopephum/types";

/**
 * 7 Numbers 9 Bases Engine (v2.0)
 * Calculates a 9x7 matrix for Thai Astrology.
 */

/** Circular reduce to 1-7 for base rows */
export function r7_local(n: number): number {
  return ((n - 1) % 7 + 7) % 7 + 1;
}

/**
 * Main Calculator for 7 Numbers 9 Bases
 */
export function calculateNineBases(input: HoroscopeInput): NineBaseResult {
  const { birthDate, birthTime } = input;
  
  // 1. Get Thai Lunar Base Numbers
  const thai = getThaiBaseNumbers(birthDate, birthTime);
  
  // 2. Generate Rows using standardized calculators
  const [b1, b2, b3] = calculateSevenBase(thai.dayNum, thai.monthNum, thai.yearNum);
  const bases = calculateNineBase(b1!, b2!, b3!);

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
      thaiYear: thai.thaiYear,
    },
    bases,
  };
}
