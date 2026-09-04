/**
 * timingReminder.server.ts — STEP 5.2 Personal Timing Reminder Service
 * 
 * Concept: Personal Timing Reminder (Not spam notifications, but high-value contextual timing alerts)
 * 
 * 3 Core Types:
 * 1. daily_brief: สรุปภาพรวมพลังงานและการเปิดรับโอกาสประจำวัน (Morning Brief)
 * 2. golden_window: แจ้งเตือนช่วงเวลาทองคำของวันเพื่อกระตุ้น Action สำคัญ
 * 3. appointment: แจ้งเตือนล่วงหน้า 30 นาที พร้อมระบุความสอดคล้องกับจังหวะเวลา
 * 
 * Hard Boundaries:
 * ❌ ไม่คำนวณโหราศาสตร์ใหม่เองเด็ดขาด — ใช้ CalendarDayIntelligence และ appointments เป็น Single Source of Truth
 * ❌ ไม่ส่งสแปม — แจ้งเตือนเฉพาะช่วงเวลาที่มีความหมาย
 * ❌ รักษาภาษาชีวิตจริง (Plain Thai) ปราศจากศัพท์โหราศาสตร์ชั้น L1
 */

import type {
  CalendarDayIntelligence,
  TimingReminder,
  TimingReminderSettings,
  TimingReminderType,
  ReminderPriority
} from "@phopephum/types";
import { DEFAULT_TIMING_REMINDER_SETTINGS } from "@phopephum/types";
import { calculateDayIntelligence, type CalendarProfileContext } from "./calendarIntelligence.server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AppointmentContext {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  score?: number;
  verdict?: string;
  advice?: string;
}

export function parseTimeToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
}

/**
 * Pure Eligibility Engine: ประเมินการแจ้งเตือนที่ตรงเงื่อนไขจากเวลาและบริบทปัจจุบัน
 * (Deterministic 100% — ไม่ต่อ Database / Network)
 */
export function evaluateEligibleReminders(params: {
  now: Date;
  userId: string;
  settings: TimingReminderSettings;
  dayIntelligence: CalendarDayIntelligence;
  appointments: AppointmentContext[];
}): TimingReminder[] {
  const { now, userId, settings, dayIntelligence, appointments } = params;
  const reminders: TimingReminder[] = [];

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dateStr = dayIntelligence.date;

  // 1. Daily Morning Brief (Type A)
  if (settings.enableDailyBrief) {
    const briefTargetMin = parseTimeToMinutes(settings.dailyBriefTime || "07:30");
    // Eligible if current time is around or after dailyBriefTime on that day
    if (nowMinutes >= briefTargetMin - 15) {
      reminders.push({
        id: `daily-brief-${dateStr}-${userId}`,
        userId,
        type: "daily_brief",
        priority: "normal",
        title: `🌅 สรุปทิศทางประจำวัน: ${dayIntelligence.dailyTheme}`,
        message: `${dayIntelligence.dailySummary}`,
        targetTime: settings.dailyBriefTime,
        windowScore: dayIntelligence.overallScore,
        actionUrl: `/dashboard/calendar?date=${dateStr}`,
        actionLabel: "ดูปฏิทินวันนี้",
        isRead: false,
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(briefTargetMin / 60), briefTargetMin % 60).toISOString(),
        metadata: {
          overallScore: dayIntelligence.overallScore,
          isWanPhra: dayIntelligence.lunarDayInfo.isWanPhra,
        },
      });
    }
  }

  // 2. Golden Window Alert (Type B)
  if (settings.enableGoldenWindowAlert && dayIntelligence.goldenWindow) {
    const gw = dayIntelligence.goldenWindow;
    const gwStartMin = parseTimeToMinutes(gw.startTime);
    const gwEndMin = parseTimeToMinutes(gw.endTime);
    const leadMin = settings.goldenWindowLeadMinutes || 30;

    // Eligible if within lead time (e.g. 30 mins before) or actively during the window
    if (nowMinutes >= gwStartMin - leadMin && nowMinutes <= gwEndMin) {
      const isDuring = nowMinutes >= gwStartMin;
      const timeRemaining = Math.max(0, gwStartMin - nowMinutes);

      reminders.push({
        id: `golden-window-${dateStr}-${gw.id}-${userId}`,
        userId,
        type: "golden_window",
        priority: "high",
        title: isDuring
          ? `⭐ ขณะนี้อยู่ในช่วงเวลาทองคำ (${gw.startTime}–${gw.endTime} น.)`
          : `⭐ อีก ${timeRemaining} นาทีถึงช่วงเวลาทองคำ (${gw.startTime}–${gw.endTime} น.)`,
        message: `${gw.plainAdvice} เหมาะสำหรับ: ${gw.suitableFor.slice(0, 3).join(", ")}`,
        targetTime: gw.startTime,
        windowScore: gw.score,
        actionUrl: `/dashboard/calendar?date=${dateStr}`,
        actionLabel: "วางแผนนัดหมายช่วงนี้",
        isRead: false,
        createdAt: now.toISOString(),
        metadata: {
          startTime: gw.startTime,
          endTime: gw.endTime,
          suitableFor: gw.suitableFor,
          score: gw.score,
        },
      });
    }
  }

  // 3. Appointment Timing Reminder (Type C)
  if (settings.enableAppointmentReminder && appointments.length > 0) {
    const leadMin = settings.appointmentLeadMinutes || 30;

    for (const app of appointments) {
      if (app.event_date !== dateStr) continue;

      const appStartMin = parseTimeToMinutes(app.event_time);
      // Eligible if within leadMin before event_time and up to 30 mins past start
      if (nowMinutes >= appStartMin - leadMin && nowMinutes <= appStartMin + 30) {
        const diff = appStartMin - nowMinutes;
        const timingPrefix = diff > 0 ? `อีก ${diff} นาที` : `ถึงเวลาแล้ว`;

        // Check contextual alignment with Golden Window
        let contextNote = "";
        if (dayIntelligence.goldenWindow) {
          const gwStart = parseTimeToMinutes(dayIntelligence.goldenWindow.startTime);
          const gwEnd = parseTimeToMinutes(dayIntelligence.goldenWindow.endTime);
          if (appStartMin >= gwStart && appStartMin < gwEnd) {
            contextNote = " (ตรงกับช่วงเวลาทองคำพอดี ⭐)";
          }
        }

        reminders.push({
          id: `appointment-${app.id}-${userId}`,
          userId,
          type: "appointment",
          priority: "high",
          title: `🔔 ${timingPrefix}: ${app.title}`,
          message: `นัดหมายเวลา ${app.event_time} น.${contextNote} ${app.advice || "ขอให้การประสานงานราบรื่นและสัมฤทธิผล"}`,
          targetTime: app.event_time,
          windowScore: app.score,
          actionUrl: `/dashboard/calendar?date=${dateStr}`,
          actionLabel: "เปิดดูนัดหมาย",
          isRead: false,
          createdAt: now.toISOString(),
          metadata: {
            appointmentId: app.id,
            title: app.title,
            eventTime: app.event_time,
          },
        });
      }
    }
  }

  // Sort by priority (high first), then time
  return reminders.sort((a, b) => {
    if (a.priority === "high" && b.priority !== "high") return -1;
    if (a.priority !== "high" && b.priority === "high") return 1;
    return 0;
  });
}

/**
 * Get active timing reminders for user with Database persistence overlay
 */
export async function getTimingRemindersForUser(params: {
  userId: string;
  supabase: SupabaseClient;
  now?: Date;
  dateStr?: string;
  profile?: CalendarProfileContext | null;
}): Promise<{
  reminders: TimingReminder[];
  unreadCount: number;
  settings: TimingReminderSettings;
}> {
  const { userId, supabase, profile } = params;
  const now = params.now || new Date();
  const dateStr = params.dateStr || now.toISOString().split("T")[0];

  // 1. Fetch user reminder settings from profiles
  let settings: TimingReminderSettings = { ...DEFAULT_TIMING_REMINDER_SETTINGS };
  try {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("reminder_settings")
      .eq("id", userId)
      .maybeSingle();

    if (profileData?.reminder_settings) {
      settings = { ...settings, ...profileData.reminder_settings };
    }
  } catch (err) {
    // Graceful fallback to default settings
  }

  // 2. Fetch today's appointments
  let appointments: AppointmentContext[] = [];
  try {
    const { data: appsData } = await supabase
      .from("appointments")
      .select("id, title, event_date, event_time, score, verdict, advice")
      .eq("user_id", userId)
      .eq("event_date", dateStr);

    if (appsData) {
      appointments = appsData;
    }
  } catch (err) {
    // Graceful fallback
  }

  // 3. Compute CalendarDayIntelligence for today
  const dayIntelligence = await calculateDayIntelligence(dateStr, profile);

  // 4. Evaluate eligible reminders
  const evaluated = evaluateEligibleReminders({
    now,
    userId,
    settings,
    dayIntelligence,
    appointments,
  });

  // 5. Check read / dismissed records from timing_reminders table if exists
  const readReminderIds = new Set<string>();
  try {
    const { data: dbReminders } = await supabase
      .from("timing_reminders")
      .select("id, is_read, dismissed_at")
      .eq("user_id", userId)
      .eq("is_read", true);

    if (dbReminders) {
      for (const r of dbReminders) {
        readReminderIds.add(r.id);
      }
    }
  } catch (err) {
    // Graceful fallback if table is not yet migrated
  }

  // Mark read status
  const finalReminders = evaluated.map((r) => ({
    ...r,
    isRead: readReminderIds.has(r.id),
  }));

  const unreadCount = finalReminders.filter((r) => !r.isRead).length;

  return {
    reminders: finalReminders,
    unreadCount,
    settings,
  };
}

/**
 * Mark a reminder as read
 */
export async function markReminderAsRead(
  userId: string,
  reminderId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("timing_reminders")
      .upsert({
        id: reminderId,
        user_id: userId,
        is_read: true,
      }, { onConflict: "id" });

    return !error;
  } catch (err) {
    return false;
  }
}

/**
 * Update user reminder settings
 */
export async function updateReminderSettings(
  userId: string,
  settings: Partial<TimingReminderSettings>,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("reminder_settings")
      .eq("id", userId)
      .maybeSingle();

    const currentSettings = profile?.reminder_settings || DEFAULT_TIMING_REMINDER_SETTINGS;
    const newSettings = { ...currentSettings, ...settings };

    const { error } = await supabase
      .from("profiles")
      .update({ reminder_settings: newSettings })
      .eq("id", userId);

    return !error;
  } catch (err) {
    return false;
  }
}
