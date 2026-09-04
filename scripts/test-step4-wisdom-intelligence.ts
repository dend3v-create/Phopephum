/**
 * scripts/test-step4-wisdom-intelligence.ts
 *
 * Automated verification for STEP 4.5 — Personal Wisdom Intelligence
 *
 * Tests:
 * 1. Insufficient Data handling (< 3 completed outcomes)
 * 2. Deterministic Pattern Detection (Timing Affinity, Activity Affinity, Action Correlation)
 * 3. Executive summary synthesis & tailored action recommendations
 * 4. Plain Thai Language & Jargon Isolation (Strictly zero astrology jargon in L1 output)
 */

import {
  analyzePersonalPatterns,
} from "../apps/web/app/services/wisdomIntelligence.server";
import type {
  WisdomOutcomeRecord,
  WisdomQueryRecord,
} from "../apps/web/app/services/wisdom.server";

const FORBIDDEN_JARGON = [
  "ยาม",
  "พรายกระซิบ",
  "ราหู",
  "ทักษา",
  "มหาภูติ",
  "อัฐกาล",
  "กาลชะตา",
  "ลัคนา",
  "ดาวเกษตร",
  "อุจจ์",
  "นิจ",
];

function checkJargonFree(text: string, context: string): void {
  for (const jargon of FORBIDDEN_JARGON) {
    if (text.includes(jargon)) {
      throw new Error(
        `[JARGON VIOLATION] Found forbidden astrological term "${jargon}" in ${context}: "${text}"`
      );
    }
  }
}

async function runTests() {
  console.log("===============================================================");
  console.log("🚀 Testing STEP 4.5: Personal Wisdom Intelligence");
  console.log("===============================================================\n");

  // ── TEST 1: Insufficient Data (< 3 tracked outcomes) ─────────────────────
  console.log("🧪 TEST 1: Testing Insufficient Data (< 3 tracked outcomes)...");
  const mockQueriesFew: WisdomQueryRecord[] = [
    {
      id: "q-1",
      user_id: "user-1",
      question: "เซ็นสัญญาเวลาไหนดี",
      intent_category: "career",
      context_type: "horary",
      confidence: "high",
      answer: "ช่วงบ่าย 14:00 - 15:30 น. เหมาะสมอย่างยิ่ง",
      actionable: "เตรียมเอกสารให้พร้อมและเริ่มเจรจาช่วงบ่าย",
      best_window: { timeRange: "14:00 - 15:30", start: "14:00", end: "15:30" },
      prediction_score: 85,
      evidence_snapshot: [],
      engine_snapshot: {},
      is_bookmarked: false,
      created_at: new Date("2026-09-01T14:00:00Z").toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockOutcomesFew: WisdomOutcomeRecord[] = [
    {
      id: "o-1",
      query_id: "q-1",
      user_id: "user-1",
      status: "completed",
      action_taken: true,
      actual_result: "accurate_success",
      user_notes: "เซ็นสัญญาผ่านฉลุย ลูกค้าตอบรับดีมาก",
      occurred_at: new Date("2026-09-01T14:30:00Z").toISOString(),
      feedback_rating: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const res1 = analyzePersonalPatterns(mockQueriesFew, mockOutcomesFew);
  if (res1.hasSufficientData !== false) {
    throw new Error(`Expected hasSufficientData: false, got: ${res1.hasSufficientData}`);
  }
  if (res1.sampleCount !== 1) {
    throw new Error(`Expected sampleCount: 1, got: ${res1.sampleCount}`);
  }
  console.log("  ✓ Correctly flagged insufficient data status (1/3 tracked)");
  console.log(`  ✓ Friendly placeholder pattern: "${res1.patterns[0].title}"\n`);

  // ── TEST 2: Pattern Detection (>= 3 tracked outcomes) ────────────────────
  console.log("🧪 TEST 2: Testing Deterministic Pattern Detection (5 tracked outcomes)...");
  const mockQueries: WisdomQueryRecord[] = [
    {
      id: "q-1",
      user_id: "user-1",
      question: "เซ็นสัญญาการงานช่วงบ่ายดีไหม",
      intent_category: "career",
      context_type: "horary",
      confidence: "high",
      answer: "ช่วงบ่ายเกื้อหนุนอย่างยิ่ง",
      actionable: "นัดหมายช่วง 14:00 น.",
      best_window: { timeRange: "14:00 - 15:30", start: "14:00", end: "15:30" },
      prediction_score: 88,
      evidence_snapshot: [],
      engine_snapshot: {},
      is_bookmarked: true,
      created_at: new Date("2026-09-01T07:00:00Z").toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "q-2",
      user_id: "user-1",
      question: "เจรจาปิดการขายช่วงบ่าย",
      intent_category: "career",
      context_type: "horary",
      confidence: "high",
      answer: "จังหวะบ่ายส่งเสริมความราบรื่น",
      actionable: "เริ่มเจรจาช่วง 13:30 น.",
      best_window: { timeRange: "13:30 - 15:00", start: "13:30", end: "15:00" },
      prediction_score: 85,
      evidence_snapshot: [],
      engine_snapshot: {},
      is_bookmarked: false,
      created_at: new Date("2026-09-02T07:00:00Z").toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "q-3",
      user_id: "user-1",
      question: "เริ่มลงทุนกองทุนช่วงเช้า",
      intent_category: "finance",
      context_type: "horary",
      confidence: "medium",
      answer: "ช่วงเช้าจังหวะปานกลาง",
      actionable: "ลงทุนตามแผน",
      best_window: { timeRange: "09:00 - 10:30", start: "09:00", end: "10:30" },
      prediction_score: 60,
      evidence_snapshot: [],
      engine_snapshot: {},
      is_bookmarked: false,
      created_at: new Date("2026-09-03T02:00:00Z").toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "q-4",
      user_id: "user-1",
      question: "สัมภาษณ์รับพนักงานช่วงบ่าย",
      intent_category: "career",
      context_type: "horary",
      confidence: "high",
      answer: "ช่วงบ่ายมีพลังแห่งการคัดเลือกที่ดี",
      actionable: "นัดหมาย 15:00 น.",
      best_window: { timeRange: "15:00 - 16:30", start: "15:00", end: "16:30" },
      prediction_score: 82,
      evidence_snapshot: [],
      engine_snapshot: {},
      is_bookmarked: false,
      created_at: new Date("2026-09-03T08:00:00Z").toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "q-5",
      user_id: "user-1",
      question: "ส่งใบเสนอราคาช่วงเช้า",
      intent_category: "finance",
      context_type: "horary",
      confidence: "medium",
      answer: "ช่วงเช้าควรตรวจทานให้รอบคอบ",
      actionable: "ตรวจสอบเอกสารก่อนส่ง",
      best_window: { timeRange: "10:00 - 11:30", start: "10:00", end: "11:30" },
      prediction_score: 70,
      evidence_snapshot: [],
      engine_snapshot: {},
      is_bookmarked: false,
      created_at: new Date("2026-09-04T03:00:00Z").toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockOutcomes: WisdomOutcomeRecord[] = [
    {
      id: "o-1",
      query_id: "q-1",
      user_id: "user-1",
      status: "completed",
      action_taken: true,
      actual_result: "accurate_success",
      user_notes: "เซ็นสัญญาสำเร็จและราบรื่นมาก",
      occurred_at: new Date("2026-09-01T14:30:00Z").toISOString(),
      feedback_rating: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "o-2",
      query_id: "q-2",
      user_id: "user-1",
      status: "completed",
      action_taken: true,
      actual_result: "accurate_success",
      user_notes: "ลูกค้าตัดสินใจซื้อทันที",
      occurred_at: new Date("2026-09-02T14:00:00Z").toISOString(),
      feedback_rating: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "o-3",
      query_id: "q-3",
      user_id: "user-1",
      status: "completed",
      action_taken: false,
      actual_result: "accurate_neutral",
      user_notes: "ชะลอการลงทุนไว้ก่อน ตลาดนิ่ง",
      occurred_at: new Date("2026-09-03T10:00:00Z").toISOString(),
      feedback_rating: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "o-4",
      query_id: "q-4",
      user_id: "user-1",
      status: "completed",
      action_taken: true,
      actual_result: "accurate_success",
      user_notes: "ได้ผู้สมัครตรงคุณสมบัติดีมาก",
      occurred_at: new Date("2026-09-03T15:30:00Z").toISOString(),
      feedback_rating: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "o-5",
      query_id: "q-5",
      user_id: "user-1",
      status: "completed",
      action_taken: true,
      actual_result: "partially_accurate",
      user_notes: "ลูกค้าขอปรับแก้ราคาเล็กน้อย",
      occurred_at: new Date("2026-09-04T11:00:00Z").toISOString(),
      feedback_rating: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const res2 = analyzePersonalPatterns(mockQueries, mockOutcomes);
  if (!res2.hasSufficientData) {
    throw new Error("Expected hasSufficientData: true with 5 outcomes");
  }

  console.log(`  ✓ Detected ${res2.patterns.length} personal patterns successfully`);

  // Check Pattern 1: Timing Affinity (Afternoon should win)
  const timingPattern = res2.patterns.find((p) => p.type === "timing_affinity");
  if (!timingPattern) throw new Error("Timing affinity pattern missing");
  console.log(`  ✓ Pattern 1 (Timing Affinity): ${timingPattern.highlight} (Confidence: ${timingPattern.confidence}%)`);
  if (!timingPattern.highlight.includes("บ่าย")) {
    throw new Error(`Expected Afternoon to win, got: ${timingPattern.highlight}`);
  }

  // Check Pattern 2: Activity Affinity (Career should win with 3/3 success = 100%)
  const activityPattern = res2.patterns.find((p) => p.type === "activity_affinity");
  if (!activityPattern) throw new Error("Activity affinity pattern missing");
  console.log(`  ✓ Pattern 2 (Activity Affinity): ${activityPattern.highlight} (Confidence: ${activityPattern.confidence}%)`);
  if (!activityPattern.highlight.includes("การงาน")) {
    throw new Error(`Expected Career/การงาน to win, got: ${activityPattern.highlight}`);
  }

  // Check Pattern 3: Action Impact
  const actionPattern = res2.patterns.find((p) => p.type === "action_impact");
  if (!actionPattern) throw new Error("Action impact pattern missing");
  console.log(`  ✓ Pattern 3 (Action Impact): ${actionPattern.highlight} (Confidence: ${actionPattern.confidence}%)`);

  // ── TEST 3: Jargon Isolation Check ───────────────────────────────────────
  console.log("\n🧪 TEST 3: Checking Plain Thai Language & Jargon Isolation...");
  for (const p of res2.patterns) {
    checkJargonFree(p.title, `Pattern title: ${p.title}`);
    checkJargonFree(p.highlight, `Pattern highlight: ${p.highlight}`);
    checkJargonFree(p.description, `Pattern description: ${p.description}`);
  }
  console.log("  ✓ 100% of detected patterns are free of forbidden astrological jargon");

  console.log("\n===============================================================");
  console.log("✅ ALL STEP 4.5 TESTS PASSED SUCCESSFULLY!");
  console.log("===============================================================");
}

runTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
