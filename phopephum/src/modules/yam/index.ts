// ─── Public API ───────────────────────────────────────────────────────────────

// Services (main entry points)
export {
  getYamPrediction,
  getCurrentYam,
  predict,
  predictFromResult,
  type GetYamOptions,
} from "./services/yamService";

// Types
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
} from "./types/yam.types";

// Constants (for display / UI)
export { DAY_INDEX_MAP, DAY_NAMES_THAI } from "./constants/dayMap";
export { yamDayTable }                   from "./constants/yamDayTable";
export { yamNightTable }                 from "./constants/yamNightTable";
export { yamMeaning }                    from "./constants/yamMeaning";
export { phaseMeaning }                  from "./constants/phaseMeaning";

// Core utilities (for advanced use)
export { getSunTimes, getMinutes, isDayTime, getYamIndex } from "./core/timeUtils";
export { calculateYam }                                    from "./core/yamCalculator";
export { calculatePhase }                                  from "./core/phaseCalculator";
export { getPrediction, generatePrediction }               from "./core/predictionEngine";
