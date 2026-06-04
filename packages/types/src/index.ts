// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  fullName: string | null;
  birthDate: string | null; // ISO date "YYYY-MM-DD"
  birthTime: string | null; // "HH:mm"
  birthPlace: string | null;
  subscription: SubscriptionTier;
  role: "user" | "admin" | "operator";
  plan: "free" | "basic" | "pro" | "imperial";
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionTier = "free" | "basic" | "premium" | "lifetime";

// ─── Core Astrology Primitives ───────────────────────────────────────────────

/** เลขดาว 1–8 (โหราศาสตร์ไทย รวมราหู=8) */
export type StarNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** ชื่อดาวภาษาไทย */
export const STAR_NAMES: Record<StarNumber, string> = {
  1: "อาทิตย์",
  2: "จันทร์",
  3: "อังคาร",
  4: "พุธ",
  5: "พฤหัส",
  6: "ศุกร์",
  7: "เสาร์",
  8: "ราหู",
} as const;

export interface LunarDateInfo {
  dayName: string;
  dayPlanet: string;
  lunarMonth: number;
  lunarMonthName: string;
  lunarDay: number;
  moonPhase: string;
  zodiacName: string;
  thaiDateText: string;
  isApproximate: boolean;
  /** ปี พ.ศ. (ไทย) — ใช้ในระบบทักษา-มหาภูติ */
  thaiYear?: number;
}

// ─── 7 Numbers 9 Bases (ผัง 7 ตัว 9 ฐาน) ────────────────────────────────────────

export interface NineBaseResult {
  lunarDate: LunarDateInfo;
  /** 9 ฐาน × 7 ช่อง */
  bases: number[][]; 
  /** ข้อมูลเสริมสำหรับแต่ละฐาน (ถ้ามี) */
  metadata?: Record<string, unknown>;
}

// ─── ทักษา (Taksa) ────────────────────────────────────────────────────────────

export type TaksaBhop =
  | "บริวาร" | "อายุ" | "เดช" | "ศรี"
  | "มูละ" | "อุตสาหะ" | "มนตรี" | "กาลกิณี";

export type TaksaMap = Record<StarNumber, TaksaBhop>;

export interface TaksaNatalResult {
  map: TaksaMap;
  bariStar: StarNumber;
  birthStar?: StarNumber;   // optional: บางเวอร์ชัน engine ไม่มี
  kalakiniStar?: StarNumber; // optional: ดาวกาลกิณี
}

export interface TaksaTransitResult {
  map: TaksaMap;
  bariStar: StarNumber;
  ageYang: number;
  kalakiniStar?: StarNumber; // optional
}

// ─── มหาภูติ (Mahabhuti) ────────────────────────────────────────────────────────

export type MahaBhop =
  | "ราชา" | "อธิบดี" | "ธงชัย" | "ขุมทรัพย์"
  | "มรณะ" | "โลกาวินาศ" | "อริ";

/** แผนที่ ภพมหาภูติ → เลขดาว (number เพราะรองรับ 1-8 จาก engine) */
export type MahaMap = Record<MahaBhop, number>;

export interface MahaBhutiResult {
  cs: number;
  remainder: number;
  map: MahaMap;
}

// ─── ยามอัฏฐกาล & ราหู (Time Engines - Systematic v2.0) ──────────────────────────

export interface SystematicAtthakarnResult {
  majorPlanet: StarNumber;
  subPlanet: StarNumber;
  majorSlot: number; // 0–7
  subSlot: number;   // 0–7
  isDaytime: boolean;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  planetName: string;
  subPlanetName: string;
}

export interface SystematicRahuResult {
  id: number;
  name: string;
  quality: "good" | "bad" | "neutral";
  minutesRange: [number, number];
}

// ─── Jorn (Progressed Calculations) ──────────────────────────────────────────

export interface JornResult {
  row: number;        // 1-based row
  col: number;        // 1-based col
  houseName: string;
  star: number;
  yumStar?: number;
  yumBase?: number;   // 1-based base index
  ageRange?: string;  // For Vaya Jorn
}

export interface LagnaPhopephumResult {
  row: number;
  col: number;
  houseName: string;
  star: number;
  subPeriod?: 'early' | 'middle' | 'end';
  reksName?: string;
  reksIndex?: number;
}

// ─── Integrated Results (สหวิชาพยากรณ์) ──────────────────────────────────────────

export type AlertLevel = "danger" | "warn" | "info" | "good";

export interface StarAlert {
  level: AlertLevel;
  star: StarNumber;
  starName: string;
  taksaNatal: TaksaBhop;
  taksaTransit: TaksaBhop;
  mahaNatal?: MahaBhop;   // optional — ราหู(8) ไม่มีในมหาภูติ
  mahaTransit?: MahaBhop; // optional
  message: string;
}

export type ElementType = "ไฟ" | "ดิน" | "ลม" | "น้ำ";

export interface ElementPairFlag {
  element: ElementType;
  stars: [StarNumber, StarNumber];
  nature: string;
  inNatal: boolean;
  inTransit: boolean;
  isPermanent: boolean;
}

export interface CrossCheckResult {
  elementPairFlags: ElementPairFlag[];
  alerts: StarAlert[];
}

export interface PhopephumResult {
  nineBase: NineBaseResult;
  taksaNatal: TaksaNatalResult;
  taksaTransit: TaksaTransitResult;
  mahaNatal: MahaBhutiResult;
  mahaTransit: MahaBhutiResult;
  crossCheck: CrossCheckResult;
  atthakarn: SystematicAtthakarnResult;
  rahu: SystematicRahuResult;
  vayaJorn?: JornResult;
  yearlyJorn?: JornResult;
  monthlyJorn?: JornResult;
  dailyJorn?: JornResult;
  lagna?: LagnaPhopephumResult;
  lagnaTransit?: LagnaPhopephumResult;
  horary?: NineBaseResult;
  timestamp: string;
}

// ─── Horoscope Legacy (Keep for compatibility) ─────────────────────────────────

export interface HoroscopeInput {
  birthDate: string; // ISO date "YYYY-MM-DD"
  birthTime?: string; // "HH:mm"
  birthPlace?: string; 
  thaiMonthOverride?: number;
  zodiacOverride?: string;
}

export interface SevenNumbers {
  base: number[];
  soul: number;
  destiny: number;
  power: number;
  karmic: number;
  mission: number;
  crown: number;
}

export interface HoroscopeResult {
  sevenNumbers: SevenNumbers;
  lunarDateInfo: LunarDateInfo;
  taksa: { name: string; planet: string; number: number }[];
  atthakarn: {
    hora: string;
    element: string;
    ruling: string;
    quality: string;
    prediction: string;
  };
  lagna: {
    sign: string;
    degree: number;
    house: number;
    strength: number;
  };
  transitPhase: {
    currentAge: number;
    phase: string;
    phaseStart: number;
    phaseEnd: number;
    keywords: string[];
  };
}

// ─── AI Report ────────────────────────────────────────────────────────────────

export interface AIReportRequest {
  userId: string;
  reportType: AIReportType;
  phopephumResult: PhopephumResult;
  userContext?: Record<string, unknown>;
}

export type AIReportType =
  | "general_prediction"
  | "life_overview"
  | "career"
  | "relationship"
  | "health"
  | "wealth"
  | "daily_insight"
  | "annual_forecast";

export interface AIReportRecord {
  id: string;
  userId: string;
  reportType: AIReportType;
  content: string;
  tokensUsed: number;
  createdAt: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
