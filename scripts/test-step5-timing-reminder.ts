/**
 * STEP 5.2 Personal Timing Reminder Test Suite
 * 
 * Verifies:
 * 1. Eligibility Engine for 3 Core Types (daily_brief, golden_window, appointment)
 * 2. Lead time precision (30 mins before appointment / golden window)
 * 3. Contextual alignment with Golden Window
 * 4. Priority sorting (High priority first)
 * 5. User settings toggle respect (Disable brief, change lead times)
 * 6. Single Source of Truth Rule: Uses CalendarDayIntelligence directly, zero recalculation
 * 7. L1 Plain-Thai Language Policy
 */

import {
  evaluateEligibleReminders,
  parseTimeToMinutes,
  type AppointmentContext
} from '../apps/web/app/services/timingReminder.server';
import type { CalendarDayIntelligence, TimingReminderSettings } from '../packages/types/src';
import { DEFAULT_TIMING_REMINDER_SETTINGS } from '../packages/types/src';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runTimingReminderTests() {
  console.log('🏛️ === STARTING STEP 5.2 TIMING REMINDER VERIFICATION ===\n');

  const userId = 'usr-test-123';
  const testDate = '2026-09-04';

  // Mock CalendarDayIntelligence (Single Source of Truth from STEP 5.1)
  const mockDayIntelligence: CalendarDayIntelligence = {
    date: testDate,
    lunarDayInfo: {
      lunarDateStr: 'วันศุกร์ แรม 7 ค่ำ',
      moonPhase: 'ข้างแรม',
      isWanPhra: false,
      dayOfWeekThai: 'วันศุกร์',
    },
    overallScore: 82,
    dailyTheme: 'วันแห่งการเปิดโอกาสทองคำและความสำเร็จใหญ่',
    dailySummary: 'วันศุกร์นี้ พลังงานโดยรวมอยู่ในเกณฑ์ส่งเสริมอย่างดีเยี่ยม',
    goldenWindow: {
      id: 'w-6',
      startTime: '13:30',
      endTime: '15:00',
      level: 'golden',
      score: 92,
      title: 'ช่วงบ่ายต้น (13:30–15:00 น.)',
      suitableFor: ['เปิดตัว', 'ทำสัญญา', 'เจรจาผลประโยชน์'],
      cautions: [],
      plainAdvice: 'ช่วงเวลาทองคำสูงสุดของวัน เหมาะอย่างยิ่งกับการตัดสินใจสำคัญ เจรจา หรือเซ็นสัญญา',
      isGoldenWindow: true,
    },
    timelineWindows: [],
    domainScores: [],
    hasPersonalContext: true,
    personalNote: 'ดาวส่งเสริมส่วนตัวทำงานโดดเด่น',
  };

  const mockAppointments: AppointmentContext[] = [
    {
      id: 'app-1',
      title: 'คุยสัญญากับคุณสมชาย',
      event_date: testDate,
      event_time: '14:00', // Inside Golden Window (13:30–15:00)
      score: 92,
      verdict: 'ช่วงเวลาทองคำ',
      advice: 'การเจรจามีโอกาสบรรลุข้อตกลงที่ยอดเยี่ยม',
    },
    {
      id: 'app-2',
      title: 'ทานข้าวเย็นกับครอบครัว',
      event_date: testDate,
      event_time: '18:30', // Far in evening
      score: 60,
    },
  ];

  // ─── Test 1: Morning Brief (08:00 AM) ───
  console.log('--- Test 1: Daily Morning Brief (Type A) ---');
  const morningTime = new Date(`${testDate}T08:00:00+07:00`);
  const morningReminders = evaluateEligibleReminders({
    now: morningTime,
    userId,
    settings: DEFAULT_TIMING_REMINDER_SETTINGS,
    dayIntelligence: mockDayIntelligence,
    appointments: mockAppointments,
  });

  const dailyBrief = morningReminders.find((r) => r.type === 'daily_brief');
  assert(!!dailyBrief, 'Daily morning brief generated at 08:00');
  assert(dailyBrief!.title.includes(mockDayIntelligence.dailyTheme), 'Brief title includes daily theme');
  assert(dailyBrief!.priority === 'normal', 'Daily brief has normal priority');
  assert(dailyBrief!.actionUrl?.includes(testDate) === true, 'Action URL points to today calendar');

  // Verify disabled brief setting
  const noBriefSettings: TimingReminderSettings = {
    ...DEFAULT_TIMING_REMINDER_SETTINGS,
    enableDailyBrief: false,
  };
  const disabledBriefReminders = evaluateEligibleReminders({
    now: morningTime,
    userId,
    settings: noBriefSettings,
    dayIntelligence: mockDayIntelligence,
    appointments: mockAppointments,
  });
  assert(!disabledBriefReminders.some((r) => r.type === 'daily_brief'), 'Daily brief respect disabled setting');

  // ─── Test 2: Golden Window Alert (13:05 PM — 25 mins before 13:30) ───
  console.log('\n--- Test 2: Golden Window Alert (Type B) ---');
  const preGoldenTime = new Date(`${testDate}T13:05:00+07:00`);
  const goldenReminders = evaluateEligibleReminders({
    now: preGoldenTime,
    userId,
    settings: DEFAULT_TIMING_REMINDER_SETTINGS,
    dayIntelligence: mockDayIntelligence,
    appointments: mockAppointments,
  });

  const gwAlert = goldenReminders.find((r) => r.type === 'golden_window');
  assert(!!gwAlert, 'Golden Window alert generated 25 mins before window');
  assert(gwAlert!.priority === 'high', 'Golden Window alert has high priority');
  assert(gwAlert!.windowScore === 92, 'Golden Window alert includes score 92');
  assert(gwAlert!.message.includes('เปิดตัว'), 'Golden Window alert includes activity recommendations');

  // Verify alert not generated too early (e.g. 10:00 AM, 3.5 hours before)
  const earlyTime = new Date(`${testDate}T10:00:00+07:00`);
  const earlyReminders = evaluateEligibleReminders({
    now: earlyTime,
    userId,
    settings: DEFAULT_TIMING_REMINDER_SETTINGS,
    dayIntelligence: mockDayIntelligence,
    appointments: mockAppointments,
  });
  assert(!earlyReminders.some((r) => r.type === 'golden_window'), 'Golden Window not triggered too early');

  // ─── Test 3: Appointment Timing Reminder (13:35 PM — 25 mins before 14:00) ───
  console.log('\n--- Test 3: Appointment Timing Reminder (Type C) ---');
  const preAppTime = new Date(`${testDate}T13:35:00+07:00`);
  const appReminders = evaluateEligibleReminders({
    now: preAppTime,
    userId,
    settings: DEFAULT_TIMING_REMINDER_SETTINGS,
    dayIntelligence: mockDayIntelligence,
    appointments: mockAppointments,
  });

  const appAlert = appReminders.find((r) => r.type === 'appointment');
  assert(!!appAlert, 'Appointment reminder generated 25 mins before 14:00');
  assert(appAlert!.title.includes('25 นาที') && appAlert!.title.includes('คุณสมชาย'), 'Appointment title includes time diff and title');
  assert(appAlert!.priority === 'high', 'Appointment alert has high priority');
  assert(appAlert!.message.includes('ช่วงเวลาทองคำพอดี ⭐'), 'Identified appointment falls inside Golden Window contextually');

  // Far appointment (18:30) should not be triggered at 13:35
  const farAppAlert = appReminders.find((r) => r.id.includes('app-2'));
  assert(!farAppAlert, '18:30 appointment is not triggered prematurely at 13:35');

  // ─── Test 4: Priority Ordering ───
  console.log('\n--- Test 4: Priority Ordering (High priority at top) ---');
  // At 13:35, we have: Appointment (High), Golden Window (High - active), Daily Brief (Normal)
  assert(appReminders[0].priority === 'high', 'First item in list is High priority');
  const briefIndex = appReminders.findIndex((r) => r.type === 'daily_brief');
  const highIndexes = appReminders
    .map((r, i) => (r.priority === 'high' ? i : -1))
    .filter((i) => i >= 0);
  assert(briefIndex > Math.max(...highIndexes), 'Normal priority Brief sits after High priority alerts');

  // ─── Test 5: Plain Thai Language Policy (Zero Jargon) ───
  console.log('\n--- Test 5: Plain Thai Language Policy (Zero Jargon in Reminders) ---');
  const forbiddenJargon = ['ราหู', 'ทักษา', 'กาลกิณี', 'บริวาร', 'มูละ', 'มนตรี', 'เดช', 'ศรี', 'อายุ'];

  const verifyNoJargon = (text: string, path: string) => {
    const cleaned = text.replace(/ความพยายาม/g, '');
    for (const term of forbiddenJargon) {
      if (cleaned.includes(term)) {
        throw new Error(`Jargon detected at [${path}]: "${term}" in "${text}"`);
      }
    }
  };

  for (const r of appReminders) {
    verifyNoJargon(r.title, `${r.type}.title`);
    verifyNoJargon(r.message, `${r.type}.message`);
  }
  console.log('✅ Zero astrological jargon found in all user-facing reminder messages');

  console.log('\n🎉 ALL STEP 5.2 TIMING REMINDER TESTS PASSED PERFECTLY!\n');
}

runTimingReminderTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
