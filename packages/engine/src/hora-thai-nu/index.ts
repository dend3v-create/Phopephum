export { calculateHoraNu } from './calculators/horaEngine.js';
export {
  calculateHoraTaynoo,
  generateHoraTaynooSVG,
  calculateNow as calculateHoraTaynooNow,
  getPlanetSteps,
  getPlanetStatus,
  calculatePositions,
  buildBhavaMap,
  findLagnaRuler,
  buildSubTimeSlots,
  loadSuccessYam,
  getSuccessYamMeta,
  getYamTimeRange,
  ZODIAC_ORDER,
  PLANET_INFO,
  PLANET_KASTERN,
  BHAVA_NAMES,
  DAY_YAM,
  NIGHT_YAM,
  YAM_START,
  DAY_PLANET,
} from './hora-taynoo-engine.js';
export type { ChartConfig } from './hora-taynoo-engine.js';
export type { SuccessYamMeta } from './types/horaNu.types.js';
export {
  getSuccessYamDatabase,
  findSuccessYam,
} from './charts/success-yam-database.js';
export type { SuccessYamChart } from './types/horaNu.types.js';
export type {
  HoraTaynooInput,
  HoraTaynooResult,
  PlanetEntry,
  SubTimeSlot as HoraTaynooSubSlot,
} from './hora-taynoo-engine.js';

// Phase 10-12 Exports
export {
  BHAVA_KNOWLEDGE,
  PLANET_KNOWLEDGE,
  STATUS_KNOWLEDGE,
  interpretChart,
} from './interpretation-engine.js';
export type {
  PlanetInterpretation,
  ChartInterpretation,
} from './interpretation-engine.js';

export type { HoraNuChartData, HoraNuHouseEntry, HoraNuYamPeriod } from './types/horaNu.types.js';
export {
  PlanetStatus,
  PLANET_STATUS_SYMBOL,
  PLANET_STATUS_LABEL,
  PLANET_STATUS_COLOR,
} from './types/horaNu.types.js';
// PhraKrasib Engine — 6-step clean implementation
export {
  calculatePhraKrasib,
  buildBouncePath,
  buildThreeAxisTable,
  buildFloatingStarMap,
  placeStarsInZodiac,
  assignHouses,
  assignTimes,
  getYam,
  chartToText,
  RASI_NAMES,
  RASI_CCW_FROM_TAURUS,
  HOUSE_NAMES,
  KASETCH_FIXED_BY_RASI,
  ATTHAKARN_DAY,
  ATTHAKARN_NIGHT,
  FLOATING_STARS,
} from './phrai-krasib-engine.js';
export type {
  PhraKrasibChart,
  ZodiacCell,
  ThreeAxisRow,
  YamResult as PhraiKrasibYamResult,
  FloatingStar,
  RasiIndex,
  DayOfWeek,
  YamNumber,
  DayPeriod,
} from './phrai-krasib-engine.js';

export {
  HORA_NU_SIGNS,
  HORA_NU_HOUSES,
  HORA_NU_PLANETS,
  DIGNITY_MAP,
  YAM_DIRECTIONS,
  COMPASS_8,
  PREDICTIONS,
} from './datasets/tables.js';

