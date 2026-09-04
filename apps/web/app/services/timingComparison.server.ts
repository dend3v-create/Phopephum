/**
 * timingComparison.server.ts — STEP 4.4 Timing Comparison Engine & Service
 *
 * Sequence:
 * User Intent → Generate Candidate Windows → Normalize A / B / C
 * → Calculate Score & Suitability → Rank Best Window → Comparison Result
 * → AI Plain-Language Explanation → Save to Wisdom Memory
 *
 * Architecture Constraints:
 * ❌ ห้ามสร้าง Astrology Engine ใหม่
 * ❌ ห้าม duplicate calculateAuspiciousTime (เรียกใช้จาก @phopephum/engine โดยตรง)
 * ❌ ห้ามให้ AI คำนวณคะแนนเอง (Engine เป็นผู้คำนวณคะแนนและ suitability)
 * ❌ ห้ามเปิดชื่อ ยาม / พรายกระซิบ / ราหู ใน L1 (ใช้ภาษาชีวิตจริง: ช่วงเวลาทอง, จังหวะส่งเสริม ฯลฯ)
 * ❌ ไม่สร้างตาราง DB ใหม่ (ใช้ wisdom_queries.context_type = 'timing_comparison')
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateAuspiciousTime,
  calculateMoonPhase,
  calculateRahu,
} from "@phopephum/engine";
import type {
  CandidateWindow,
  CandidateWindowInput,
  TimingComparisonResult,
  TimingSuitability,
} from "@phopephum/types";
import { saveWisdomQuery } from "./wisdom.server";

export interface CompareTimingOptions {
  question?: string;
  activity: string;
  date?: string; // "YYYY-MM-DD"
  customWindows?: CandidateWindowInput[];
  userId?: string;
  supabase?: SupabaseClient;
  aiWorkerUrl?: string;
  aiWorkerSecret?: string;
  userName?: string;
}

// แผนที่กิจกรรมหลักกับคำสำคัญที่สอดคล้องกับพลังงานยาม
const ACTIVITY_KEYWORD_MAP: Record<string, string[]> = {
  "ทำสัญญา": ["ทำสัญญา", "เจรจา", "เซ็นสัญญา", "ปิดดีล", "นิติกรรม"],
  "เจรจาธุรกิจ": ["เจรจา", "ธุรกิจ", "ประชุมสำคัญ", "สัมภาษณ์งาน", "เข้าพบผู้ใหญ่"],
  "เปิดตัว/เริ่มธุรกิจ": ["เปิดตัวโปรเจกต์", "เริ่มต้นสิ่งดี", "ขยายธุรกิจ", "เปิดร้าน", "เริ่มงาน"],
  "ลงทุน/การเงิน": ["ลงทุน", "ขยายธุรกิจ", "ค้าขาย", "เงิน", "ทรัพย์"],
  "เดินทาง/ออกรถ": ["เดินทาง", "สร้างความสัมพันธ์", "ปลอดภัย", "คล่องตัว"],
  "ความรัก/นัดหมาย": ["สร้างความสัมพันธ์", "ความรัก", "แต่งงาน", "พบปะ"],
  "ทั่วไป": ["เริ่มต้นสิ่งดี", "ธุรกิจ", "การงาน", "ประชุมสำคัญ"],
};

/**
 * แปลงเวลา "HH:mm" เป็นนาทีรวมจาก 00:00
 */
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  return h * 60 + m;
}

/**
 * แปลงนาทีรวมเป็น "HH:mm"
 */
function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * สร้างวันที่และเวลาในเขตเวลาไทยจากสตริงวันที่และนาที
 */
function createSlotDate(dateStr: string, minutes: number): Date {
  const [year, month, day] = dateStr.split("-").map((v) => parseInt(v, 10));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  // สร้าง Date object โดยอิงเวลา UTC เพื่อความแม่นยำในเซิร์ฟเวอร์
  const d = new Date(Date.UTC(year, month - 1, day, h - 7, m, 0));
  return d;
}

/**
 * สร้าง Candidate Windows พื้นฐาน 3 ช่วงเวลา A / B / C จากยามมงคลของวันนั้น
 */
function generateDefaultWindows(targetDate: Date): CandidateWindowInput[] {
  const auspicious = calculateAuspiciousTime(targetDate);
  const slots = auspicious.auspiciousSlots;

  // ค้นหาช่วงเวลาเช้า บ่ายต้น และบ่ายแก่ จาก 8 slots
  // slot 1-2: 06:00-09:00
  // slot 3-4: 09:00-12:00
  // slot 5-6: 12:00-15:00
  // slot 7-8: 15:00-18:00
  const morningSlot = slots[2] || slots[1] || slots[0]; // 09:00-10:30
  const afternoonSlot1 = slots[5] || slots[4];          // 13:30-15:00
  const afternoonSlot2 = slots[6] || slots[7];          // 15:00-16:30

  const parseRange = (range: string) => {
    const [start, end] = range.split("–");
    return { start: start.trim(), end: end.trim() };
  };

  const winA = parseRange(morningSlot.timeRange);
  const winB = parseRange(afternoonSlot1.timeRange);
  const winC = parseRange(afternoonSlot2.timeRange);

  return [
    { id: "A", label: "ช่วงเช้า (ตัวเลือก A)", start: winA.start, end: winA.end },
    { id: "B", label: "ช่วงบ่ายต้น (ตัวเลือก B)", start: winB.start, end: winB.end },
    { id: "C", label: "ช่วงบ่ายแก่ (ตัวเลือก C)", start: winC.start, end: winC.end },
  ];
}

/**
 * คำนวณคะแนน ความเหมาะสม จุดเด่น และข้อควรระวังสำหรับแต่ละช่วงเวลา
 * กฎเหล็ก: ENGINE เป็นผู้คำนวณคะแนนทั้งหมด ไม่ใช้ AI คำนวณคะแนน
 */
function evaluateCandidateWindow(
  winInput: CandidateWindowInput,
  id: string,
  targetDate: Date,
  dateStr: string,
  activity: string
): CandidateWindow {
  const startMin = parseTimeToMinutes(winInput.start);
  const endMin = parseTimeToMinutes(winInput.end);
  const midMin = Math.floor((startMin + endMin) / 2);

  const slotDate = createSlotDate(dateStr, midMin);
  const auspicious = calculateAuspiciousTime(targetDate);
  const moonPhase = calculateMoonPhase(targetDate);

  // ค้นหายามที่ครอบคลุมช่วงเวลานี้
  const matchedSlot = auspicious.auspiciousSlots.find((slot) => {
    const [sStart, sEnd] = slot.timeRange.split("–").map(parseTimeToMinutes);
    return midMin >= sStart && midMin < sEnd;
  }) || auspicious.auspiciousSlots[0];

  // 1. คะแนนฐานจากระดับยามมงคล
  let baseScore = 60;
  if (matchedSlot.level === "ดีมาก") baseScore = 88;
  else if (matchedSlot.level === "ดี") baseScore = 76;
  else if (matchedSlot.level === "ปานกลาง") baseScore = 58;
  else if (matchedSlot.level === "หลีกเลี่ยง") baseScore = 36;

  // 2. ตรวจสอบความสอดคล้องกับกิจกรรม (Activity Alignment)
  let activityBonus = 0;
  const targetKeywords = ACTIVITY_KEYWORD_MAP[activity] || [activity];
  const isDirectMatch = matchedSlot.suitableFor.some((item) =>
    targetKeywords.some((kw) => item.includes(kw) || kw.includes(item))
  );
  if (isDirectMatch) {
    activityBonus = 8;
  }

  // 3. ตรวจสอบพลังงานราหู (Rahu Check)
  let rahuPenalty = 0;
  try {
    const rahu = calculateRahu(slotDate);
    if (rahu && !rahu.is_current_moment_good) {
      rahuPenalty = 7;
    }
  } catch {
    // Graceful fallback
  }

  // 4. วันพระ (Wan Phra) ต่องานสัญญา/ธุรกิจ
  let wanPhraPenalty = 0;
  if (moonPhase.isWanPhra && ["ทำสัญญา", "เจรจาธุรกิจ", "ลงทุน/การเงิน"].includes(activity)) {
    wanPhraPenalty = 8;
  }

  // รวมคะแนนสุดท้าย (Clamped 20–96)
  const finalScore = Math.min(96, Math.max(20, baseScore + activityBonus - rahuPenalty - wanPhraPenalty));

  // กำหนดระดับความเหมาะสม
  let suitability: TimingSuitability = "neutral";
  if (finalScore >= 85) suitability = "optimal";
  else if (finalScore >= 70) suitability = "favorable";
  else if (finalScore >= 55) suitability = "neutral";
  else if (finalScore >= 40) suitability = "cautious";
  else suitability = "avoid";

  // จุดเด่นและข้อควรระวัง (ภาษาชีวิตจริง — ไม่เปิดศัพท์เทคนิคใน L1)
  const strengths: string[] = [];
  const cautions: string[] = [];

  if (suitability === "optimal") {
    strengths.push("ช่วงเวลาทอง พลังงานเปิดกว้างและเกื้อหนุนให้ภารกิจสำเร็จราบรื่น");
    strengths.push("จังหวะเวลาส่งเสริมความไว้เนื้อเชื่อใจและการเจรจาที่ลงตัว");
    if (isDirectMatch) {
      strengths.push(`สอดคล้องอย่างยิ่งกับกิจกรรม${activity}`);
    }
    cautions.push("ควรดำเนินงานตามแผนที่วางไว้และรักษาความตรงต่อเวลา");
  } else if (suitability === "favorable") {
    strengths.push("จังหวะเวลาส่งเสริม มีความคล่องตัวและเกิดความร่วมมือที่ดี");
    strengths.push("บรรยากาศราบรื่น เหมาะแก่การพูดคุยและสร้างข้อตกลง");
    cautions.push("ตรวจสอบรายละเอียดและเงื่อนไขเอกสารให้ครบถ้วนก่อนยืนยัน");
  } else if (suitability === "neutral") {
    strengths.push("พลังงานอยู่ในเกณฑ์ปกติ สามารถดำเนินการได้ตามแผนงาน");
    cautions.push("อาจต้องใช้ความพยายามหรือการติดตามผลเพิ่มขึ้นเล็กน้อย");
    cautions.push("ควรเตรียมข้อมูลให้ชัดเจนเพื่อป้องกันความเข้าใจคลาดเคลื่อน");
  } else if (suitability === "cautious") {
    strengths.push("เหมาะกับการเตรียมความพร้อม วางแผน และตรวจทานงานภายใน");
    cautions.push("อาจมีความล่าช้าหรือการเจรจาที่ยังไม่ได้ข้อสรุปในทันที");
    cautions.push("ควรเผื่อเวลาและหลีกเลี่ยงการเร่งรัดการตัดสินใจ");
  } else {
    strengths.push("เหมาะสำหรับการพักผ่อน สมาธิ หรือการทบทวนแผนงาน");
    cautions.push("พลังงานค่อนข้างผันผวน ควรชะลอการตัดสินใจหรือหลีกเลี่ยงการเริ่มข้อตกลงใหม่");
  }

  if (moonPhase.isWanPhra) {
    cautions.push("ตรงกับวันพระ ควรเน้นความซื่อตรง ยุติธรรม และมีสติเป็นที่ตั้ง");
  }

  return {
    id,
    label: winInput.label || `ตัวเลือก ${id}`,
    start: winInput.start,
    end: winInput.end,
    score: finalScore,
    suitability,
    strengths,
    cautions,
    recommended_for: matchedSlot.suitableFor,
  };
}

/**
 * สร้างคำอธิบายเปรียบเทียบในภาษาคน (Deterministic Fallback)
 */
function generateDeterministicExplanation(
  recommended: CandidateWindow,
  allCandidates: CandidateWindow[],
  activity: string,
  dateStr: string,
  userName = "คุณ"
): { explanation: string; reason: string; actionable: string } {
  const reason = `ช่วงเวลา ${recommended.id} (${recommended.start}–${recommended.end} น.) ได้รับการประเมินว่าเหมาะสมที่สุด ด้วยคะแนนพลังงาน ${recommended.score}/100 มีความราบรื่นและเกื้อหนุนกิจกรรม${activity}มากกว่าช่วงเวลาอื่น`;

  const otherWinners = allCandidates.filter((c) => c.id !== recommended.id);
  const comparisonText = otherWinners
    .map((c) => `ตัวเลือก ${c.id} (${c.start}–${c.end} น. ได้คะแนน ${c.score}/100)`)
    .join(" และ ");

  const explanation = `${userName}ครับ จากการเปรียบเทียบช่วงเวลาสำหรับ${activity}ในวันที่ ${dateStr} พบว่าตัวเลือก ${recommended.id} (${recommended.start}–${recommended.end} น.) คือช่วงเวลาที่ลงตัวและมีพลังงานส่งเสริมสูงสุด เมื่อเทียบกับ ${comparisonText} โดยมีจุดเด่นคือ${recommended.strengths[0] || "ความราบรื่น"} ขอแนะนำให้ล็อกช่วงเวลานี้ในการดำเนินการครับ`;

  const actionable = `ล็อกช่วงเวลา ${recommended.start}–${recommended.end} น. (ตัวเลือก ${recommended.id}) สำหรับ${activity} และจัดเตรียมข้อมูลสำคัญล่วงหน้า 15 นาที`;

  return { explanation, reason, actionable };
}

/**
 * Main Orchestrator for Timing Comparison (STEP 4.4)
 */
export async function compareTimingWindows(
  options: CompareTimingOptions
): Promise<TimingComparisonResult> {
  const {
    activity,
    userId,
    supabase,
    aiWorkerUrl,
    aiWorkerSecret,
    userName = "คุณ",
  } = options;

  // 1. วันที่เป้าหมาย (Default: วันนี้ตามเวลาไทย)
  const now = new Date();
  const dateStr =
    options.date ||
    new Date(now.getTime() + 7 * 3600 * 1000).toISOString().split("T")[0];

  const [year, month, day] = dateStr.split("-").map((v) => parseInt(v, 10));
  const targetDate = new Date(Date.UTC(year, month - 1, day, 5, 0, 0));

  const question =
    options.question?.trim() ||
    `เปรียบเทียบช่วงเวลาสำหรับ${activity} ประจำวันที่ ${dateStr}`;

  // 2. Generate or Normalize Candidate Windows (A, B, C)
  let rawWindows = options.customWindows && options.customWindows.length >= 2
    ? options.customWindows.slice(0, 3)
    : generateDefaultWindows(targetDate);

  const ID_KEYS = ["A", "B", "C"];
  const candidates: CandidateWindow[] = rawWindows.map((win, idx) => {
    const id = ID_KEYS[idx] || String(idx + 1);
    return evaluateCandidateWindow(win, id, targetDate, dateStr, activity);
  });

  // 3. Rank Best Window
  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const recommendedCandidate = ranked[0];

  // 4. Deterministic Baseline Explanation
  const { explanation: baseExplanation, reason, actionable } = generateDeterministicExplanation(
    recommendedCandidate,
    candidates,
    activity,
    dateStr,
    userName
  );

  // 5. Optional AI Plain-Language Explanation (via AI Worker)
  let finalAnswer = baseExplanation;
  if (aiWorkerUrl) {
    try {
      const prompt = `คุณคือ "Wisdom" ที่ปรึกษาจังหวะชีวิตส่วนตัวของ${userName}
โจทย์: ผู้ใช้ต้องการเปรียบเทียบ 3 ช่วงเวลาเพื่อทำกิจกรรม "${activity}" ในวันที่ ${dateStr}

ผลการคำนวณจากระบบ:
${candidates
  .map(
    (c) =>
      `- ตัวเลือก ${c.id} (${c.start}–${c.end} น.): คะแนน ${c.score}/100, ระดับ: ${c.suitability}
  จุดเด่น: ${c.strengths.join(", ")}
  ข้อระวัง: ${c.cautions.join(", ")}`
  )
  .join("\n")}

ช่วงเวลาที่ระบบประเมินว่าดีที่สุดคือ: ตัวเลือก ${recommendedCandidate.id} (${recommendedCandidate.start}–${recommendedCandidate.end} น.)

คำสั่ง:
1. อธิบายเปรียบเทียบสั้นๆ เป็นภาษาเพื่อนที่เป็นมิตร กระชับ เข้าใจง่ายใน 3-4 ประโยค
2. บอกเหตุผลว่าทำไมตัวเลือก ${recommendedCandidate.id} จึงชนะตัวเลือกอื่น
3. ห้ามใช้คำศัพท์โหราศาสตร์เฉพาะทาง (เช่น ยาม, พรายกระซิบ, ราหู, ทักษา)
4. จบด้วยคำแนะนำที่ปฏิบัติได้ทันที 1 ข้อ`;

      const aiRes = await fetch(`${aiWorkerUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiWorkerSecret || ""}`,
        },
        body: JSON.stringify({
          userId: userId || "timing-comparison",
          reportType: "timing_comparison",
          context: { activity, date: dateStr },
          prompt,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json<{ text?: string }>();
        if (aiData.text?.trim()) {
          finalAnswer = aiData.text.trim();
        }
      }
    } catch (err) {
      console.warn("[compareTimingWindows] AI worker failed, using deterministic explanation:", err);
    }
  }

  const result: TimingComparisonResult = {
    question,
    activity,
    date: dateStr,
    candidates,
    recommendedCandidate,
    reason,
    actionable,
  };

  // 6. Save to Unified Wisdom Memory (No new table needed)
  if (supabase && userId) {
    try {
      const evidenceSnapshot = candidates.map((c) => ({
        source: `ตัวเลือก ${c.id} (${c.start}–${c.end} น.)`,
        finding: `คะแนนพลังงาน ${c.score}/100 (${c.suitability === "optimal" ? "ช่วงเวลาทอง" : c.suitability === "favorable" ? "จังหวะส่งเสริม" : "ปานกลาง"}) — ${c.strengths[0] || "มีความพร้อม"}`,
        weight: c.id === recommendedCandidate.id ? "primary" : "supporting",
      }));

      const saved = await saveWisdomQuery(supabase, userId, {
        question,
        intentCategory: "timing",
        contextType: "timing_comparison",
        confidence: "high",
        answer: finalAnswer,
        actionable,
        bestWindow: {
          timeRange: `${recommendedCandidate.start}–${recommendedCandidate.end}`,
          description: `ช่วงเวลาที่เหมาะสมที่สุด (ตัวเลือก ${recommendedCandidate.id}) สำหรับ${activity}`,
        },
        predictionScore: recommendedCandidate.score,
        evidenceSnapshot,
        engineSnapshot: {
          activity,
          date: dateStr,
          candidates,
          recommendedCandidateId: recommendedCandidate.id,
        },
      });

      if (saved?.id) {
        result.queryId = saved.id;
        result.isBookmarked = saved.is_bookmarked;
      }
    } catch (saveErr) {
      console.warn("[compareTimingWindows] Auto-save to wisdom memory failed:", saveErr);
    }
  }

  return result;
}
