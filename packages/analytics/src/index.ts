export const EVENTS = {
  USER_REGISTERED: "user_registered",
  CALC_HORA: "calc_hora",
  CALC_TRANSIT: "calc_transit",
  AI_REPORT_GENERATED: "ai_report_generated",
  FEATURE_BLOCKED: "feature_blocked",
  SUBSCRIPTION_STARTED: "subscription_started",
  DAILY_VISIT: "daily_visit",
  PUSH_OPENED: "push_opened",
  PDF_EXPORTED: "pdf_exported",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
