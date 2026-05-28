import { PhaseType } from "../types/yam.types";

/**
 * ความหมายของช่วงยาม (phase) ใน 3 ระยะ
 * ต้นยาม (start) / กลางยาม (middle) / ปลายยาม (end)
 */
export const phaseMeaning: Record<
  PhaseType,
  { label: string; description: string; advice: string }
> = {
  start: {
    label:       "ต้นยาม",
    description: "ช่วงเริ่มต้นของยาม พลังงานกำลังก่อตัว เหมาะสำหรับการเริ่มต้นสิ่งใหม่",
    advice:      "เวลานี้เหมาะแก่การตัดสินใจ วางแผน และเริ่มกิจการ",
  },
  middle: {
    label:       "กลางยาม",
    description: "ช่วงที่พลังงานแข็งแกร่งที่สุด ผลลัพธ์จะปรากฏชัดเจน",
    advice:      "เวลานี้เหมาะแก่การลงมือปฏิบัติ เจรจา และตัดสิน",
  },
  end: {
    label:       "ปลายยาม",
    description: "ช่วงปิดของยาม พลังงานเริ่มเสื่อมถอย เตรียมพร้อมสำหรับยามถัดไป",
    advice:      "เวลานี้เหมาะแก่การสรุป ตรวจสอบ และพักผ่อน",
  },
};
