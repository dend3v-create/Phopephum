/**
 * types/fateMatrix.ts
 * Type definitions for 7-Base 9-Stars Fate Matrix system (เลข 7 ตัว 9 ฐาน)
 */

import { StarNumber } from "@phopephum/types";

/** ผังดวงชะตา 9 แถว × 7 คอลัมน์ */
export type FateMatrix = number[][]

/** ข้อมูลเกิดดิบ — Input สำหรับ CalendarConverter */
export interface BirthData {
  solarDate: Date     // วันสากล เช่น 2026-05-28
  birthTime: string   // เวลาเกิด "HH:MM"
  birthPlace: string  // จังหวัดที่เกิด (สำหรับคำนวณเวลาตัดวัน/อันตรานาที)
}

/**
 * เลขฐาน 1-7 ทั้งสามมิติ — Output จาก CalendarConverter
 * dayNum  : 1 = อาทิตย์ … 7 = เสาร์
 * monthNum: 1 = เดือน 5 จันทรคติ … 7 = เดือน 11
 * yearNum : 1 = ชวด … 7 = มะเมีย (วนซ้ำ)
 */
export interface AstroBaseNumbers {
  dayNum: number
  monthNum: number
  yearNum: number
}

/** ผลจับคู่พิกัด–ภพ–ดาว สำหรับ HouseMapper.mapMatrixToHouses() */
export interface HouseDelineation {
  row: number       // แถวที่ 1, 2, 3
  col: number       // คอลัมน์ที่ 1–7
  houseName: string // ชื่อภพ
  starNumber: number // ตัวเลขดาวที่สถิต
}

/** พิกัดภพเรือนในผัง — ผลจาก HouseMapper.findHouseLocations() */
export interface HouseLocation {
  rowIdx: number  // 0, 1, 2
  colIdx: number  // 0–6
  houseName: string
}

/** บริบทจรสำหรับ ClairvoyantEngine */
export interface TransitContext {
  thaksa: string    // ทักษาภายนอก: "ศรี" | "กาลกิณี" | "เดช" | "มนตรี" | "มูลละ" | "อุตสาหะ"
  mahaphoot: string // มหาภูติภายใน: "ราชา" | "ธงชัย" | "มรณะ" | "โลกาวินาศ"
}

/** พิมพ์เขียวชะตา — Output ต่อภพจาก ClairvoyantEngine.analyzeDestinyFlow() */
export interface DestinyBlueprint {
  inquiryHouse: string
  activatedStar: number
  base4Power: number
  futureProjection: { base8: number; base9: number }
  matrixSolutions: { base5: number; base6: number; base7: number }
  astralVisualization: { planet: string; signArchetype: string; westernHouse: string }
}

export const BASE4_MEANINGS: Record<number, string> = {
  3: "กำลังดาวอังคารเล็ก",
  4: "กำลังดาวพุธเล็ก",
  5: "กำลังดาวพฤหัสบดีเล็ก",
  6: "กำลังพระอาทิตย์",
  7: "กำลังดาวเสาร์เล็ก",
  8: "กำลังพระอังคาร",
  9: "กำลังพระเกตุ",
  10: "กำลังพระเสาร์",
  11: "ราชาโชค",
  12: "กำลังพระราหู",
  13: "มหาอุจ",
  14: "จักรพรรดิ",
  15: "กำลังพระจันทร์",
  16: "โสฬสมงคล",
  17: "กำลังพระพุธ",
  18: "มหาจักรพรรดิ์",
  19: "กำลังพระพฤหัสบดี",
  20: "กำลังดาวเสาร์ใหญ่ (มฤตยู)",
  21: "กำลังพระศุกร์",
};

export const POWER_TO_STAR: Record<number, StarNumber> = {
  6: 1,
  15: 2,
  8: 3,
  3: 3,
  17: 4,
  4: 4,
  19: 5,
  5: 5,
  21: 6,
  10: 7,
  7: 7,
  12: 8,
};

export const STAR_DIRECTIONS: Record<StarNumber, string> = {
  1: "อีสาน (NE)",
  2: "บูรพา (E)",
  3: "อาคเนย์ (SE)",
  4: "ทักษิณ (S)",
  7: "หรดี (SW)",
  8: "ประจิม (W)",
  5: "พายัพ (NW)",
  6: "อุดร (N)",
};
