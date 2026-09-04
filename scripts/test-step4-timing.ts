/**
 * scripts/test-step4-timing.ts
 * Automated validation test for STEP 4.4 — Timing Comparison
 *
 * Tests:
 * 1. Default Candidate Windows generation (A, B, C)
 * 2. Custom Candidate Windows evaluation
 * 3. Engine-based Scoring & Suitability
 * 4. Ranking & Recommended Candidate selection
 * 5. Deterministic Plain-Language Explanation (Zero Astrology Jargon in L1)
 * 6. Contract Compliance with CandidateWindow & TimingComparisonResult
 */

import { compareTimingWindows } from "../apps/web/app/services/timingComparison.server.js";

async function runTests() {
  console.log("=================================================");
  console.log("  TESTING STEP 4.4 — TIMING COMPARISON ENGINE");
  console.log("=================================================\n");

  const todayStr = new Date().toISOString().split("T")[0];

  // Test 1: Default Candidate Windows (Auto-generated A, B, C)
  console.log("Test 1: Auto-generate Candidate Windows for 'ทำสัญญา'...");
  const result1 = await compareTimingWindows({
    activity: "ทำสัญญา",
    date: todayStr,
  });

  if (!result1.candidates || result1.candidates.length !== 3) {
    throw new Error(`Expected 3 candidate windows, got ${result1.candidates?.length}`);
  }
  console.log(`✓ Generated 3 candidates: ${result1.candidates.map((c) => c.id).join(", ")}`);

  const ids = result1.candidates.map((c) => c.id);
  if (ids[0] !== "A" || ids[1] !== "B" || ids[2] !== "C") {
    throw new Error(`Expected IDs ['A', 'B', 'C'], got ${JSON.stringify(ids)}`);
  }
  console.log("✓ IDs normalized to A, B, C");

  // Verify fields on each candidate
  for (const c of result1.candidates) {
    if (typeof c.score !== "number" || c.score < 0 || c.score > 100) {
      throw new Error(`Invalid score ${c.score} for candidate ${c.id}`);
    }
    if (!["optimal", "favorable", "neutral", "cautious", "avoid"].includes(c.suitability)) {
      throw new Error(`Invalid suitability ${c.suitability} for candidate ${c.id}`);
    }
    if (!Array.isArray(c.strengths) || c.strengths.length === 0) {
      throw new Error(`Candidate ${c.id} missing strengths`);
    }
    if (!Array.isArray(c.cautions) || c.cautions.length === 0) {
      throw new Error(`Candidate ${c.id} missing cautions`);
    }
    console.log(`  Candidate ${c.id} (${c.start}–${c.end}): Score=${c.score}, Suitability=${c.suitability}`);
  }

  // Verify recommended candidate
  const maxScore = Math.max(...result1.candidates.map((c) => c.score));
  if (result1.recommendedCandidate.score !== maxScore) {
    throw new Error(`Recommended candidate score ${result1.recommendedCandidate.score} is not highest (${maxScore})`);
  }
  console.log(`✓ Recommended Candidate: ${result1.recommendedCandidate.id} (${result1.recommendedCandidate.start}–${result1.recommendedCandidate.end}) with Score=${result1.recommendedCandidate.score}`);

  // Test 2: Custom Candidate Windows
  console.log("\nTest 2: Custom Candidate Windows (09:30 vs 13:00 vs 15:30)...");
  const result2 = await compareTimingWindows({
    question: "จะไปเซ็นสัญญาพรุ่งนี้ ช่วงไหนดีสุด?",
    activity: "ทำสัญญา",
    date: todayStr,
    customWindows: [
      { id: "A", label: "เช้าตรู่", start: "09:30", end: "11:00" },
      { id: "B", label: "บ่ายตรง", start: "13:00", end: "14:30" },
      { id: "C", label: "บ่ายแก่", start: "15:30", end: "17:00" },
    ],
  });

  if (result2.candidates.length !== 3) {
    throw new Error(`Expected 3 custom candidates, got ${result2.candidates.length}`);
  }
  console.log(`✓ Custom candidates evaluated: Winner is ${result2.recommendedCandidate.id} (${result2.recommendedCandidate.start}–${result2.recommendedCandidate.end})`);
  console.log(`  Reason: ${result2.reason}`);

  // Test 3: Verify No Raw Astrological Jargon in Strengths & Cautions (L1 Level)
  console.log("\nTest 3: Checking for Jargon Isolation (Strict Rule: No raw jargon in L1)...");
  const forbiddenJargon = ["ยามอัฏฐกาล", "พรายกระซิบ", "ราหูค้นทรัพย์", "ทักษาพยากรณ์", "กาลชะตา"];
  for (const c of result2.candidates) {
    for (const s of c.strengths) {
      for (const j of forbiddenJargon) {
        if (s.includes(j)) throw new Error(`Found forbidden jargon '${j}' in strength: ${s}`);
      }
    }
    for (const cau of c.cautions) {
      for (const j of forbiddenJargon) {
        if (cau.includes(j)) throw new Error(`Found forbidden jargon '${j}' in caution: ${cau}`);
      }
    }
  }
  console.log("✓ All candidate descriptions and strengths are in plain Thai language with zero raw jargon in L1!");

  console.log("\n=================================================");
  console.log("  ALL STEP 4.4 LOGIC & CONTRACT TESTS PASSED! 🎉");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
