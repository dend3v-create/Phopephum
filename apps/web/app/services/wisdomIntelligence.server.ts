/**
 * wisdomIntelligence.server.ts — STEP 4.5 Personal Wisdom Intelligence
 *
 * Architecture Sequence:
 * Historical Data (wisdom_queries + wisdom_outcomes)
 *   ↓
 * Aggregate & Pattern Detection (Deterministic Read-Only Analytics)
 *   ↓
 * Personal Patterns & Wisdom Metrics
 *   ↓
 * AI Plain-Language Synthesis (Warm, empowering plain Thai summary, no jargon)
 *   ↓
 * User
 *
 * Hard Rules:
 * ❌ ไม่แก้ Astrology Engine ดั้งเดิม
 * ❌ ไม่ใช้ Machine Learning หนัก ๆ
 * ❌ ไม่เปิดเผยศัพท์เทคนิคดั้งเดิมใน L1
 * ❌ ไม่สร้าง Table ใหม่ (ดึงจาก wisdom_queries + wisdom_outcomes ที่มีอยู่)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PersonalPattern,
  PersonalWisdomIntelligence,
} from "@phopephum/types";
import {
  getWisdomHistory,
  getWisdomStats,
  type WisdomOutcomeRecord,
  type WisdomQueryRecord,
} from "./wisdom.server";

export interface GenerateWisdomIntelligenceOptions {
  userId: string;
  supabase: SupabaseClient;
  aiWorkerUrl?: string;
  aiWorkerSecret?: string;
  userName?: string;
}

const CATEGORY_NAMES_TH: Record<string, string> = {
  timing: "การเลือกจังหวะเวลาและฤกษ์",
  finance: "การเงินและโชคลาภ",
  career: "การงานและธุรกิจ",
  relationship: "ความสัมพันธ์และความรัก",
  health: "สุขภาพและความเป็นอยู่",
  lost: "ของหายหรือสิ่งคลุมเครือ",
  general: "การตัดสินใจทั่วไป",
};

/**
 * แปลงเวลาในสตริงหรือเวลาสร้างเป็นชั่วโมง (0-23)
 */
function extractHour(
  query: WisdomQueryRecord,
  outcome?: WisdomOutcomeRecord | null
): number {
  // 1. ตรวจสอบ best_window.start หรือ timeRange
  if (query.best_window) {
    if (typeof query.best_window.start === "string") {
      const h = parseInt(query.best_window.start.split(":")[0] || "", 10);
      if (!isNaN(h)) return h;
    }
    if (typeof query.best_window.timeRange === "string") {
      const match = query.best_window.timeRange.match(/(\d{1,2}):\d{2}/);
      if (match && match[1]) {
        const h = parseInt(match[1], 10);
        if (!isNaN(h)) return h;
      }
    }
  }

  // 2. ตรวจสอบ occurred_at
  if (outcome?.occurred_at) {
    const d = new Date(outcome.occurred_at);
    if (!isNaN(d.getTime())) return d.getHours();
  }

  // 3. ตรวจสอบ created_at
  const d = new Date(query.created_at);
  return isNaN(d.getTime()) ? 12 : d.getHours();
}

/**
 * วิเคราะห์ Pattern จากประวัติ queries และ outcomes (Deterministic Analytics)
 */
export function analyzePersonalPatterns(
  queries: WisdomQueryRecord[],
  outcomes: WisdomOutcomeRecord[]
): {
  patterns: PersonalPattern[];
  hasSufficientData: boolean;
  sampleCount: number;
  threshold: number;
} {
  const THRESHOLD = 3;
  const completedOutcomes = outcomes.filter((o) => o.actual_result !== null);
  const sampleCount = completedOutcomes.length;
  const hasSufficientData = sampleCount >= THRESHOLD;

  // แผนที่ query lookup
  const queryMap = new Map<string, WisdomQueryRecord>();
  for (const q of queries) {
    queryMap.set(q.id, q);
  }

  // กรณีข้อมูลยังไม่ถึงเกณฑ์ (Insufficient Data < 3)
  if (!hasSufficientData) {
    const remaining = THRESHOLD - sampleCount;
    return {
      hasSufficientData: false,
      sampleCount,
      threshold: THRESHOLD,
      patterns: [
        {
          type: "timing_affinity",
          title: "กำลังเริ่มสะสมจังหวะเวลาส่วนตัว",
          highlight: `บันทึกแล้ว ${sampleCount} / ${THRESHOLD} ครั้ง`,
          sampleCount,
          confidence: 50,
          description: `ต้องการการติดตามผลอีกเพียง ${remaining} ครั้ง เพื่อที่ระบบจะสามารถสะท้อนช่วงเวลาทองที่สอดคล้องกับคุณได้อย่างแม่นยำ`,
          icon: "⏳",
        },
        {
          type: "action_impact",
          title: "ความเชื่อมโยงของการลงมือทำ",
          highlight: "พร้อมวิเคราะห์เมื่อมีข้อมูลเพิ่ม",
          sampleCount,
          confidence: 50,
          description:
            "ทุกครั้งที่คุณลองปฏิบัติตามคำแนะนำและกลับมาบันทึกผล ปัญญาเฉพาะตัวของคุณจะคมชัดขึ้นเรื่อยๆ",
          icon: "💡",
        },
      ],
    };
  }

  const patterns: PersonalPattern[] = [];

  // ── 1. Timing Affinity (ช่วงเวลาเกื้อหนุนเฉพาะตน) ──────────────────────────
  const timeBuckets = {
    morning: { label: "ช่วงเช้า (06:00 – 11:59 น.)", success: 0, total: 0 },
    afternoon: { label: "ช่วงบ่าย (12:00 – 16:59 น.)", success: 0, total: 0 },
    evening: { label: "ช่วงเย็นและค่ำ (17:00 – 23:59 น.)", success: 0, total: 0 },
  };

  for (const out of completedOutcomes) {
    const q = queryMap.get(out.query_id);
    if (!q) continue;
    const hour = extractHour(q, out);
    const isSuccess =
      out.actual_result === "accurate_success" ||
      out.actual_result === "accurate_neutral";

    if (hour >= 6 && hour < 12) {
      timeBuckets.morning.total += 1;
      if (isSuccess) timeBuckets.morning.success += 1;
    } else if (hour >= 12 && hour < 17) {
      timeBuckets.afternoon.total += 1;
      if (isSuccess) timeBuckets.afternoon.success += 1;
    } else {
      timeBuckets.evening.total += 1;
      if (isSuccess) timeBuckets.evening.success += 1;
    }
  }

  // หาช่วงเวลาที่มีความสำเร็จสูงสุด
  const sortedTimeBuckets = Object.entries(timeBuckets)
    .filter(([_, b]) => b.total > 0)
    .sort((a, b) => {
      const rateA = a[1].success / a[1].total;
      const rateB = b[1].success / b[1].total;
      if (rateB !== rateA) return rateB - rateA;
      return b[1].total - a[1].total;
    });

  if (sortedTimeBuckets.length > 0) {
    const [_, bestBucket] = sortedTimeBuckets[0];
    const successRate = Math.round((bestBucket.success / bestBucket.total) * 100);
    patterns.push({
      type: "timing_affinity",
      title: "ช่วงเวลาทองที่เกื้อหนุนคุณมากที่สุด",
      highlight: bestBucket.label,
      sampleCount: bestBucket.total,
      confidence: successRate,
      description: `จากสถิติที่คุณติดตามผล ${bestBucket.total} ครั้งในช่วงเวลานี้ พบว่าให้ผลลัพธ์ราบรื่นและตรงตามแผนถึง ${successRate}% เหมาะกับการนัดหมายหรือเริ่มงานสำคัญ`,
      icon: "☀️",
    });
  }

  // ── 2. Activity Affinity (หมวดกิจกรรมที่โดดเด่นและแม่นยำสูงสุด) ──────────
  const categoryStats: Record<string, { total: number; success: number }> = {};
  for (const out of completedOutcomes) {
    const q = queryMap.get(out.query_id);
    if (!q) continue;
    const cat = q.intent_category || "general";
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, success: 0 };
    }
    categoryStats[cat].total += 1;
    if (
      out.actual_result === "accurate_success" ||
      out.actual_result === "accurate_neutral"
    ) {
      categoryStats[cat].success += 1;
    }
  }

  const sortedCategories = Object.entries(categoryStats).sort((a, b) => {
    const rateA = a[1].success / a[1].total;
    const rateB = b[1].success / b[1].total;
    if (rateB !== rateA) return rateB - rateA;
    return b[1].total - a[1].total;
  });

  if (sortedCategories.length > 0) {
    const [catKey, stat] = sortedCategories[0];
    const catName = CATEGORY_NAMES_TH[catKey] || catKey;
    const catRate = Math.round((stat.success / stat.total) * 100);
    patterns.push({
      type: "activity_affinity",
      title: "หมวดหมู่ที่คุณสอดคล้องกับจังหวะชีวิตสูงสุด",
      highlight: `หมวด${catName}`,
      sampleCount: stat.total,
      confidence: catRate,
      description: `คุณมีการติดตามผลในหมวดนี้ ${stat.total} ครั้ง โดยผลลัพธ์มีความแม่นยำสูงถึง ${catRate}% สอดคล้องกับจังหวะพลังงานของคุณอย่างเด่นชัด`,
      icon: "🎯",
    });
  }

  // ── 3. Action Impact (พลังแห่งการลงมือทำจริง) ────────────────────────────
  const actionTakenOutcomes = completedOutcomes.filter((o) => o.action_taken === true);
  if (actionTakenOutcomes.length > 0) {
    const actionSuccess = actionTakenOutcomes.filter(
      (o) =>
        o.actual_result === "accurate_success" ||
        o.actual_result === "accurate_neutral"
    ).length;
    const actionSuccessRate = Math.round(
      (actionSuccess / actionTakenOutcomes.length) * 100
    );

    patterns.push({
      type: "action_impact",
      title: "พลังแห่งการลงมือทำตามจังหวะเวลา",
      highlight: `สำเร็จ ${actionSuccess} จาก ${actionTakenOutcomes.length} ครั้ง (${actionSuccessRate}%)`,
      sampleCount: actionTakenOutcomes.length,
      confidence: actionSuccessRate,
      description: `เมื่อคุณเลือกที่จะลงมือทำจริงตามคำแนะนำ ผลลัพธ์ปรากฏเป็นไปตามเป้าหมายถึง ${actionSuccessRate}% สะท้อนว่าการตัดสินใจอย่างมีจังหวะเวลาช่วยลดอุปสรรคได้อย่างชัดเจน`,
      icon: "⚡",
    });
  }

  // ── 4. Decision Consistency (ความสม่ำเสมอในการสะท้อนบทเรียน) ────────────
  const ratings = completedOutcomes
    .map((o) => o.feedback_rating)
    .filter((r): r is number => typeof r === "number" && r > 0);
  const avgRating =
    ratings.length > 0
      ? Number((ratings.reduce((acc, cur) => acc + cur, 0) / ratings.length).toFixed(1))
      : 5.0;

  patterns.push({
    type: "decision_consistency",
    title: "ความชัดเจนและการตกผลึกปัญญา",
    highlight: `ความพึงพอใจเฉลี่ย ${avgRating} / 5 ดาว`,
    sampleCount: completedOutcomes.length,
    confidence: Math.round((avgRating / 5) * 100),
    description: `คุณมีการติดตามและบันทึกข้อคิดอย่างสม่ำเสมอ ยิ่งบันทึกมากเท่าใด จังหวะการตัดสินใจของคุณยิ่งแม่นยำและกลมกลืนกับชีวิตจริงมากขึ้น`,
    icon: "🌟",
  });

  return {
    hasSufficientData: true,
    sampleCount,
    threshold: THRESHOLD,
    patterns,
  };
}

/**
 * สร้างคำสังเคราะห์ปัญญาเฉพาะตน (Deterministic Plain Thai Narrative)
 */
function buildDeterministicSummary(
  patterns: PersonalPattern[],
  stats: { totalQueries: number; trackedOutcomes: number; successRate: number; actionTakenCount: number },
  hasSufficientData: boolean,
  userName?: string
): { summary: string; actionRecommendations: string[] } {
  const name = userName ? `คุณ${userName}` : "คุณ";

  if (!hasSufficientData) {
    return {
      summary: `ยินดีต้อนรับสู่คลังปัญญาเฉพาะตน ขณะนี้${name}ได้ติดตามผลแล้ว ${stats.trackedOutcomes} ครั้ง เมื่อสะสมครบ 3 ครั้งขึ้นไป ระบบจะสามารถตรวจจับแพทเทิร์นจังหวะเวลาและหมวดหมู่ที่เกื้อหนุนคุณได้อย่างสมบูรณ์`,
      actionRecommendations: [
        "เมื่อลงมือทำกิจกรรมที่เคยสอบถาม ให้กลับมาอัปเดตผลลัพธ์เพื่อสะสมปัญญาชีวิต",
        "สังเกตความรู้สึกและความราบรื่นของแต่ละช่วงเวลา เพื่อทำความเข้าใจจังหวะของตนเอง",
      ],
    };
  }

  const timingPattern = patterns.find((p) => p.type === "timing_affinity");
  const activityPattern = patterns.find((p) => p.type === "activity_affinity");
  const actionPattern = patterns.find((p) => p.type === "action_impact");

  const summaryParts: string[] = [];
  summaryParts.push(
    `จากประวัติการตัดสินใจและการติดตามผลจริง ${stats.trackedOutcomes} ครั้ง ${name}มีจังหวะชีวิตเฉพาะตนที่เริ่มปรากฏชัดเจน`
  );

  if (timingPattern) {
    summaryParts.push(
      `โดยมีแนวโน้มความสำเร็จสูงสุดใน${timingPattern.highlight}`
    );
  }

  if (activityPattern) {
    summaryParts.push(
      `โดยเฉพาะใน${activityPattern.highlight} ที่มีอัตราความราบรื่นสูงถึง ${activityPattern.confidence}%`
    );
  }

  if (actionPattern && actionPattern.confidence >= 60) {
    summaryParts.push(
      `และเมื่อคุณลงมือทำจริงตามคำแนะนำ ผลลัพธ์กว่า ${actionPattern.confidence}% จะสำเร็จลุล่วงด้วยดี`
    );
  }

  const summary = summaryParts.join(" ") + " เป็นแนวทางที่พิสูจน์แล้วจากประสบการณ์จริงของคุณเอง";

  const actionRecommendations: string[] = [];
  if (timingPattern) {
    actionRecommendations.push(
      `จัดสรรการนัดหมาย เจรจา หรือเริ่มงานสำคัญให้อยู่ใน${timingPattern.highlight}`
    );
  }
  if (activityPattern) {
    actionRecommendations.push(
      `ใน${activityPattern.highlight} ขอให้มั่นใจในสัญชาตญาณและการวางแผนของคุณ เพราะมีสถิติเกื้อหนุนสูง`
    );
  }
  actionRecommendations.push(
    "จดบันทึกผลลัพธ์หลังลงมือทำทุกครั้ง เพื่อรักษาความคมชัดของจังหวะชีวิตส่วนตัวอย่างต่อเนื่อง"
  );

  return {
    summary,
    actionRecommendations,
  };
}

/**
 * ฟังก์ชันหลัก: สร้าง Personal Wisdom Intelligence สำหรับผู้ใช้
 * ดึงข้อมูล ประมวลผลแบบ Read-only และสังเคราะห์เป็น Insight
 */
export async function generatePersonalWisdomIntelligence(
  options: GenerateWisdomIntelligenceOptions
): Promise<PersonalWisdomIntelligence> {
  const { userId, supabase, aiWorkerUrl, aiWorkerSecret, userName } = options;

  // 1. ดึง Queries และ Stats จากคลังปัญญา
  const [queries, stats] = await Promise.all([
    getWisdomHistory(supabase, userId, { limit: 100 }),
    getWisdomStats(supabase, userId),
  ]);

  // ดึง Outcomes ที่ผูกกับ queries
  const outcomes: WisdomOutcomeRecord[] = [];
  for (const q of queries) {
    if (q.outcome) {
      outcomes.push(q.outcome);
    }
  }

  // 2. Deterministic Pattern Detection
  const { patterns, hasSufficientData, sampleCount, threshold } =
    analyzePersonalPatterns(queries, outcomes);

  // 3. สร้างคำอธิบายแบบ Deterministic เป็นค่าตั้งต้น
  let { summary, actionRecommendations } = buildDeterministicSummary(
    patterns,
    stats,
    hasSufficientData,
    userName
  );

  // 4. หากมี AI Worker และมีข้อมูลเพียงพอ ให้สังเคราะห์ให้อบอุ่นเป็นธรรมชาติยิ่งขึ้น
  if (hasSufficientData && aiWorkerUrl) {
    try {
      const prompt = `คุณคือ "Wisdom" ที่ปรึกษาชีวิตส่วนตัวของ${userName || "ผู้ใช้"}
นี่คือข้อมูลสรุปแบบสถิติจริงจากการติดตามผลลัพธ์ของผู้ใช้จำนวน ${sampleCount} ครั้ง:
- สถิติรวม: คำถามทั้งหมด ${stats.totalQueries} ครั้ง, ติดตามผล ${stats.trackedOutcomes} ครั้ง, อัตราความแม่นยำ ${stats.successRate}%
- แพทเทิร์นที่พบ:
${patterns.map((p) => `  * ${p.title}: ${p.highlight} (ความสอดคล้อง ${p.confidence}%, ${p.description})`).join("\n")}

คำสั่ง:
1. เขียนสรุปปัญญาเฉพาะบุคคล (Personal Wisdom) สั้นๆ 2-3 ประโยค ในน้ำเสียงที่อบอุ่น มั่นใจ เป็นมิตร และให้พลัง
2. ห้ามใช้ศัพท์เทคนิคโหราศาสตร์ใดๆ ทั้งสิ้น (ห้ามพูดถึง ยาม, ดาว, ลัคนา, ราหู) ให้พูดในมิติจังหวะชีวิต การลงมือทำ และผลลัพธ์จริง
3. เน้นย้ำว่านี่คือปัญญาที่เกิดจาก "การลงมือทำและประสบการณ์จริงของคุณเอง"`;

      const aiRes = await fetch(`${aiWorkerUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiWorkerSecret || ""}`,
        },
        body: JSON.stringify({
          userId: userId || "wisdom-intelligence",
          reportType: "wisdom_intelligence",
          context: { sampleCount, stats },
          prompt,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json<{ text?: string }>();
        if (aiData.text?.trim()) {
          summary = aiData.text.trim();
        }
      }
    } catch (err) {
      console.warn(
        "[generatePersonalWisdomIntelligence] AI worker failed, using deterministic summary:",
        err
      );
    }
  }

  return {
    summary,
    patterns,
    actionRecommendations,
    hasSufficientData,
    sampleCount,
    threshold,
    stats,
    lastUpdated: new Date().toISOString(),
  };
}
