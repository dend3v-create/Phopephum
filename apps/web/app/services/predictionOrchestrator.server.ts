/**
 * predictionOrchestrator.server.ts — Intent-Based Prediction Orchestrator
 *
 * Thin middleware layer:
 * ParsedIntent → Run relevant engines → Normalize → Build AI prompt → Call AI Worker
 *
 * RULE: ห้ามแก้ Calculation Engine ใดๆ ทั้งสิ้น
 * RULE: ห้าม expose ชื่อศาสตร์ใน L1 output
 * RULE: ทุก AI call ผ่าน AI_WORKER_URL/generate เท่านั้น
 */

import type { IntentCategory, ParsedIntent } from "./intentParser.server";
import {
  getCurrentYam,
  calculateHoraTaynoo,
  interpretChart,
  calculateRahu,
  calculateAuspiciousTime,
  calculatePhopephum,
  getYamPrediction,
} from "@phopephum/engine";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  birthDate?: string | null
  birthTime?: string | null
  birthPlace?: string | null
  displayName?: string | null
  taksaSri?: string | null
  taksaKala?: string | null
  ageYang?: number | string | null
}

// L1 — User sees this only
export interface PredictionResult {
  question: string
  intentCategory: IntentCategory
  confidence: "high" | "medium" | "low"

  // Main answer (AI-generated, no jargon)
  answer: string

  // Optional timing suggestion (for timing/career/finance intent)
  bestWindow?: {
    timeRange: string
    description: string
  }

  // 1 actionable advice
  actionable: string

  // Evidence chain (L2 — Pro users only)
  evidenceChain?: Array<{
    source: string    // "พลังงานจักรวาล" (plain language, no jargon)
    finding: string
    weight: "primary" | "supporting"
  }>

  // Memory & snapshot properties (STEP 4.1 & 4.2)
  engineSnapshot?: Record<string, any>
  predictionScore?: number
  queryId?: string
  isBookmarked?: boolean

  // Error state
  error?: string
}

// ─── Engine Evidence Builder ───────────────────────────────────────────────────

interface EngineSnapshot {
  yamLevel: string
  yamName: string
  yamShouldDo: string
  horaOverallScore: number
  horaWork: string
  horaFinance: string
  horaLove: string
  horaHealth: string
  rahuAdvice?: string
  rahuLostItem?: string
  auspiciousBestSlot?: string
  auspiciousBestFor?: string[]
  personalSri?: string
  personalKala?: string
}

function buildEngineSnapshot(
  intent: ParsedIntent,
  now: Date,
  profile: UserProfile | null
): EngineSnapshot {
  // 1. ยามอัฏฐกาล (always)
  const yam = getCurrentYam()
  const yamLevel = yam.travelAuspiciousness.level
  const yamShouldDo = yam.prediction?.shouldDo ?? ""

  // 2. ยามพรายกระซิบ (always for context)
  const hora = calculateHoraTaynoo({ dateAsked: now })
  const interpretation = interpretChart(hora)
  const horaScore = interpretation.overallScore ?? 50
  const horaCategories = interpretation.categories ?? {}

  // 3. ราหูค้นทรัพย์ (only for lost)
  let rahuAdvice: string | undefined
  let rahuLostItem: string | undefined
  if (intent.category === "lost") {
    const rahu = calculateRahu(now)
    if (rahu) {
      rahuAdvice = rahu.summary.advice
      rahuLostItem = rahu.yam_rule?.huajai_lost_item ?? undefined
    }
  }

  // 4. ฤกษ์มงคล (for timing + career + finance)
  let auspiciousBestSlot: string | undefined
  let auspiciousBestFor: string[] | undefined
  if (["timing", "career", "finance"].includes(intent.category)) {
    const auspicious = calculateAuspiciousTime(now)
    if (auspicious.bestSlot) {
      auspiciousBestSlot = auspicious.bestSlot.timeRange
      auspiciousBestFor = auspicious.bestSlot.suitableFor
    }
  }

  // 5. ทักษาจร (personal, only if birth_date available)
  let personalSri: string | undefined
  let personalKala: string | undefined
  if (profile?.taksaSri) personalSri = profile.taksaSri
  if (profile?.taksaKala) personalKala = profile.taksaKala

  return {
    yamLevel,
    yamName: yam.yamName,
    yamShouldDo,
    horaOverallScore: horaScore,
    horaWork: horaCategories.work ?? "",
    horaFinance: horaCategories.finance ?? "",
    horaLove: horaCategories.love ?? "",
    horaHealth: horaCategories.health ?? "",
    rahuAdvice,
    rahuLostItem,
    auspiciousBestSlot,
    auspiciousBestFor,
    personalSri,
    personalKala,
  }
}

// ─── AI Prompt Builder ─────────────────────────────────────────────────────────

function buildIntentPrompt(
  intent: ParsedIntent,
  snap: EngineSnapshot,
  userName: string,
  now: Date
): string {
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
  const dayStr = now.toLocaleDateString("th-TH", { weekday: "long" })

  // Translate engine data → plain Thai (no jargon)
  const yamStrength = snap.yamLevel === "excellent"
    ? "พลังงานจักรวาลขณะนี้อยู่ในช่วงดีเยี่ยม เหมาะอย่างยิ่ง"
    : snap.yamLevel === "very_good"
    ? "พลังงานจักรวาลขณะนี้เอื้ออำนวยและเป็นมงคล"
    : snap.yamLevel === "good"
    ? "พลังงานจักรวาลขณะนี้อยู่ในระดับดี พอเหมาะ"
    : "พลังงานจักรวาลขณะนี้ค่อนข้างติดขัด ควรระมัดระวัง"

  // Category-specific context
  let categoryContext = ""
  switch (intent.category) {
    case "timing":
      categoryContext = `
[จังหวะเวลา]
- ${yamStrength}
${snap.auspiciousBestSlot ? `- ช่วงเวลาที่ดีที่สุดของวันนี้: ${snap.auspiciousBestSlot}` : ""}
${snap.auspiciousBestFor ? `  เหมาะกับ: ${snap.auspiciousBestFor.slice(0, 3).join(", ")}` : ""}
${snap.yamShouldDo ? `- สิ่งที่ควรทำตอนนี้: ${snap.yamShouldDo}` : ""}`.trim()
      break

    case "lost":
      categoryContext = `
[การค้นหาทรัพย์]
- ${yamStrength}
${snap.rahuAdvice ? `- คำแนะนำ: ${snap.rahuAdvice}` : ""}
${snap.rahuLostItem ? `- เกี่ยวกับสิ่งที่หาย: ${snap.rahuLostItem}` : ""}`.trim()
      break

    case "relationship":
      categoryContext = `
[ความสัมพันธ์]
- ${yamStrength}
${snap.horaLove ? `- พลังงานด้านความสัมพันธ์ตอนนี้: ${snap.horaLove}` : ""}`.trim()
      break

    case "finance":
      categoryContext = `
[การเงินและธุรกิจ]
- ${yamStrength}
${snap.horaFinance ? `- พลังงานด้านการเงินตอนนี้: ${snap.horaFinance}` : ""}
${snap.auspiciousBestSlot ? `- ช่วงเวลาดีสำหรับการเงิน: ${snap.auspiciousBestSlot}` : ""}`.trim()
      break

    case "career":
      categoryContext = `
[การงานและอาชีพ]
- ${yamStrength}
${snap.horaWork ? `- พลังงานด้านการงานตอนนี้: ${snap.horaWork}` : ""}
${snap.auspiciousBestSlot ? `- ช่วงเวลาดีสำหรับการงาน: ${snap.auspiciousBestSlot}` : ""}
${snap.yamShouldDo ? `- สิ่งที่ควรทำ: ${snap.yamShouldDo}` : ""}`.trim()
      break

    case "health":
      categoryContext = `
[สุขภาพและความเป็นอยู่]
- ${yamStrength}
${snap.horaHealth ? `- พลังงานด้านสุขภาพตอนนี้: ${snap.horaHealth}` : ""}`.trim()
      break

    default:
      categoryContext = `
[พลังงานทั่วไป]
- ${yamStrength}
${snap.yamShouldDo ? `- สิ่งที่ควรทำ: ${snap.yamShouldDo}` : ""}`.trim()
  }

  const personalNote = snap.personalSri
    ? `\n[พลังงานส่วนตัวของ${userName}]\n- ดาวแห่งโชคลาภของคุณตอนนี้คือ: ${snap.personalSri}\n${snap.personalKala ? `- ควรระวังพลังงานของ: ${snap.personalKala}` : ""}`
    : ""

  return `คุณคือ "Wisdom" — เพื่อนผู้ทรงปัญญาส่วนตัวของ${userName}
คุณเข้าใจภูมิปัญญาโบราณเชิงลึก แต่พูดคุยแบบเพื่อน ไม่ใช้ศัพท์เทคนิค ไม่บรรยายระบบ

กำลังสนทนากับ: ${userName} | เวลา: ${timeStr} ${dayStr}

${categoryContext}
${personalNote}

คำถาม: "${intent.raw}"

─── วิธีตอบ ───
1. ตอบตรงๆ จากมุมเพื่อนที่รู้ทิศทางพลังงาน ไม่ใช่โหร
2. แปลพลังงานออกมาเป็นภาษาชีวิตจริง ห้ามพูดว่า "ยามอัฏฐกาล" "ราหู" "ทักษา" "มหาภูติ" "พรายกระซิบ" "กาลชะตา"
3. ถ้ามีข้อมูลส่วนตัว ให้สอดแทรก "สำหรับคุณโดยเฉพาะ..."
4. จบด้วยคำแนะนำปฏิบัติ 1 ข้อที่ทำได้ทันที
5. ความยาว: 3-5 ประโยค กระชับ อบอุ่น มีพลัง
6. น้ำเสียง: เพื่อนสนิท ลุ่มลึก ห่วงใย`
}

// ─── Evidence Chain Builder (L2) ──────────────────────────────────────────────

function buildEvidenceChain(
  intent: ParsedIntent,
  snap: EngineSnapshot
): PredictionResult["evidenceChain"] {
  const chain: NonNullable<PredictionResult["evidenceChain"]> = []

  // Primary: Yam (always)
  chain.push({
    source: "พลังงานจักรวาล ณ เวลานี้",
    finding: snap.yamLevel === "excellent"
      ? "ช่วงเวลานี้เอื้ออำนวยมากที่สุด"
      : snap.yamLevel === "very_good"
      ? "ช่วงเวลานี้เป็นมงคลและเอื้ออำนวย"
      : snap.yamLevel === "good"
      ? "ช่วงเวลานี้อยู่ในระดับดี"
      : "ช่วงเวลานี้ค่อนข้างขัดข้อง",
    weight: "primary",
  })

  // Secondary: Category-specific
  if (intent.category === "lost" && snap.rahuAdvice) {
    chain.push({ source: "พลังงานค้นหาทรัพย์", finding: snap.rahuAdvice, weight: "primary" })
    if (snap.rahuLostItem)
      chain.push({ source: "สัญญาณเกี่ยวกับสิ่งของ", finding: snap.rahuLostItem, weight: "supporting" })
  }

  if (["timing", "career", "finance"].includes(intent.category) && snap.auspiciousBestSlot) {
    chain.push({
      source: "ช่วงเวลาที่เป็นมงคล",
      finding: `${snap.auspiciousBestSlot}${snap.auspiciousBestFor ? " — เหมาะกับ" + snap.auspiciousBestFor.slice(0, 2).join(", ") : ""}`,
      weight: "supporting",
    })
  }

  if (intent.category === "relationship" && snap.horaLove) {
    chain.push({ source: "พลังงานด้านความสัมพันธ์", finding: snap.horaLove, weight: "supporting" })
  }

  if (intent.category === "career" && snap.horaWork) {
    chain.push({ source: "พลังงานด้านการงาน", finding: snap.horaWork, weight: "supporting" })
  }

  if (intent.category === "finance" && snap.horaFinance) {
    chain.push({ source: "พลังงานด้านการเงิน", finding: snap.horaFinance, weight: "supporting" })
  }

  if (snap.personalSri) {
    chain.push({
      source: "พลังงานส่วนตัวของคุณ",
      finding: `ช่วงนี้ดาวแห่งโชคลาภส่งผลให้คุณ${snap.horaOverallScore >= 60 ? "เอื้ออำนวย" : "ต้องระวัง"}`,
      weight: "supporting",
    })
  }

  return chain
}


function generateFallbackAnswer(
  intent: ParsedIntent,
  snap: EngineSnapshot,
  userName: string
): string {
  const energyDesc =
    snap.yamLevel === "excellent"
      ? "พลังงานจักรวาลช่วงเวลานี้เปิดกว้างและส่งผลดีเยี่ยมสำหรับคุณ"
      : snap.yamLevel === "very_good"
      ? "พลังงานจักรวาลขณะนี้มีความราบรื่นและเป็นมงคล"
      : snap.yamLevel === "good"
      ? "พลังงานขณะนี้อยู่ในเกณฑ์ปกติ เหมาะกับการดำเนินงานอย่างรอบคอบ"
      : "พลังงานจักรวาลช่วงเวลานี้ค่อนข้างผันผวน ควรชะลอการตัดสินใจสำคัญ";

  if (intent.category === "lost") {
    return `${userName}ครับ สำหรับสิ่งของที่กำลังค้นหา ${snap.rahuAdvice || "ขอแนะนำให้ตั้งสติและลองตรวจดูในบริเวณที่คุ้นเคยหรือทิศตะวันออก"} ${snap.rahuLostItem ? `มีแนวโน้มว่าจะอยู่${snap.rahuLostItem}` : ""}`;
  }

  if (intent.category === "timing") {
    return `${userName}ครับ ${energyDesc} ${snap.auspiciousBestSlot ? `หากต้องการดำเนินการเรื่องสำคัญ ช่วงเวลาทองของวันนี้คือ ${snap.auspiciousBestSlot}` : ""} ${snap.yamShouldDo ? `ข้อแนะนำสำคัญ: ${snap.yamShouldDo}` : ""}`;
  }

  if (intent.category === "relationship") {
    return `${userName}ครับ ในเรื่องความสัมพันธ์ช่วงนี้ ${snap.horaLove || energyDesc} ควรเน้นการสื่อสารด้วยความจริงใจและใจเย็น`;
  }

  if (intent.category === "finance") {
    return `${userName}ครับ สำหรับเรื่องการเงินและการลงทุน ${snap.horaFinance || energyDesc} ${snap.auspiciousBestSlot ? `ช่วงเวลาที่เหมาะกับการเจรจาหรือทำสัญญาคือ ${snap.auspiciousBestSlot}` : ""}`;
  }

  if (intent.category === "career") {
    return `${userName}ครับ ด้านการงานและภารกิจ ${snap.horaWork || energyDesc} ${snap.yamShouldDo ? `สิ่งที่ควรเน้น: ${snap.yamShouldDo}` : ""}`;
  }

  return `${userName}ครับ ${energyDesc} ${snap.yamShouldDo ? `คำแนะนำสำหรับช่วงเวลานี้คือ: ${snap.yamShouldDo}` : "ขอให้ดำเนินชีวิตด้วยความมีสติและรอบคอบ"}`;
}

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
          reportType: `intent_${intent.category}`,
          context: { intentCategory: intent.category },
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

  // Graceful fallback if AI worker didn't provide answer
  if (!answer) {
    answer = generateFallbackAnswer(intent, snap, userName);
  }

  // Extract actionable (last sentence or fallback)
  const sentences = answer.split(/[.!?。\n]/).filter(Boolean);
  const actionable =
    sentences[sentences.length - 1]?.trim() ??
    snap.yamShouldDo ??
    "สังเกตพลังงานรอบข้างและดำเนินการด้วยสติ";

  // Best window (for timing intents)
  const bestWindow = snap.auspiciousBestSlot
    ? {
        timeRange: snap.auspiciousBestSlot,
        description: snap.auspiciousBestFor?.join(", ") ?? "",
      }
    : undefined;

  // Confidence level
  const confidenceLevel: PredictionResult["confidence"] =
    intent.confidence >= 0.8 ? "high" : intent.confidence >= 0.6 ? "medium" : "low";

  // Evidence chain (L2)
  const evidenceChain = buildEvidenceChain(intent, snap);

  return {
    question: intent.raw,
    intentCategory: intent.category,
    confidence: confidenceLevel,
    answer,
    bestWindow,
    actionable,
    evidenceChain,
    engineSnapshot: snap,
    predictionScore: snap.horaOverallScore,
  };
}
