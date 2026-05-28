/**
 * hora-engine/constants/planets.ts
 * ข้อมูลดาวทั้ง 7 ดวง + ลำดับ Chaldean + เจ้าของวัน
 *
 * @module constants/planets
 */

import type { Planet, PlanetId } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Planets Data
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

// ─────────────────────────────────────────────────────────────────────────────
// Chaldean Order — ลำดับดาวสำหรับคำนวณยาม (วนซ้ำ 7)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ลำดับดาว Chaldean (ใช้สำหรับวนคำนวณยาม)
 * เสาร์ → พฤหัส → อังคาร → อาทิตย์ → ศุกร์ → พุธ → จันทร์
 */
export const PLANET_CHALDEAN_ORDER: PlanetId[] = [
  "saturn",   // 0
  "jupiter",  // 1
  "mars",     // 2
  "sun",      // 3
  "venus",    // 4
  "mercury",  // 5
  "moon",     // 6
];

// ─────────────────────────────────────────────────────────────────────────────
// Day Rulers — ดาวเจ้าของวัน
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ดาวเจ้าของแต่ละวัน (index = dayOfWeek)
 * 0=อาทิตย์, 1=จันทร์, 2=อังคาร, 3=พุธ, 4=พฤหัส, 5=ศุกร์, 6=เสาร์
 */
export const DAY_RULERS: PlanetId[] = [
  "sun",     // 0 = วันอาทิตย์
  "moon",    // 1 = วันจันทร์
  "mars",    // 2 = วันอังคาร
  "mercury", // 3 = วันพุธ
  "jupiter", // 4 = วันพฤหัส
  "venus",   // 5 = วันศุกร์
  "saturn",  // 6 = วันเสาร์
];

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

export const DAY_NAMES_THAI = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์",
] as const;

export const DAY_NAMES_EN = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export const MAJOR_HORA_NAMES = [
  "ยามที่ 1 (ยามเช้า)",
  "ยามที่ 2",
  "ยามที่ 3",
  "ยามที่ 4 (ยามเที่ยง)",
  "ยามที่ 5",
  "ยามที่ 6",
  "ยามที่ 7",
  "ยามที่ 8 (ยามดึก)",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Time Constants
// ─────────────────────────────────────────────────────────────────────────────

/** ยามกลางวันเริ่ม 06:00 = 360 นาที */
export const DAY_START_MINUTES = 360;

/** แต่ละยามใหญ่ = 180 นาที (3 ชั่วโมง) */
export const MAJOR_SLOT_MINUTES = 180;

/** แต่ละยามย่อย = 22.5 นาที */
export const SUB_SLOT_MINUTES = MAJOR_SLOT_MINUTES / 8; // 22.5

/** จำนวนยามใหญ่ต่อวัน */
export const MAJOR_SLOTS_PER_DAY = 8;

/** จำนวนยามย่อยต่อยามใหญ่ */
export const SUB_SLOTS_PER_MAJOR = 8;

/** จำนวนนาทีต่อวัน */
export const MINUTES_PER_DAY = 1440;
