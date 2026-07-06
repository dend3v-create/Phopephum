/**
 * hora-taynoo-engine.ts
 * ยามพรายกระซิบ — Engine หลัก (Final Production Grade)
 * อ้างอิง: อ.กานดา + ชุดผังดวงสำเร็จ 112 ผัง
 */


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

function getThaiLocalTime(date: Date): { hour: number, minute: number, day: number, raw: Date } {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const thai = new Date(utc + (3600000 * 7));
  return { hour: thai.getHours(), minute: thai.getMinutes(), day: thai.getDay(), raw: thai };
}

function getAstroDay(thaiTime: { hour: number, minute: number, day: number }): number {
  const mins = thaiTime.hour * 60 + thaiTime.minute;
  if (mins < 360) return (thaiTime.day + 6) % 7;
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
  const mFrac = Math.round((m - mInt) * 60); // seconds (0 or 30)
  if (mFrac === 0) return `${String(h).padStart(2,'0')}:${String(mInt).padStart(2,'0')}`;
  return `${String(h).padStart(2,'0')}:${String(mInt).padStart(2,'0')}.${String(mFrac).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE
// ─────────────────────────────────────────────────────────────────────────────

export function getPlanetSteps(day: number, yamAsked: number, period: 'day' | 'night'): number[] {
  const row = period === 'day' ? DAY_YAM[day] : NIGHT_YAM[day];
  
  function foldYam(y: number): number {
    let val = y;
    while (val < 1) val += 8;
    while (val > 15) val -= 8;
    if (val <= 8) return val;
    return 16 - val;
  }

  // Correct bounce: walk DOWN to yam 8, bounce once, walk back UP (11 positions)
  const bouncePath: number[] = [];
  let cur = yamAsked;
  let going: 'down' | 'up' = 'down';
  for (let i = 0; i < 11; i++) {
    bouncePath.push(cur);
    if (i < 10) {
      if (going === 'down') {
        if (cur < 8) { cur++; }
        else { going = 'up'; } // bounce at yam 8, stay at 8 one more step
      } else {
        cur = Math.max(1, cur - 1);
      }
    }
  }

  return bouncePath.map(y => row[foldYam(y) - 1]);
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

export function buildSubTimeSlots(yamStartMin: number, startZodiacIndex: number, bhavaMap: Record<number, string>): SubTimeSlot[] {
  const slots: SubTimeSlot[] = [];
  const DURATION = 7.5;
  for (let i = 0; i < 12; i++) {
    const zIdx = (startZodiacIndex + i) % 12;
    const startMin = yamStartMin + i * DURATION;
    const endMin = startMin + DURATION;
    const bhava = bhavaMap[zIdx] ?? '';
    const endStrVal = minToStr(endMin);
    slots.push({
      slotIndex: i, zodiacIndex: zIdx, zodiacName: ZODIAC_ORDER[zIdx].name,
      bhavaName: bhava, startMin, endMin, startStr: endStrVal, endStr: endStrVal,
      bhavaTimeLabel: bhava ? `${bhava} ${endStrVal}` : endStrVal,
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
  const thai = getThaiLocalTime(dateAsked);
  const h = input.hour ?? thai.hour;
  const m = input.minute ?? thai.minute;
  const day = input.dayOverride ?? getAstroDay(thai);
  const period = getPeriod(h);
  const yamAsked = getYamNumber(h, m, period);
  const yamStartMin = getYamStartMin(period, yamAsked);
  const yamEndMin = yamStartMin + 90;
  const dayPlanet = DAY_PLANET[day];
  const yamPlanet = (period === 'day' ? DAY_YAM : NIGHT_YAM)[day][yamAsked - 1];

  const planetSteps = getPlanetSteps(day, yamAsked, period);

  const positions = calculatePositions(planetSteps);

  const LABELS = ['1','2','3','4','5','6','7','8','ล','9','0'];
  const KEYS   = ['1','2','3','4','5','6','7','8','la','9','0'];
  const PLANET_NUMS: (number|null)[] = [1,2,3,4,5,6,7,8,null,9,null];

  const planetEntries: PlanetEntry[] = LABELS.map((label, i) => {
    const pNum = PLANET_NUMS[i];
    const key  = KEYS[i];
    let zIdx = positions[i];
    let steps: number | null = planetSteps[i];
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

  const lagnaEntry = planetEntries[8];
  const lagnaZodiacIndex = lagnaEntry.zodiacIndex;
  const bhavaMap = buildBhavaMap(lagnaZodiacIndex);
  const lagnaRulerPlanet = findLagnaRuler(lagnaZodiacIndex);
  const timeStartZodiacIndex = findPlanetPosition(lagnaRulerPlanet, planetEntries);
  const subTimeSlots = buildSubTimeSlots(yamStartMin, timeStartZodiacIndex, bhavaMap);

  const DAY_NAMES = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];

  return {
    dayOfWeek: day, dayName: DAY_NAMES[day], period, yamAsked,
    yamStartMin, yamEndMin, yamStartStr: minToStr(yamStartMin), yamEndStr: minToStr(yamEndMin),
    dayPlanet, yamPlanet, kasternZodiacIndex: PLANET_KASTERN[dayPlanet][0], kasternZodiacName: ZODIAC_ORDER[PLANET_KASTERN[dayPlanet][0]].name,
    planetSteps, planetEntries, lagnaZodiacIndex, lagnaZodiacName: ZODIAC_ORDER[lagnaZodiacIndex].name,
    bhavaMap, lagnaRulerPlanet, timeStartZodiacIndex, subTimeSlots,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartConfig {
  size?: number; theme?: 'dark' | 'light';
  showKasternFixed?: boolean; showFloatingPlanets?: boolean;
  showPlanetStatus?: boolean; showTimeRing?: boolean;
  showLagnaRulerMarker?: boolean; highlightLagna?: boolean;
}

export function generateHoraTaynooSVG(result: HoraTaynooResult, config: ChartConfig = {}): string {
  const SHOW_FIXED  = config.showKasternFixed !== false;
  const SHOW_FLOAT  = config.showFloatingPlanets !== false;
  const SHOW_STATUS = config.showPlanetStatus !== false;
  const SHOW_TIME   = config.showTimeRing !== false;
  const SHOW_START  = config.showLagnaRulerMarker !== false;

  const SIZE = config.size ?? 520;
  const CX = SIZE / 2; const CY = SIZE / 2; const s = SIZE / 520;

  const R_RING1 = SIZE * 0.38; const R_RING2 = SIZE * 0.28; const R_RING3 = SIZE * 0.21;
  const R_CORE  = SIZE * 0.13; const R_TIME  = SIZE * 0.455; const R_LIMIT = SIZE * 0.49;
  const R_ZOD_BHAVA = (R_RING1 + R_RING2) / 2 + 3 * s;
  const R_PLN_LBL   = (R_RING2 + R_RING3) / 2;
  const R_FIX_LBL   = (R_RING3 + R_CORE) / 2;

  const GOLD = '#C9A96E'; const GOLD_TXT = '#C9A96E'; const TXT = '#F8F6F1'; const TXT_TIME = '#C9A96E';
  const LAGNA_BG = '#1A4E9A35'; const PLN_BG = '#C9A96E1A'; const BHAVA_CLR = '#4B6FAE';

  function polar(deg: number, r: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  const byZodiac: Record<number, PlanetEntry[]> = {};
  for (const e of result.planetEntries) { (byZodiac[e.zodiacIndex] ??= []).push(e); }

  let highlights = '';
  for (const z of ZODIAC_ORDER) {
    const isLagna = z.index === result.lagnaZodiacIndex;
    const hasPlanets = (byZodiac[z.index] ?? []).length > 0;
    if (!isLagna && !hasPlanets) continue;
    const a1 = z.sectorAngle + 14.85, a2 = z.sectorAngle - 14.85;
    const o1 = polar(a1, R_RING1), o2 = polar(a2, R_RING1);
    const i2 = polar(a2, R_CORE), i1 = polar(a1, R_CORE);
    const d = `M${o1.x} ${o1.y} A${R_RING1} ${R_RING1} 0 0 0 ${o2.x} ${o2.y} L${i2.x} ${i2.y} A${R_CORE} ${R_CORE} 0 0 1 ${i1.x} ${i1.y} Z`;
    highlights += `<path d="${d}" fill="${isLagna ? LAGNA_BG : PLN_BG}" stroke="none"/>`;
  }

  const circles = [
    `<circle cx="${CX}" cy="${CY}" r="${R_RING1.toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="2.2"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R_RING2.toFixed(1)}" fill="none" stroke="${GOLD}60" stroke-width="1.2"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R_RING3.toFixed(1)}" fill="none" stroke="${GOLD}28" stroke-width="1"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${R_CORE.toFixed(1)}" fill="#020617" stroke="${GOLD}" stroke-width="1.8"/>`,
  ].join('\n');

  let dividers = '';
  for (let i = 0; i < 12; i++) {
    const angle = 345 - 30 * i;
    const inner = polar(angle, R_CORE); const outer = polar(angle, R_RING1);
    dividers += `<line x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}" stroke="${GOLD}" stroke-width="0.8"/>`;
  }

  let ring1Labels = '';
  for (const z of ZODIAC_ORDER) {
    const isLagna = z.index === result.lagnaZodiacIndex;
    const bhava = result.bhavaMap[z.index];
    const pCenter = polar(z.sectorAngle, R_ZOD_BHAVA);
    ring1Labels += `<text x="${pCenter.x.toFixed(1)}" y="${(pCenter.y - 8*s).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${12.5*s}" font-family="sans-serif" fill="${isLagna ? '#6EB0F5' : TXT}" font-weight="900">${z.name}</text>`;
    if (bhava) {
      const color = isLagna ? '#6EB0F5' : BHAVA_CLR;
      ring1Labels += `<text x="${pCenter.x.toFixed(1)}" y="${(pCenter.y + 10*s).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${10.5*s}" font-family="sans-serif" fill="${color}" font-weight="800">${bhava}</text>`;
    }
  }

  const STATUS_GLYPHS: Record<Exclude<PlanetStatus, null>, { char: string; color: string }> = {
    'maha-uccj': { char: '✿', color: '#22C55E' }, 'kaset': { char: '△', color: '#EF4444' },
    'racha-chok':{ char: '⬡', color: '#3B82F6' }, 'maha-chakr':{ char: '□', color: '#EAB308' },
    'pra': { char: '○', color: '#EF4444' }, 'nij': { char: '✳', color: '#EF4444' },
  };

  let planetLabels = '';
  if (SHOW_FLOAT) {
    for (const z of ZODIAC_ORDER) {
      const entries = byZodiac[z.index] ?? [];
      if (entries.length === 0) continue;
      const pos = polar(z.sectorAngle, R_PLN_LBL);
      const gap = 22 * s; const totalWidth = (entries.length - 1) * gap;
      entries.forEach((entry, idx) => {
        const x = pos.x - totalWidth / 2 + idx * gap; const y = pos.y;
        const color = entry.isLagna ? '#6EB0F5' : GOLD;
        if (entry.status && SHOW_STATUS) {
          const st = STATUS_GLYPHS[entry.status];
          planetLabels += `<text x="${x.toFixed(1)}" y="${(y - 15 * s).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${11*s}" font-family="sans-serif" fill="${st.color}" font-weight="900">${st.char}</text>`;
        }
        planetLabels += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${22*s}" font-family="serif" fill="${color}" font-weight="900">${entry.labelThai}</text>`;
      });
    }
  }

  let kasternFixedLabels = '';
  if (SHOW_FIXED) {
    for (const z of ZODIAC_ORDER) {
      const pos = polar(z.sectorAngle, R_FIX_LBL);
      kasternFixedLabels += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${17*s}" font-family="sans-serif" fill="${TXT}" opacity="0.85" font-weight="800">${KASTERN_FIXED[z.index]}</text>`;
    }
  }

  let timeLabels = '';
  if (SHOW_TIME) {
    for (const slot of result.subTimeSlots) {
      const angle = ZODIAC_ORDER[slot.zodiacIndex].sectorAngle;
      const pos = polar(angle, R_TIME);
      timeLabels += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${10.5*s}" font-family="mono" fill="${TXT_TIME}" font-weight="900">${slot.startStr.replace(/:/g, '.')}</text>`;
    }
  }

  const centerMask = `<circle cx="${CX}" cy="${CY}" r="${(R_CORE + 12*s).toFixed(1)}" fill="#020617" stroke="${GOLD}" stroke-width="3"/>`;
  const pDay = polar(225, 20 * s); const pYam = polar(45, 20 * s);
  const dayLabel = `<text x="${pDay.x.toFixed(1)}" y="${pDay.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${28*s}" font-family="sans-serif" fill="${GOLD}" font-weight="900">${result.dayPlanet}</text>`;
  const yamLabel = `<text x="${pYam.x.toFixed(1)}" y="${pYam.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${28*s}" font-family="sans-serif" fill="${GOLD}" font-weight="900">${result.yamAsked}</text>`;

  let startMarker = '';
  if (SHOW_START) {
    const startAngle = ZODIAC_ORDER[result.timeStartZodiacIndex].sectorAngle;
    const pos = polar(startAngle, R_RING1);
    startMarker = `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${7.5*s}" fill="none" stroke="#6EB0F5" stroke-width="3" opacity="0.9" />`;
    startMarker += `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${3.5*s}" fill="#6EB0F5" opacity="1" />`;
  }

  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" style="background:#020617; border-radius:1.5rem;">
  <circle cx="${CX}" cy="${CY}" r="${R_LIMIT.toFixed(1)}" fill="#020617" stroke="none" />
${highlights} ${circles} ${dividers} ${kasternFixedLabels} ${ring1Labels} ${planetLabels} ${timeLabels} ${startMarker} ${centerMask} ${dayLabel} ${yamLabel}
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export function calculateNow(theme: 'dark'|'light' = 'dark') {
  const result = calculateHoraTaynoo();
  const svg = generateHoraTaynooSVG(result, { theme });
  return { result, svg };
}

export function loadSuccessYam(weekday: number, period: 'day' | 'night', yamNo: number): HoraTaynooResult {
  const startMin = YAM_START[period][yamNo - 1];
  const safeMin = ((startMin % 1440) + 1440) % 1440;
  return calculateHoraTaynoo({ dayOverride: weekday, hour: Math.floor(safeMin / 60), minute: safeMin % 60 });
}

export function getYamTimeRange(period: 'day' | 'night', yamNo: number): { start: string; end: string } {
  const s = YAM_START[period][yamNo - 1];
  return { start: minToStr(s), end: minToStr(s + 90) };
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
