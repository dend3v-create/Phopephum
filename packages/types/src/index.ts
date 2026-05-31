// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  birthDate: string | null; // ISO date
  birthTime: string | null; // HH:mm
  birthPlace: string | null;
  subscription: SubscriptionTier;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionTier = "free" | "basic" | "premium" | "lifetime";

// ─── Horoscope ────────────────────────────────────────────────────────────────

export interface HoroscopeInput {
  birthDate: string; // ISO date "YYYY-MM-DD"
  birthTime?: string; // "HH:mm"
  birthPlace?: string; // province name
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
}

export interface TaksaPosition {
  name: string;
  planet: string;
  number: number;
}

export interface HoroscopeResult {
  sevenNumbers: SevenNumbers;
  lunarDateInfo: LunarDateInfo;
  taksa: TaksaPosition[];
  atthakarn: AtthakarnResult;
  lagna: LagnaResult;
  transitPhase: TransitPhase;
}

export interface AtthakarnResult {
  hora: string;
  element: string;
  ruling: string;
  quality: string;
  prediction: string;
}

export interface LagnaResult {
  sign: string;
  degree: number;
  house: number;
  strength: number;
}

export interface TransitPhase {
  currentAge: number;
  phase: string;
  phaseStart: number;
  phaseEnd: number;
  keywords: string[];
}

// ─── AI Report ────────────────────────────────────────────────────────────────

export interface AIReportRequest {
  userId: string;
  reportType: AIReportType;
  horoscope: HoroscopeResult;
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

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  userId: string | null;
  event: string;
  properties: Record<string, unknown>;
  url: string;
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
