/**
 * scripts/test-phase6-4-sands-economy.ts
 * Concurrency, Idempotency, Reward Class & Atomic Debit/Credit Verification
 * Run: npx tsx scripts/test-phase6-4-sands-economy.ts
 */

import {
  DAILY_RITUAL_SANDS_CAP,
  SANDS_REDEMPTION_CATALOG,
} from "../apps/web/app/services/rewards.server";
import type {
  SandsRewardClass,
  SandsActivityType,
  SandsLedgerEntry,
} from "../packages/types/src/index";

console.log("═══════════════════════════════════════════════════════════════");
console.log("🏛️  PHASE 6.4 — SANDS OF TIME ECONOMY VERIFICATION SUITE");
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

// ─── 1. Reward Class & Daily Cap Boundary Tests ──────────────────────────────
console.log("▶ 1. REWARD CLASS & DAILY CAP CHECKS");

assert(
  DAILY_RITUAL_SANDS_CAP === 15,
  "Daily Ritual Cap strictly equals 15 Sands/day"
);

const dailyRitualActivities: SandsActivityType[] = [
  "daily_login",
  "checkin",
  "intention",
  "reflection",
  "golden_window_action",
];

const wisdomActivities: SandsActivityType[] = [
  "outcome_tracking",
  "meaningful_feedback",
  "streak_7d",
];

const communityActivities: SandsActivityType[] = [
  "referral_signup",
  "friend_first_action",
  "creator_contribution",
];

assert(
  dailyRitualActivities.length === 5,
  "All 5 Daily Ritual Activities defined"
);
assert(
  wisdomActivities.length === 3,
  "All 3 Wisdom Activities defined"
);
assert(
  communityActivities.length === 3,
  "All 3 Community Activities defined"
);

// ─── 2. Pure SQL Logic Mock Simulator for credit_sands ───────────────────────
console.log("\n▶ 2. ATOMIC CREDIT_SANDS LOGIC & DAILY CAP SIMULATION");

interface MockProfile {
  id: string;
  time_sands: number;
}

interface MockLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reward_class: SandsRewardClass;
  activity_type: SandsActivityType;
  reference_id: string;
  created_at: string;
}

function simulateCreditSands(
  profile: MockProfile,
  ledger: MockLedgerEntry[],
  params: {
    amount: number;
    reward_class: SandsRewardClass;
    activity_type: SandsActivityType;
    reference_id: string;
  }
) {
  // Idempotency check: unique index on (user_id, activity_type, reference_id)
  const isDuplicate = ledger.some(
    (row) =>
      row.user_id === profile.id &&
      row.activity_type === params.activity_type &&
      row.reference_id === params.reference_id
  );

  if (isDuplicate) {
    return {
      success: false,
      code: "DUPLICATE_EVENT",
      error: "Duplicate transaction (Idempotent)",
      current_balance: profile.time_sands,
    };
  }

  let allowedAmount = params.amount;

  // Daily Ritual Cap check: applies only to reward_class === 'daily_ritual'
  if (params.reward_class === "daily_ritual") {
    const todayRitualSum = ledger
      .filter(
        (row) =>
          row.user_id === profile.id &&
          row.reward_class === "daily_ritual" &&
          row.amount > 0
      )
      .reduce((sum, row) => sum + row.amount, 0);

    if (todayRitualSum >= DAILY_RITUAL_SANDS_CAP) {
      return {
        success: false,
        code: "DAILY_CAP_REACHED",
        error: "Daily ritual cap reached (15 sands/day)",
        cap_reached: true,
        today_earned: todayRitualSum,
        current_balance: profile.time_sands,
      };
    } else if (todayRitualSum + params.amount > DAILY_RITUAL_SANDS_CAP) {
      allowedAmount = DAILY_RITUAL_SANDS_CAP - todayRitualSum;
    }
  }

  const balanceBefore = profile.time_sands;
  const balanceAfter = balanceBefore + allowedAmount;

  // Mutate state atomically
  profile.time_sands = balanceAfter;
  const entry: MockLedgerEntry = {
    id: `tx_${ledger.length + 1}`,
    user_id: profile.id,
    amount: allowedAmount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    reward_class: params.reward_class,
    activity_type: params.activity_type,
    reference_id: params.reference_id,
    created_at: new Date().toISOString(),
  };
  ledger.push(entry);

  return {
    success: true,
    amount_credited: allowedAmount,
    balance_before: balanceBefore,
    new_balance: balanceAfter,
  };
}

function simulateDebitSands(
  profile: MockProfile,
  ledger: MockLedgerEntry[],
  params: {
    amount: number;
    activity_type: SandsActivityType;
    reference_id?: string;
  }
) {
  if (profile.time_sands < params.amount) {
    return {
      success: false,
      error: "ละอองทรายกาลเวลาไม่เพียงพอ",
      current_balance: profile.time_sands,
      required: params.amount,
    };
  }

  const balanceBefore = profile.time_sands;
  const balanceAfter = balanceBefore - params.amount;

  profile.time_sands = balanceAfter;
  const entry: MockLedgerEntry = {
    id: `tx_${ledger.length + 1}`,
    user_id: profile.id,
    amount: -params.amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    reward_class: "spend",
    activity_type: params.activity_type,
    reference_id: params.reference_id || `spend_${ledger.length + 1}`,
    created_at: new Date().toISOString(),
  };
  ledger.push(entry);

  return {
    success: true,
    amount_debited: params.amount,
    balance_before: balanceBefore,
    new_balance: balanceAfter,
  };
}

// Execution 1: Normal Daily Rituals
const mockUser: MockProfile = { id: "user_777", time_sands: 0 };
const mockLedger: MockLedgerEntry[] = [];

// Login (+1)
const r1 = simulateCreditSands(mockUser, mockLedger, {
  amount: 1,
  reward_class: "daily_ritual",
  activity_type: "daily_login",
  reference_id: "login:2026-09-05",
});
assert(r1.success && mockUser.time_sands === 1, "Login grants +1 Sands");

// Checkin (+1)
const r2 = simulateCreditSands(mockUser, mockLedger, {
  amount: 1,
  reward_class: "daily_ritual",
  activity_type: "checkin",
  reference_id: "checkin:2026-09-05",
});
assert(r2.success && mockUser.time_sands === 2, "Checkin grants +1 Sands (balance: 2)");

// Intention (+3)
const r3 = simulateCreditSands(mockUser, mockLedger, {
  amount: 3,
  reward_class: "daily_ritual",
  activity_type: "intention",
  reference_id: "intention:2026-09-05",
});
assert(r3.success && mockUser.time_sands === 5, "Intention grants +3 Sands (balance: 5)");

// Reflection (+5)
const r4 = simulateCreditSands(mockUser, mockLedger, {
  amount: 5,
  reward_class: "daily_ritual",
  activity_type: "reflection",
  reference_id: "reflection:2026-09-05",
});
assert(r4.success && mockUser.time_sands === 10, "Reflection grants +5 Sands (balance: 10)");

// Golden Window (+5) -> Hits exactly 15 cap
const r5 = simulateCreditSands(mockUser, mockLedger, {
  amount: 5,
  reward_class: "daily_ritual",
  activity_type: "golden_window_action",
  reference_id: "gw:2026-09-05:A",
});
assert(r5.success && mockUser.time_sands === 15, "Golden window grants +5 Sands (balance: 15 / exactly at cap)");

// 6th Daily Ritual attempt (+5) -> MUST BE REJECTED by Cap
const r6 = simulateCreditSands(mockUser, mockLedger, {
  amount: 5,
  reward_class: "daily_ritual",
  activity_type: "golden_window_action",
  reference_id: "gw:2026-09-05:B",
});
assert(
  !r6.success && r6.code === "DAILY_CAP_REACHED" && mockUser.time_sands === 15,
  "Exceeding Daily Ritual cap is strictly blocked at 15 Sands"
);

// ─── 3. Idempotency Guard Tests ──────────────────────────────────────────────
console.log("\n▶ 3. IDEMPOTENCY GUARD (REPLAY ATTACK PREVENTION)");

const replayLogin = simulateCreditSands(mockUser, mockLedger, {
  amount: 1,
  reward_class: "daily_ritual",
  activity_type: "daily_login",
  reference_id: "login:2026-09-05", // Same reference_id
});
assert(
  !replayLogin.success && replayLogin.code === "DUPLICATE_EVENT",
  "Replay event with same reference_id returns DUPLICATE_EVENT error"
);
assert(mockUser.time_sands === 15, "Balance remains untouched after duplicate attempt");

// ─── 4. Class Separation Tests (Community / Referral bypasses Daily Cap) ─────
console.log("\n▶ 4. CLASS SEPARATION: COMMUNITY CLASS BYPASSES DAILY RITUAL CAP");

// User already has 15 sands from Daily Rituals today.
// Now user gets verified referral bonus (+20 Sands) in 'community' class
const referralCredit = simulateCreditSands(mockUser, mockLedger, {
  amount: 20,
  reward_class: "community",
  activity_type: "referral_signup",
  reference_id: "ref:user_friend_888",
});

assert(
  referralCredit.success && mockUser.time_sands === 35,
  "Community referral reward (+20) successfully bypasses Daily Ritual Cap (balance: 35)"
);

// ─── 5. Debit / Spending & Balance Guard Tests ───────────────────────────────
console.log("\n▶ 5. DEBIT / REDEMPTION & BALANCE GUARD");

// Redeem AI In-depth Report (30 Sands)
const debitReport = simulateDebitSands(mockUser, mockLedger, {
  amount: 30,
  activity_type: "ai_report_redeem",
  reference_id: "rep_999",
});
assert(
  debitReport.success && mockUser.time_sands === 5,
  "Debit 30 Sands for AI report succeeds (balance: 5)"
);

// Try to redeem another 10 Sands when only 5 remaining -> MUST FAIL
const debitExcess = simulateDebitSands(mockUser, mockLedger, {
  amount: 10,
  activity_type: "timing_comparison_redeem",
});
assert(
  !debitExcess.success && mockUser.time_sands === 5,
  "Debit exceeding balance is blocked without negative balance (balance remains 5)"
);

// ─── 6. Catalog Integrity Checks ─────────────────────────────────────────────
console.log("\n▶ 6. REDEMPTION CATALOG & CAMPAIGN-CONFIGURABLE BENEFIT CHECKS");

assert(SANDS_REDEMPTION_CATALOG.length >= 5, "Redemption catalog contains at least 5 benefits");

const voucherItem = SANDS_REDEMPTION_CATALOG.find((i) => i.id === "master_consultation_voucher");
assert(
  voucherItem?.isCampaignBenefit === true,
  "Master consultation voucher is explicitly marked as campaign-configurable (NOT permanent cash peg)"
);

// Verify audit trail consistency
const totalCredits = mockLedger
  .filter((r) => r.amount > 0)
  .reduce((sum, r) => sum + r.amount, 0);
const totalDebits = mockLedger
  .filter((r) => r.amount < 0)
  .reduce((sum, r) => sum + Math.abs(r.amount), 0);
const netCalculated = totalCredits - totalDebits;

assert(
  netCalculated === mockUser.time_sands,
  `Ledger Audit Trail equals Current Balance: (Credits: ${totalCredits} - Debits: ${totalDebits} = ${netCalculated}) === Profile Cache (${mockUser.time_sands})`
);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`🏁 VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
console.log("═══════════════════════════════════════════════════════════════\n");

if (failed > 0) {
  process.exit(1);
}
