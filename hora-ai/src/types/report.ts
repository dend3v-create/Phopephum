/**
 * types/report.ts
 * AI Report & TQM types
 */

export interface ReportSection {
  title: string
  content: string
  icon?: string
}

export interface WeeklyPlan {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

export interface AIReportContent {
  overview: string
  strengths: string[]
  challenges: string[]
  career: string
  relationships: string
  health: string
  auspiciousDays: string
  affirmation: string
  weeklyPlan: WeeklyPlan
}

export interface AIReport {
  id: string
  userId: string
  reportType: 'life_report'
  content: AIReportContent
  pdfUrl?: string
  tokensUsed: number
  createdAt: string
}

export interface TQMData {
  week: string       // 'YYYY-WW'
  plan: WeeklyPlan
  review?: Partial<WeeklyPlan>  // สิ่งที่ทำได้จริง
}
