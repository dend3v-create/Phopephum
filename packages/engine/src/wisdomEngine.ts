/**
 * wisdomEngine.ts (v2.0)
 * ระบบคำนวณปัญญาศาสตร์มาตรฐาน (เลข 7 ตัว 9 ฐาน, ทักษาคู่ธาตุ, มหาภูติ)
 * Refactored to use the new standardized v2.0 engines.
 */

import { calculateNineBases } from "./engine/seven-numbers-v2.js";
import { calcTaksaNatal, calcTaksaTransit, calcMahabhuti, buddhToCS } from "./taksa-mahabhuti/index.js";

/**
 * 1. ระบบเลข 7 ตัว 9 ฐาน (9 ฐาน 7 ช่อง)
 */
export function calculateSevenNumbersNineBases(day: number, month: number, year: number) {
  // Mock a HoroscopeInput for calculateNineBases
  // Since calculateNineBases needs a full date to handle lunar calendar correctly,
  // we use this helper for direct numeric input if needed, but preferred to use the new engine.
  const result = calculateNineBases({
    birthDate: `${year - 543}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  });
  return result.bases;
}

/**
 * 2. ระบบทักษาคู่ธาตุ (Standard v2.0)
 */
export function calculateWisdomTaksa(birthDayPlanet: number, age: number = 1) {
  // Convert planet number to day of week (1=อาทิตย์=0, 2=จันทร์=1, ...)
  const dayOfWeek = birthDayPlanet === 7 ? 6 : birthDayPlanet - 1;
  const natal = calcTaksaNatal(dayOfWeek);
  
  // Create a fake transit with age
  const birthDate = new Date();
  const checkDate = new Date();
  checkDate.setFullYear(birthDate.getFullYear() + age - 1);
  const transit = calcTaksaTransit(birthDate, checkDate);

  const format = (map: Record<number, string>) => Object.entries(map).map(([p, t]) => ({
    title: t,
    planet: Number(p)
  }));

  return { 
    natal: format(natal.map), 
    transit: format(transit.map) 
  };
}

/**
 * 3. ระบบมหาภูติ (ตามปี จ.ศ.)
 */
export function calculateMahabhuti(csYear: number) {
  const result = calcMahabhuti(csYear);
  return result.map;
}
