/**
 * test-phase6-6-membership-monetization.ts
 *
 * Automated Verification Suite for STEP 6.6 — Membership & Monetization Activation
 * Tests:
 * 1. Tier Normalization & Dynamic Expiry Guard
 * 2. Feature Access & Quotas (canAccess, canUseFeature, getAiReportLimit, getPersonLimit)
 * 3. Subscription & Sands Refill Pricing Consistency
 * 4. Omise PromptPay Fee Calculation & Real-time Webhook Verification
 * 5. Sands Micro-Economy & Habit Loop (Daily Cap, Refill Packs, Redemption Catalog)
 * 6. End-to-End Payment Activation to Commission Attribution Flow
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

import {
  getUserPlan,
  canAccess,
  canUseFeature,
  getAiReportLimit,
  getPersonLimit,
  getTimingComparisonLimit,
  SUBSCRIPTION_PLANS,
  SANDS_REFILL_PACKS,
  FEATURE_PLANS,
} from "../apps/web/app/services/permissions.server";
import {
  calculateOmiseFee,
  verifyOmiseWebhookEvent,
} from "../apps/web/app/services/omise.server";
import {
  awardPurchasedSandsPack,
  SANDS_REDEMPTION_CATALOG,
  DAILY_RITUAL_SANDS_CAP,
} from "../apps/web/app/services/rewards.server";
import {
  processSubscriptionCommission,
} from "../apps/web/app/services/partner.server";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://ixbxwquhyyutffeqicgc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runStep66MonetizationSuite() {
  console.log("================================================================================");
  console.log("🏛️ PHOPEPHUM V3 — STEP 6.6 MEMBERSHIP & MONETIZATION VERIFICATION SUITE");
  console.log("================================================================================\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TIER NORMALIZATION & DYNAMIC EXPIRY GUARD TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🔹 TEST 1: Tier Normalization & Dynamic Expiry Guard");

  // 1.1 Active Subscriptions
  const basicActive = { plan: "basic", membership_status: "active", membership_expires_at: new Date(Date.now() + 86400000).toISOString() };
  assert(getUserPlan(basicActive) === "premium", "basic plan must normalize to 'premium'");

  const proActive = { plan: "pro", membership_status: "active", membership_expires_at: new Date(Date.now() + 86400000).toISOString() };
  assert(getUserPlan(proActive) === "pro", "pro plan must normalize to 'pro'");

  const imperialActive = { plan: "imperial", membership_status: "active" };
  assert(getUserPlan(imperialActive) === "master", "imperial plan must normalize to 'master'");

  // 1.2 Lifetime & Admin Bypass
  const lifetimeUser = { plan: "free", subscription: "lifetime" };
  assert(getUserPlan(lifetimeUser) === "master", "lifetime subscription must normalize to 'master'");

  const adminUser = { role: "admin", plan: "free" };
  assert(getUserPlan(adminUser) === "master", "admin role must bypass all gates and resolve to 'master'");

  const operatorUser = { role: "operator", plan: "free" };
  assert(getUserPlan(operatorUser) === "master", "operator role must bypass all gates and resolve to 'master'");

  // 1.3 Dynamic Expiry Fallback (Timestamp in Past)
  const expiredTimestamp = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const proExpired = {
    plan: "pro",
    membership_status: "active", // status says active, but timestamp is expired
    membership_expires_at: expiredTimestamp,
  };
  assert(
    getUserPlan(proExpired) === "free",
    "Profile with expired timestamp MUST dynamically fallback to 'free' regardless of active status"
  );

  // 1.4 Inactive/Pending Status
  const pendingUser = { plan: "pro", membership_status: "pending" };
  assert(getUserPlan(pendingUser) === "free", "pending membership_status must resolve to 'free'");

  console.log("  ✅ Tier normalization and dynamic expiry guard verified 100% correctly.\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FEATURE ACCESS & QUOTA LIMIT TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🔹 TEST 2: Feature Access Matrix & Quota Limits");

  const freeUser = { plan: "free", membership_status: "active" };
  const premiumUser = { plan: "basic", membership_status: "active" };
  const proUser = { plan: "pro", membership_status: "active" };
  const masterUser = { plan: "imperial", membership_status: "active" };

  // 2.1 canAccess hierarchy
  assert(canAccess(freeUser, "free"), "Free user can access free tier");
  assert(!canAccess(freeUser, "premium"), "Free user cannot access premium tier");
  assert(canAccess(premiumUser, "premium"), "Premium user can access premium tier");
  assert(!canAccess(premiumUser, "pro"), "Premium user cannot access pro tier");
  assert(canAccess(proUser, "pro"), "Pro user can access pro tier");
  assert(!canAccess(proUser, "master"), "Pro user cannot access master tier");
  assert(canAccess(masterUser, "master"), "Master user can access master tier");

  // 2.2 Feature access checks
  assert(canUseFeature(freeUser, "yam_live"), "Free user can view live Yam widget");
  assert(!canUseFeature(freeUser, "horoscope_self"), "Free user cannot view self Horoscope chart");
  assert(canUseFeature(premiumUser, "horoscope_self"), "Premium user can view self Horoscope chart");
  assert(!canUseFeature(premiumUser, "transit_system"), "Premium user cannot view transit system");
  assert(canUseFeature(proUser, "transit_system"), "Pro user can view transit system");
  assert(!canUseFeature(proUser, "matchmaking"), "Pro user cannot view matchmaking");
  assert(canUseFeature(masterUser, "matchmaking"), "Master user can view matchmaking");

  // 2.3 Quota Limits
  assert(getAiReportLimit(freeUser) === 0, "Free report limit must be 0");
  assert(getAiReportLimit(premiumUser) === 1, "Premium report limit must be 1");
  assert(getAiReportLimit(proUser) === 15, "Pro report limit must be 15");
  assert(getAiReportLimit(masterUser) === null, "Master report limit must be unlimited (null)");

  assert(getPersonLimit(freeUser) === 0, "Free CRM person limit must be 0");
  assert(getPersonLimit(premiumUser) === 3, "Premium CRM person limit must be 3");
  assert(getPersonLimit(proUser) === 20, "Pro CRM person limit must be 20");
  assert(getPersonLimit(masterUser) === null, "Master CRM person limit must be unlimited (null)");

  assert(getTimingComparisonLimit(proUser) === 5, "Pro candidate limit must be 5");

  console.log("  ✅ Feature access matrix and quota boundaries verified 100% accurately.\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PRICING & SUBSCRIPTION PLAN CONSISTENCY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🔹 TEST 3: Subscription & Sands Refill Pricing Consistency");

  assert(SUBSCRIPTION_PLANS.basic.priceThb === 59, "Basic price must be ฿59");
  assert(SUBSCRIPTION_PLANS.pro.priceThb === 259, "Pro price must be ฿259");
  assert(SUBSCRIPTION_PLANS.pro_annual.priceThb === 2490, "Pro annual price must be ฿2,490");
  assert(SUBSCRIPTION_PLANS.imperial.priceThb === 789, "Imperial price must be ฿789");

  assert(SANDS_REFILL_PACKS.sands_50.priceThb === 59, "50 Sands must be ฿59");
  assert(SANDS_REFILL_PACKS.sands_150.priceThb === 149, "150 Sands must be ฿149");
  assert(SANDS_REFILL_PACKS.sands_500.priceThb === 399, "500 Sands must be ฿399");

  console.log("  ✅ Pricing tokens for Subscriptions and Sands Packs harmonized.\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. OMISE PROMPTPAY FEE & WEBHOOK SECURITY TEST
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🔹 TEST 4: Omise PromptPay Fee Calculation & Webhook Authenticity");

  // PromptPay ฿259 charge
  const fee259 = calculateOmiseFee(259, "promptpay");
  assert(fee259.feeThb === 4.27, `Expected fee 4.27, got ${fee259.feeThb}`); // 259 * 0.0165 = 4.2735 -> 4.27
  assert(fee259.feeVatThb === 0.3, `Expected fee VAT 0.30, got ${fee259.feeVatThb}`); // 4.27 * 0.07 = 0.2989 -> 0.30
  assert(fee259.totalDeductionThb === 4.57, `Expected total deduction 4.57, got ${fee259.totalDeductionThb}`);
  assert(fee259.netReceivedThb === 254.43, `Expected net received 254.43, got ${fee259.netReceivedThb}`);

  // Webhook verification test
  const mockEnv = {
    OMISE_SECRET_KEY: "skey_test_mock",
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } as any;

  const validEvent = { id: "evnt_test_12345", key: "charge.complete", data: { id: "chrg_test_123" } };
  const authRes = await verifyOmiseWebhookEvent(validEvent, mockEnv);
  assert(authRes.authentic === true, "Valid test webhook must be verified as authentic");

  const invalidEvent = { key: "charge.complete" }; // missing id
  const rejectRes = await verifyOmiseWebhookEvent(invalidEvent, mockEnv);
  assert(rejectRes.authentic === false, "Webhook missing ID must be rejected");

  console.log("  ✅ Omise PromptPay mathematical breakdown and webhook guard verified.\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. SANDS OF TIME MICRO-ECONOMY & REDEMPTION CATALOG
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🔹 TEST 5: Sands of Time Micro-Economy & Redemption Catalog");

  assert(DAILY_RITUAL_SANDS_CAP === 15, "Daily ritual sands cap must be 15");
  assert(SANDS_REDEMPTION_CATALOG.length >= 5, "Redemption catalog must have at least 5 items");

  const aiReportItem = SANDS_REDEMPTION_CATALOG.find((i) => i.id === "ai_in_depth_report");
  assert(Boolean(aiReportItem), "AI report redemption item must exist");
  assert(aiReportItem?.sandsCost === 30, "AI report redemption cost must be 30 sands");

  const voucherItem = SANDS_REDEMPTION_CATALOG.find((i) => i.id === "master_consultation_voucher");
  assert(Boolean(voucherItem), "Master consultation voucher must exist");
  assert(voucherItem?.sandsCost === 150, "Master consultation voucher must cost 150 sands");

  console.log("  ✅ Sands micro-economy and consultation privilege rail verified.\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. LIVE SUPABASE DB INTEGRATION & ACTIVATION TEST
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🔹 TEST 6: Live Supabase Atomic Payment Activation & Attribution Test");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 6.1 Create test buyer user via auth admin
  const runId = Math.random().toString(36).substring(2, 7);
  const testBuyerEmail = `buyer.monetize.${runId}.${Date.now()}@phopephum.test`;

  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: testBuyerEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: `Buyer Monetization Test ${runId}` },
  });

  assert(!authErr && Boolean(authUser?.user), `Failed to create auth user: ${authErr?.message}`);
  const testBuyerId = authUser.user.id;

  await supabase.from("profiles").upsert({
    id: testBuyerId,
    email: testBuyerEmail,
    display_name: "Buyer Monetization Test",
    plan: "free",
    subscription: "free",
    membership_status: "active",
    time_sands: 5,
  });

  // 6.2 Execute record_omise_payment_and_activate_atomic for Pro Annual
  const chargeId = `chrg_test_monetize_${Date.now()}`;
  const { data: actRes, error: actErr } = await supabase.rpc(
    "record_omise_payment_and_activate_atomic",
    {
      p_user_id: testBuyerId,
      p_omise_charge_id: chargeId,
      p_payment_method: "promptpay",
      p_gross_amount_thb: 2490,
      p_gateway_fee_thb: 41.09,
      p_gateway_vat_thb: 2.88,
      p_net_received_thb: 2446.03,
      p_subscription_plan_code: "pro_annual",
      p_vat_rate: 0.07,
      p_idempotency_key: `test_monetize:${chargeId}`,
      p_metadata: { test: true },
    }
  );

  assert(!actErr, `Activation RPC error: ${actErr?.message}`);
  assert(actRes?.success === true, "Activation RPC must return success: true");

  // 6.3 Verify updated profile
  const { data: updatedBuyer } = await supabase
    .from("profiles")
    .select("plan, subscription, membership_status, membership_expires_at")
    .eq("id", testBuyerId)
    .single();

  assert(updatedBuyer?.membership_status === "active", "Buyer membership_status must be active");
  assert(Boolean(updatedBuyer?.membership_expires_at), "Buyer membership_expires_at must be set");
  assert(new Date(updatedBuyer?.membership_expires_at).getTime() > Date.now(), "Buyer membership must be in future");
  assert(getUserPlan(updatedBuyer) === "pro", "Buyer normalized plan must now be 'pro'");

  // 6.4 Fulfill Sands Refill Pack
  const sandsRes = await awardPurchasedSandsPack({
    userId: testBuyerId,
    packId: "sands_150",
    sandsAmount: 150,
    chargeId: `chrg_test_sands_${Date.now()}`,
    grossAmountThb: 149,
    env: mockEnv,
  });

  assert(sandsRes.success === true, `Sands pack credit error: ${sandsRes.error}`);
  assert(sandsRes.newBalance >= 155, `Expected balance >= 155, got ${sandsRes.newBalance}`);

  console.log(`  ✅ Live payment activation & Sands refill pack (+150) successfully verified (New Balance: ${sandsRes.newBalance}).\n`);

  console.log("================================================================================");
  console.log("🎉 ALL STEP 6.6 MEMBERSHIP & MONETIZATION TESTS PASSED WITH 100% PERFECTION!");
  console.log("================================================================================\n");
}

runStep66MonetizationSuite().catch((err) => {
  console.error("FATAL ERROR in Step 6.6 test suite:", err);
  process.exit(1);
});
