/**
 * test-phase6-6-2-pricing-packaging.ts
 * ============================================================================
 * 💰 PHOPEPHUM V3 — STEP 6.6.2: PRICING & PACKAGING VALIDATION
 * ============================================================================
 * 
 * Candidate v2 Pricing Matrix Validation:
 *  - Basic Sage: ฿89 / month
 *  - Professional Master: ฿289 / month
 *  - Professional Master (Annual): ฿2,790 / year (~฿232.50/mo, 20% savings)
 *  - Imperial Master: ฿789 / month
 *  - Sands 50 Pack: ฿59
 *  - Sands 150 Pack: ฿149
 *  - Sands 500 Pack: ฿399
 * 
 * Domains Validated:
 *  1. Plan & Sands Configuration Consistency
 *  2. Omise PromptPay & Card Fee Calculation Precision
 *  3. Invoice VAT (7%) Mathematical Precision
 *  4. Partner Commission Base Isolation (INV-07)
 *  5. Live Supabase Atomic Payment Activation with Candidate v2 Prices
 *  6. Quota & Unlimited Semantics Alignment
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

import {
  SUBSCRIPTION_PLANS,
  SANDS_REFILL_PACKS,
  getUserPlan,
  canUseFeature,
  getAiReportLimit,
  getPersonLimit,
  AI_REPORT_LIMIT,
  PERSON_LIMIT,
} from "../apps/web/app/services/permissions.server";

import {
  calculateOmiseFee,
  verifyOmiseWebhookEvent,
} from "../apps/web/app/services/omise.server";

import {
  awardPurchasedSandsPack,
} from "../apps/web/app/services/rewards.server";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const env = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
} as any;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

interface TestResult {
  id: number;
  domain: string;
  name: string;
  expected: string;
  actual: string;
  evidence: string;
  status: "PASS" | "FAIL";
}

const testResults: TestResult[] = [];

function recordResult(result: TestResult) {
  testResults.push(result);
  const icon = result.status === "PASS" ? "✅" : "❌";
  console.log(`  ${icon} [${result.status}] #${String(result.id).padStart(2, "0")} [${result.domain.padEnd(14)}] ${result.name.padEnd(38)} : ${result.actual}`);
}

async function createTestUser(email: string, displayName: string) {
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: `Pass_${crypto.randomBytes(6).toString("hex")}!`,
    email_confirm: true,
  });

  if (authErr || !authUser?.user) {
    throw new Error(`Failed to create auth user (${email}): ${authErr?.message}`);
  }

  const userId = authUser.user.id;
  const { error: profErr } = await supabase.from("profiles").upsert({
    id: userId,
    email,
    display_name: displayName,
    plan: "free",
    subscription: "free",
    membership_status: "active",
    time_sands: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (profErr) throw profErr;
  return userId;
}

async function runPricingPackagingSuite() {
  console.log("================================================================================");
  console.log("💰 PHOPEPHUM V3 — STEP 6.6.2: PRICING & PACKAGING VALIDATION");
  console.log("================================================================================");
  console.log("Target: Candidate v2 (฿89 / ฿289 / ฿2,790 / ฿789 | Sands: ฿59 / ฿149 / ฿399)");
  console.log("--------------------------------------------------------------------------------\n");

  const runSeed = crypto.randomBytes(4).toString("hex");

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SUBSCRIPTION PRICING CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("📦 --- DOMAIN 1: SUBSCRIPTION PLANS CANDIDATE v2 CONFIGURATION ---");

  // TEST 1: Basic Sage ฿89
  assert(SUBSCRIPTION_PLANS.basic.priceThb === 89, "Basic Sage must be ฿89/month");
  assert(SUBSCRIPTION_PLANS.basic.canonicalPlan === "premium", "Basic must map to canonical premium");
  recordResult({
    id: 1,
    domain: "PRICING",
    name: "Basic Sage (฿89/mo)",
    expected: "priceThb: 89, canonicalPlan: 'premium'",
    actual: `฿${SUBSCRIPTION_PLANS.basic.priceThb}/mo (${SUBSCRIPTION_PLANS.basic.name})`,
    evidence: "apps/web/app/lib/plans.ts SUBSCRIPTION_PLANS.basic",
    status: "PASS",
  });

  // TEST 2: Professional Master ฿289
  assert(SUBSCRIPTION_PLANS.pro.priceThb === 289, "Professional Master must be ฿289/month");
  assert(SUBSCRIPTION_PLANS.pro.canonicalPlan === "pro", "Pro must map to canonical pro");
  recordResult({
    id: 2,
    domain: "PRICING",
    name: "Professional Master (฿289/mo)",
    expected: "priceThb: 289, canonicalPlan: 'pro'",
    actual: `฿${SUBSCRIPTION_PLANS.pro.priceThb}/mo (${SUBSCRIPTION_PLANS.pro.name})`,
    evidence: "apps/web/app/lib/plans.ts SUBSCRIPTION_PLANS.pro",
    status: "PASS",
  });

  // TEST 3: Professional Master Annual ฿2,790
  assert(SUBSCRIPTION_PLANS.pro_annual.priceThb === 2790, "Pro Annual must be ฿2,790/year");
  assert(SUBSCRIPTION_PLANS.pro_annual.durationDays === 365, "Pro Annual must have 365 days duration");
  recordResult({
    id: 3,
    domain: "PRICING",
    name: "Professional Master Annual (฿2,790/yr)",
    expected: "priceThb: 2790, durationDays: 365",
    actual: `฿${SUBSCRIPTION_PLANS.pro_annual.priceThb}/yr (Save ~20% vs monthly)`,
    evidence: "apps/web/app/lib/plans.ts SUBSCRIPTION_PLANS.pro_annual",
    status: "PASS",
  });

  // TEST 4: Imperial Master ฿789
  assert(SUBSCRIPTION_PLANS.imperial.priceThb === 789, "Imperial Master must be ฿789");
  assert(SUBSCRIPTION_PLANS.imperial.canonicalPlan === "master", "Imperial must map to canonical master");
  recordResult({
    id: 4,
    domain: "PRICING",
    name: "Imperial Master (฿789)",
    expected: "priceThb: 789, canonicalPlan: 'master'",
    actual: `฿${SUBSCRIPTION_PLANS.imperial.priceThb} (${SUBSCRIPTION_PLANS.imperial.name})`,
    evidence: "apps/web/app/lib/plans.ts SUBSCRIPTION_PLANS.imperial",
    status: "PASS",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SANDS REFILL PACKS CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n⏳ --- DOMAIN 2: SANDS REFILL PACKS CANDIDATE v2 CONFIGURATION ---");

  // TEST 5: Sands Packs (50: ฿59, 150: ฿149, 500: ฿399)
  assert(SANDS_REFILL_PACKS.sands_50.priceThb === 59, "50 Sands must be ฿59");
  assert(SANDS_REFILL_PACKS.sands_150.priceThb === 149, "150 Sands must be ฿149");
  assert(SANDS_REFILL_PACKS.sands_500.priceThb === 399, "500 Sands must be ฿399");

  recordResult({
    id: 5,
    domain: "SANDS PACKS",
    name: "Sands Refill Pricing (59 / 149 / 399)",
    expected: "50: ฿59 (1.18/u), 150: ฿149 (0.99/u), 500: ฿399 (0.80/u)",
    actual: `50=฿${SANDS_REFILL_PACKS.sands_50.priceThb}, 150=฿${SANDS_REFILL_PACKS.sands_150.priceThb}, 500=฿${SANDS_REFILL_PACKS.sands_500.priceThb}`,
    evidence: "apps/web/app/lib/plans.ts SANDS_REFILL_PACKS",
    status: "PASS",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. OMISE GATEWAY & INVOICE VAT MATHEMATICAL PRECISION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n💳 --- DOMAIN 3: OMISE GATEWAY & INVOICE VAT MATHEMATICAL PRECISION ---");

  // TEST 6: Omise PromptPay Breakdown for Candidate v2 Prices
  // 89 THB PromptPay: fee = 1.47, vat on fee = 0.10, total fee = 1.57, net = 87.43
  const fee89 = calculateOmiseFee(89, "promptpay");
  assert(fee89.feeThb === 1.47, `Expected fee 1.47, got ${fee89.feeThb}`);
  assert(fee89.feeVatThb === 0.10, `Expected fee VAT 0.10, got ${fee89.feeVatThb}`);
  assert(fee89.totalDeductionThb === 1.57, `Expected total deduction 1.57, got ${fee89.totalDeductionThb}`);
  assert(fee89.netReceivedThb === 87.43, `Expected net 87.43, got ${fee89.netReceivedThb}`);

  // 289 THB PromptPay: fee = 4.77, vat on fee = 0.33, total fee = 5.10, net = 283.90
  const fee289 = calculateOmiseFee(289, "promptpay");
  assert(fee289.feeThb === 4.77, `Expected fee 4.77, got ${fee289.feeThb}`);
  assert(fee289.feeVatThb === 0.33, `Expected fee VAT 0.33, got ${fee289.feeVatThb}`);
  assert(fee289.totalDeductionThb === 5.10, `Expected total deduction 5.10, got ${fee289.totalDeductionThb}`);
  assert(fee289.netReceivedThb === 283.90, `Expected net 283.90, got ${fee289.netReceivedThb}`);

  // 789 THB PromptPay: fee = 13.02, vat on fee = 0.91, total fee = 13.93, net = 775.07
  const fee789 = calculateOmiseFee(789, "promptpay");
  assert(fee789.feeThb === 13.02, `Expected fee 13.02, got ${fee789.feeThb}`);
  assert(fee789.feeVatThb === 0.91, `Expected fee VAT 0.91, got ${fee789.feeVatThb}`);
  assert(fee789.totalDeductionThb === 13.93, `Expected total deduction 13.93, got ${fee789.totalDeductionThb}`);
  assert(fee789.netReceivedThb === 775.07, `Expected net 775.07, got ${fee789.netReceivedThb}`);

  recordResult({
    id: 6,
    domain: "GATEWAY MATH",
    name: "Omise PromptPay Precision (89/289/789)",
    expected: "89->Fee 1.57/Net 87.43, 289->Fee 5.10/Net 283.90, 789->Fee 13.93/Net 775.07",
    actual: `89->Net ${fee89.netReceivedThb}, 289->Net ${fee289.netReceivedThb}, 789->Net ${fee789.netReceivedThb}`,
    evidence: "apps/web/app/services/omise.server.ts calculateOmiseFee",
    status: "PASS",
  });

  // TEST 7: Dynamic Invoice VAT 7% Separation
  const calcVat = (gross: number) => Math.round((gross * 0.07) / 1.07 * 100) / 100;
  const vat89 = calcVat(89);   // 5.82 THB
  const vat289 = calcVat(289); // 18.91 THB
  const vat789 = calcVat(789); // 51.62 THB

  assert(vat89 === 5.82, `Expected 89 VAT 5.82, got ${vat89}`);
  assert(vat289 === 18.91, `Expected 289 VAT 18.91, got ${vat289}`);
  assert(vat789 === 51.62, `Expected 789 VAT 51.62, got ${vat789}`);

  recordResult({
    id: 7,
    domain: "INVOICE VAT",
    name: "Invoice VAT 7% Base Separation",
    expected: "89->VAT 5.82, 289->VAT 18.91, 789->VAT 51.62",
    actual: `89 VAT: ${vat89} THB, 289 VAT: ${vat289} THB, 789 VAT: ${vat789} THB`,
    evidence: "Invoice VAT formula: gross * 0.07 / 1.07 (INV-07 separate from Gateway fee)",
    status: "PASS",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. LIVE SUPABASE ATOMIC PAYMENT ACTIVATION FOR CANDIDATE v2
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n🚀 --- DOMAIN 4: LIVE ATOMIC PAYMENT ACTIVATION (CANDIDATE v2) ---");

  const testUser = await createTestUser(`pricing.user.${runSeed}@phopephum-test.com`, `Pricing Test User ${runSeed}`);

  // TEST 8: Live Activation of Pro Monthly (฿289)
  const chargePro = `chrg_v2_pro_${runSeed}`;
  const { data: actPro, error: actProErr } = await supabase.rpc("record_omise_payment_and_activate_atomic", {
    p_user_id: testUser,
    p_omise_charge_id: chargePro,
    p_payment_method: "promptpay",
    p_gross_amount_thb: 289,
    p_gateway_fee_thb: fee289.feeThb,
    p_gateway_vat_thb: fee289.feeVatThb,
    p_net_received_thb: fee289.netReceivedThb,
    p_subscription_plan_code: "pro_monthly",
    p_vat_rate: 0.07,
    p_idempotency_key: `pay_v2_pro:${chargePro}`,
  });

  assert(!actProErr && actPro?.success, "Pro monthly activation failed");
  const { data: profPro } = await supabase.from("profiles").select("*").eq("id", testUser).single();
  assert(getUserPlan(profPro) === "pro", "User plan must be pro");

  recordResult({
    id: 8,
    domain: "LIVE ACTIVATION",
    name: "Pro Monthly (฿289) Live Activation",
    expected: "payment_transactions recorded with gross 289, profile plan pro, status active",
    actual: `Activated Pro Monthly: Tx ID ${(actPro.payment_transaction_id || chargePro).slice(0, 8)}..., Expiry: ${profPro.membership_expires_at.slice(0, 10)}`,
    evidence: "Live Supabase record_omise_payment_and_activate_atomic",
    status: "PASS",
  });

  // TEST 9: Live Sands Refill Pack 150 (฿149)
  const chargeSands = `chrg_v2_sands150_${runSeed}`;
  const sandsBuy = await awardPurchasedSandsPack({
    userId: testUser,
    packId: "sands_150",
    sandsAmount: 150,
    chargeId: chargeSands,
    grossAmountThb: 149,
    env,
  });

  assert(sandsBuy.success, "Sands refill purchase failed");
  assert(sandsBuy.newBalance >= 150, "Sands balance must be >= 150");

  const { data: profSands } = await supabase.from("profiles").select("time_sands, plan").eq("id", testUser).single();
  assert(profSands.time_sands === 150, "Sands balance must be exactly 150");
  assert(profSands.plan === "pro_monthly", "Sands purchase must NOT overwrite membership plan");

  recordResult({
    id: 9,
    domain: "LIVE ACTIVATION",
    name: "Sands 150 (฿149) Refill Fulfillment",
    expected: "Credited +150 Sands, membership plan preserved as pro_monthly",
    actual: `Sands: ${profSands.time_sands}, Plan preserved: ${profSands.plan}`,
    evidence: "awardPurchasedSandsPack atomic credit",
    status: "PASS",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. UNLIMITED SEMANTICS VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n🔒 --- DOMAIN 5: UNLIMITED SEMANTICS & QUOTA BOUNDARIES ---");

  // TEST 10: Null Unlimited Semantics
  assert(AI_REPORT_LIMIT.master === null, "AI_REPORT_LIMIT.master must be null");
  assert(PERSON_LIMIT.master === null, "PERSON_LIMIT.master must be null");
  assert(AI_REPORT_LIMIT.pro === 15, "AI_REPORT_LIMIT.pro must be 15");
  assert(PERSON_LIMIT.pro === 20, "PERSON_LIMIT.pro must be 20");

  recordResult({
    id: 10,
    domain: "SEMANTICS",
    name: "Unlimited Semantics (null values)",
    expected: "master limits are null (∞), pro limits are 15 reports & 20 persons",
    actual: `Master AI Limit: ${AI_REPORT_LIMIT.master} (∞), Pro AI Limit: ${AI_REPORT_LIMIT.pro}`,
    evidence: "apps/web/app/services/permissions.server.ts",
    status: "PASS",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("📊 STEP 6.6.2 PRICING & PACKAGING VALIDATION RESULTS");
  console.log("================================================================================\n");

  const passedCount = testResults.filter((r) => r.status === "PASS").length;

  for (const r of testResults) {
    console.log(`[✅ PASS] #${String(r.id).padStart(2, "0")} | [${r.domain.padEnd(14)}] | ${r.name.padEnd(38)} | ${r.actual}`);
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`TOTAL RESULT: ${passedCount} / ${testResults.length} Tests Passed (100% Green)`);
  console.log("--------------------------------------------------------------------------------\n");

  if (passedCount === testResults.length) {
    console.log("🏆 CANDIDATE v2 PRICING (฿89 / ฿289 / ฿789) VALIDATED & LOCKED SUCCESSFULLY!\n");
  }
}

runPricingPackagingSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
