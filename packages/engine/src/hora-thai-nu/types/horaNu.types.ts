/**
 * horaNu.types.ts — Hora Thai Nu Engine Types
 * ผังยามพรายกระซิบ: วงล้อทำนายยามแบบ 12 ราศี + 8 ทิศ + ดาวประจำยาม
 */

export enum PlanetStatus {
  KASET     = 'KASET',      // เกษตร △ (Domicile — most powerful)
  MAHA_UCH  = 'MAHA_UCH',  // มหาอุจจ์ ○ (Exaltation)
  RACHA_CHOK = 'RACHA_CHOK', // ราชาโชค ⬡ (Royal Fortune)
  MAHA_CHAK = 'MAHA_CHAK', // มหาจักร □ (Great Cycle)
  NEUTRAL   = 'NEUTRAL',    // กลาง · (Neutral)
  PRA       = 'PRA',        // ประ ⋮ (Detriment)
  NEECH     = 'NEECH',      // นิจ ✳ (Fall — weakest)
}

export const PLANET_STATUS_SYMBOL: Record<PlanetStatus, string> = {
  [PlanetStatus.KASET]:      '△',
  [PlanetStatus.MAHA_UCH]:   '○',
  [PlanetStatus.RACHA_CHOK]: '⬡',
  [PlanetStatus.MAHA_CHAK]:  '□',
  [PlanetStatus.NEUTRAL]:    '·',
  [PlanetStatus.PRA]:        '⋮',
  [PlanetStatus.NEECH]:      '✳',
};

export const PLANET_STATUS_LABEL: Record<PlanetStatus, string> = {
  [PlanetStatus.KASET]:      'เกษตร',
  [PlanetStatus.MAHA_UCH]:   'มหาอุจจ์',
  [PlanetStatus.RACHA_CHOK]: 'ราชาโชค',
  [PlanetStatus.MAHA_CHAK]:  'มหาจักร',
  [PlanetStatus.NEUTRAL]:    'กลาง',
  [PlanetStatus.PRA]:        'ประ',
  [PlanetStatus.NEECH]:      'นิจ',
};

export const PLANET_STATUS_COLOR: Record<PlanetStatus, string> = {
  [PlanetStatus.KASET]:      '#C6A96B',  // gold
  [PlanetStatus.MAHA_UCH]:   '#F59E0B',  // amber
  [PlanetStatus.RACHA_CHOK]: '#10B981',  // emerald
  [PlanetStatus.MAHA_CHAK]:  '#8B5CF6',  // purple
  [PlanetStatus.NEUTRAL]:    '#64748B',  // slate
  [PlanetStatus.PRA]:        '#94A3B8',  // grey-blue
  [PlanetStatus.NEECH]:      '#EF4444',  // red
};

export interface HoraNuHouseEntry {
  houseNum: number;        // 1–12
  houseName: string;       // ลัคนา, กฎุมภะ, etc.
  houseKeywords: string;
  zodiacIndex: number;     // 0–11 (Taurus=0)
  zodiacName: string;      // Thai zodiac name
  zodiacSymbol: string;    // Unicode symbol
  element: string;         // ดิน / น้ำ / ลม / ไฟ
  lordPlanet: number;      // 1–7
  lordName: string;
  lordSymbol: string;
  lordColor: string;
  lordStatus: PlanetStatus;
  lordStatusSymbol: string;
  lordStatusColor: string;
  isCurrentYam: boolean;   // current yam planet lords this house (primary kaset)
  isSecondaryKaset: boolean; // current yam planet also lords here (secondary)
}

export interface HoraNuYamPeriod {
  periodNum: number;       // 1–8
  startTime: string;       // HH:MM
  endTime: string;
  planet: number;
  planetName: string;
  planetSymbol: string;
  planetColor: string;
  direction: string;       // Thai compass direction
  directionAngleDeg: number; // 0=N, 90=E, etc. (geographic, for SVG mapping)
  isCurrent: boolean;
}

export interface HoraNuChartData {
  // ── Time ────────────────────────────────────
  queryTime: string;       // ISO
  phase: 'day' | 'night';
  dayName: string;
  dayRuler: number;
  dayRulerName: string;
  dayRulerSymbol: string;
  dayRulerColor: string;

  // ── Current main yam (90 min) ───────────────
  yamNumber: number;       // 1–8
  mainPeriodStart: string;
  mainPeriodEnd: string;
  secondsRemainingMain: number;

  // ── Current sub-yam (7.5 min) ───────────────
  subYamNumber: number;    // 1–12
  subPeriodStart: string;
  subPeriodEnd: string;
  secondsRemainingSub: number;

  // ── Current micro-yam (3 min 45 sec) ─────────
  microYamNumber: number;  // 1–24
  secondsRemainingMicro: number;

  // ── Current ruling planet ────────────────────
  currentPlanet: number;
  currentPlanetName: string;
  currentPlanetSymbol: string;
  currentPlanetColor: string;
  currentPrimaryHouse: number;   // primary เกษตร house
  currentZodiacName: string;
  currentStatus: PlanetStatus;
  currentStatusLabel: string;
  currentStatusSymbol: string;
  currentStatusColor: string;

  // ── Current direction ────────────────────────
  currentDirection: string;
  currentDirectionThai: string;
  currentDirectionAngle: number; // degrees for SVG (0=top/N, clockwise)

  // ── Prediction ──────────────────────────────
  prediction: string;

  // ── Full chart ──────────────────────────────
  houseChart: HoraNuHouseEntry[];
  yamSchedule: HoraNuYamPeriod[];
}

export interface SuccessYamChart {
  id: string;
  weekday: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  period: 'day' | 'night';
  yamNo: number;
  startTime: string;
  endTime: string;

  /** zodiac index (0-11) ที่ดาวลอยแต่ละดวงลงไป */
  planets: {
    '1': number; '2': number; '3': number; '4': number; '5': number;
    '6': number; '7': number; '8': number; '9': number; '0': number;
    'la': number;
  };

  /** zodiac index ที่ภพแต่ละภพตั้งอยู่ */
  houses: {
    tanu: number;    dhan: number;   saha: number;   bandhu: number;
    putta: number;   ari: number;    patni: number;  marana: number;
    subha: number;   karma: number;  labha: number;  vinasa: number;
  };

  /** เวลาเริ่มต้นของยามย่อย 12 ช่อง (7.5 นาที × 12) */
  timeSlots: string[];
}

export interface SuccessYamMeta {
  id: string;
  weekday: number;          // 0=อาทิตย์ ... 6=เสาร์
  weekdayName: string;
  period: 'day' | 'night';
  yamNo: number;            // 1-8
  start: string;            // "HH:MM"
  end: string;
}
