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

export type Locale = "th" | "en" | "zh";

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
  reksName?: string;
  reksIndex?: number;
  yamYaiNumber?: number;
  subPeriod?: 'early' | 'middle' | 'end';
  yumBase?: number;
  yumStar?: number;
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
  | "annual_forecast"
  | "personal_branding";

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

// ─── Hora Nu (ยามพรายกระซิบ) ──────────────────────────────────────────────────

export interface HoraNuHouseEntry {
  houseNum: number;
  houseName: string;
  zodiacNum: number;
  zodiacName: string;
  zodiacSymbol: string;
  lordPlanet: number;
  lordName: string;
  lordSymbol: string;
  lordColor: string;
  lordStatus: string;
  lordStatusSymbol: string;
  lordStatusLabel: string;
  lordStatusColor: string;
  isCurrentYam: boolean;
  isSecondaryKaset: boolean;
}

export interface HoraNuYamPeriod {
  periodNum: number;
  startTime: string;
  endTime: string;
  planet: number;
  planetName: string;
  planetSymbol: string;
  planetColor: string;
  direction: string;
  directionAngleDeg: number;
  isCurrent: boolean;
}

export interface HoraNuChartData {
  queryTime: string;
  phase: "day" | "night";
  dayName: string;
  dayRuler: number;
  dayRulerName: string;
  dayRulerSymbol: string;
  dayRulerColor: string;

  yamNumber: number;
  mainPeriodStart: string;
  mainPeriodEnd: string;
  secondsRemainingMain: number;

  subYamNumber: number;
  subPeriodStart: string;
  subPeriodEnd: string;
  secondsRemainingSub: number;

  microYamNumber: number;
  secondsRemainingMicro: number;

  currentPlanet: number;
  currentPlanetName: string;
  currentPlanetSymbol: string;
  currentPlanetColor: string;
  currentPrimaryHouse: number;
  currentZodiacName: string;

  currentStatus: string;
  currentStatusSymbol: string;
  currentStatusLabel: string;
  currentDirectionThai: string;
  currentDirectionAngleDeg: number;

  yamSchedule: HoraNuYamPeriod[];
  houseChart: HoraNuHouseEntry[];
}

// ─── STEP 4.4 — Timing Comparison Data Contracts ─────────────────────────────

export type TimingSuitability = "optimal" | "favorable" | "neutral" | "cautious" | "avoid";

export interface CandidateWindow {
  /** รหัสช่วงเวลา เช่น "A" | "B" | "C" */
  id: string;
  /** ป้ายกำกับ เช่น "ช่วงเช้า (A)", "ช่วงบ่าย (B)" */
  label?: string;
  /** เวลาเริ่มต้น "HH:mm" */
  start: string;
  /** เวลาสิ้นสุด "HH:mm" */
  end: string;
  /** คะแนนพลังงาน 0–100 ที่คำนวณโดย Engine */
  score: number;
  /** ระดับความเหมาะสม */
  suitability: TimingSuitability;
  /** จุดเด่นและข้อดีของช่วงเวลานี้ (ภาษาชีวิตจริง ไม่เปิดศัพท์เทคนิคใน L1) */
  strengths: string[];
  /** ข้อควรระวัง (ถ้ามี) */
  cautions: string[];
  /** กิจกรรมที่เกื้อหนุนเป็นพิเศษ */
  recommended_for: string[];
}

export interface CandidateWindowInput {
  id?: string;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  label?: string;
}

export interface TimingComparisonResult {
  question: string;
  activity: string;
  date: string; // "YYYY-MM-DD"
  candidates: CandidateWindow[];
  recommendedCandidate: CandidateWindow;
  reason: string;
  actionable?: string;
  queryId?: string;
  isBookmarked?: boolean;
}

// ─── STEP 4.5 — Personal Wisdom Intelligence Data Contracts ──────────────────

export type PersonalPatternType =
  | "timing_affinity"
  | "activity_affinity"
  | "action_impact"
  | "decision_consistency";

export interface PersonalPattern {
  type: PersonalPatternType;
  title: string;
  highlight: string;
  sampleCount: number;
  confidence: number; // 0 - 100
  description: string;
  icon?: string;
}

export interface PersonalWisdomIntelligence {
  summary: string;
  patterns: PersonalPattern[];
  actionRecommendations: string[];
  hasSufficientData: boolean;
  sampleCount: number;
  threshold: number;
  stats: {
    totalQueries: number;
    trackedOutcomes: number;
    actionTakenCount: number;
    successRate: number;
    averageRating: number;
  };
  lastUpdated: string;
}

// ─── STEP 5.1 — Personal Auspicious Calendar Data Contracts ──────────────────

export type CalendarEnergyLevel = "golden" | "favorable" | "neutral" | "caution" | "avoid";

export interface CalendarTimeWindow {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  level: CalendarEnergyLevel;
  score: number;     // 0 - 100
  title: string;
  suitableFor: string[];
  cautions: string[];
  plainAdvice: string;
  isGoldenWindow: boolean;
}

export interface CalendarDomainScore {
  domain: "career" | "finance" | "relationship" | "wellness";
  label: string;
  score: number; // 0 - 100
  verdict: string;
  icon: string;
}

export interface CalendarDayIntelligence {
  date: string; // "YYYY-MM-DD"
  lunarDayInfo: {
    lunarDateStr: string;
    moonPhase: string;
    isWanPhra: boolean;
    dayOfWeekThai: string;
  };
  overallScore: number; // 0 - 100
  dailyTheme: string;
  dailySummary: string;
  goldenWindow: CalendarTimeWindow | null;
  timelineWindows: CalendarTimeWindow[];
  domainScores: CalendarDomainScore[];
  hasPersonalContext: boolean;
  personalNote?: string;
}

export interface CalendarMonthDayOverview {
  date: string; // "YYYY-MM-DD"
  day: number;
  overallScore: number;
  hasGoldenWindow: boolean;
  isWanPhra: boolean;
  dominantEnergy: CalendarEnergyLevel;
  appointmentCount: number;
}

// ─── STEP 5.2 — Personal Timing Reminder Data Contracts ─────────────────────

export type TimingReminderType = "daily_brief" | "golden_window" | "appointment";
export type ReminderPriority = "high" | "normal" | "low";

export interface TimingReminder {
  id: string;
  userId: string;
  type: TimingReminderType;
  priority: ReminderPriority;
  title: string;
  message: string;
  targetTime?: string; // "HH:mm" หรือ ISO
  windowScore?: number;
  actionUrl?: string;
  actionLabel?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface TimingReminderSettings {
  enableDailyBrief: boolean;
  dailyBriefTime: string; // "07:30"
  enableGoldenWindowAlert: boolean;
  goldenWindowLeadMinutes: number; // e.g. 30
  enableAppointmentReminder: boolean;
  appointmentLeadMinutes: number; // e.g. 30
  enableLineNotify: boolean;
}

export const DEFAULT_TIMING_REMINDER_SETTINGS: TimingReminderSettings = {
  enableDailyBrief: true,
  dailyBriefTime: "07:30",
  enableGoldenWindowAlert: true,
  goldenWindowLeadMinutes: 30,
  enableAppointmentReminder: true,
  appointmentLeadMinutes: 30,
  enableLineNotify: false,
};
