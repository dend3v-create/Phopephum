/**
 * calculateHoraThaiNu.ts
 * โหรทายหนู — ศาสตร์ยามพยากรณ์แม่นยำยิ่งกว่าตาเห็น
 *
 * หลักการ:
 * - ราศีพฤษภเป็นราศีที่ 1 เสมอ (Fixed Taurus = House 1)
 * - 1 วัน แบ่งเป็น 16 ยามใหญ่ (กลางวัน 8 + กลางคืน 8)
 * - แต่ละยามใหญ่ = 90 นาที (06:00–18:00 / 18:00–06:00)
 * - แต่ละยามใหญ่แบ่งย่อยเป็น 12 ยามย่อย × 7.5 นาที
 * - กลางวัน: เดินยาม step +5 mod 7 | กลางคืน: step +4 mod 7
 * - วันโหราศาสตร์เริ่มที่ 06:00 น. (ก่อน 06:00 นับเป็นคืนของวันก่อน)
 *
 * อ้างอิง: ตำราโหรทายหนู อ.ประทีป อัครา (พ.ศ. 2528)
 */

// ─── Zodiac (Fixed: Taurus = 1) ──────────────────────────────────────────────

export const HORA_THAI_NU_ZODIAC = [
  { index: 0, nameThai: 'พฤษภ',  nameEn: 'Taurus',      lord: 6, lordName: 'ศุกร์',   lordSymbol: '♀' },
  { index: 1, nameThai: 'เมถุน',  nameEn: 'Gemini',      lord: 4, lordName: 'พุธ',     lordSymbol: '☿' },
  { index: 2, nameThai: 'กรกฎ',   nameEn: 'Cancer',      lord: 2, lordName: 'จันทร์',  lordSymbol: '☽' },
  { index: 3, nameThai: 'สิงห์',   nameEn: 'Leo',         lord: 1, lordName: 'อาทิตย์', lordSymbol: '☉' },
  { index: 4, nameThai: 'กันย์',   nameEn: 'Virgo',       lord: 4, lordName: 'พุธ',     lordSymbol: '☿' },
  { index: 5, nameThai: 'ตุลย์',   nameEn: 'Libra',       lord: 6, lordName: 'ศุกร์',   lordSymbol: '♀' },
  { index: 6, nameThai: 'พิจิก',   nameEn: 'Scorpio',     lord: 3, lordName: 'อังคาร',  lordSymbol: '♂' },
  { index: 7, nameThai: 'ธนู',    nameEn: 'Sagittarius', lord: 5, lordName: 'พฤหัส',  lordSymbol: '♃' },
  { index: 8, nameThai: 'มังกร',  nameEn: 'Capricorn',   lord: 7, lordName: 'เสาร์',   lordSymbol: '♄' },
  { index: 9, nameThai: 'กุมภ์',   nameEn: 'Aquarius',    lord: 7, lordName: 'เสาร์',   lordSymbol: '♄' },
  { index: 10, nameThai: 'มีน',   nameEn: 'Pisces',      lord: 5, lordName: 'พฤหัส',  lordSymbol: '♃' },
  { index: 11, nameThai: 'เมษ',   nameEn: 'Aries',       lord: 3, lordName: 'อังคาร',  lordSymbol: '♂' },
] as const;

// ─── Planets ─────────────────────────────────────────────────────────────────

export const HORA_THAI_NU_PLANETS: Record<number, { name: string; symbol: string; color: string; dayName: string }> = {
  1: { name: 'อาทิตย์', symbol: '☉', color: '#EF4444', dayName: 'วันอาทิตย์' },
  2: { name: 'จันทร์',  symbol: '☽', color: '#FBBF24', dayName: 'วันจันทร์'  },
  3: { name: 'อังคาร',  symbol: '♂',  color: '#F97316', dayName: 'วันอังคาร'  },
  4: { name: 'พุธ',     symbol: '☿',  color: '#10B981', dayName: 'วันพุธ'     },
  5: { name: 'พฤหัส',  symbol: '♃',  color: '#F59E0B', dayName: 'วันพฤหัสบดี' },
  6: { name: 'ศุกร์',   symbol: '♀',  color: '#EC4899', dayName: 'วันศุกร์'   },
  7: { name: 'เสาร์',   symbol: '♄',  color: '#8B5CF6', dayName: 'วันเสาร์'   },
};

// ─── Houses ──────────────────────────────────────────────────────────────────

export const HORA_THAI_NU_HOUSES: Record<number, { nameThai: string; keywords: string; questionType: string }> = {
  1:  { nameThai: 'ลัคนา',   keywords: 'ตัวเอง, ร่างกาย, บุคลิกภาพ',           questionType: 'ตัวผู้ถาม' },
  2:  { nameThai: 'กฎุมภะ',  keywords: 'ทรัพย์สิน, เงินทอง, ของมีค่า',          questionType: 'ของหาย / ทรัพย์สิน' },
  3:  { nameThai: 'ภาตุ',    keywords: 'พี่น้อง, การเดินทางใกล้, ข้อความ',       questionType: 'พี่น้อง / ข่าวสาร' },
  4:  { nameThai: 'พันธุ',   keywords: 'บ้าน, ครอบครัว, สายโลหิต',             questionType: 'บ้าน / เครือญาติ' },
  5:  { nameThai: 'ปุตตะ',   keywords: 'ลูกหลาน, บริวาร, ความรัก',             questionType: 'ลูกหลาน / บริวาร' },
  6:  { nameThai: 'อริ',     keywords: 'ศัตรู, โรคภัยไข้เจ็บ, อุปสรรค',         questionType: 'โรค / ศัตรู' },
  7:  { nameThai: 'ปัตนิ',   keywords: 'คู่ครอง, หุ้นส่วน, สัญญา',             questionType: 'คู่ครอง / หุ้นส่วน' },
  8:  { nameThai: 'มรณะ',   keywords: 'การสูญเสีย, วิกฤต, มรดก',              questionType: 'วิกฤต / อันตราย' },
  9:  { nameThai: 'ธรรม',   keywords: 'โชคลาภ, ศาสนา, การเดินทางไกล',         questionType: 'โชคลาภ / บุญ' },
  10: { nameThai: 'กรรม',   keywords: 'การงาน, อาชีพ, ชื่อเสียง',             questionType: 'การงาน / อาชีพ' },
  11: { nameThai: 'ลาภ',    keywords: 'ผลกำไร, รายได้, มิตรสหาย',             questionType: 'กำไร / รายได้' },
  12: { nameThai: 'ศุภะ',   keywords: 'จิตวิญญาณ, ที่ลับ, วาระซ่อนเร้น',      questionType: 'สิ่งซ่อนเร้น' },
};

// ─── Day Rulers ──────────────────────────────────────────────────────────────
// JS getDay(): 0=Sunday, 1=Monday ... 6=Saturday
// Astro planet: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
const DAY_RULERS: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function minutesToHHMM(totalMinutesFloat: number): string {
  const clamped = ((totalMinutesFloat % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = Math.floor(clamped % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function minutesToHHMMSS(totalMinutesFloat: number): string {
  const clamped = ((totalMinutesFloat % 1440) + 1440) % 1440;
  const totalSeconds = Math.round(clamped * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const base = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  return s > 0 ? `${base}:${s.toString().padStart(2, '0')}` : base;
}

function getPlanetForPeriod(dayRuler: number, periodIndex: number, phase: 'day' | 'night'): number {
  const step = phase === 'day' ? 5 : 4;
  return ((dayRuler - 1 + periodIndex * step) % 7) + 1;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HoraThaiNuPeriod {
  periodNum: number;       // 1-8
  startTime: string;       // HH:MM
  endTime: string;
  planet: number;          // 1-7
  planetName: string;
  planetSymbol: string;
  planetColor: string;
  isCurrent: boolean;
}

export interface HoraThaiNuSubPeriod {
  subNum: number;          // 1-12
  startTime: string;       // HH:MM or HH:MM:SS
  endTime: string;
  isCurrent: boolean;
}

export interface HoraThaiNuHouse {
  houseNum: number;        // 1-12
  houseName: string;
  houseKeywords: string;
  houseQuestion: string;
  zodiacIndex: number;     // 0-11
  zodiacName: string;
  lordPlanet: number;
  lordPlanetName: string;
  lordPlanetSymbol: string;
  lordPlanetColor: string;
}

export interface HoraThaiNuResult {
  queryTime: string;       // ISO
  phase: 'day' | 'night';

  // Current main period
  currentMainPeriod: number;    // 1-8
  currentMainPlanet: number;
  currentMainPlanetName: string;
  currentMainPlanetSymbol: string;
  currentMainPlanetColor: string;
  mainPeriodStartTime: string;
  mainPeriodEndTime: string;
  minutesIntoMainPeriod: number;
  minutesRemainingInMainPeriod: number;

  // Current sub period (7.5 min)
  currentSubPeriod: number;     // 1-12
  subPeriodStartTime: string;
  subPeriodEndTime: string;
  minutesRemainingInSubPeriod: number;

  // Day info
  dayOfWeek: number;            // 0=Sun
  dayRuler: number;
  dayRulerName: string;
  dayName: string;

  // Full schedule for current phase
  allMainPeriods: HoraThaiNuPeriod[];

  // Sub-periods for current main period
  subPeriods: HoraThaiNuSubPeriod[];

  // 12 houses (fixed Taurus = house 1)
  houses: HoraThaiNuHouse[];
}

// ─── Main Calculator ─────────────────────────────────────────────────────────

export function calculateHoraThaiNu(now: Date): HoraThaiNuResult {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const totalMinutesOfDay = hour * 60 + minute + second / 60;

  // วันโหราศาสตร์เริ่ม 06:00 น. — ก่อน 06:00 นับเป็นคืนของวันก่อน
  let astroDay: Date;
  if (hour < 6) {
    astroDay = new Date(now);
    astroDay.setDate(astroDay.getDate() - 1);
  } else {
    astroDay = now;
  }
  const dayOfWeek = astroDay.getDay();
  const dayRuler = DAY_RULERS[dayOfWeek] ?? 1;
  const dayPlanetInfo = HORA_THAI_NU_PLANETS[dayRuler]!;

  // Phase and elapsed minutes from phase start
  const DAY_START  = 6  * 60; // 360 min
  const NIGHT_START = 18 * 60; // 1080 min

  let phase: 'day' | 'night';
  let minutesPassed: number;
  let phaseStartMin: number; // absolute minutes from midnight for phase start

  if (hour >= 6 && hour < 18) {
    phase = 'day';
    minutesPassed = totalMinutesOfDay - DAY_START;
    phaseStartMin = DAY_START;
  } else {
    phase = 'night';
    if (hour >= 18) {
      minutesPassed = totalMinutesOfDay - NIGHT_START;
      phaseStartMin = NIGHT_START;
    } else {
      // 00:00–05:59 → night continues from previous 18:00
      minutesPassed = totalMinutesOfDay + (24 * 60) - NIGHT_START;
      phaseStartMin = NIGHT_START; // night started 18:00 yesterday
    }
  }

  // Guard bounds
  minutesPassed = Math.max(0, Math.min(minutesPassed, 12 * 60 - 0.0001));

  // ── Main period (90 min) ──
  const mainIdx = Math.min(Math.floor(minutesPassed / 90), 7); // 0-7
  const currentMainPeriod = mainIdx + 1;
  const minutesIntoMainPeriod = minutesPassed - mainIdx * 90;
  const minutesRemainingInMainPeriod = 90 - minutesIntoMainPeriod;

  const currentMainPlanet = getPlanetForPeriod(dayRuler, mainIdx, phase);
  const currentPlanetInfo = HORA_THAI_NU_PLANETS[currentMainPlanet]!;

  // Absolute start minute of current main period
  const mainPeriodAbsStart = phaseStartMin + mainIdx * 90;

  // ── Sub period (7.5 min) ──
  const subIdx = Math.min(Math.floor(minutesIntoMainPeriod / 7.5), 11); // 0-11
  const currentSubPeriod = subIdx + 1;
  const minutesIntoSubPeriod = minutesIntoMainPeriod - subIdx * 7.5;
  const minutesRemainingInSubPeriod = 7.5 - minutesIntoSubPeriod;
  const subAbsStart = mainPeriodAbsStart + subIdx * 7.5;

  // ── All 8 main periods ──
  const allMainPeriods: HoraThaiNuPeriod[] = [];
  for (let i = 0; i < 8; i++) {
    const absStart = phaseStartMin + i * 90;
    const planet = getPlanetForPeriod(dayRuler, i, phase);
    const pInfo = HORA_THAI_NU_PLANETS[planet]!;
    allMainPeriods.push({
      periodNum: i + 1,
      startTime: minutesToHHMM(absStart),
      endTime: minutesToHHMM(absStart + 90),
      planet,
      planetName: pInfo.name,
      planetSymbol: pInfo.symbol,
      planetColor: pInfo.color,
      isCurrent: i === mainIdx,
    });
  }

  // ── Sub-periods for current main period ──
  const subPeriods: HoraThaiNuSubPeriod[] = [];
  for (let i = 0; i < 12; i++) {
    const absStart = mainPeriodAbsStart + i * 7.5;
    subPeriods.push({
      subNum: i + 1,
      startTime: minutesToHHMMSS(absStart),
      endTime: minutesToHHMMSS(absStart + 7.5),
      isCurrent: i === subIdx,
    });
  }

  // ── 12 Houses (fixed Taurus = house 1) ──
  const houses: HoraThaiNuHouse[] = [];
  for (let houseNum = 1; houseNum <= 12; houseNum++) {
    const zodiacIndex = (houseNum - 1) % 12;
    const zodiac = HORA_THAI_NU_ZODIAC[zodiacIndex]!;
    const houseInfo = HORA_THAI_NU_HOUSES[houseNum]!;
    const lordInfo = HORA_THAI_NU_PLANETS[zodiac.lord]!;
    houses.push({
      houseNum,
      houseName: houseInfo.nameThai,
      houseKeywords: houseInfo.keywords,
      houseQuestion: houseInfo.questionType,
      zodiacIndex,
      zodiacName: zodiac.nameThai,
      lordPlanet: zodiac.lord,
      lordPlanetName: zodiac.lordName,
      lordPlanetSymbol: zodiac.lordSymbol,
      lordPlanetColor: lordInfo.color,
    });
  }

  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  return {
    queryTime: now.toISOString(),
    phase,
    currentMainPeriod,
    currentMainPlanet,
    currentMainPlanetName: currentPlanetInfo.name,
    currentMainPlanetSymbol: currentPlanetInfo.symbol,
    currentMainPlanetColor: currentPlanetInfo.color,
    mainPeriodStartTime: minutesToHHMM(mainPeriodAbsStart),
    mainPeriodEndTime: minutesToHHMM(mainPeriodAbsStart + 90),
    minutesIntoMainPeriod,
    minutesRemainingInMainPeriod,
    currentSubPeriod,
    subPeriodStartTime: minutesToHHMMSS(subAbsStart),
    subPeriodEndTime: minutesToHHMMSS(subAbsStart + 7.5),
    minutesRemainingInSubPeriod,
    dayOfWeek,
    dayRuler,
    dayRulerName: dayPlanetInfo.name,
    dayName: `วัน${dayNames[dayOfWeek] ?? ''}`,
    allMainPeriods,
    subPeriods,
    houses,
  };
}
