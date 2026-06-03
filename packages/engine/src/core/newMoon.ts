/**
 * core/newMoon.ts
 * Moon Phase calculation — strictly follows NASA/Meeus reference points.
 */

import { dateToJD } from "./julianDay.js";

/** 
 * รอบดวงจันทร์เฉลี่ย (Synodic Month) 
 * อ้างอิงจาก NASA / Meeus
 */
export const SYNODIC_MONTH = 29.530588853;

/** 
 * จุดอ้างอิง New Moon (6 มกราคม 2000)
 */
export const NEW_MOON_REF = 2451550.1;

/**
 * คำนวณอายุดวงจันทร์ (Moon Age) จาก Julian Day
 * @param jd Julian Day
 * @returns 0–29.53...
 */
export function moonAge(jd: number): number {
  const age = (jd - NEW_MOON_REF) % SYNODIC_MONTH;
  return age < 0 ? age + SYNODIC_MONTH : age;
}

/**
 * คำนวณ ขึ้น/แรม และค่ำ แบบไทย
 * @param age อายุดวงจันทร์
 */
export function getThaiMoonDay(age: number): { phase: "ขึ้น" | "แรม"; day: number } {
  if (age < 15) {
    return {
      phase: "ขึ้น",
      day: Math.floor(age) + 1
    };
  }
  return {
    phase: "แรม",
    day: Math.floor(age - 14)
  };
}

/**
 * คำนวณ New Moon ที่ใกล้ที่สุดกับวันที่กำหนด
 */
export function nearestNewMoon(date: Date): Date {
  const jd = dateToJD(date);
  const age = moonAge(jd);
  const nmJD = jd - age;
  
  // Convert back to local Date object
  // (Assuming jdToDate from julianDay.ts)
  const z = Math.floor(nmJD + 0.5);
  const f = nmJD + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const totalHours = f * 24;
  return new Date(year, month - 1, day, Math.floor(totalHours));
}
