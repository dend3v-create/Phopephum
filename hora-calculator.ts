/**
 * hora-calculator.ts
 * Hora AI — ยามอัฐกาล Engine
 *
 * ระบบคำนวณยามอัฐกาล (โหรทายหนู) ตามหลักโหราศาสตร์ไทย
 * แต่ละวันมี 8 ยามใหญ่ (ยามกลางวัน 4 + ยามกลางคืน 4)
 * แต่ละยามใหญ่แบ่งเป็น 8 ยามย่อย
 *
 * @module hora-calculator
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0=อาทิตย์, 1=จันทร์, 2=อังคาร, 3=พุธ, 4=พฤหัส, 5=ศุกร์, 6=เสาร์

export type PlanetId =
  | "sun"    // อาทิตย์
  | "moon"   // จันทร์
  | "mars"   // อังคาร
  | "mercury" // พุธ
  | "jupiter" // พฤหัส
  | "venus"  // ศุกร์
  | "saturn"; // เสาร์

export type HourPeriod = "day" | "night";

export interface Planet {
  id: PlanetId;
  nameThai: string;
  nameEn: string;
  symbol: string;
  color: string;
  /** เลขดาวโหราศาสตร์ไทย */
  number: number;
  /** ลักษณะพลังงาน */
  nature: "benefic" | "malefic" | "neutral";
  /** คำอธิบายสั้น */
  description: string;
  /** ด้านที่ส่งเสริม */
  promotes: string[];
  /** ด้านที่ควรระวัง */
  warns: string[];
}

export interface HoraSlot {
  /** ลำดับยามย่อยในยามใหญ่ (1–8) */
  slot: number;
  planet: Planet;
  /** เวลาเริ่มต้น (minutes from midnight) */
  startMinute: number;
  /** เวลาสิ้นสุด (minutes from midnight) */
  endMinute: number;
  /** เวลาเริ่มต้น formatted HH:MM */
  startTime: string;
  /** เวลาสิ้นสุด formatted HH:MM */
  endTime: string;
  /** กลางวัน / กลางคืน */
  period: HourPeriod;
}

export interface HoraMajorSlot {
  /** ลำดับยามใหญ่ (1–8) */
  majorSlot: number;
  /** ชื่อยามใหญ่ */
  name: string;
  period: HourPeriod;
  /** ดาวเจ้าของยามใหญ่ */
  rulerPlanet: Planet;
  /** 8 ยามย่อยภายใน */
  subSlots: HoraSlot[];
  /** เวลาเริ่มต้น formatted */
  startTime: string;
  /** เวลาสิ้นสุด formatted */
  endTime: string;
}

export interface HoraResult {
  /** วันที่คำนวณ */
  date: Date;
  /** วันในสัปดาห์ (0=อาทิตย์) */
  dayOfWeek: DayOfWeek;
  /** ชื่อวัน (ไทย) */
  dayNameThai: string;
  /** ดาวเจ้าของวัน */
  dayRuler: Planet;
  /** ยามใหญ่ทั้ง 8 ยาม */
  majorSlots: HoraMajorSlot[];
  /** ยามปัจจุบัน (ถ้าส่ง currentTime) */
  currentHora?: CurrentHoraInfo;
}

export interface CurrentHoraInfo {
  majorSlot: HoraMajorSlot;
  subSlot: HoraSlot;
  /** ยามใหญ่ที่ (1–8) */
  majorIndex: number;
  /** ยามย่อยที่ (1–8) */
  subIndex: number;
  /** นาทีที่เหลือในยามย่อยนี้ */
  minutesRemaining: number;
  /** % ของยามย่อยที่ผ่านไปแล้ว */
  progressPercent: number;
}

export interface HoraInput {
  date: Date;
  /** เวลาปัจจุบัน (optional) — ถ้าส่งจะคืน currentHora */
  currentTime?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants — ดาวทั้ง 7 ดวง
// ─────────────────────────────────────────────────────────────────────────────

export const PLANETS: Record<PlanetId, Planet> = {
  sun: {
    id: "sun",
    nameThai: "อาทิตย์",
    nameEn: "Sun",
    symbol: "☉",
    color: "#F59E0B",
    number: 1,
    nature: "benefic",
    description: "ดาวแห่งอำนาจ อัตตา และพลังชีวิต",
    promotes: ["ผู้นำ", "การเจรจา", "ความมีชื่อเสียง", "สุขภาพ"],
    warns: ["อัตตาสูง", "ความเย่อหยิ่ง"],
  },
  moon: {
    id: "moon",
    nameThai: "จันทร์",
    nameEn: "Moon",
    symbol: "☽",
    color: "#E5E7EB",
    number: 2,
    nature: "benefic",
    description: "ดาวแห่งอารมณ์ ความรู้สึก และสัญชาตญาณ",
    promotes: ["ความสัมพันธ์", "การดูแล", "ความคิดสร้างสรรค์", "การค้าขาย"],
    warns: ["อารมณ์แปรปรวน", "ตัดสินใจด้วยอารมณ์"],
  },
  mars: {
    id: "mars",
    nameThai: "อังคาร",
    nameEn: "Mars",
    symbol: "♂",
    color: "#EF4444",
    number: 3,
    nature: "malefic",
    description: "ดาวแห่งพลังงาน ความกล้า และการต่อสู้",
    promotes: ["ความกล้าหาญ", "พลังงาน", "ความเด็ดเดี่ยว", "ธุรกิจ"],
    warns: ["ความขัดแย้ง", "อุบัติเหตุ", "ความโกรธ"],
  },
  mercury: {
    id: "mercury",
    nameThai: "พุธ",
    nameEn: "Mercury",
    symbol: "☿",
    color: "#10B981",
    number: 4,
    nature: "neutral",
    description: "ดาวแห่งการสื่อสาร ความฉลาด และการค้า",
    promotes: ["การสื่อสาร", "ธุรกิจ", "การเรียนรู้", "เทคโนโลยี", "การเขียน"],
    warns: ["ความไม่ซื่อสัตย์", "ความลังเล"],
  },
  jupiter: {
    id: "jupiter",
    nameThai: "พฤหัส",
    nameEn: "Jupiter",
    symbol: "♃",
    color: "#F97316",
    number: 5,
    nature: "benefic",
    description: "ดาวแห่งความโชคดี ปัญญา และการขยาย",
    promotes: ["โชคลาภ", "ปัญญา", "จิตวิญญาณ", "การศึกษา", "กฎหมาย"],
    warns: ["การสุรุ่ยสุร่าย", "การประมาทเลินเล่อ"],
  },
  venus: {
    id: "venus",
    nameThai: "ศุกร์",
    nameEn: "Venus",
    symbol: "♀",
    color: "#EC4899",
    number: 6,
    nature: "benefic",
    description: "ดาวแห่งความรัก ความงาม และความสุข",
    promotes: ["ความรัก", "ศิลปะ", "ความงาม", "ความบันเทิง", "สันติภาพ"],
    warns: ["ความฟุ่มเฟือย", "ความโลภ"],
  },
  saturn: {
    id: "saturn",
    nameThai: "เสาร์",
    nameEn: "Saturn",
    symbol: "♄",
    color: "#6B7280",
    number: 7,
    nature: "malefic",
    description: "ดาวแห่งวินัย ความอดทน และกรรม",
    promotes: ["ความอดทน", "วินัย", "ความพยายาม", "งานหนัก"],
    warns: ["ความล่าช้า", "อุปสรรค", "โรคภัย"],
  },
};

// ลำดับดาว 7 ดวงตามระบบโหราศาสตร์ไทย (Chaldean order)
// ใช้วนซ้ำในการคำนวณยาม
export const PLANET_CHALDEAN_ORDER: PlanetId[] = [
  "saturn",  // 1
  "jupiter", // 2
  "mars",    // 3
  "sun",     // 4
  "venus",   // 5
  "mercury", // 6
  "moon",    // 7
];

// ดาวเจ้าของแต่ละวันในสัปดาห์
// index = dayOfWeek (0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์)
export const DAY_RULERS: PlanetId[] = [
  "sun",     // 0 = อาทิตย์
  "moon",    // 1 = จันทร์
  "mars",    // 2 = อังคาร
  "mercury", // 3 = พุธ
  "jupiter", // 4 = พฤหัส
  "venus",   // 5 = ศุกร์
  "saturn",  // 6 = เสาร์
];

export const DAY_NAMES_THAI = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์",
];

// ชื่อยามใหญ่ทั้ง 8
export const MAJOR_HORA_NAMES = [
  "ยามที่ 1 (ยามเช้า)",
  "ยามที่ 2",
  "ยามที่ 3",
  "ยามที่ 4 (ยามเที่ยง)",
  "ยามที่ 5",
  "ยามที่ 6",
  "ยามที่ 7",
  "ยามที่ 8 (ยามดึก)",
];

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/** แปลง minutes-from-midnight → "HH:MM" (floor ทศนิยม) */
export function minutesToTimeStr(totalMinutes: number): string {
  const normalized = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** แปลง Date → minutes from midnight (local time) */
export function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * หา index ของดาวใน PLANET_CHALDEAN_ORDER
 */
export function getPlanetChaldeanIndex(id: PlanetId): number {
  return PLANET_CHALDEAN_ORDER.indexOf(id);
}

/**
 * คำนวณดาวเจ้าของยามจาก Chaldean index offset
 * @param startIndex  - index แรกใน PLANET_CHALDEAN_ORDER (ดาวเจ้าของวัน)
 * @param offset      - ยามที่ต้องการ (0-based)
 */
export function getPlanetAtOffset(startIndex: number, offset: number): Planet {
  const idx = (startIndex + offset) % 7;
  return PLANETS[PLANET_CHALDEAN_ORDER[idx]];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณยามอัฐกาลทั้งหมดสำหรับวันที่กำหนด
 *
 * กฎการคำนวณ:
 * - 1 วัน = 24 ชั่วโมง = 1440 นาที
 * - ยามกลางวัน: 06:00 – 18:00 (720 นาที) → 4 ยามใหญ่ × 180 นาที
 * - ยามกลางคืน: 18:00 – 06:00 (720 นาที) → 4 ยามใหญ่ × 180 นาที
 * - แต่ละยามใหญ่ = 8 ยามย่อย × 22.5 นาที (= 22 นาที 30 วินาที)
 * - ดาวเจ้าของยามใหญ่ที่ 1 (กลางวัน) = ดาวเจ้าของวัน
 * - ดาวเจ้าของยามถัดไปเดิน +1 ตาม Chaldean order (เวียนซ้ำ 7)
 * - ยามใหญ่กลางคืนเดินต่อจากยามกลางวัน (ยามใหญ่ที่ 5–8)
 */
export function calculateHora(input: HoraInput): HoraResult {
  const { date, currentTime } = input;
  const dayOfWeek = date.getDay() as DayOfWeek;
  const dayRulerId = DAY_RULERS[dayOfWeek];
  const dayRuler = PLANETS[dayRulerId];

  // Chaldean index ของดาวเจ้าของวัน → จุดเริ่มต้นวนดาว
  const startChaldeanIndex = getPlanetChaldeanIndex(dayRulerId);

  // แต่ละยามใหญ่ = 180 นาที (3 ชั่วโมง)
  const MAJOR_SLOT_MINUTES = 180;
  // แต่ละยามย่อย = 22.5 นาที
  const SUB_SLOT_MINUTES = MAJOR_SLOT_MINUTES / 8; // 22.5

  // ยามกลางวันเริ่ม 06:00 = 360 นาที
  const DAY_START_MINUTES = 360;

  const majorSlots: HoraMajorSlot[] = [];

  for (let major = 0; major < 8; major++) {
    const period: HourPeriod = major < 4 ? "day" : "night";
    const majorStartMinute = DAY_START_MINUTES + major * MAJOR_SLOT_MINUTES;
    const majorEndMinute = majorStartMinute + MAJOR_SLOT_MINUTES;

    // ดาวเจ้าของยามใหญ่
    const rulerPlanet = getPlanetAtOffset(startChaldeanIndex, major);

    // ยามย่อย 8 ยาม
    const subSlots: HoraSlot[] = [];
    for (let sub = 0; sub < 8; sub++) {
      const subOffset = major * 8 + sub;
      const subPlanet = getPlanetAtOffset(startChaldeanIndex, subOffset);

      const subStartMinute = majorStartMinute + sub * SUB_SLOT_MINUTES;
      const subEndMinute = subStartMinute + SUB_SLOT_MINUTES;

      subSlots.push({
        slot: sub + 1,
        planet: subPlanet,
        startMinute: subStartMinute,
        endMinute: subEndMinute,
        startTime: minutesToTimeStr(subStartMinute),
        endTime: minutesToTimeStr(subEndMinute),
        period,
      });
    }

    majorSlots.push({
      majorSlot: major + 1,
      name: MAJOR_HORA_NAMES[major],
      period,
      rulerPlanet,
      subSlots,
      startTime: minutesToTimeStr(majorStartMinute),
      endTime: minutesToTimeStr(majorEndMinute),
    });
  }

  const result: HoraResult = {
    date,
    dayOfWeek,
    dayNameThai: DAY_NAMES_THAI[dayOfWeek],
    dayRuler,
    majorSlots,
  };

  // หายามปัจจุบัน (optional)
  if (currentTime) {
    result.currentHora = findCurrentHora(majorSlots, currentTime);
  }

  return result;
}

/**
 * หายามปัจจุบันจาก majorSlots
 */
function findCurrentHora(
  majorSlots: HoraMajorSlot[],
  currentTime: Date
): CurrentHoraInfo | undefined {
  const currentMinute = dateToMinutes(currentTime);

  for (let mi = 0; mi < majorSlots.length; mi++) {
    const major = majorSlots[mi];
    for (let si = 0; si < major.subSlots.length; si++) {
      const sub = major.subSlots[si];

      // handle midnight wrap (endMinute > 1440)
      const start = sub.startMinute % 1440;
      const end = sub.endMinute % 1440;

      const isInSlot =
        end > start
          ? currentMinute >= start && currentMinute < end
          : currentMinute >= start || currentMinute < end;

      if (isInSlot) {
        const elapsed =
          end > start
            ? currentMinute - start
            : currentMinute >= start
            ? currentMinute - start
            : currentMinute + (1440 - start);

        const duration = sub.endMinute - sub.startMinute; // 22.5
        const minutesRemaining = Math.max(0, duration - elapsed);
        const progressPercent = Math.min(100, (elapsed / duration) * 100);

        return {
          majorSlot: major,
          subSlot: sub,
          majorIndex: mi + 1,
          subIndex: si + 1,
          minutesRemaining: Math.round(minutesRemaining * 10) / 10,
          progressPercent: Math.round(progressPercent * 10) / 10,
        };
      }
    }
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * คำนวณยามปัจจุบัน (shorthand)
 */
export function getCurrentHora(now?: Date): HoraResult {
  const d = now ?? new Date();
  return calculateHora({ date: d, currentTime: d });
}

/**
 * หาว่าเวลาที่กำหนดเป็นยามใดในวันที่กำหนด
 */
export function getHoraAt(date: Date, time: Date): HoraResult {
  return calculateHora({ date, currentTime: time });
}

/**
 * หายามที่ดีที่สุดสำหรับกิจกรรมที่กำหนดในวันที่กำหนด
 * @param date         - วันที่ต้องการ
 * @param preferredIds - PlanetId[] ที่ต้องการ (เช่น ['jupiter','venus'] สำหรับธุรกิจ)
 */
export function findAuspiciousHoras(
  date: Date,
  preferredIds: PlanetId[]
): HoraSlot[] {
  const result = calculateHora({ date });
  const auspicious: HoraSlot[] = [];

  for (const major of result.majorSlots) {
    for (const sub of major.subSlots) {
      if (preferredIds.includes(sub.planet.id)) {
        auspicious.push(sub);
      }
    }
  }

  return auspicious;
}

/**
 * สรุปยามรายวัน — list ยามย่อยทั้งหมดพร้อมข้อมูล
 */
export function getHoraSummary(date: Date): HoraSlot[] {
  const result = calculateHora({ date });
  return result.majorSlots.flatMap((m) => m.subSlots);
}
