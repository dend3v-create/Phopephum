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

// ─── STEP 6: Economic, Membership & Sands Architecture ────────────────────────
export type CanonicalPlan = "free" | "premium" | "pro" | "master";
export type LegacyPlan = "basic" | "imperial" | "lifetime";
export type MembershipPlan = CanonicalPlan | LegacyPlan;

export type MembershipStatus = "active" | "expired" | "pending" | "canceled";

export type SandsRewardClass = "daily_ritual" | "wisdom" | "community" | "spend" | "adjustment";

export type SandsActivityType =
  // Daily Rituals
  | "daily_login"
  | "checkin"
  | "intention"
  | "reflection"
  | "golden_window_action"
  // Wisdom
  | "outcome_tracking"
  | "meaningful_feedback"
  | "streak_7d"
  // Community
  | "referral_signup"
  | "friend_first_action"
  | "creator_contribution"
  // Spend / Redemption / Purchase
  | "ai_report_redeem"
  | "timing_comparison_redeem"
  | "wisdom_deep_dive"
  | "calendar_lookahead"
  | "consultation_voucher"
  | "sands_purchase"
  // Adjustment
  | "admin_adjustment";

export interface SandsLedgerEntry {
  id: string;
  userId: string;
  amount: number; // positive = earn, negative = spend
  balanceBefore: number;
  balanceAfter: number;
  rewardClass: SandsRewardClass;
  activityType: SandsActivityType;
  referenceId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SandsDailySummary {
  currentBalance: number;
  todayEarned: number;
  dailyCap: number;
  remainingDailyQuota: number;
  isDailyCapReached: boolean;
}

export interface SandsRedemptionItem {
  id: string;
  title: string;
  description: string;
  sandsCost: number;
  activityType: SandsActivityType;
  eligiblePlans: CanonicalPlan[];
  icon: string;
  badge?: string;
  isCampaignBenefit?: boolean;
}

export type PaymentProviderType = "stripe" | "opn" | "gbprimepay" | "promptpay" | "manual_slip";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface PaymentTransaction {
  id: string;
  userId: string;
  provider: PaymentProviderType;
  providerTransactionId?: string | null;
  planId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementPolicy {
  plan: CanonicalPlan;
  maxDailyAppointments: number;
  maxSavedCustomers: number;
  maxTimingComparisons: number;
  aiReportsMonthlyQuota: number;
  calendarLookaheadDays: number;
  canExportWhitelabelPdf: boolean;
  canUseTimingReminders: boolean;
  canAccessPersonalPatterns: boolean;
}

// ─── STEP 6.5: Affiliate & Partner Economy Contracts (V3 Architecture) ───────
export type PartnerEntityType = "individual" | "corporate";
export type PartnerTier = "affiliate" | "creator" | "partner_pro" | "institutional" | "master";
export type PartnerStatus = "active" | "suspended" | "pending_kyc";
export type PartnerVerificationStatus = "unverified" | "pending_review" | "verified" | "rejected";

export interface PartnerTermsVersion {
  version: string;
  title: string;
  documentUrl: string;
  documentChecksum: string;
  effectiveFrom: string;
  isActive: boolean;
}

export interface PartnerTermsAcceptance {
  id: string;
  partnerId: string;
  termsVersion: string;
  ipHash: string;
  userAgentHash: string;
  acceptedAt: string;
}

export interface PartnerEntity {
  id: string;
  userId: string;
  partnerCode: string;
  tierCode: PartnerTier;
  status: PartnerStatus;
  verificationStatus: PartnerVerificationStatus;
  
  // 3-Balance Model + Clawback Debt (Materialized Cache from partner_ledger)
  holdingBalance: number;
  availableBalance: number;
  payoutPendingBalance: number;
  clawbackPendingBalance?: number;
  
  totalEarned: number;
  totalWithdrawn: number;
  lifetimeReferredCount: number;
  retentionPolicy: string;
  retentionUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Backwards compatibility alias
export type PartnerProfileRecord = PartnerEntity & {
  tier: PartnerTier;
  commissionRate: number;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
  promptpayId?: string | null;
  taxId?: string | null;
  legalName?: string | null;
  entityType?: PartnerEntityType | null;
  isVatRegistered?: boolean;
};

export interface PartnerTaxProfile {
  id: string;
  partnerId: string;
  entityType: PartnerEntityType;
  taxId: string;
  legalName: string;
  registeredAddress: Record<string, unknown>;
  isVatRegistered: boolean;
  withholdingTaxExempt: boolean;
  taxDocumentUrl?: string | null;
  verificationNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerPayoutDestination {
  id: string;
  partnerId: string;
  payoutMethod: "bank_transfer" | "promptpay";
  bankCode: string;
  accountNumber: string;
  accountName: string;
  promptpayId?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxRule {
  ruleCode: string;
  description: string;
  entityType: "individual" | "corporate" | "any";
  withholdingRate: number;
  minThresholdThb: number;
  requiresTaxCertificate: boolean;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface CommissionPlan {
  id: string;
  planCode: string;
  planName: string;
  planType: "recurring" | "first_month_only" | "campaign_promotional";
  holdingPeriodDays: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface CommissionPlanAssignment {
  id: string;
  assignmentScope: "tier" | "partner" | "campaign";
  tierCode?: PartnerTier | null;
  partnerId?: string | null;
  campaignCode?: string | null;
  planId: string;
  priority: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface CommissionRateRule {
  id: string;
  planId: string;
  subscriptionPlanCode: string;
  ratePercentage: number;
  fixedBonusThb: number;
}

export interface CommissionEvent {
  id: string;
  partnerId: string;
  referredUserId: string;
  subscriptionPaymentId: string;
  subscriptionPlanCode: string;
  grossAmountThb: number;
  vatRate: number;
  vatAmountThb: number;
  commissionableAmountThb: number;
  planIdApplied: string;
  commissionRateApplied: number;
  commissionAmountThb: number;
  status: "holding" | "cleared" | "clawback_refunded" | "void";
  holdingUntil: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface PartnerCommissionItem {
  id: string;
  subscriptionPaymentId: string;
  subscriptionPlanCode: string;
  planName?: string;
  maskedBuyerName: string; // Masked for privacy (e.g. "User #***8492" - NO PII)
  grossAmountThb: number;
  vatRate: number;
  vatAmountThb: number;
  commissionableAmountThb: number;
  commissionRateApplied: number;
  commissionAmountThb: number;
  status: "holding" | "cleared" | "clawback_refunded" | "void";
  holdingUntil: string;
  isHoldingExpired: boolean;
  createdAt: string;
}

export interface PartnerReferralPerformance {
  totalClicks: number;
  totalConverted: number;
  conversionRate: number;
  activeReferralsCount: number;
  topCampaigns: Array<{ campaignCode: string; clicks: number; conversions: number }>;
  recentReferrals: Array<{
    maskedName: string;
    tierOrPlan: string;
    joinedAt: string;
  }>;
}

export type PartnerLedgerEntryType =
  | "commission_holding_in"
  | "commission_cleared"
  | "commission_clawback"
  | "payout_reserved"
  | "payout_settled"
  | "payout_rejected"
  | "manual_adjustment"
  // Legacy compatibility types
  | "commission_earned"
  | "holding_cleared"
  | "payout_requested"
  | "payout_refund_reversal";

export interface PartnerLedgerEntry {
  id: string;
  partnerId: string;
  entryType: PartnerLedgerEntryType;
  amount: number;
  holdingBalanceBefore: number;
  holdingBalanceAfter: number;
  availableBalanceBefore: number;
  availableBalanceAfter: number;
  payoutPendingBefore: number;
  payoutPendingAfter: number;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  notes?: string | null;
  description?: string | null;
  createdAt: string;
  
  // Legacy aliases
  status?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  referredUserId?: string | null;
  holdingUntil?: string | null;
}

export type PayoutRequestStatus =
  | "pending_review"
  | "approved"
  | "processing"
  | "reconciling"
  | "completed"
  | "rejected"
  | "failed"
  | "cancelled"
  | "manual_review"
  | "pending"; // Legacy alias

export type PayoutRetryClassification =
  | "SAFE_TO_RETRY"
  | "WAIT_FOR_PROVIDER"
  | "MANUAL_REVIEW"
  | "FINAL_FAILURE"
  | "COMPLETED";

export interface PayoutRequest {
  id: string;
  requestNumber: string;
  partnerId: string;
  requestedAmountThb: number;
  taxRuleCodeApplied: string;
  withholdingRateApplied: number;
  withholdingTaxAmountThb: number;
  netPayoutAmountThb: number;
  destinationSnapshot: Record<string, unknown>;
  status: PayoutRequestStatus;
  rejectionReason?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  failedAt?: string | null;
  omiseTransferId?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Backwards compatibility alias
export type PayoutRequestRecord = PayoutRequest & {
  amount: number;
  whtAmount: number;
  netPayout: number;
  bankInfo: {
    bankName: string;
    accountNo: string;
    accountName: string;
    taxId?: string;
  };
};

export interface PayoutTransaction {
  id: string;
  payoutRequestId: string;
  actualTransferredAmountThb: number;
  transferBankRef: string;
  transferProofFileUrl: string;
  whtCertificateNumber?: string | null;
  transferredAt: string;
  settledBy: string;
  notes?: string | null;
}

export interface PartnerBenefit {
  id: string;
  partnerId: string;
  benefitType: "consultation_discount" | "report_unlock_subsidy" | "workshop_access";
  title: string;
  description: string;
  sandsRedeemCost: number;
  benefitReferenceValueThb: number; // Closed-loop non-monetary reference value, NOT exchange rate
  partnerSubsidyBudgetThb: number;
  isActive: boolean;
  expiresAt?: string | null;
}

// ─── PARTNER ONBOARDING & FINANCIAL ELIGIBILITY TYPES (STEP 7.2D.2) ───────────

export type PartnerOnboardingStep =
  | "applied"
  | "profile_complete"
  | "tax_profile_complete"
  | "payout_destination_complete"
  | "terms_accepted"
  | "active";

export type PartnerOnboardingStatus =
  | "applied"
  | "profile_complete"
  | "tax_profile_complete"
  | "payout_destination_complete"
  | "terms_accepted"
  | "active"
  | "suspended"
  | "rejected";

export type PartnerEligibilityOperation = "referral" | "commission" | "payout";

export interface PartnerEligibilityResult {
  eligible: boolean;
  partnerId: string;
  partnerCode: string;
  status: PartnerOnboardingStatus;
  operation: PartnerEligibilityOperation;
  missingRequirements: string[];
  termsStatus: {
    accepted: boolean;
    activeVersion: string;
    acceptedVersion?: string;
  };
  taxProfileValid: boolean;
  payoutDestinationValid: boolean;
  reason?: string;
}

// ─── FINANCIAL RECONCILIATION TYPES & CONTRACTS (STEP 7.2E) ─────────────────

export interface FinancialReconciliationConfig {
  reconcilingSlaHours: number; // Configurable SLA (Default: 48)
  holdingMaturityPeriodDays: number; // Default: 14
  holdingClearanceGraceHours: number; // Default: 2
  minimumPayoutThresholdThb: number; // Default: 500.00
  batchClearanceLimit: number; // Default: 100
  maxAllowedDiscrepancyDeltaThb: number; // Strictly 0.00 (Zero Drift)
}

export type DiscrepancyCode =
  | "DISC-01" // ORPHANED_COMMISSION
  | "DISC-02" // MISSING_COMMISSION
  | "DISC-03" // COMMISSION_AMOUNT_MISMATCH
  | "DISC-04" // HOLDING_OVERDUE_CLEARANCE
  | "DISC-05" // ORPHANED_OMISE_TRANSFER
  | "DISC-06" // TRANSFER_SETTLEMENT_MISSING
  | "DISC-07" // LEDGER_DRIFT_DETECTED
  | "DISC-08"; // RECONCILING_SLA_EXCEEDED

export type DiscrepancySeverity = "yellow" | "red";

export interface ReconciliationRunRecord {
  id: string;
  runType: "hourly_surveillance" | "daily_deep_reconciliation" | "manual_audit";
  status: "green" | "yellow" | "red";
  totalPaymentsChecked: number;
  totalCommissionsChecked: number;
  totalTransfersChecked: number;
  totalPartnersChecked: number;
  discrepancyCount: number;
  summaryMetadata: Record<string, unknown>;
  startedAt: string;
  completedAt: string;
  createdAt: string;
}

export interface ReconciliationDiscrepancyRecord {
  id: string;
  runId: string;
  discrepancyCode: DiscrepancyCode;
  severity: DiscrepancySeverity;
  partnerId?: string | null;
  partnerCode?: string | null;
  referenceTable?: string | null;
  referenceId?: string | null;
  expectedValue?: number | null;
  actualValue?: number | null;
  deltaThb?: number | null;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolutionNotes?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

// ─── PARTNER STATEMENT & 50 TAWI REPORTING TYPES (STEP 7.2F) ─────────────────

export interface PartnerStatementLineItem {
  id: string;
  timestamp: string;
  entryType: string;
  description: string;
  planCode?: string | null;
  grossAmountThb?: number | null;
  vatBaseThb?: number | null;
  commissionRate?: number | null;
  grossCommissionThb?: number | null;
  holdingDeltaThb: number;
  availableDeltaThb: number;
  payoutPendingDeltaThb: number;
  clawbackDebtDeltaThb: number;
  whtRate?: number | null;
  whtAmountThb?: number | null;
  netPayoutThb?: number | null;
  referenceId?: string | null;
  referenceType?: string | null;
  runningHoldingBalance: number;
  runningAvailableBalance: number;
}

export interface PartnerMonthlyStatement {
  partnerId: string;
  partnerCode: string;
  tierCode: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  openingHoldingBalance: number;
  openingAvailableBalance: number;
  totalNewCommissionEarned: number;
  totalHoldingReleased: number;
  totalHoldingRefunded: number;
  totalPayoutsReserved: number;
  totalPayoutReversals: number;
  totalClawbackOffset: number;
  closingHoldingBalance: number;
  closingAvailableBalance: number;
  lineItems: PartnerStatementLineItem[];
  generatedAt: string;
}

export interface Wht50TawiCertificateRecord {
  payoutRequestId: string;
  requestNumber: string;
  partnerId: string;
  partnerCode: string;
  taxId: string;
  legalName: string;
  entityType: "individual" | "corporate";
  registeredAddress?: Record<string, unknown>;
  paymentDate: string;
  incomeType: "commission_income" | "service_fee";
  grossAmountThb: number;
  whtRateApplied: number;
  whtAmountThb: number;
  netPaidAmountThb: number;
  whtCertificateNumber?: string | null;
  omiseTransferId?: string | null;
}

export interface Wht50TawiReport {
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  totalCertificatesCount: number;
  totalGrossIncomeThb: number;
  totalWhtRemittedThb: number;
  totalNetPaidThb: number;
  records: Wht50TawiCertificateRecord[];
  generatedAt: string;
}

export interface FinanceOperationsSummary {
  activePartnersCount: number;
  totalHoldingBalanceThb: number;
  totalAvailableBalanceThb: number;
  totalPayoutPendingThb: number;
  totalLifetimeEarnedThb: number;
  totalLifetimeWithdrawnThb: number;
  pendingPayoutRequestsCount: number;
  pendingPayoutAmountThb: number;
  lastReconciliationStatus: "green" | "yellow" | "red";
  openDiscrepanciesCount: number;
}



