import type { HoroscopeInput, HoroscopeResult } from "@phopephum/types";
import { getThaiBaseNumbers, r7 } from "../core/lunarCalendar.js";
import { calculateAgeCycle } from "../calculators/ageCycle.js";

export async function horoscopeEngine(
  input: HoroscopeInput
): Promise<HoroscopeResult> {
  // ── Thai Base Numbers (dayNum/monthNum/yearNum + lunar date info) ──────────
  // getThaiBaseNumbers handles 06:00 cutoff internally
  const thai = getThaiBaseNumbers(input.birthDate, input.birthTime);

  const dayNum   = thai.dayNum;
  const monthNum = thai.monthNum;
  const yearNum  = thai.yearNum;

  // ── Master Base & Named Numbers ───────────────────────────────────────────
  const masterBase = r7(dayNum + monthNum + yearNum);
  const karmic     = r7(dayNum + yearNum);
  const crown      = r7(monthNum + masterBase);
  const soulX      = r7(dayNum + monthNum);

  // ── ทักษา 8 ตำแหน่ง ──────────────────────────────────────────────────────
  const PLANET_NAMES = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];
  const TAKSA_MAP    = ['บริวาร','อายุ','เดช','ศรี','มูละ','อุตสาหะ','มนตรี','กาลกิณี'] as const;
  // dayNum is 1-7 (1=อาทิตย์...7=เสาร์), planet index = dayNum-1
  const taksaPositions = TAKSA_MAP.map((name, i) => ({
    name,
    planet: PLANET_NAMES[r7(dayNum + i) - 1] ?? '',
    number: r7(dayNum + i),
  }));

  // ── วัยจร (Transit Phase) ─────────────────────────────────────────────────
  const birthYear = new Date(input.birthDate).getFullYear();
  const ageCycle  = calculateAgeCycle(birthYear);
  const rangeParts = ageCycle.ageRange.replace(' ปี', '').split('–');
  const phaseStart = parseInt(rangeParts[0] ?? '0') || 0;
  const phaseEnd   = parseInt(rangeParts[1] ?? '0') || 0;

  return {
    sevenNumbers: {
      base:    [dayNum, monthNum, yearNum, masterBase, karmic, crown, soulX],
      soul:    dayNum,
      destiny: masterBase,
      power:   monthNum,
      karmic,
      mission: yearNum,
      crown,
    },
    lunarDateInfo: {
      dayName:        thai.dayName,
      dayPlanet:      thai.dayPlanet,
      lunarMonth:     thai.lunarMonth,
      lunarMonthName: thai.lunarMonthName,
      lunarDay:       thai.lunarDay,
      moonPhase:      thai.moonPhase,
      zodiacName:     thai.zodiacName,
      thaiDateText:   thai.thaiDateText,
      isApproximate:  thai.isApproximate,
    },
    taksa: taksaPositions,
    atthakarn: { hora: '', element: '', ruling: '', quality: '', prediction: '' },
    lagna:     { sign: '', degree: 0, house: 0, strength: 0 },
    transitPhase: {
      currentAge: ageCycle.age,
      phase:      `${ageCycle.planet} — ${ageCycle.theme}`,
      phaseStart,
      phaseEnd,
      keywords:   ageCycle.lifePhase.split(/[·,\s]+/).filter(Boolean),
    },
  };
}
