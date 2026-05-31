/**
 * atthakarnAdapter.ts
 * Bridge ระหว่าง atthakarnDatabase กับ Engine types
 * ให้ API ที่สะอาดสำหรับ yamService และ promptBuilder
 */

import {
  YAM_PREDICTIONS,
  PLANETS,
  DAY_YAM_TIMES,
  NIGHT_YAM_TIMES,
  DAY_NUMBER,
  DAY_THAI,
  getPlanetForYam,
  getYamNumberFromTime,
  getDayOfWeek,
  getDayPeriod,
  type DayOfWeek,
  type DayPeriod,
  type YamNumber,
  type YamPrediction,
  type Planet,
  type SubYam,
  type Quality,
  type TimeRange,
} from "./atthakarnDatabase.js";

// ─── Re-export core types ──────────────────────────────────────────────────────

export type {
  DayOfWeek,
  DayPeriod,
  YamNumber,
  YamPrediction,
  Planet,
  SubYam,
  Quality,
  TimeRange,
};

// ─── Enriched birth yam result ────────────────────────────────────────────────

export interface AtthakarnBirthYam {
  /** วันเกิด (เช่น 'monday') */
  day: DayOfWeek;
  /** ชื่อวันภาษาไทย */
  dayThai: string;
  /** กลางวัน / กลางคืน */
  period: DayPeriod;
  /** ยามที่ 1–8 */
  yamNumber: YamNumber;
  /** ยามต้น / กลาง / ปลาย */
  subYam: SubYam;
  /** ดาวประจำยาม */
  planet: Planet;
  /** ช่วงเวลา */
  timeRange: TimeRange;
  /** ระดับดี/ร้าย (ของทั้งยาม) */
  quality: Quality;
  /** คำทำนายจากตำราเต็มรูปแบบ */
  prediction: YamPrediction;
  /** คำทำนายย่อยตามช่วงยาม */
  subYamQuality: Quality;
  /** ข้อความสรุปสั้น */
  summary: string;
}

// ─── Main lookup function ──────────────────────────────────────────────────────

/**
 * ดึงข้อมูลยามอัฏฐกาล ณ วันเวลาที่ระบุ (เช่น เวลาเกิด)
 * ใช้ฐานข้อมูลคัมภีร์ยามอัฏฐกาลเต็มรูปแบบ
 */
export function getAtthakarnYamAt(date: Date): AtthakarnBirthYam {
  const day = getDayOfWeek(date);
  const dayThai = DAY_THAI[day];
  const period = getDayPeriod(date);
  const { yamNumber, subYam } = getYamNumberFromTime(date, period);
  const planetNumber = getPlanetForYam(day, period, yamNumber);
  const planet = PLANETS[planetNumber];
  const timeRange = period === "day" ? DAY_YAM_TIMES[yamNumber] : NIGHT_YAM_TIMES[yamNumber];

  const prediction = YAM_PREDICTIONS.find(
    (p) => p.day === day && p.period === period && p.yamNumber === yamNumber
  );

  if (!prediction) {
    const fallback: YamPrediction = {
      day, period, yamNumber, planetNumber, timeRange,
      quality: "neutral",
      generalMeaning: `ยามที่ ${yamNumber} ${period === "day" ? "กลางวัน" : "กลางคืน"}`,
      travel: "พิจารณาตามดาวประจำยาม",
      lostItems: "พิจารณาตามดาวประจำยาม",
      sickness: "พิจารณาตามดาวประจำยาม",
      news: "พิจารณาตามดาวประจำยาม",
      subYamPredictions: {
        ton: { quality: "neutral", meaning: "ยามต้น — พิจารณาตามสถานการณ์" },
        klang: { quality: "neutral", meaning: "ยามกลาง — พิจารณาตามสถานการณ์" },
        plai: { quality: "neutral", meaning: "ยามปลาย — พิจารณาตามสถานการณ์" },
      },
    };

    return {
      day, dayThai, period, yamNumber, subYam, planet, timeRange,
      quality: "neutral",
      prediction: fallback,
      subYamQuality: "neutral",
      summary: `ยามที่ ${yamNumber} ${period === "day" ? planet.nameDay : planet.nameNight}`,
    };
  }

  const subYamPred = prediction.subYamPredictions[subYam];
  const subYamThai = { ton: "ต้น", klang: "กลาง", plai: "ปลาย" }[subYam];
  const planetName = period === "day" ? planet.nameDay : planet.nameNight;

  return {
    day, dayThai, period, yamNumber, subYam, planet, timeRange,
    quality: prediction.quality,
    prediction,
    subYamQuality: subYamPred.quality,
    summary: `ยามที่ ${yamNumber} (${planetName}) ${period === "day" ? "กลางวัน" : "กลางคืน"} — ยาม${subYamThai}: ${subYamPred.meaning}`,
  };
}

/**
 * ดึงข้อมูลยามเกิดจาก birthDate + birthTime string
 * @param birthDate - ISO date string เช่น "1990-05-15"
 * @param birthTime - HH:MM string เช่น "14:30" (optional)
 */
export function getBirthYamData(
  birthDate: string,
  birthTime?: string | null
): AtthakarnBirthYam | null {
  if (!birthDate) return null;

  try {
    const dateStr = birthTime
      ? `${birthDate}T${birthTime}:00`
      : `${birthDate}T12:00:00`; // default noon if no time

    const birthDateTime = new Date(dateStr);
    if (isNaN(birthDateTime.getTime())) return null;

    return getAtthakarnYamAt(birthDateTime);
  } catch {
    return null;
  }
}

/**
 * ดึงข้อมูลยามปัจจุบัน
 */
export function getCurrentAtthakarnYam(): AtthakarnBirthYam {
  return getAtthakarnYamAt(new Date());
}

/**
 * ชื่อดาวประจำยามพร้อมทั้งชื่อกลางวัน/กลางคืน
 */
export function getPlanetFullName(yam: AtthakarnBirthYam): string {
  const { planet, period } = yam;
  return `${period === "day" ? planet.nameDay : planet.nameNight} (${planet.nameThai})`;
}

/**
 * แปลง Quality เป็น Label ไทย
 */
export function qualityToLabel(q: Quality): string {
  return { good: "✅ ยามดี", bad: "❌ ยามร้าย", neutral: "⚖️ ยามปานกลาง" }[q];
}
