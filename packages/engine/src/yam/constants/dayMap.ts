import { DayName } from "../types/yam.types";

/** แมป getDay() (0–6) → DayName */
export const DAY_INDEX_MAP: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** ชื่อวันภาษาไทย */
export const DAY_NAMES_THAI: Record<DayName, string> = {
  sunday:    "อาทิตย์",
  monday:    "จันทร์",
  tuesday:   "อังคาร",
  wednesday: "พุธ",
  thursday:  "พฤหัสบดี",
  friday:    "ศุกร์",
  saturday:  "เสาร์",
};
