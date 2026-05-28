import { yamMeaning }   from "../constants/yamMeaning";
import { phaseMeaning } from "../constants/phaseMeaning";
import {
  PredictionResult,
  GeneratePredictionOptions,
  PhaseType,
} from "../types/yam.types";

/** ดึงคำทำนายเต็มรูปแบบตามชื่อยาม */
export function getPrediction(yamName: string): PredictionResult | undefined {
  return yamMeaning[yamName];
}

/**
 * สร้างคำทำนายแบบ targeted ตาม yam + phase + topic
 *
 * @example
 * generatePrediction({ yam: "พุธ", phase: "middle", topic: "travel" })
 * // → "เดินทางแล้วสำเร็จ พบเหตุการณ์ที่ต้องใช้ปัญญาแก้ปัญหา (กลางยาม)"
 */
export function generatePrediction(
  options: GeneratePredictionOptions
): string {
  const { yam, phase, topic } = options;
  const meaning = yamMeaning[yam];

  if (!meaning) {
    return `ไม่พบข้อมูลยาม "${yam}"`;
  }

  const phaseInfo = phaseMeaning[phase];

  switch (topic) {
    case "news":
      return `${meaning.news} (${phaseInfo.label})`;

    case "sickness":
      return `${meaning.sickness} — ${phaseInfo.advice}`;

    case "lostItem":
      return `${meaning.lostItem} (${phaseInfo.label}: ${phaseInfo.description})`;

    case "travel":
      return buildTravelPrediction(meaning.travel, phase);

    case "general":
    default:
      return buildGeneralPrediction(yam, meaning, phase, phaseInfo);
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildTravelPrediction(
  travel: PredictionResult["travel"],
  phase: PhaseType
): string {
  const map: Record<PhaseType, string> = {
    start:  travel.start,
    middle: travel.middle,
    end:    travel.end,
  };
  return map[phase];
}

function buildGeneralPrediction(
  yamName: string,
  meaning: (typeof yamMeaning)[string],
  phase: PhaseType,
  phaseInfo: (typeof phaseMeaning)[PhaseType]
): string {
  return (
    `ยาม${yamName} ${phaseInfo.label}: ${phaseInfo.description}\n` +
    `ข่าวสาร: ${meaning.news}\n` +
    `คำแนะนำ: ${phaseInfo.advice}`
  );
}
