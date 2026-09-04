/**
 * STEP 5.1 Personal Auspicious Calendar Intelligence Test Suite
 * 
 * Verifies:
 * 1. Engine calculation integrity: Lunar Day, Auspicious slots, Moon phase
 * 2. Day intelligence calculation (Universal vs Personalized)
 * 3. Score clamping & valid ranges (0-100)
 * 4. Golden window extraction & accuracy
 * 5. 4 Life domains scores & insights
 * 6. Plain-language L1 boundary compliance (No astrology jargon in plain user text)
 * 7. Month overview aggregation
 */

import {
  calculateDayIntelligence,
  calculateMonthOverview
} from '../apps/web/app/services/calendarIntelligence.server';
import type { CalendarDayIntelligence, CalendarMonthDayOverview } from '@phopephum/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runCalendarIntelligenceTests() {
  console.log('🏛️ === STARTING STEP 5.1 CALENDAR INTELLIGENCE VERIFICATION ===\n');

  // Test Date 1: 2026-09-04 (Friday, Non-WanPhra with Golden Window)
  const fridayDate = '2026-09-04';

  // 1. Universal Mode (No birthdate)
  console.log('--- Test 1: Universal Day Intelligence (Friday 2026-09-04) ---');
  const universal = await calculateDayIntelligence(fridayDate, null);
  
  assert(universal.date === fridayDate, `Day intelligence returns correct date: ${universal.date}`);
  assert(universal.overallScore >= 0 && universal.overallScore <= 100, `Overall score clamped: ${universal.overallScore}`);
  assert(universal.timelineWindows.length === 8, `Timeline has exactly 8 windows: got ${universal.timelineWindows.length}`);
  assert(!!universal.goldenWindow, 'Golden window is identified on auspicious day');
  assert(universal.goldenWindow!.isGoldenWindow === true, 'Golden window flag is set to true');
  assert(universal.goldenWindow!.score >= 70, `Golden window score is high: ${universal.goldenWindow!.score}`);
  assert(universal.domainScores.length === 4, '4 life domains present');
  for (const ds of universal.domainScores) {
    assert(ds.score >= 0 && ds.score <= 100, `Domain ${ds.domain} score valid: ${ds.score}`);
    assert(ds.verdict.length > 0, `Domain ${ds.domain} has plain verdict`);
  }
  assert(!universal.hasPersonalContext, 'Universal mode flag is false');
  assert((universal.personalNote ?? '').includes('ทั่วไป') || (universal.personalNote ?? '').includes('วันเกิด'), 'Universal personal note guides user');

  // 2. Personalized Mode (With birthdate)
  console.log('\n--- Test 2: Personalized Day Intelligence (With User Birthday) ---');
  const personalized = await calculateDayIntelligence(fridayDate, {
    birthDate: '1990-05-15',
    birthTime: '09:30',
    displayName: 'คุณเด่น'
  });

  assert(personalized.date === fridayDate, 'Personalized date matches');
  assert(personalized.overallScore >= 0 && personalized.overallScore <= 100, 'Personalized overall score clamped');
  assert(personalized.timelineWindows.length === 8, '8 windows in personalized timeline');
  assert(!!personalized.goldenWindow, 'Personalized golden window identified');
  assert(personalized.hasPersonalContext === true, 'Personalized mode flag is true');
  assert((personalized.personalNote ?? '').length > 10, `Personalized note generated: "${personalized.personalNote}"`);

  // 3. Wan Phra Behavior Test (Saturday 2026-09-05)
  console.log('\n--- Test 3: Wan Phra Behavior (Saturday 2026-09-05) ---');
  const wanPhra = await calculateDayIntelligence('2026-09-05', null);
  assert(wanPhra.lunarDayInfo.isWanPhra === true, 'Identifies Wan Phra correctly');
  assert(wanPhra.dailyTheme.includes('สติ') || wanPhra.dailyTheme.includes('สงบ') || wanPhra.overallScore >= 50, 'Wan Phra theme respects spiritual balance');

  // 4. Jargon Leakage Check (L1 Plain-Thai Language Policy)
  console.log('\n--- Test 4: L1 Plain-Thai Language Check (Zero Jargon in Plain Text) ---');
  const jargonTerms = ['ราหู', 'ทักษา', 'กาลกิณี', 'บริวาร', 'มูละ', 'มนตรี', 'เดช', 'ศรี', 'อายุ'];

  const checkTextForJargon = (text: string, path: string) => {
    // Strip common benign words containing substrings like "ความพยายาม"
    const cleaned = text.replace(/ความพยายาม/g, '');
    for (const term of jargonTerms) {
      if (cleaned.includes(term)) {
        throw new Error(`Jargon leak detected at [${path}]: contains "${term}" in "${text}"`);
      }
    }
  };

  checkTextForJargon(universal.dailyTheme, 'universal.dailyTheme');
  checkTextForJargon(universal.dailySummary, 'universal.dailySummary');
  checkTextForJargon(universal.goldenWindow!.title, 'universal.goldenWindow.title');
  checkTextForJargon(universal.goldenWindow!.plainAdvice, 'universal.goldenWindow.plainAdvice');
  for (let i = 0; i < universal.timelineWindows.length; i++) {
    const w = universal.timelineWindows[i];
    checkTextForJargon(w.title, `universal.timelineWindows[${i}].title`);
    checkTextForJargon(w.plainAdvice, `universal.timelineWindows[${i}].plainAdvice`);
  }
  console.log('✅ Zero astrological jargon found in all public L1 intelligence fields');

  // 5. Month Overview Aggregation
  console.log('\n--- Test 5: Month Overview Aggregation ---');
  const monthOverview = calculateMonthOverview(
    2026,
    9,
    { birthDate: '1990-05-15' },
    [
      { event_date: '2026-09-04' },
      { event_date: '2026-09-04' },
      { event_date: '2026-09-12' }
    ]
  );

  assert(monthOverview.length === 30, `September 2026 has 30 days: got ${monthOverview.length}`);
  const day4 = monthOverview.find(d => d.date === '2026-09-04');
  assert(!!day4, 'Day 4 exists in month overview');
  assert(day4!.appointmentCount === 2, `Day 4 has 2 appointments: got ${day4!.appointmentCount}`);
  assert(day4!.overallScore >= 0 && day4!.overallScore <= 100, `Day 4 score valid: ${day4!.overallScore}`);
  assert(day4!.hasGoldenWindow === true, 'Day 4 has golden window in month view');

  const day12 = monthOverview.find(d => d.date === '2026-09-12');
  assert(day12!.appointmentCount === 1, `Day 12 has 1 appointment: got ${day12!.appointmentCount}`);

  console.log('\n🎉 ALL STEP 5.1 CALENDAR INTELLIGENCE TESTS PASSED PERFECTLY!\n');
}

runCalendarIntelligenceTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
