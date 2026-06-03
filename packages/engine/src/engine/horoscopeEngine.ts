import { getThaiBaseNumbers } from "../core/lunarCalendar.js";
import { getProvinceCoords } from "../core/geoLocation.js";
import { calculateSevenBase } from "../calculators/sevenBase.js";
import { calculateNineBase } from "../calculators/nineBase.js";
import { calculateTaksa } from "../calculators/taksa.js";
import { calculateAgeCycle } from "../calculators/ageCycle.js";
import { buildEmperorChart } from "../calculators/emperorChart.js";
import { BirthInput, HoroscopeResult } from "../types/horoscope.js";

/**
 * Integrated Horoscope Engine (v3.1 - Perfect Master Edition)
 * strictly follows 100-year calendar and 06:00 AM cutoff.
 */
export async function horoscopeEngine(
  input: BirthInput,
  checkDate: Date = new Date()
): Promise<HoroscopeResult> {
  // 1. Core Thai Lunar state (with 06:00 cutoff)
  const lunar = getThaiBaseNumbers(input.birthDate, input.birthTime);
  
  // 2. Location
  const coordinates = getProvinceCoords(input.province);
  
  // 3. 7 Numbers Matrix
  const [b1, b2, b3] = calculateSevenBase(
    lunar.dayNum,
    lunar.monthNum,
    lunar.yearNum
  );
  
  const nineBase = calculateNineBase(b1!, b2!, b3!);
  
  // 4. Taksa
  const taksaData = calculateTaksa(
    lunar.dayNum as any,
    new Date(input.birthDate + 'T12:00:00'),
    checkDate
  );
  
  // 5. Age Cycle
  const ageCycle = calculateAgeCycle(
    lunar.thaiYear,
    checkDate.getFullYear() + 543
  );
  
  // 6. Emperor Chart
  const emperorChart = buildEmperorChart(nineBase, taksaData);
  
  return {
    lunar: {
      lunarDay:   lunar.lunarDay,
      lunarMonth: lunar.lunarMonth,
      lunarYear:  lunar.thaiYear,
      moonPhase:  lunar.moonPhase,
      thaiDateText: lunar.thaiDateText,
      isWanPhra:  lunar.isWanPhra
    },
    sevenBase: nineBase,
    taksa: taksaData.transit as any,
    ageCycle,
    emperorChart,
    coordinates
  };
}
