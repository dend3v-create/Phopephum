import { calculateNineBases } from "./seven-numbers-v2.js";
import { calculateAtthakarn as calculateAtthakarnLivingWisdom, calculateRahu as calculateRahuLivingWisdom } from "./time-engines.js";
import { calcTaksaMaha, buddhToCS } from "../taksa-mahabhuti/index.js";
import type { PhopephumResult, HoroscopeInput } from "@phopephum/types";

/**
 * Phopephum Living Wisdom Operating System (v2.0)
 * Integrated Prediction Engine
 */
export async function calculatePhopephum(input: HoroscopeInput, checkDate: Date = new Date()): Promise<PhopephumResult> {
  let birthDateObj = new Date(input.birthDate);
  if (isNaN(birthDateObj.getTime())) {
    console.warn("Invalid birthDate provided to calculatePhopephum, defaulting to checkDate");
    birthDateObj = new Date(checkDate);
  }
  
  // 1. Calculate 7 Numbers 9 Bases
  const nineBase = calculateNineBases({
    ...input,
    birthDate: birthDateObj.toISOString().split('T')[0]
  });
  
  // 2. Calculate Taksa & Mahabhuti (Integrated)
  const thaiYear = (birthDateObj.getFullYear() || checkDate.getFullYear()) + 543;
  const currentYear = (checkDate.getFullYear() || new Date().getFullYear()) + 543;
  
  const taksaMaha = calcTaksaMaha({
    birthDate: birthDateObj,
    checkDate: checkDate,
    birthYearThai: thaiYear,
    currentYearThai: currentYear,
    csNatal: buddhToCS(thaiYear),
    csTransit: buddhToCS(currentYear),
  });
  
  // 3. Calculate Time-based Engines
  const atthakarn = calculateAtthakarnLivingWisdom(checkDate);
  const rahu = calculateRahuLivingWisdom(checkDate);
  
  return {
    nineBase,
    taksaNatal: taksaMaha.taksaNatal,
    taksaTransit: taksaMaha.taksaTransit,
    mahaNatal: taksaMaha.mahaNatal,
    mahaTransit: taksaMaha.mahaTransit,
    crossCheck: {
      elementPairFlags: taksaMaha.elementPairFlags,
      alerts: taksaMaha.alerts,
    },
    atthakarn,
    rahu,
    timestamp: checkDate.toISOString(),
  };
}
