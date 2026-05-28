/**
 * hora-engine/utils/time.ts
 * Utility ด้านเวลา — แปลง minutes ↔ "HH:MM", normalize, เปรียบเทียบ
 *
 * @module utils/time
 */

import { MINUTES_PER_DAY } from "../constants/planets";

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลง minutes-from-midnight → "HH:MM"
 * @example minutesToTimeStr(90) → "01:30"
 * @example minutesToTimeStr(1470) → "00:30" (wrap midnight)
 */
export function minutesToTimeStr(totalMinutes: number): string {
  const normalized = ((Math.floor(totalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * แปลง Date → minutes from midnight (local time)
 * @example dateToMinutes(new Date("2024-01-01T09:30")) → 570
 */
export function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * แปลง "HH:MM" → minutes from midnight
 * @example timeStrToMinutes("09:30") → 570
 */
export function timeStrToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Normalize minutes ให้อยู่ใน range 0–1439
 */
export function normalizeMinutes(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slot Time Checks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ตรวจว่า currentMinute อยู่ใน range [startMinute, endMinute)
 * รองรับ midnight wrap (endMinute < startMinute)
 */
export function isMinuteInRange(
  currentMinute: number,
  startMinute: number,
  endMinute: number
): boolean {
  const start = startMinute % MINUTES_PER_DAY;
  const end = endMinute % MINUTES_PER_DAY;

  return end > start
    ? currentMinute >= start && currentMinute < end
    : currentMinute >= start || currentMinute < end;
}

/**
 * คำนวณนาทีที่ผ่านไปใน range (รองรับ midnight wrap)
 */
export function getElapsedMinutes(
  currentMinute: number,
  startMinute: number,
  endMinute: number
): number {
  const start = startMinute % MINUTES_PER_DAY;
  const end = endMinute % MINUTES_PER_DAY;

  if (end > start) {
    return currentMinute - start;
  }
  // midnight wrap
  return currentMinute >= start
    ? currentMinute - start
    : currentMinute + (MINUTES_PER_DAY - start);
}

/**
 * คำนวณ progress percent (0–100) ในยามย่อย
 */
export function calcProgressPercent(elapsed: number, duration: number): number {
  return Math.min(100, Math.round((elapsed / duration) * 1000) / 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลง Date เป็น "YYYY-MM-DD" (local time)
 */
export function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * สร้าง Date จาก "YYYY-MM-DD" + "HH:MM"
 */
export function buildDate(dateStr: string, timeStr = "00:00"): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

/**
 * ตรวจว่าสองวันเป็นวันเดียวกัน (local time)
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
