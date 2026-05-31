export type DayName =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type PeriodType = "day" | "night";

export type PhaseType = "start" | "middle" | "end";

export type PredictionTopic =
  | "news"
  | "sickness"
  | "lostItem"
  | "travel"
  | "general";

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

export interface YamInfo {
  dayName: DayName;
  period: PeriodType;
  yamNumber: number; // 1–8
  yamName: string;
}

export interface PredictionResult {
  news: string;
  sickness: string;
  lostItem: string;
  travel: {
    start: string;
    middle: string;
    end: string;
  };
  bestTime: string;
  auspicious: string;
  shouldDo: string;
  shouldNotDo: string;
  howTo: string;
}

export interface TravelAuspiciousness {
  ticks: number; // 0 | 1 | 2 | 3
  level: "bad" | "good" | "very_good" | "excellent";
  label: string; // "ไม่ดี/ติดขัด", "ดี", "ดีมาก", "ดีเยี่ยม"
  description: string; // คำทำนายการเดินทางสำหรับปัจจุบัน (อิงตามเฟส)
}

export interface YamResult extends YamInfo {
  date: Date;
  phase: PhaseType;
  sunTimes: SunTimes;
  prediction?: PredictionResult;
  travelAuspiciousness: TravelAuspiciousness; // ระบุระดับความมงคลเดินทาง
}

export interface GeneratePredictionOptions {
  yam: string;
  phase: PhaseType;
  topic: PredictionTopic;
  period?: PeriodType;
}


