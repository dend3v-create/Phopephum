/**
 * hora-taynoo-engine.ts
 * ยามพรายกระซิบ — Engine หลัก (Final Production Grade)
 * อ้างอิง: อ.กานดา + ชุดผังดวงสำเร็จ 112 ผัง
 */

import { SUCCESS_YAM_DATA } from './datasets/success-yam-data.js'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** 12 ราศีเรียง CCW จาก index 0 = พฤษภ (330°) ตาม อ.กานดา */
export const ZODIAC_ORDER = [
  { index: 0,  name: 'พฤษภ',  nameEn: 'Taurus',      sectorAngle: 240 },
  { index: 1,  name: 'เมถุน',  nameEn: 'Gemini',      sectorAngle: 210 },
  { index: 2,  name: 'กรกฎ',  nameEn: 'Cancer',      sectorAngle: 180 },
  { index: 3,  name: 'สิงห์',  nameEn: 'Leo',         sectorAngle: 150 },
  { index: 4,  name: 'กันย์',  nameEn: 'Virgo',       sectorAngle: 120 },
  { index: 5,  name: 'ตุลย์',  nameEn: 'Libra',       sectorAngle: 90  },
  { index: 6,  name: 'พิจิก',  nameEn: 'Scorpio',     sectorAngle: 60  },
  { index: 7,  name: 'ธนู',   nameEn: 'Sagittarius', sectorAngle: 30  },
  { index: 8,  name: 'มังกร',  nameEn: 'Capricorn',   sectorAngle: 0   },
  { index: 9,  name: 'กุมภ์',  nameEn: 'Aquarius',    sectorAngle: 330 },
  { index: 10, name: 'มีน',   nameEn: 'Pisces',       sectorAngle: 300 },
  { index: 11, name: 'เมษ',   nameEn: 'Aries',        sectorAngle: 270 },
]

export const PLANET_KASTERN: Record<number, number[]> = {
  1: [3], 2: [2], 3: [11, 6], 4: [1, 4], 5: [7, 10], 6: [0, 5], 7: [8], 8: [9]
}

export const KASTERN_FIXED: Record<number, number> = {
  0: 6, 1: 4, 2: 2, 3: 1, 4: 4, 5: 6, 6: 3, 7: 5, 8: 7, 9: 8, 10: 5, 11: 3
}

export type PlanetStatus = 'kaset' | 'pra' | 'maha-uccj' | 'nij' | 'racha-chok' | 'maha-chakr' | null

export function getPlanetStatus(planetNum: number, zodiacIndex: number): PlanetStatus {
  const MAHA_UCH: Record<number, number> = { 1: 11, 2: 0, 3: 8, 4: 4, 5: 2, 6: 10, 7: 5, 8: 6 };
  if (MAHA_UCH[planetNum] === zodiacIndex) return 'maha-uccj';
  if (KASTERN_FIXED[zodiacIndex] === planetNum) return 'kaset';
  const RAJA_CHOK: Record<number, number> = { 1: 1, 2: 4, 3: 0, 4: 3, 5: 11, 6: 8, 7: 6, 8: 5 };
  if (RAJA_CHOK[planetNum] === zodiacIndex) return 'racha-chok';
  const MAHA_CHAK: Record<number, number> = { 1: 6, 2: 11, 3: 4, 4: 3, 5: 6, 6: 7, 7: 0, 8: 8 };
  if (MAHA_CHAK[planetNum] === zodiacIndex) return 'maha-chakr';
  const oppositeZodiac = (zodiacIndex + 6) % 12;
  if (KASTERN_FIXED[oppositeZodiac] === planetNum) return 'pra';
  const NID: Record<number, number> = { 1: 5, 2: 6, 3: 2, 4: 10, 5: 8, 6: 4, 7: 11, 8: 0 };
  if (NID[planetNum] === zodiacIndex) return 'nij';
  return null;
}

export const THAI_LABELS: string[] = ['๑','๒','๓','๔','๕','๖','๗','๘','ลั','๙','๐']
export const DAY_PLANET: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 }

export const DAY_YAM: number[][] = [
  [1,6,4,2,7,5,3,1], [2,7,5,3,1,6,4,2], [3,1,6,4,2,7,5,3], [4,2,7,5,3,1,6,4],
  [5,3,1,6,4,2,7,5], [6,4,2,7,5,3,1,6], [7,5,3,1,6,4,2,7]
]
export const NIGHT_YAM: number[][] = [
  [1,5,2,6,3,7,4,1], [2,6,3,7,4,1,5,2], [3,7,4,1,5,2,6,3], [4,1,5,2,6,3,7,4],
  [5,2,6,3,7,4,1,5], [6,3,7,4,1,5,2,6], [7,4,1,5,2,6,3,7]
]

export const YAM_START: Record<'day'|'night', number[]> = {
  day:   [360,450,540,630,720,810,900,990],
  night: [1080,1170,1260,1350,0,90,180,270]
}

export const BHAVA_NAMES = ['ตนุ','กฎุมภะ','สหัชชะ','พันธุ','ปุตตะ','อริ','ปัตนิ','มรณะ','ศุภะ','กัมมะ','ลาภะ','วินาศ']

export const PLANET_INFO: Record<number, {
  day: string; night: string; thai: string; color: string; isMalefic: boolean
}> = {
  1: { day:'สุริชะ',  night:'ระวิ',   thai:'พระอาทิตย์', color:'#F59E0B', isMalefic:false },
  2: { day:'จันเทา',  night:'ศะศิ',   thai:'พระจันทร์',  color:'#CBD5E1', isMalefic:false },
  3: { day:'ภุมมะ',   night:'ภุมโม',  thai:'พระอังคาร',  color:'#EF4444', isMalefic:true  },
  4: { day:'พุธะ',    night:'พุโธ',   thai:'พระพุธ',     color:'#10B981', isMalefic:false },
  5: { day:'ครู',     night:'ชีโว',   thai:'พระพฤหัส',   color:'#EAB308', isMalefic:false },
  6: { day:'ศุกระ',   night:'ศุโกร',  thai:'พระศุกร์',   color:'#A855F7', isMalefic:false },
  7: { day:'เสารี',   night:'โสโร',   thai:'พระเสาร์',   color:'#94A3B8', isMalefic:true  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface HoraTaynooInput {
  dateAsked?: Date
  hour?: number
  minute?: number
  dayOverride?: number
  overridePlanets?: Record<string, number>
  overrideLagnaIdx?: number
}

export interface SubTimeSlot {
  slotIndex: number; zodiacIndex: number; zodiacName: string; bhavaName: string;
  startMin: number; endMin: number; startStr: string; endStr: string; bhavaTimeLabel: string;
}

export interface PlanetEntry {
  label: string; labelThai: string; planetNum: number | null;
  zodiacIndex: number; zodiacName: string; steps: number | null;
  isLagna: boolean; status: PlanetStatus;
}

export interface HoraTaynooResult {
  dayOfWeek: number; dayName: string; period: 'day' | 'night'; yamAsked: number;
  yamStartMin: number; yamEndMin: number; yamStartStr: string; yamEndStr: string;
  dayPlanet: number; yamPlanet: number; kasternZodiacIndex: number; kasternZodiacName: string;
  planetSteps: number[]; planetEntries: PlanetEntry[];
  lagnaZodiacIndex: number; lagnaZodiacName: string;
  bhavaMap: Record<number, string>; lagnaRulerPlanet: number;
  timeStartZodiacIndex: number; subTimeSlots: SubTimeSlot[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getThaiLocalTime — แปลงเวลาใดๆ ให้เป็น Thailand Local Time (UTC+7)
 */
function getThaiLocalTime(date: Date): { hour: number, minute: number, day: number, raw: Date } {
  // สร้าง Date object ใหม่ที่มี offset +7 เสมอ
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const thai = new Date(utc + (3600000 * 7));
  return {
    hour: thai.getHours(),
    minute: thai.getMinutes(),
    day: thai.getDay(),
    raw: thai
  };
}

function getAstroDay(thaiTime: { hour: number, minute: number, day: number }): number {
  const mins = thaiTime.hour * 60 + thaiTime.minute;
  if (mins < 360) {
    return (thaiTime.day + 6) % 7; // ย้อนกลับไปวันก่อนหน้า
  }
  return thaiTime.day;
}

function getPeriod(h: number): 'day' | 'night' {
  return h >= 6 && h < 18 ? 'day' : 'night';
}

function getYamNumber(h: number, m: number, period: 'day'|'night'): number {
  const mins = h * 60 + m;
  const starts = YAM_START[period];
  for (let i = 7; i >= 0; i--) {
    if (period === 'night' && i >= 4) {
      if (mins >= starts[i] && mins < (i < 7 ? starts[i+1] : 360)) return i + 1;
    } else {
      if (mins >= starts[i]) return i + 1;
    }
  }
  return 1;
}

function getYamStartMin(period: 'day'|'night', yam: number): number {
  return YAM_START[period][yam - 1];
}

function minToStr(minutes: number): string {
  const safeMin = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(safeMin / 60);
  const m = safeMin % 60;
  const mInt = Math.floor(m);
  const mFrac = Math.round((m - mInt) * 60);
  if (mFrac === 0) return `${String(h).padStart(2,'0')}:${String(mInt).padStart(2,'0')}`;
  return `${String(h).padStart(2,'0')}:${String(mInt).padStart(2,'0')}.${String(mFrac).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE
// ─────────────────────────────────────────────────────────────────────────────

export function getPlanetSteps(day: number, yamAsked: number, period: 'day' | 'night'): number[] {
  const row = period === 'day' ? DAY_YAM[day] : NIGHT_YAM[day];
  const steps: number[] = [];
  for (let y = yamAsked; y <= 8; y++) { steps.push(row[y - 1]); if (steps.length === 11) return steps; }
  steps.push(row[0]); if (steps.length === 11) return steps;
  for (let y = 7; y >= 1; y--) { steps.push(row[y - 1]); if (steps.length === 11) return steps; }
  while (steps.length < 11) steps.push(row[0]);
  return steps;
}

export function calculatePositions(steps: number[]): number[] {
  const positions: number[] = [];
  let cur = 0;
  for (let p = 0; p < steps.length; p++) {
    const land = (cur + steps[p] - 1) % 12;
    positions.push(land);
    cur = land;
  }
  return positions;
}

export function buildBhavaMap(lagnaZodiacIndex: number): Record<number, string> {
  const map: Record<number, string> = {};
  for (let b = 0; b < 12; b++) { map[(lagnaZodiacIndex + b) % 12] = BHAVA_NAMES[b]; }
  return map;
}

export function findLagnaRuler(lagnaZodiacIndex: number): number {
  for (const [planet, kasterns] of Object.entries(PLANET_KASTERN)) {
    if (kasterns.includes(lagnaZodiacIndex)) return Number(planet);
  }
  return 4;
}

export function findPlanetPosition(planetNum: number, entries: PlanetEntry[]): number {
  const found = entries.find(e => e.planetNum === planetNum);
  return found ? found.zodiacIndex : 0;
}

/**
 * buildSubTimeSlots — คำนวณเวลายามย่อย
 * **อ้างอิงจากรูปผังสำเร็จ: ทวนเข็มนาฬิกา (CCW ในระบบ index 0->1->2)**
 */
export function buildSubTimeSlots(yamStartMin: number, startZodiacIndex: number, bhavaMap: Record<number, string>): SubTimeSlot[] {
  const slots: SubTimeSlot[] = [];
  const DURATION = 7.5;
  for (let i = 0; i < 12; i++) {
    // เดินทวนเข็มนาฬิกาตามลำดับราศี 0 -> 1 -> 2
    const zIdx = (startZodiacIndex + i) % 12;
    const startMin = yamStartMin + i * DURATION;
    const endMin = startMin + DURATION;
    const bhava = bhavaMap[zIdx] ?? '';
    const startStrVal = minToStr(startMin);
    slots.push({
      slotIndex: i, zodiacIndex: zIdx, zodiacName: ZODIAC_ORDER[zIdx].name,
      bhavaName: bhava, startMin, endMin, startStr: startStrVal, endStr: minToStr(endMin),
      bhavaTimeLabel: bhava ? `${bhava} ${startStrVal}` : startStrVal,
    });
  }
  return slots;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function calculateHoraTaynoo(input: HoraTaynooInput = {}): HoraTaynooResult {
  const now = new Date();
  const dateAsked = input.dateAsked ?? now;

  // บังคับให้เป็นเวลาไทย
  const thai = getThaiLocalTime(dateAsked);
  const h = input.hour   ?? thai.hour;
  const m = input.minute ?? thai.minute;
  const day = input.dayOverride ?? getAstroDay(thai);
  
  const period = getPeriod(h);
  const yamAsked = getYamNumber(h, m, period);
  const yamStartMin = getYamStartMin(period, yamAsked);
  const yamEndMin = yamStartMin + 90;
  const dayPlanet = DAY_PLANET[day];
  const yamPlanet = (period === 'day' ? DAY_YAM : NIGHT_YAM)[day][yamAsked - 1];

  // ค้นหาข้อมูลจากผังสำเร็จ 112 ผัง เพื่อความแม่นยำ 100% ตามรูปอ้างอิง
  const WEEKDAY_ID = ['sun','mon','tue','wed','thu','fri','sat'];
  const fixedId = `${WEEKDAY_ID[day]}-${period}-${yamAsked}`;
  const fixedData = SUCCESS_YAM_DATA[fixedId];

  // พับยามแบบดั้งเดิม (เผื่อไว้กรณีไม่มี fixed data)
  const planetSteps = getPlanetSteps(day, yamAsked, period);
  const positions = calculatePositions(planetSteps);

  const LABELS = ['1','2','3','4','5','6','7','8','ล','9','0'];
  const KEYS   = ['1','2','3','4','5','6','7','8','la','9','0'];
  const PLANET_NUMS: (number|null)[] = [1,2,3,4,5,6,7,8,null,9,null];

  const planetEntries: PlanetEntry[] = LABELS.map((label, i) => {
    const pNum = PLANET_NUMS[i];
    const key  = KEYS[i];
    
    // ใช้ Fixed Data (ลำดับความสำคัญสูงสุด)
    let zIdx = (fixedData?.planets as any)?.[key] ?? positions[i];
    let steps = (fixedData ? null : planetSteps[i]);

    // ใช้ Manual Input Override (ลำดับรองลงมา)
    if (input.overridePlanets && input.overridePlanets[key] !== undefined) {
      zIdx = input.overridePlanets[key];
      steps = null;
    } else if (label === 'ล' && input.overrideLagnaIdx !== undefined) {
      zIdx = input.overrideLagnaIdx;
      steps = null;
    }

    return {
      label, labelThai: THAI_LABELS[i], planetNum: pNum,
      zodiacIndex: zIdx, zodiacName: ZODIAC_ORDER[zIdx].name,
      steps, isLagna: label === 'ล',
      status: pNum != null ? getPlanetStatus(pNum, zIdx) : null,
    };
  });

  const lagnaEntry = planetEntries[8]; // ลัคนา
  const lagnaZodiacIndex = lagnaEntry.zodiacIndex;
  const bhavaMap = buildBhavaMap(lagnaZodiacIndex);
  const lagnaRulerPlanet = findLagnaRuler(lagnaZodiacIndex);
  const timeStartZodiacIndex = findPlanetPosition(lagnaRulerPlanet, planetEntries);
  const subTimeSlots = buildSubTimeSlots(yamStartMin, timeStartZodiacIndex, bhavaMap);

  const DAY_NAMES = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];

  return {
    dayOfWeek: day, dayName: DAY_NAMES[day], period, yamAsked,
    yamStartMin, yamEndMin, yamStartStr: minToStr(yamStartMin), yamEndStr: minToStr(yamEndMin),
    dayPlanet, yamPlanet, kasternZodiacIndex: 0, kasternZodiacName: '', // Placeholder
    planetSteps, planetEntries, lagnaZodiacIndex, lagnaZodiacName: ZODIAC_ORDER[lagnaZodiacIndex].name,
    bhavaMap, lagnaRulerPlanet, timeStartZodiacIndex, subTimeSlots,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export function calculateNow(theme: 'dark'|'light' = 'dark') {
  const result = calculateHoraTaynoo();
  return { result };
}

export function loadSuccessYam(weekday: number, period: 'day' | 'night', yamNo: number): HoraTaynooResult {
  const startMin = YAM_START[period][yamNo - 1];
  const safeMin = ((startMin % 1440) + 1440) % 1440;
  return calculateHoraTaynoo({ dayOverride: weekday, hour: Math.floor(safeMin / 60), minute: safeMin % 60 });
}

/**
 * getYamTimeRange — ดึงช่วงเวลาของยาม
 */
export function getYamTimeRange(
  period: 'day' | 'night',
  yamNo: number,
): { start: string; end: string } {
  const s = YAM_START[period][yamNo - 1]
  return { start: minToStr(s), end: minToStr(s + 90) }
}

export function getSuccessYamMeta() {

  const list = [];
  const WEEKDAY_NAMES = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];
  const WEEKDAY_ID    = ['sun','mon','tue','wed','thu','fri','sat'];
  for (let w = 0; w < 7; w++) {
    for (const period of ['day','night'] as const) {
      for (let y = 1; y <= 8; y++) {
        const s = YAM_START[period][y - 1];
        list.push({
          id: `${WEEKDAY_ID[w]}-${period}-${y}`, weekday: w, weekdayName: WEEKDAY_NAMES[w],
          period, yamNo: y, start: minToStr(s), end: minToStr(s + 90),
        });
      }
    }
  }
  return list;
}
