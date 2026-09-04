/**
 * predictionOrchestrator.server.ts — 4 Sacred Engines Prediction Orchestrator
 *
 * ParsedIntent → ดึง Logic ของศาสตร์ที่ตรงที่สุด (โหรทายหนู / ยามอัฏฐกาล / กาลชะตา / ราหูค้นทรัพย์)
 * → สังเคราะห์เป็นคำตอบภาษาชีวิตจริง (Level 1)
 * → ส่งออก Deep Link & Target Route ไปยังผังการคำนวณเจาะลึก
 */

import type { IntentCategory, ParsedIntent, SacredEngineCategory } from "./intentParser.server";
import { SACRED_ENGINES } from "./intentParser.server";
import {
  getCurrentYam,
  calculateHoraTaynoo,
  interpretChart,
  calculateRahu,
  calculateAuspiciousTime,
  calculateKarnchata,
  PLANET_INFO,
  ZODIAC_ORDER,
} from "@phopephum/engine";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  birthDate?: string | null;
  birthTime?: string | null;
  birthPlace?: string | null;
  displayName?: string | null;
  taksaSri?: string | null;
  taksaKala?: string | null;
  ageYang?: number | string | null;
}

// L1 — User sees this
export interface PredictionResult {
  question: string;
  intentCategory: IntentCategory;
  sacredEngine?: SacredEngineCategory;
  targetRoute?: string;
  targetEngineTitle?: string;
  targetEngineReason?: string;
  confidence: "high" | "medium" | "low";

  // Main answer (AI-generated or synthesized fallback)
  answer: string;

  // Optional timing suggestion
  bestWindow?: {
    timeRange: string;
    description: string;
  };

  // Actionable advice
  actionable: string;

  // Evidence chain (L2)
  evidenceChain?: Array<{
    source: string;
    finding: string;
    weight: "primary" | "supporting";
  }>;

  // Memory & snapshot properties
  engineSnapshot?: Record<string, any>;
  predictionScore?: number;
  queryId?: string;
  isBookmarked?: boolean;

  // Error state
  error?: string;
}

// ─── Engine Evidence Builder ───────────────────────────────────────────────────

interface EngineSnapshot {
  sacredEngine: SacredEngineCategory;
  targetRoute: string;
  targetEngineTitle: string;
  // ยามอัฏฐกาล
  yamLevel: string;
  yamName: string;
  yamShouldDo: string;
  yamTravelDirection?: string;
  // โหรทายหนู
  horaOverallScore: number;
  horaLagnaName: string;
  horaYamPlanetName: string;
  horaWork: string;
  horaFinance: string;
  horaLove: string;
  horaHealth: string;
  // กาลชะตา
  karnchataYamYai: string;
  karnchataYamSoy: string;
  karnchataDayStar: number;
  // ราหูค้นทรัพย์
  rahuCurrentMomentGood: boolean;
  rahuAdvice?: string;
  rahuLostItem?: string;
  rahuSubSlotName?: string;
  rahuSubSlotTime?: string;
  // ฤกษ์มงคล & ทักษา
  auspiciousBestSlot?: string;
  auspiciousBestFor?: string[];
  personalSri?: string;
  personalKala?: string;
}

function buildEngineSnapshot(
  intent: ParsedIntent,
  now: Date,
  profile: UserProfile | null
): EngineSnapshot {
  const engineInfo = SACRED_ENGINES[intent.sacredEngine] || SACRED_ENGINES.horanu;

  // 1. ยามอัฏฐกาล (Atthakarn)
  const yam = getCurrentYam();
  const yamLevel = yam.travelAuspiciousness.level;
  const yamShouldDo = yam.prediction?.shouldDo ?? "";
  const yamTravelDirection = (yam.prediction as any)?.travelDirection ?? yam.travelAuspiciousness.label ?? "ทิศมงคลประจำวัน";

  // 2. โหรทายหนู (Horanu / Phra Krasib)
  const hora = calculateHoraTaynoo({ dateAsked: now });
  const interpretation = interpretChart(hora);
  const horaScore = interpretation.overallScore ?? 50;
  const horaCategories = interpretation.categories ?? {};
  const horaLagnaName = ZODIAC_ORDER[hora.lagnaZodiacIndex]?.name ?? "เมษ";
  const horaYamPlanetName = PLANET_INFO[hora.yamPlanet]?.thai ?? "ดาวพฤหัส";

  // 3. กาลชะตา (Karnchata - รายชั่วโมง ยามซอย)
  const karnchata = calculateKarnchata(now);

  // 4. ราหูค้นทรัพย์ (Rahu - ๙ ฤกษ์ย่อย ๑๐ นาที & ของหาย)
  let rahuCurrentMomentGood = false;
  let rahuAdvice: string | undefined;
  let rahuLostItem: string | undefined;
  let rahuSubSlotName: string | undefined;
  let rahuSubSlotTime: string | undefined;

  const rahu = calculateRahu(now);
  if (rahu) {
    rahuCurrentMomentGood = rahu.is_current_moment_good;
    rahuAdvice = rahu.summary.advice;
    rahuLostItem = rahu.yam_rule?.huajai_lost_item ?? undefined;
    if (rahu.sub_block) {
      rahuSubSlotName = rahu.sub_block.name;
      rahuSubSlotTime = `นาทีที่ ${rahu.sub_block.minute_start} - ${rahu.sub_block.minute_end}`;
    }
  }

  // 5. ฤกษ์มงคล
  let auspiciousBestSlot: string | undefined;
  let auspiciousBestFor: string[] | undefined;
  const auspicious = calculateAuspiciousTime(now);
  if (auspicious.bestSlot) {
    auspiciousBestSlot = auspicious.bestSlot.timeRange;
    auspiciousBestFor = auspicious.bestSlot.suitableFor;
  }

  // 6. ทักษาจร
  let personalSri: string | undefined;
  let personalKala: string | undefined;
  if (profile?.taksaSri) personalSri = profile.taksaSri;
  if (profile?.taksaKala) personalKala = profile.taksaKala;

  return {
    sacredEngine: intent.sacredEngine,
    targetRoute: engineInfo.route,
    targetEngineTitle: engineInfo.title,
    yamLevel,
    yamName: yam.yamName,
    yamShouldDo,
    yamTravelDirection,
    horaOverallScore: horaScore,
    horaLagnaName,
    horaYamPlanetName,
    horaWork: horaCategories.work ?? "",
    horaFinance: horaCategories.finance ?? "",
    horaLove: horaCategories.love ?? "",
    horaHealth: horaCategories.health ?? "",
    karnchataYamYai: karnchata.yamYaiName,
    karnchataYamSoy: karnchata.yamSoyName,
    karnchataDayStar: karnchata.dayStarNumber,
    rahuCurrentMomentGood,
    rahuAdvice,
    rahuLostItem,
    rahuSubSlotName,
    rahuSubSlotTime,
    auspiciousBestSlot,
    auspiciousBestFor,
    personalSri,
    personalKala,
  };
}

// ─── AI Prompt Builder ─────────────────────────────────────────────────────────

function buildIntentPrompt(
  intent: ParsedIntent,
  snap: EngineSnapshot,
  userName: string,
  now: Date
): string {
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const dayStr = now.toLocaleDateString("th-TH", { weekday: "long" });

  let engineKnowledge = "";

  switch (snap.sacredEngine) {
    case "horanu":
      // โหรทายหนู: เจาะเหตุการณ์เฉพาะหน้า จะได้ไหม สำเร็จไหม
      engineKnowledge = `
[หลักการพยากรณ์: โหรทายหนู ๑๒ ภพ (เฉพาะหน้า/จะได้ไหม/สำเร็จไหม)]
- จุดกาลเวลาลัคนาสถิต: ภพ${snap.horaLagnaName} | ดาวยามผู้ครองกาล: ${snap.horaYamPlanetName}
- คะแนนดวงยามภาพรวม: ${snap.horaOverallScore}/100
- ความรัก/ความสัมพันธ์: ${snap.horaLove || "ดำเนินไปตามเหตุปัจจัย"}
- การงาน/ข้อตกลง: ${snap.horaWork || "ขึ้นอยู่กับความเด็ดขาดในการลงมือทำ"}
- การเงิน/ผลประโยชน์: ${snap.horaFinance || "มีเกณฑ์ขยับขยายตามจังหวะ"}
- สรุปเกณฑ์: หากคะแนนเกิน 60 ถือว่าสำเร็จสมหวัง หากต่ำกว่า 50 จะมีอุปสรรคต้องแก้ไข`;
      break;

    case "yam":
      // ยามอัฏฐกาล: ถามยาม ช่วงเวลาเดินทาง วันเวลาเจรจาธุรกิจสำเร็จ
      engineKnowledge = `
[หลักการพยากรณ์: ยามอัฏฐกาล ๘ ยาม (ช่วงเวลาเดินทาง/วันเวลาเจรจาสำเร็จ)]
- ยามปัจจุบัน: ${snap.yamName} (ระดับพลังงาน: ${snap.yamLevel})
- ทิศมงคลนำโชค: ${snap.yamTravelDirection}
- ช่วงเวลาทองของวัน: ${snap.auspiciousBestSlot || "ช่วงยามปลอดกลางวัน"}
- คำแนะนำการเคลื่อนไหว: ${snap.yamShouldDo || "มุ่งหน้าสู่เป้าหมายด้วยความมั่นใจ"}`;
      break;

    case "karnchata":
      // กาลชะตา: วางแผนรายวัน รายชั่วโมง (เจรจา, ขอแต่งงาน, ปิดการขาย)
      engineKnowledge = `
[หลักการพยากรณ์: กาลชะตายามซอย (วางแผนรายวัน รายชั่วโมง เจรจา/แต่งงาน/ปิดการขาย)]
- ยามใหญ่ขณะนี้: ${snap.karnchataYamYai} | ยามซอยขณะนี้: ${snap.karnchataYamSoy}
- ดาวประจำวันครองฤกษ์: ดาว ${snap.karnchataDayStar}
- แนวทางจัดไทม์ไลน์: เน้นจังหวะที่ยามซอยเป็นยามศุภะ/ลาภะ เหมาะกับการเอ่ยปากขอแต่งงานหรือปิดการขายสำคัญ`;
      break;

    case "rahu":
      // ราหูค้นทรัพย์: ฤกษ์ย่อย 10 นาที และของหาย
      engineKnowledge = `
[หลักการพยากรณ์: ราหูค้นทรัพย์ ๙ ฤกษ์ย่อย ๑๐ นาที (ฤกษ์ด่วน/ตามหาของหาย)]
- สถานะฤกษ์ย่อยขณะนี้: ${snap.rahuCurrentMomentGood ? "ฤกษ์ดีเปิดทรัพย์" : "ฤกษ์ควรระวัง"}
- ช่วงฤกษ์ย่อย 10 นาที: ${snap.rahuSubSlotName || "ฤกษ์จร"} (${snap.rahuSubSlotTime || timeStr})
- ทิศทางและสัญญาณของหาย: ${snap.rahuLostItem || "ของอาจตกหล่นในมุมอับหรือทิศตะวันออก"}
- คำแนะนำการตามหา: ${snap.rahuAdvice || "มีเกณฑ์พบหากตรวจสอบในที่ใกล้ตัวหรือมุมเดิม"}`;
      break;
  }

  const personalNote = snap.personalSri
    ? `\n[พลังงานส่วนบุคคลของ${userName}]\n- ดาวส่งเสริม: ${snap.personalSri}\n${snap.personalKala ? `- จุดควรระวัง: ${snap.personalKala}` : ""}`
    : "";

  return `คุณคือ "Wisdom" — ที่ปรึกษาปัญญาญาณกาลเวลาส่วนตัวของ${userName}
ทำหน้าที่แปลผลจากศาสตร์พยากรณ์ชั้นสูงของไทยเป็นภาษาชีวิตจริงที่แม่นยำ ลุ่มลึก และตรงประเด็น

ผู้ถาม: ${userName} | เวลาปัจจุบัน: ${timeStr} วัน${dayStr}
คำถามที่ถาม: "${intent.raw}"

${engineKnowledge}
${personalNote}

─── กฎเหล็กในการตอบ ───
1. ตอบตรงประเด็นคำถามทันทีในประโยคแรก (จะได้ไหม / เวลาไหนดี / แผนอย่างไร / ของอยู่ที่ไหน)
2. อธิบายเหตุผลตามพลังงานอย่างเข้าใจง่าย ห้ามใช้ศัพท์บาลีโหรที่ฟังยาก
3. ให้คำแนะนำเชิงปฏิบัติ (Actionable Advice) ที่นำไปใช้ได้ทันที 1 ข้อ
4. ความยาวกระชับ 3-5 ประโยค ทรงพลัง เป็นมิตร และให้ความมั่นใจ`;
}

// ─── Evidence Chain Builder (L2) ──────────────────────────────────────────────

function buildEvidenceChain(
  intent: ParsedIntent,
  snap: EngineSnapshot
): PredictionResult["evidenceChain"] {
  const chain: NonNullable<PredictionResult["evidenceChain"]> = [];

  switch (snap.sacredEngine) {
    case "horanu":
      chain.push({
        source: "ผังดวงโหรทายหนู ๑๒ ภพ",
        finding: `ลัคนาสถิตภพ${snap.horaLagnaName} ดาวเจ้ายามคือ${snap.horaYamPlanetName} (คะแนนรวม ${snap.horaOverallScore}/100)`,
        weight: "primary",
      });
      if (snap.horaWork) {
        chain.push({ source: "เกณฑ์ด้านการงาน/ข้อตกลง", finding: snap.horaWork, weight: "supporting" });
      }
      break;

    case "yam":
      chain.push({
        source: "ยามอัฏฐกาล ๘ ยาม",
        finding: `ยามปัจจุบันคือ ${snap.yamName} สถานะพลังงาน ${snap.yamLevel}`,
        weight: "primary",
      });
      if (snap.auspiciousBestSlot) {
        chain.push({ source: "ช่วงเวลามงคลเจรจา/เดินทาง", finding: snap.auspiciousBestSlot, weight: "supporting" });
      }
      break;

    case "karnchata":
      chain.push({
        source: "กาลชะตายามซอยรายชั่วโมง",
        finding: `กำลังสถิตยามใหญ่ ${snap.karnchataYamYai} แตกยามซอย ${snap.karnchataYamSoy}`,
        weight: "primary",
      });
      break;

    case "rahu":
      chain.push({
        source: "ราหูค้นทรัพย์ ๙ ฤกษ์ย่อย ๑๐ นาที",
        finding: snap.rahuLostItem ? `เบาะแสสิ่งของ: ${snap.rahuLostItem}` : `ฤกษ์ย่อย: ${snap.rahuSubSlotName || "ช่วงเวลาปัจจุบัน"}`,
        weight: "primary",
      });
      if (snap.rahuAdvice) {
        chain.push({ source: "คำแนะนำการค้นหา/ฤกษ์", finding: snap.rahuAdvice, weight: "supporting" });
      }
      break;
  }

  return chain;
}

// ─── Fallback Generator ───────────────────────────────────────────────────────

function generateFallbackAnswer(
  intent: ParsedIntent,
  snap: EngineSnapshot,
  userName: string
): string {
  switch (snap.sacredEngine) {
    case "horanu":
      return `${userName}ครับ สำหรับเรื่องที่ถามเฉพาะหน้านี้ พลังงานดวงยามบ่งชี้ว่ามีโอกาสสำเร็จสมหวัง (เกณฑ์ความพร้อม ${snap.horaOverallScore}%) สิ่งสำคัญคือการตัดสินใจที่เด็ดขาดและลงมือทำอย่างต่อเนื่องครับ`;

    case "yam":
      return `${userName}ครับ ช่วงเวลาและยามมงคลสำหรับการเดินทางหรือเจรจาธุรกิจคือช่วง ${snap.auspiciousBestSlot || snap.yamName} โดยมีทิศมงคลเกื้อหนุนคือ ${snap.yamTravelDirection} จะช่วยให้การติดต่อราบรื่นสำเร็จครับ`;

    case "karnchata":
      return `${userName}ครับ ในการวางแผนรายวันรายชั่วโมงเพื่อเจรจาหรือติดต่อเรื่องสำคัญ แนะนำให้ดำเนินตามจังหวะยามซอย ${snap.karnchataYamSoy} ซึ่งเป็นจังหวะที่ผู้ใหญ่และคู่เจรจาเปิดรับและเห็นพ้องต้องกันได้ง่ายที่สุดครับ`;

    case "rahu":
      return `${userName}ครับ สำหรับฤกษ์ย่อย ๑๐ นาทีและการตามหาของหาย ${snap.rahuAdvice || "แนะนำให้ตั้งสติและตรวจสอบในมุมอับหรือทิศทางที่คุ้นเคย"} ${snap.rahuLostItem ? `มีเกณฑ์สูงว่าจะอยู่${snap.rahuLostItem}` : ""}`;
  }
}

// ─── Main Orchestrator ─────────────────────────────────────────────────────────

export async function orchestratePrediction(
  intent: ParsedIntent,
  profile: UserProfile | null,
  aiWorkerUrl: string,
  aiWorkerSecret: string,
  now: Date = new Date()
): Promise<PredictionResult> {
  const userName = profile?.displayName ?? "คุณ";
  const snap = buildEngineSnapshot(intent, now, profile);

  let answer = "";
  try {
    if (aiWorkerUrl) {
      const prompt = buildIntentPrompt(intent, snap, userName, now);
      const aiRes = await fetch(`${aiWorkerUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiWorkerSecret}`,
        },
        body: JSON.stringify({
          userId: "intent-prediction",
          reportType: `sacred_${snap.sacredEngine}`,
          context: {
            sacredEngine: snap.sacredEngine,
            intentCategory: intent.category,
          },
          prompt,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json<{ text?: string; error?: string }>();
        answer = aiData.text?.trim() ?? "";
      }
    }
  } catch (err) {
    console.warn("[orchestratePrediction] AI Worker unreachable, falling back to engine synthesis:", err);
  }

  if (!answer) {
    answer = generateFallbackAnswer(intent, snap, userName);
  }

  const sentences = answer.split(/[.!?。\n]/).filter(Boolean);
  const actionable =
    sentences[sentences.length - 1]?.trim() ??
    snap.yamShouldDo ??
    "ตั้งสติและดำเนินการตามจังหวะเวลาที่เอื้ออำนวย";

  const bestWindow = snap.auspiciousBestSlot
    ? {
        timeRange: snap.auspiciousBestSlot,
        description: snap.auspiciousBestFor?.join(", ") ?? "ช่วงเวลาส่งเสริมความสำเร็จ",
      }
    : undefined;

  const confidenceLevel: PredictionResult["confidence"] =
    intent.confidence >= 0.8 ? "high" : intent.confidence >= 0.6 ? "medium" : "low";

  const evidenceChain = buildEvidenceChain(intent, snap);

  return {
    question: intent.raw,
    intentCategory: intent.category,
    sacredEngine: snap.sacredEngine,
    targetRoute: snap.targetRoute,
    targetEngineTitle: snap.targetEngineTitle,
    targetEngineReason: SACRED_ENGINES[snap.sacredEngine].reason,
    confidence: confidenceLevel,
    answer,
    bestWindow,
    actionable,
    evidenceChain,
    engineSnapshot: snap,
    predictionScore: snap.horaOverallScore,
  };
}
