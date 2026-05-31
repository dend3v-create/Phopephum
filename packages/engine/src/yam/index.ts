// ─── Public API ───────────────────────────────────────────────────────────────

export {
  getYamPrediction,
  getCurrentYam,
  predict,
  predictFromResult,
  type GetYamOptions,
  // ── Atthakarn (ยามอัฏฐกาล) ──
  getBirthYamResult,
  getAtthakarnAt,
  type AtthakarnBirthYam,
} from "./services/yamService.js";

export type {
  DayName,
  PeriodType,
  PhaseType,
  PredictionTopic,
  SunTimes,
  YamInfo,
  YamResult,
  PredictionResult,
  GeneratePredictionOptions,
} from "./types/yam.types.js";

export { DAY_INDEX_MAP, DAY_NAMES_THAI } from "./constants/dayMap.js";
export const dummy = 1; // Unused but makes diff clear if needed
export { yamDayTable, yamDayTicksTable }       from "./constants/yamDayTable.js";
export { yamNightTable, yamNightTicksTable }   from "./constants/yamNightTable.js";

export { yamMeaning }                    from "./constants/yamMeaning.js";
export { phaseMeaning }                  from "./constants/phaseMeaning.js";

export { getSunTimes, getMinutes, isDayTime, getYamIndex } from "./core/timeUtils.js";
export { calculateYam }                                    from "./core/yamCalculator.js";
export { calculatePhase }                                  from "./core/phaseCalculator.js";
export { getPrediction, generatePrediction }               from "./core/predictionEngine.js";
