import { calculateYam, CalculateYamOptions } from "../core/yamCalculator.js";
import { calculatePhase }                    from "../core/phaseCalculator.js";
import { getPrediction, generatePrediction } from "../core/predictionEngine.js";
import { yamDayTicksTable }                  from "../constants/yamDayTable.js";
import { yamNightTicksTable }                from "../constants/yamNightTable.js";
import {
  YamResult,
  GeneratePredictionOptions,
  PredictionTopic,
  PhaseType,
  TravelAuspiciousness,
} from "../types/yam.types.js";
import {
  getBirthYamData,
  getAtthakarnYamAt,
  type AtthakarnBirthYam,
} from "../data/atthakarnAdapter.js";

// Re-export AtthakarnBirthYam for upstream consumers
export type { AtthakarnBirthYam };

export interface GetYamOptions extends CalculateYamOptions {
  /** รวมคำทำนายด้วยหรือไม่ (default: true) */
  withPrediction?: boolean;
}

/**
 * ดึงข้อมูลยามอัฏฐกาล ณ วันเวลาที่กำหนด พร้อมคำทำนายและฤกษ์เดินทาง
 *
 * @example
 * const result = getYamPrediction(new Date());
 * console.log(result.yamName, result.phase, result.travelAuspiciousness.label);
 */
export function getYamPrediction(
  date: Date = new Date(),
  options: GetYamOptions = {}
): YamResult {
  const { withPrediction = true, ...calcOptions } = options;

  const yam       = calculateYam(date, calcOptions);
  const phase     = calculatePhase(date, yam.sunTimes);
  const prediction = withPrediction ? getPrediction(yam.yamName, yam.period) : undefined;

  // คำนวณความมงคลเดินทาง (Ticks)
  const ticksTable = yam.period === "day" ? yamDayTicksTable[yam.dayName] : yamNightTicksTable[yam.dayName];
  const ticks = ticksTable[yam.yamNumber - 1] ?? 0;

  let level: TravelAuspiciousness["level"] = "good";
  let label = "ดี (✓)";

  if (ticks === 3) {
    level = "excellent";
    label = "ดีเยี่ยม (✓✓✓)";
  } else if (ticks === 2) {
    level = "very_good";
    label = "ดีมาก (✓✓)";
  } else if (ticks === 1) {
    level = "good";
    label = "ดี (✓)";
  } else {
    level = "bad";
    label = "ไม่ดี/ติดขัด ( )";
  }

  // ดึงคำทำนายการเดินทางตรงตามเฟส
  let description = "ไม่พบคำพยากรณ์การเดินทาง";
  if (prediction?.travel) {
    const map = {
      start: prediction.travel.start,
      middle: prediction.travel.middle,
      end: prediction.travel.end,
    };
    description = map[phase] ?? description;
  }

  const travelAuspiciousness: TravelAuspiciousness = {
    ticks,
    level,
    label,
    description,
  };

  return {
    date,
    ...yam,
    phase,
    prediction,
    travelAuspiciousness,
  };
}

/**
 * ดึงยามอัฏฐกาล ณ ปัจจุบัน (shorthand)
 */
export function getCurrentYam(options: GetYamOptions = {}): YamResult {
  return getYamPrediction(new Date(), options);
}

/**
 * สร้างคำทำนายแบบเฉพาะเจาะจง (topic-based)
 *
 * @example
 * yamService.predict({ yam: "พุธ", phase: "middle", topic: "travel" })
 * // → "เดินทางแล้วสำเร็จ..."
 */
export function predict(options: GeneratePredictionOptions): string {
  return generatePrediction(options);
}

/**
 * ดึงคำทำนาย topic เดียวจากผล YamResult
 */
export function predictFromResult(
  result: YamResult,
  topic: PredictionTopic
): string {
  return generatePrediction({
    yam:   result.yamName,
    phase: result.phase,
    topic,
    period: result.period,
  });
}

// ─── Atthakarn (ยามอัฏฐกาล) integration ──────────────────────────────────────

/**
 * ดึงข้อมูลยามอัฏฐกาลจากวันเวลาเกิด (พร้อม context สำหรับ RAG)
 * @param birthDate - ISO date string เช่น "1990-05-15"
 * @param birthTime - HH:MM string เช่น "14:30" (optional)
 */
export function getBirthYamResult(
  birthDate: string,
  birthTime?: string | null
): AtthakarnBirthYam | null {
  return getBirthYamData(birthDate, birthTime);
}

/**
 * ดึงยามอัฏฐกาล ณ วันเวลาที่ระบุ (generic)
 */
export function getAtthakarnAt(date: Date): AtthakarnBirthYam {
  return getAtthakarnYamAt(date);
}

