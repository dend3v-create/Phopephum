/**
 * scripts/test-phase6-5-partner-economy.ts
 * Verification Suite for PHASE 6.5 — Affiliate & Partner Economy
 * Tests: Self-referral protection, Commission Tiers (7%, 15%, 25%), 
 * 14-day holding period, Minimum Payout ฿500 threshold, and 3% WHT calculation.
 * 
 * Run: npx tsx scripts/test-phase6-5-partner-economy.ts
 */

import type {
  PartnerTier,
  PartnerProfileRecord,
  PartnerLedgerEntry,
  PayoutRequestRecord,
} from "../packages/types/src/index";

console.log("═══════════════════════════════════════════════════════════════");
console.log("🤝  PHASE 6.5 — AFFILIATE & PARTNER ECONOMY VERIFICATION SUITE");
console.log("═══════════════════════════════════════════════════════════════\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (detail) console.error(`     👉 Details: ${detail}`);
    failed++;
  }
}

// ─── 1. Commission Tier Model Tests ──────────────────────────────────────────
console.log("▶ 1. COMMISSION TIER & PERCENTAGE TESTS");

const TIER_RATES: Record<PartnerTier, number> = {
  affiliate: 7.0,
  creator: 15.0,
  master: 25.0,
  institutional: 25.0,
};

assert(TIER_RATES.affiliate === 7.0, "Affiliate (Individual) tier commission rate is 7%");
assert(TIER_RATES.creator === 15.0, "Creator / Influencer tier commission rate is 15%");
assert(TIER_RATES.master === 25.0, "Master / Astrologer tier commission rate is 25%");

function calculateCommission(tier: PartnerTier, amount: number): number {
  const rate = TIER_RATES[tier] || 7.0;
  return Number(((amount * rate) / 100).toFixed(2));
}

// Subscription Test Cases (Pro ฿299, Master ฿999)
const affCommPro = calculateCommission("affiliate", 299);
const creatorCommPro = calculateCommission("creator", 299);
const masterCommPro = calculateCommission("master", 299);

assert(affCommPro === 20.93, `Affiliate commission for Pro ฿299 is ฿20.93 (got ฿${affCommPro})`);
assert(creatorCommPro === 44.85, `Creator commission for Pro ฿299 is ฿44.85 (got ฿${creatorCommPro})`);
assert(masterCommPro === 74.75, `Master commission for Pro ฿299 is ฿74.75 (got ฿${masterCommPro})`);

// ─── 2. Mock Stored Procedure Simulator for record_partner_commission ─────────
console.log("\n▶ 2. RECORD COMMISSION & 14-DAY HOLDING PERIOD SIMULATION");

interface MockPartnerState {
  profile: PartnerProfileRecord;
  ledger: PartnerLedgerEntry[];
}

function createMockPartner(userId: string, tier: PartnerTier = "affiliate"): MockPartnerState {
  return {
    profile: {
      userId,
      tier,
      commissionRate: TIER_RATES[tier],
      holdingBalance: 0,
      availableBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ledger: [],
  };
}

function simulateRecordCommission(
  state: MockPartnerState,
  params: {
    referredUserId: string;
    subscriptionAmount: number;
    paymentId?: string;
  }
) {
  // Self-referral guard
  if (state.profile.userId === params.referredUserId) {
    return { success: false, error: "Self-referral is strictly prohibited" };
  }

  const commission = calculateCommission(state.profile.tier, params.subscriptionAmount);
  if (commission <= 0) {
    return { success: false, error: "Commission must be positive" };
  }

  const currentHolding = state.profile.holdingBalance;
  const newHolding = Number((currentHolding + commission).toFixed(2));
  const holdingUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // Mutate profile
  state.profile.holdingBalance = newHolding;
  state.profile.totalEarned = Number((state.profile.totalEarned + commission).toFixed(2));

  // Write ledger
  const ledgerEntry: PartnerLedgerEntry = {
    id: `tx_${state.ledger.length + 1}`,
    partnerId: state.profile.userId,
    referredUserId: params.referredUserId,
    amount: commission,
    balanceBefore: currentHolding,
    balanceAfter: newHolding,
    entryType: "commission_earned",
    status: "holding",
    subscriptionPaymentId: params.paymentId || "pay_123",
    holdingUntil,
    description: `ค่าแนะนำสมาชิก (Holding 14 วัน)`,
    createdAt: new Date().toISOString(),
  };
  state.ledger.push(ledgerEntry);

  return {
    success: true,
    commission,
    holdingUntil,
    newHoldingBalance: newHolding,
  };
}

const partnerAlice = createMockPartner("alice_001", "affiliate");

// Test 2.1: Self-referral blocked
const selfRefResult = simulateRecordCommission(partnerAlice, {
  referredUserId: "alice_001", // Self referral
  subscriptionAmount: 299,
});
assert(
  !selfRefResult.success && selfRefResult.error === "Self-referral is strictly prohibited",
  "Self-referral attempt is strictly blocked"
);
assert(partnerAlice.profile.holdingBalance === 0, "Holding balance untouched after self-referral");

// Test 2.2: Valid referral (Bob subscribes to Pro ฿299)
const validRefResult = simulateRecordCommission(partnerAlice, {
  referredUserId: "bob_002",
  subscriptionAmount: 299,
});
assert(validRefResult.success, "Valid referral creates commission entry");
assert(partnerAlice.profile.holdingBalance === 20.93, "Holding balance credited ฿20.93");
assert(partnerAlice.profile.availableBalance === 0, "Available balance remains 0 while holding");
assert(partnerAlice.ledger[0]?.status === "holding", "Ledger entry status is 'holding'");

// ─── 3. Holding Clear Transition Simulator ────────────────────────────────────
console.log("\n▶ 3. HOLDING CLEAR (14-DAY EXPIRY TO AVAILABLE BALANCE)");

function simulateClearHolding(state: MockPartnerState, nowTime: Date) {
  let clearedAmount = 0;
  for (const entry of state.ledger) {
    if (entry.status === "holding" && entry.holdingUntil) {
      const unlockTime = new Date(entry.holdingUntil);
      if (nowTime >= unlockTime) {
        entry.status = "available";
        clearedAmount = Number((clearedAmount + entry.amount).toFixed(2));
      }
    }
  }

  if (clearedAmount > 0) {
    state.profile.holdingBalance = Number((state.profile.holdingBalance - clearedAmount).toFixed(2));
    state.profile.availableBalance = Number((state.profile.availableBalance + clearedAmount).toFixed(2));
  }

  return { clearedAmount };
}

// Before 14 days (Day 7) -> Should NOT clear
const day7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const clearDay7 = simulateClearHolding(partnerAlice, day7);
assert(clearDay7.clearedAmount === 0, "Commissions do NOT clear before 14-day holding period (Day 7: ฿0)");
assert(partnerAlice.profile.availableBalance === 0, "Available balance still 0 on Day 7");

// After 14 days (Day 15) -> Should CLEAR into available
const day15 = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
const clearDay15 = simulateClearHolding(partnerAlice, day15);
assert(clearDay15.clearedAmount === 20.93, "Commissions clear successfully after 14 days (Day 15: ฿20.93)");
assert(partnerAlice.profile.holdingBalance === 0, "Holding balance drops to ฿0 after clearance");
assert(partnerAlice.profile.availableBalance === 20.93, "Available balance credited ฿20.93 after clearance");

// ─── 4. Payout Request & WHT 3% Simulation ───────────────────────────────────
console.log("\n▶ 4. PAYOUT REQUEST, MINIMUM THRESHOLD & WHT 3% TAX CALCULATION");

function simulateRequestPayout(
  state: MockPartnerState,
  payouts: PayoutRequestRecord[],
  amount: number,
  bankInfo: { bankName: string; accountNo: string; accountName: string; taxId?: string }
) {
  if (amount < 500) {
    return { success: false, error: "ยอดถอนขั้นต่ำคือ 500 บาท" };
  }

  if (state.profile.availableBalance < amount) {
    return {
      success: false,
      error: "ยอดเงินที่พร้อมถอนไม่เพียงพอ",
      available: state.profile.availableBalance,
    };
  }

  const whtAmount = Number((amount * 0.03).toFixed(2)); // 3% WHT
  const netPayout = Number((amount - whtAmount).toFixed(2));

  state.profile.availableBalance = Number((state.profile.availableBalance - amount).toFixed(2));
  state.profile.totalWithdrawn = Number((state.profile.totalWithdrawn + amount).toFixed(2));

  const payoutRecord: PayoutRequestRecord = {
    id: `payout_${payouts.length + 1}`,
    partnerId: state.profile.userId,
    amount,
    whtAmount,
    netPayout,
    bankInfo,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  payouts.push(payoutRecord);

  return {
    success: true,
    amount,
    whtAmount,
    netPayout,
    payoutId: payoutRecord.id,
  };
}

const mockPayouts: PayoutRequestRecord[] = [];

// Test 4.1: Below ฿500 threshold blocked
const lowPayout = simulateRequestPayout(
  partnerAlice,
  mockPayouts,
  300,
  { bankName: "KBank", accountNo: "1234567890", accountName: "Alice Wonderland" }
);
assert(!lowPayout.success && lowPayout.error === "ยอดถอนขั้นต่ำคือ 500 บาท", "Payout below ฿500 is blocked");

// Test 4.2: Insufficient available balance blocked
const excessPayout = simulateRequestPayout(
  partnerAlice,
  mockPayouts,
  1000,
  { bankName: "KBank", accountNo: "1234567890", accountName: "Alice Wonderland" }
);
assert(!excessPayout.success && excessPayout.error === "ยอดเงินที่พร้อมถอนไม่เพียงพอ", "Payout exceeding available balance is blocked");

// Boost Alice's balance to ฿1,000 for payout test
partnerAlice.profile.availableBalance = 1000.0;

// Test 4.3: Valid payout ฿1,000 with 3% WHT
const validPayout = simulateRequestPayout(
  partnerAlice,
  mockPayouts,
  1000.0,
  { bankName: "KBank", accountNo: "1234567890", accountName: "Alice Wonderland", taxId: "1234567890123" }
);

assert(validPayout.success, "Valid payout request succeeds");
assert(validPayout.whtAmount === 30.0, `Withholding tax 3% is exactly ฿30.00 (got ฿${validPayout.whtAmount})`);
assert(validPayout.netPayout === 970.0, `Net payout after WHT 3% is exactly ฿970.00 (got ฿${validPayout.netPayout})`);
assert(partnerAlice.profile.availableBalance === 0, "Available balance deducted to 0");
assert(partnerAlice.profile.totalWithdrawn === 1000.0, "Total withdrawn recorded as ฿1,000");
assert(mockPayouts.length === 1 && mockPayouts[0]?.status === "pending", "Payout request created with status 'pending'");

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`🏁 VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
console.log("═══════════════════════════════════════════════════════════════\n");

if (failed > 0) {
  process.exit(1);
}
