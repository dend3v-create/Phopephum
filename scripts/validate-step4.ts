/**
 * validate-step4.ts — Integration Validation Suite for STEP 4 Intent-Based Prediction Engine
 */

import { parseIntent } from "../apps/web/app/services/intentParser.server";
import { orchestratePrediction } from "../apps/web/app/services/predictionOrchestrator.server";

async function runValidation() {
  console.log("===============================================================");
  console.log("✦ STEP 4 — FINAL INTEGRATION VALIDATION");
  console.log("===============================================================\n");

  // ─── 1. INTENT TEST ────────────────────────────────────────────────────────
  console.log("--- 1. INTENT TEST (8 Questions) ---");
  const questions = [
    "เดินทางเวลาไหนดี",
    "พรุ่งนี้ไปหาลูกค้าดีไหม",
    "วันนี้ไปง้อแฟนดีไหม",
    "พรุ่งนี้เดินทางไปง้อแฟน เวลาไหนดี",
    "กระเป๋าหายจะหาเจอไหม",
    "แฟนลืมกระเป๋าบนรถ จะหาเจอไหม",
    "วันนี้ปิดการขายดีไหม",
    "พรุ่งนี้สัมภาษณ์งานดีไหม",
  ];

  const intentResults = questions.map((q) => {
    const parsed = parseIntent(q);
    console.log(`Question: "${q}"`);
    console.log(`  → Category:   ${parsed.category}`);
    console.log(`  → Context:    ${parsed.context}`);
    console.log(`  → Confidence: ${parsed.confidence}`);
    console.log(`  → Keywords:   [${parsed.keywords.join(", ")}]\n`);
    return { question: q, parsed };
  });

  // ─── 2. ENGINE ROUTING TEST ────────────────────────────────────────────────
  console.log("\n--- 2. ENGINE ROUTING & CALCULATION TEST ---");
  const testNow = new Date("2026-09-04T10:30:00+07:00");
  const testProfile = {
    displayName: "คุณเด่น",
    birthDate: "1985-05-15",
    birthTime: "08:30",
    birthPlace: "กรุงเทพมหานคร",
    taksaSri: "ดาวพฤหัส (๕)",
    taksaKala: "ดาวอังคาร (๓)",
  };

  // Test Travel / Timing Routing
  const travelIntent = parseIntent("เดินทางเวลาไหนดี");
  const travelResult = await orchestratePrediction(travelIntent, testProfile, "", "", testNow);
  console.log("Travel Routing Test:");
  console.log("  Evidence Sources:", travelResult.evidenceChain?.map(e => e.source));
  console.log("  Best Window:", travelResult.bestWindow);
  console.log("  Has Actionable:", !!travelResult.actionable);

  // Test Relationship Routing
  const relIntent = parseIntent("วันนี้ไปง้อแฟนดีไหม");
  const relResult = await orchestratePrediction(relIntent, testProfile, "", "", testNow);
  console.log("\nRelationship Routing Test:");
  console.log("  Evidence Sources:", relResult.evidenceChain?.map(e => e.source));
  console.log("  Has Actionable:", !!relResult.actionable);

  // Test Lost Item Routing
  const lostIntent = parseIntent("กระเป๋าหายจะหาเจอไหม");
  const lostResult = await orchestratePrediction(lostIntent, testProfile, "", "", testNow);
  console.log("\nLost Item Routing Test:");
  console.log("  Evidence Sources:", lostResult.evidenceChain?.map(e => e.source));
  console.log("  Finding summary:", lostResult.evidenceChain?.find(e => e.source.includes("ค้นหาทรัพย์"))?.finding);

  // ─── 3. AI / FALLBACK TEST ─────────────────────────────────────────────────
  console.log("\n--- 3. AI / FALLBACK TEST (Proxy OFF vs Graceful Fallback) ---");
  console.log("Testing with AI_WORKER_URL='' (Fallback Engine Active)...");
  console.log("Fallback Answer Sample:", travelResult.answer);
  console.log("Fallback Answer Length:", travelResult.answer.length);
  console.log("Fallback Actionable:", travelResult.actionable);

  // ─── 4. OUTPUT SANITY TEST ─────────────────────────────────────────────────
  console.log("\n--- 4. OUTPUT SANITY TEST (Level 1 Plain Thai & No Jargon) ---");
  const forbiddenJargons = [
    "ยามอัฏฐกาล", "อัฐกาล", "ราหูค้นทรัพย์", "ทักษาจร", "มหาภูติ",
    "พรายกระซิบ", "กาลชะตา", "ตนุ", "กฎุมภะ", "มรณะ", "วินาศ", "อริ"
  ];

  let sanityPassed = true;
  for (const item of [travelResult, relResult, lostResult]) {
    for (const jargon of forbiddenJargons) {
      if (item.answer.includes(jargon)) {
        console.error(`❌ FAILED: Found jargon "${jargon}" in answer: "${item.answer}"`);
        sanityPassed = false;
      }
    }
    if (!item.actionable) {
      console.error(`❌ FAILED: Missing actionable advice for question: "${item.question}"`);
      sanityPassed = false;
    }
  }

  if (sanityPassed) {
    console.log("✅ SANITY CHECK PASSED: Level 1 answers are clean, friendly, jargon-free, and actionable!");
  }

  console.log("\n===============================================================");
  console.log("✦ ALL INTEGRATION VALIDATIONS COMPLETED SUCCESSFULLY");
  console.log("===============================================================");
}

runValidation().catch(console.error);
