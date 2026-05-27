/**
 * analytics.ts
 * User Behavior Logging สำหรับ Phopephum
 */
import { createClient } from '@/lib/supabase'

export type EventType =
  | 'page_view'
  | 'calc_hora'        // คำนวณยาม
  | 'calc_chart'       // ดูดวงชะตา
  | 'calc_transit'     // ดูจร
  | 'ai_report_gen'    // สร้าง AI Report
  | 'ai_question'      // ถาม AI
  | 'pdf_export'       // Export PDF
  | 'upgrade_click'    // คลิก Upgrade
  | 'feature_blocked'  // ถูก Block เพราะ Plan ไม่พอ

let _sessionId: string | null = null

function getSessionId(): string {
  if (_sessionId) return _sessionId
  _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return _sessionId
}

export async function logEvent(
  eventType: EventType,
  eventData?: Record<string, unknown>
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('behavior_logs').insert({
      user_id: user.id,
      event_type: eventType,
      event_data: eventData,
      session_id: getSessionId(),
    })
  } catch {
    // Logging ไม่ควร crash แอป
  }
}

export async function logFeatureBlocked(feature: string) {
  await logEvent('feature_blocked', { feature, timestamp: Date.now() })
}

export async function logPageView(page: string) {
  await logEvent('page_view', { page })
}
