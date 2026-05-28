/**
 * hora-engine/types/index.ts
 * Type definitions สำหรับระบบยามอัฐกาล
 *
 * @module types
 */

// ─────────────────────────────────────────────────────────────────────────────
// Primitive Types
// ─────────────────────────────────────────────────────────────────────────────

/** วันในสัปดาห์ (0=อาทิตย์ … 6=เสาร์) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** ID ดาวทั้ง 7 ดวง */
export type PlanetId =
  | "sun"      // อาทิตย์
  | "moon"     // จันทร์
  | "mars"     // อังคาร
  | "mercury"  // พุธ
  | "jupiter"  // พฤหัส
  | "venus"    // ศุกร์
  | "saturn";  // เสาร์

/** กลางวัน / กลางคืน */
export type HourPeriod = "day" | "night";

/** ลักษณะพลังงานดาว */
export type PlanetNature = "benefic" | "malefic" | "neutral";

// ─────────────────────────────────────────────────────────────────────────────
// Entity Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** ข้อมูลดาว */
export interface Planet {
  id: PlanetId;
  nameThai: string;
  nameEn: string;
  symbol: string;
  color: string;
  /** เลขดาวโหราศาสตร์ไทย */
  number: number;
  nature: PlanetNature;
  description: string;
  promotes: string[];
  warns: string[];
}

/** ยามย่อย (1 ใน 8 ของยามใหญ่ = 22.5 นาที) */
export interface HoraSlot {
  /** ลำดับยามย่อยในยามใหญ่ (1–8) */
  slot: number;
  planet: Planet;
  /** เวลาเริ่มต้น (minutes from midnight) */
  startMinute: number;
  /** เวลาสิ้นสุด (minutes from midnight) */
  endMinute: number;
  /** เวลาเริ่มต้น "HH:MM" */
  startTime: string;
  /** เวลาสิ้นสุด "HH:MM" */
  endTime: string;
  period: HourPeriod;
}

/** ยามใหญ่ (1 ใน 8 ของวัน = 180 นาที) */
export interface HoraMajorSlot {
  /** ลำดับยามใหญ่ (1–8) */
  majorSlot: number;
  name: string;
  period: HourPeriod;
  rulerPlanet: Planet;
  subSlots: HoraSlot[];
  startTime: string;
  endTime: string;
}

/** ข้อมูลยามปัจจุบัน */
export interface CurrentHoraInfo {
  majorSlot: HoraMajorSlot;
  subSlot: HoraSlot;
  /** ยามใหญ่ที่ (1–8) */
  majorIndex: number;
  /** ยามย่อยที่ (1–8) */
  subIndex: number;
  /** นาทีที่เหลือในยามย่อยนี้ */
  minutesRemaining: number;
  /** % ของยามย่อยที่ผ่านไปแล้ว (0–100) */
  progressPercent: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input / Output Types
// ─────────────────────────────────────────────────────────────────────────────

/** Input สำหรับ calculateHora */
export interface HoraInput {
  date: Date;
  /** ถ้าส่งจะได้ currentHora กลับมาด้วย */
  currentTime?: Date;
}

/** ผลลัพธ์จาก calculateHora */
export interface HoraResult {
  date: Date;
  dayOfWeek: DayOfWeek;
  dayNameThai: string;
  dayRuler: Planet;
  majorSlots: HoraMajorSlot[];
  currentHora?: CurrentHoraInfo;
}

/** ยามมงคลสำหรับกิจกรรม */
export interface AuspiciousHora {
  slot: HoraSlot;
  majorSlotName: string;
  majorSlotNumber: number;
  score: number; // 0–100 ความเหมาะสม
}

/** สรุปยามรายวัน */
export interface DailyHoraSummary {
  date: Date;
  dayNameThai: string;
  dayRuler: Planet;
  totalSlots: number;
  beneficSlots: number;
  maleficSlots: number;
  neutralSlots: number;
  slots: HoraSlot[];
}
