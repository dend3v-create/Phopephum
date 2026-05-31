import { yamMeaning, YamMeaning } from "../constants/yamMeaning.js";
import { phaseMeaning } from "../constants/phaseMeaning.js";
import { yamNightMeaning } from "../constants/yamNightMeaning.js";
import {
  PredictionResult,
  GeneratePredictionOptions,
  PhaseType,
  PeriodType,
} from "../types/yam.types.js";

/** ฐานข้อมูลคำทำนายเดินทางกลางวันใหม่สำหรับดาว ๑, ๒, ๓ */
const DAYTIME_NEW_TRAVEL_MEANINGS: Record<string, { start: string; middle: string; end: string }> = {
  "สุริยะ": {
    start: "แสนทรพ์ไม่ประสบความยาก เดินทางราบรื่นและไร้อุปสรรค",
    middle: "ดีเลิศ เด่นทำนองสิ่งดี ประสบความสำเร็จขั้นสูงสุด มีชื่อเสียง",
    end: "ดีติดขัดหลักสิ้นสุด ปลายยามมีเกณฑ์สะดุดหรือล่าช้าเล็กน้อย",
  },
  "จันเทา": {
    start: "ร้อนใจ อ่อนไม่มีเชื่อ เริ่มต้นสัญจรด้วยความร้อนใจหรือปัญหาติดขัด",
    middle: "คนไทว่าไม่ไสร้เชื่อ ข่าวสารหรือผู้คนระหว่างเดินทางยังไม่น่าไว้วางใจ",
    end: "ดูถูกดูหมิ่นของ ระมัดระวังการทำของเสียหาย หรือเสียเกียรติยศ",
  },
  "จันทรา": { // เผื่อการสะกดในจุดอื่นๆ
    start: "ร้อนใจ อ่อนไม่มีเชื่อ เริ่มต้นสัญจรด้วยความร้อนใจหรือปัญหาติดขัด",
    middle: "คนไทว่าไม่ไสร้เชื่อ ข่าวสารหรือผู้คนระหว่างเดินทางยังไม่น่าไว้วางใจ",
    end: "ดูถูกดูหมิ่นของ ระมัดระวังการทำของเสียหาย หรือเสียเกียรติยศ",
  },
  "ภุมมะ": {
    start: "สำเภาทุกข์ เพิ่มเติมอันเนื่องมา การสัญจรระยะแรกมีความเหน็ดเหนื่อยหรือทุกขลาภ",
    middle: "งามนิยมรัก งามประสบชัย ประสบความสำเร็จอย่างโดดเด่นและปลอดภัย",
    end: "เนื้อนิยม ได้รับสิ่งดี ได้ลาภผลประโยชน์และสิ่งพึงพอใจอย่างมาก",
  },
};

/** ดึงคำทำนายเต็มรูปแบบตามชื่อยาม และระบุช่วงเวลา (กลางวัน/กลางคืน) */
export function getPrediction(yamName: string, period: PeriodType = "day"): PredictionResult | undefined {
  const m = yamMeaning[yamName];
  if (!m) return undefined;

  let travel = { ...m.travel };

  if (period === "night") {
    // ใช้คำทำนายเดินทางกลางคืนจาก night_watch_app
    const nightM = yamNightMeaning[yamName];
    if (nightM) {
      travel = {
        start: nightM.travel.start,
        middle: nightM.travel.middle,
        end: nightM.travel.end,
      };
    }
  } else {
    // ใช้คำทำนายเดินทางกลางวันใหม่สำหรับ สุริยะ, จันทรา/จันเทา, ภูมมะ/ภุมมะ
    const dayNewM = DAYTIME_NEW_TRAVEL_MEANINGS[yamName];
    if (dayNewM) {
      travel = {
        start: dayNewM.start,
        middle: dayNewM.middle,
        end: dayNewM.end,
      };
    }
  }

  return {
    news:     m.news,
    sickness: m.sickness,
    lostItem: m.lostItem,
    travel,
    bestTime: m.bestTime,
    auspicious: m.auspicious,
    shouldDo: m.shouldDo,
    shouldNotDo: m.shouldNotDo,
    howTo: m.howTo,
  };
}

/** ดึง YamMeaning เต็ม */
export function getYamMeaning(yamName: string): YamMeaning | undefined {
  return yamMeaning[yamName];
}

/**
 * สร้างคำทำนายแบบ targeted ตาม yam + phase + topic
 */
export function generatePrediction(
  options: GeneratePredictionOptions
): string {
  const { yam, phase, topic, period = "day" } = options;
  const meaning = getPrediction(yam, period);

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
  meaning: PredictionResult,
  phase: PhaseType,
  phaseInfo: (typeof phaseMeaning)[PhaseType]
): string {
  const full = yamMeaning[yamName];
  const bestTime = full?.bestTime ? `เวลาที่ดี: ${full.bestTime}` : "";
  return (
    `ยาม${yamName} ${phaseInfo.label}: ${phaseInfo.description}\n` +
    `ข่าวสาร: ${meaning.news}\n` +
    `คนเจ็บไข้: ${meaning.sickness}\n` +
    `ของหาย: ${meaning.lostItem}\n` +
    `การเดินทาง: ${buildTravelPrediction(meaning.travel, phase)}\n` +
    bestTime
  );
}

