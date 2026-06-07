import { calculateNineBases } from "./seven-numbers-v2.js";
import { calculateAtthakarn as calculateAtthakarnLivingWisdom, calculateRahu as calculateRahuLivingWisdom } from "./time-engines.js";
import { calcTaksaMaha, buddhToCS } from "../taksa-mahabhuti/index.js";
import { getThaiBaseNumbers } from "../core/lunarCalendar.js";
import { calculateVayaJorn, calculateVayaJornRanges, calculateYearlyJorn, calculateMonthlyJorn, calculateDailyJorn } from "../calculators/calculateJorn.js";
import { calculateLagnaPhopephum, calculateLagnaTransitPhopephum, calculateHorary } from "../calculators/calculatePhopephumTime.js";
import type { PhopephumResult, HoroscopeInput } from "@phopephum/types";

/**
 * Phopephum Living Wisdom Operating System (v3.0 - Perfect Edition)
 * Integrated Prediction Engine strictly following:
 * 1. 100-Year Thai Lunar Calendar (Verified lookup)
 * 2. 06:00 AM Astrological Day Transition
 * 3. Month 5 Zodiac Year Transition
 */
export async function calculatePhopephum(input: HoroscopeInput, checkDate: Date = new Date()): Promise<PhopephumResult> {
  // ── 1. Calculate Core Calendar State (V3) ──────────────────────────────────
  
  // Birth state (Corrected for 06:00 cutoff and 100-year calendar)
  const birthThai = getThaiBaseNumbers(input.birthDate, input.birthTime);
  
  // Transit state (Corrected for 06:00 cutoff and 100-year calendar)
  const checkDateStr = checkDate.toISOString().split('T')[0]!;
  const checkTimeStr = checkDate.getHours().toString().padStart(2, '0') + ':' + checkDate.getMinutes().toString().padStart(2, '0');
  const transitThai = getThaiBaseNumbers(checkDateStr, checkTimeStr);

  // ── 2. Calculate 7 Numbers 9 Bases ─────────────────────────────────────────
  const nineBase = calculateNineBases(input);
  
  // ── 3. Calculate Taksa & Mahabhuti (V3 Integration) ────────────────────────
  const taksaMaha = calcTaksaMaha({
    birthDate: new Date(input.birthDate + 'T12:00:00'),
    checkDate: checkDate,
    birthStar: birthThai.dayNum as any, // 1-8 (Rahu support)
    csNatal:   buddhToCS(birthThai.thaiYear),
    csTransit: buddhToCS(transitThai.thaiYear),
  });
  
  // ── 4. Calculate Time-based Engines ────────────────────────────────────────
  const atthakarn = calculateAtthakarnLivingWisdom(checkDate);
  const rahu = calculateRahuLivingWisdom(checkDate);

  // ── 5. Calculate Jorn (Progressed) & Lagna ────────────────────────────────
  const ageYang = taksaMaha.taksaTransit.ageYang;
  const matrix = nineBase.bases;
  const taksaMap = taksaMaha.taksaTransit.map;

  const vayaJorn = calculateVayaJorn(matrix, ageYang, taksaMap);
  const vayaJornRanges = calculateVayaJornRanges(matrix);
  const yearlyJorn = calculateYearlyJorn(matrix, ageYang, taksaMap);
  const monthlyJorn = calculateMonthlyJorn(matrix, transitThai.lunarMonth, taksaMap);
  const dailyJorn = calculateDailyJorn(matrix, transitThai.dayNum, taksaMap);
  
  const birthDateTime = new Date(`${input.birthDate}T${input.birthTime || '12:00'}:00`);
  const lagna = calculateLagnaPhopephum(matrix, birthDateTime, taksaMap);
  const lagnaTransit = calculateLagnaTransitPhopephum(matrix, lagna, ageYang, taksaMap);
  const lagnaMoment = calculateLagnaPhopephum(matrix, checkDate, taksaMap);

  // ── 6. Calculate Horary (กาลชะตา) ──────────────────────────────────────────
  const horaryMatrix = calculateHorary(checkDate);
  const horary: any = {
    lunarDate: transitThai,
    bases: horaryMatrix
  };
  
  return {
    nineBase,
    taksaNatal: taksaMaha.taksaNatal,
    taksaTransit: taksaMaha.taksaTransit,
    mahaNatal: taksaMaha.mahaNatal,
    mahaTransit: taksaMaha.mahaTransit,
    crossCheck: {
      elementPairFlags: taksaMaha.elementPairFlags,
      alerts: taksaMaha.alerts,
    },
    atthakarn,
    rahu,
    vayaJorn,
    yearlyJorn,
    monthlyJorn,
    dailyJorn,
    lagna,
    lagnaTransit,
    lagnaMoment,
    horary,
    timestamp: checkDate.toISOString(),
  };
}
