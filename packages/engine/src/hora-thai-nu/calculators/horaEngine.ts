/**
 * horaEngine.ts — Hora Thai Nu Engine Calculator
 * คำนวณ HoraNuChartData จาก Date object
 */

import type { HoraNuChartData, HoraNuHouseEntry, HoraNuYamPeriod, PlanetStatus } from '../types/horaNu.types.js';
import {
  PLANET_STATUS_SYMBOL,
  PLANET_STATUS_LABEL,
  PLANET_STATUS_COLOR,
} from '../types/horaNu.types.js';
import {
  HORA_NU_SIGNS,
  HORA_NU_HOUSES,
  HORA_NU_PLANETS,
  DIGNITY_MAP,
  YAM_DIRECTIONS,
  THAI_DAY_NAMES,
  PREDICTIONS,
} from '../datasets/tables.js';

// ── helpers ────────────────────────────────────────────────────────────────

function minutesToHHMM(totalMinFloat: number): string {
  const clamped = ((totalMinFloat % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = Math.floor(clamped % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function minutesToHHMMSS(totalMinFloat: number): string {
  const clamped = ((totalMinFloat % 1440) + 1440) % 1440;
  const totalSec = Math.round(clamped * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const base = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  return s > 0 ? `${base}:${s.toString().padStart(2, '0')}` : base;
}

// day ruler: JS getDay() 0=Sun → planet 1–7
const DAY_RULERS: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };

// yam planet stepping: day +5, night +4 (mod 7)
function getPlanetForPeriod(dayRuler: number, periodIdx: number, phase: 'day' | 'night'): number {
  const step = phase === 'day' ? 5 : 4;
  return ((dayRuler - 1 + periodIdx * step) % 7) + 1;
}

// get dignity status of planet p in zodiac index z
function getDignity(planet: number, zodiacIdx: number): PlanetStatus {
  const d = DIGNITY_MAP[planet];
  if (!d) return 'NEUTRAL' as PlanetStatus;
  if (d.kaset.includes(zodiacIdx))    return 'KASET'    as PlanetStatus;
  if (d.maha_uch.includes(zodiacIdx)) return 'MAHA_UCH' as PlanetStatus;
  if (d.neech.includes(zodiacIdx))    return 'NEECH'    as PlanetStatus;
  if (d.pra.includes(zodiacIdx))      return 'PRA'      as PlanetStatus;
  return 'NEUTRAL' as PlanetStatus;
}

// ── Main calculator ────────────────────────────────────────────────────────

export function calculateHoraNu(now: Date): HoraNuChartData {
  const hour   = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const totalMinOfDay = hour * 60 + minute + second / 60;

  // Astrological day starts at 06:00
  let astroDay = now;
  if (hour < 6) { astroDay = new Date(now); astroDay.setDate(astroDay.getDate() - 1); }
  const dow = astroDay.getDay();
  const dayRuler = DAY_RULERS[dow] ?? 1;
  const dayPlanet = HORA_NU_PLANETS[dayRuler]!;
  const dayName = `วัน${THAI_DAY_NAMES[dow] ?? ''}`;

  // Phase
  const DAY_START   = 6  * 60;
  const NIGHT_START = 18 * 60;

  let phase: 'day' | 'night';
  let minutesPassed: number;
  let phaseStartMin: number;

  if (hour >= 6 && hour < 18) {
    phase = 'day';
    minutesPassed = totalMinOfDay - DAY_START;
    phaseStartMin = DAY_START;
  } else {
    phase = 'night';
    if (hour >= 18) {
      minutesPassed = totalMinOfDay - NIGHT_START;
    } else {
      minutesPassed = totalMinOfDay + 1440 - NIGHT_START;
    }
    phaseStartMin = NIGHT_START;
  }
  minutesPassed = Math.max(0, Math.min(minutesPassed, 720 - 0.0001));

  // Main period (90 min)
  const mainIdx = Math.min(Math.floor(minutesPassed / 90), 7);
  const yamNumber = mainIdx + 1;
  const minsIntoMain = minutesPassed - mainIdx * 90;
  const secsRemainingMain = Math.round((90 - minsIntoMain) * 60);
  const mainAbsStart = phaseStartMin + mainIdx * 90;

  // Sub-period (7.5 min — 12 per main)
  const subIdx = Math.min(Math.floor(minsIntoMain / 7.5), 11);
  const subYamNumber = subIdx + 1;
  const minsIntoSub = minsIntoMain - subIdx * 7.5;
  const secsRemainingSub = Math.round((7.5 - minsIntoSub) * 60);
  const subAbsStart = mainAbsStart + subIdx * 7.5;

  // Micro-period (3.75 min — 24 per main)
  const microIdx = Math.min(Math.floor(minsIntoMain / 3.75), 23);
  const microYamNumber = microIdx + 1;
  const minsIntoMicro = minsIntoMain - microIdx * 3.75;
  const secsRemainingMicro = Math.round((3.75 - minsIntoMicro) * 60);

  // Current planet
  const currentPlanet = getPlanetForPeriod(dayRuler, mainIdx, phase);
  const pInfo = HORA_NU_PLANETS[currentPlanet]!;
  const primaryZodiacIdx = pInfo.primary;
  const primarySign = HORA_NU_SIGNS[primaryZodiacIdx]!;
  const currentStatus = getDignity(currentPlanet, primaryZodiacIdx);
  const currentStatusLabel  = PLANET_STATUS_LABEL[currentStatus];
  const currentStatusSymbol = PLANET_STATUS_SYMBOL[currentStatus];
  const currentStatusColor  = PLANET_STATUS_COLOR[currentStatus];

  // Direction
  const dirInfo = YAM_DIRECTIONS[yamNumber]!;
  // svgAngle: geoAngle maps directly (N=0=top, E=90=right, S=180=bottom, W=270=left)
  const directionAngle = dirInfo.geoAngle;

  // Prediction
  const predMap = PREDICTIONS[currentPlanet] ?? {};
  const prediction = predMap[currentStatus] ?? predMap['NEUTRAL'] ?? 'กำลังคำนวณ...';

  // ── All 8 yam periods ────────────────────────────────────────────────────
  const yamSchedule: HoraNuYamPeriod[] = [];
  for (let i = 0; i < 8; i++) {
    const absStart = phaseStartMin + i * 90;
    const planet = getPlanetForPeriod(dayRuler, i, phase);
    const pi = HORA_NU_PLANETS[planet]!;
    const dir = YAM_DIRECTIONS[i + 1]!;
    yamSchedule.push({
      periodNum:         i + 1,
      startTime:         minutesToHHMM(absStart),
      endTime:           minutesToHHMM(absStart + 90),
      planet,
      planetName:        pi.name,
      planetSymbol:      pi.symbol,
      planetColor:       pi.color,
      direction:         dir.thai,
      directionAngleDeg: dir.geoAngle,
      isCurrent:         i === mainIdx,
    });
  }

  // ── House chart (12 fixed houses) ────────────────────────────────────────
  const houseChart: HoraNuHouseEntry[] = [];
  for (let h = 0; h < 12; h++) {
    const sign     = HORA_NU_SIGNS[h]!;
    const houseNum = sign.house;
    const houseInfo = HORA_NU_HOUSES[houseNum]!;
    const lordPlanet = sign.lord;
    const lordPlanetInfo = HORA_NU_PLANETS[lordPlanet]!;
    const lordStatus = getDignity(lordPlanet, h);

    houseChart.push({
      houseNum,
      houseName:        houseInfo.name,
      houseKeywords:    houseInfo.keywords,
      zodiacIndex:      h,
      zodiacName:       sign.nameThai,
      zodiacSymbol:     sign.symbol,
      element:          sign.element,
      lordPlanet,
      lordName:         lordPlanetInfo.name,
      lordSymbol:       lordPlanetInfo.symbol,
      lordColor:        lordPlanetInfo.color,
      lordStatus,
      lordStatusSymbol: PLANET_STATUS_SYMBOL[lordStatus],
      lordStatusColor:  PLANET_STATUS_COLOR[lordStatus],
      isCurrentYam:     lordPlanet === currentPlanet && h === primaryZodiacIdx,
      isSecondaryKaset: lordPlanet === currentPlanet && h === pInfo.secondary,
    });
  }

  return {
    queryTime:            now.toISOString(),
    phase,
    dayName,
    dayRuler,
    dayRulerName:         dayPlanet.name,
    dayRulerSymbol:       dayPlanet.symbol,
    dayRulerColor:        dayPlanet.color,

    yamNumber,
    mainPeriodStart:      minutesToHHMM(mainAbsStart),
    mainPeriodEnd:        minutesToHHMM(mainAbsStart + 90),
    secondsRemainingMain: secsRemainingMain,

    subYamNumber,
    subPeriodStart:       minutesToHHMMSS(subAbsStart),
    subPeriodEnd:         minutesToHHMMSS(subAbsStart + 7.5),
    secondsRemainingSub:  secsRemainingSub,

    microYamNumber,
    secondsRemainingMicro: secsRemainingMicro,

    currentPlanet,
    currentPlanetName:    pInfo.name,
    currentPlanetSymbol:  pInfo.symbol,
    currentPlanetColor:   pInfo.color,
    currentPrimaryHouse:  primarySign.house,
    currentZodiacName:    primarySign.nameThai,
    currentStatus,
    currentStatusLabel,
    currentStatusSymbol,
    currentStatusColor,

    currentDirection:     dirInfo.thai,
    currentDirectionThai: dirInfo.thai,
    currentDirectionAngle: directionAngle,

    prediction,

    houseChart,
    yamSchedule,
  };
}
