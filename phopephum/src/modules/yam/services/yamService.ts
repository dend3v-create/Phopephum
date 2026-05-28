import { calculateYam, CalculateYamOptions } from "../core/yamCalculator";
import { calculatePhase }                    from "../core/phaseCalculator";
import { getPrediction, generatePrediction } from "../core/predictionEngine";
import {
  YamResult,
  GeneratePredictionOptions,
  PredictionTopic,
  PhaseType,
} from "../types/yam.types";

export interface GetYamOptions extends CalculateYamOptions {
  /** รวมคำทำนายด้วยหรือไม่ (default: true) */
  withPrediction?: boolean;
}

/**
 * ดึงข้อมูลยามอัฐกาล ณ วันเวลาที่กำหนด พร้อมคำทำนาย
 *
 * @example
 * const result = getYamPrediction(new Date());
 * console.log(result.yamName, result.phase, result.prediction?.news);
 */
export function getYamPrediction(
  date: Date = new Date(),
  options: GetYamOptions = {}
): YamResult {
  const { withPrediction = true, ...calcOptions } = options;

  const yam       = calculateYam(date, calcOptions);
  const phase     = calculatePhase(date, yam.sunTimes);
  const prediction = withPrediction ? getPrediction(yam.yamName) : undefined;

  return {
    date,
    ...yam,
    phase,
    prediction,
  };
}

/**
 * ดึงยามอัฐกาล ณ ปัจจุบัน (shorthand)
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
  });
}
