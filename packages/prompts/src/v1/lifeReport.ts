import type { HoroscopeResult, AIReportType } from "@phopephum/types";

export const PROMPT_VERSION = "v1.0.0";

export function buildLifeReportPrompt(
  horoscope: HoroscopeResult,
  reportType: AIReportType,
  userName: string
): string {
  const { sevenNumbers, transitPhase } = horoscope;

  return `คุณคือนักโหราศาสตร์ไทยผู้เชี่ยวชาญระบบเลข 7 ตัว 9 ฐาน
ห้ามแสดงสูตรคำนวณ ห้ามแสดงลูกศร ห้ามแสดง logic ทางเทคนิค
ให้ผลลัพธ์เป็นภาษาไทยที่อ่านง่าย ลึกซึ้ง และเป็นประโยชน์

ชื่อผู้ใช้: ${userName}
ประเภทรายงาน: ${reportType}

ข้อมูลดวงชะตา:
- เลขชะตา: ${sevenNumbers.destiny}
- เลขพลัง: ${sevenNumbers.power}
- เลขวิญญาณ: ${sevenNumbers.soul}
- เลขภารกิจ: ${sevenNumbers.mission}
- ช่วงวัยปัจจุบัน: ${transitPhase.phase} (อายุ ${transitPhase.phaseStart}–${transitPhase.phaseEnd})
- คำสำคัญของช่วงนี้: ${transitPhase.keywords.join(", ")}

สร้างรายงาน${reportType === "life_overview" ? "ชีวิตโดยรวม" : reportType}ที่ครอบคลุม:
1. จุดแข็งและพรสวรรค์ของชีวิต
2. ช่วงเวลาปัจจุบันและโอกาส
3. คำแนะนำที่ลึกซึ้งและนำไปปฏิบัติได้จริง
4. แนวทางการเติบโตในอีก 12 เดือนข้างหน้า

ตอบเป็นภาษาไทย ใช้ภาษาที่อบอุ่น ให้กำลังใจ และเป็นมืออาชีพ`;
}
