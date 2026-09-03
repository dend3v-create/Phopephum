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
export { yamDayTable, yamDayTicksTable, yamDaySubTable }       from "./constants/yamDayTable.js";
export { yamNightTable, yamNightTicksTable, yamNightSubTable } from "./constants/yamNightTable.js";

export { yamMeaning }                    from "./constants/yamMeaning.js";
export { phaseMeaning }                  from "./constants/phaseMeaning.js";
export {
  ATTHAKARN_CHAN_CHAI_TABLE,
  DAY_SUB_TIME_SLOTS_24,
  NIGHT_SUB_TIME_SLOTS_24,
  YAM_BEST_TIMES_SUMMARY,
  YAM_RULES_NOTE,
  getChanChaiItem,
  getChanChaiProphecy,
  type MasterYamItem,
  type ChanChaiPhase,
  type ChanChaiSubProphecy,
  type SubTimeSlotItem,
  type BestTimeSummaryItem,
} from "./constants/chanChaiTable.js";

export { getSunTimes, getMinutes, isDayTime, getYamIndex } from "./core/timeUtils.js";
export { calculateYam }                                    from "./core/yamCalculator.js";
export { calculatePhase }                                  from "./core/phaseCalculator.js";
export { getPrediction, generatePrediction }               from "./core/predictionEngine.js";

