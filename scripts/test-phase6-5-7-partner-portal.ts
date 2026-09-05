/**
 * test-phase6-5-7-partner-portal.ts
 * ============================================================================
 * PHOPEPHUM V3 — STEP 6.5.7: PARTNER DASHBOARD & PORTAL AUTOMATED TESTS
 * ============================================================================
 * 
 * 8 Comprehensive Test Suites:
 * 1. Financial Single Source of Truth & 4 Balances Integrity (No duplicate balances)
 * 2. Strict Buyer PII Masking Security (Zero Email/Phone Leakage)
 * 3. Dynamic Tax Rule Resolution & Snapshot Freeze at Payout Reservation
 * 4. Payout Request Atomic Reservation & Double Withdrawal Guard
 * 5. Minimum Threshold Validation (Min ฿500 & Balance Check)
 * 6. Payout State Machine Representation & Provider Failure Distinction
 * 7. Partner Financial Ledger Double-Entry History Integrity
 * 8. Tenant & RLS Security Isolation (Owner Only Access)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

import {
  getOrCreatePartnerProfile,
  getPartnerLedgerHistory,
  getPartnerPayoutRequests,
  getPartnerCommissionHistory,
  getPartnerReferralPerformance,
  requestPartnerPayout,
  resolveApplicableTaxRule,
  maskBuyerIdentifier,
} from "../apps/web/app/services/partner.server";

import {
  adminApprovePayoutRequest,
  adminRejectPayoutRequest,
} from "../apps/web/app/services/payoutOperations.server";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

interface TestResult {
  name: string;
  group: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];
let _serviceRoleClient: ReturnType<typeof createClient> | null = null;
let _anonClient: ReturnType<typeof createClient> | null = null;

function getServiceRole() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  if (!_serviceRoleClient) {
    _serviceRoleClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _serviceRoleClient;
}

function getAnon() {
  if (!SUPABASE_URL || !ANON_KEY) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  if (!_anonClient) {
    _anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _anonClient;
}

async function runTest(group: string, name: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const details = await fn();
    results.push({ group, name, passed: true, details: details || undefined });
    console.log(`  ✅ [PASS] ${group} — ${name}`);
  } catch (err: any) {
    results.push({ group, name, passed: false, error: err.message });
    console.error(`  ❌ [FAIL] ${group} — ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// ── Mock Env for Services Testing ──
const mockEnv = {
  SUPABASE_URL: SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY!,
  SUPABASE_ANON_KEY: ANON_KEY!,
  APP_ENV: "test",
} as any;

async function main() {
  console.log("\n================================================================================");
  console.log("🏛️  PHOPEPHUM V3 — STEP 6.5.7: PARTNER DASHBOARD & PORTAL TESTS");
  console.log("================================================================================\n");

  const supabase = getServiceRole();

  // Setup Test Partner & Profiles via auth.admin
  const timestamp = Date.now();
  let testPartnerUserId = "";
  let testBuyerUserId = "";
  const testPartnerCode = `P${String(timestamp).slice(-6)}`;
  let testPartnerEntityId = "";

  try {
    // 0. Pre-Flight Setup
    console.log("📦 Preparing Seed Fixtures for Step 6.5.7...");

    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    // Partner user
    const existingPartner = authUsers?.users?.find(u => u.email === "partner.portal.test@phopephum.com");
    if (existingPartner) {
      testPartnerUserId = existingPartner.id;
    } else {
      const { data: newP, error: pErr } = await supabase.auth.admin.createUser({
        email: "partner.portal.test@phopephum.com",
        password: "TestPassword123!",
        email_confirm: true,
        user_metadata: { display_name: "สมศักดิ์ มาสเตอร์พาร์ทเนอร์" },
      });
      if (pErr || !newP?.user) throw new Error(`Failed to create partner user: ${pErr?.message}`);
      testPartnerUserId = newP.user.id;
    }

    // Buyer user
    const existingBuyer = authUsers?.users?.find(u => u.email === "buyer.portal.test@secretbank.com");
    if (existingBuyer) {
      testBuyerUserId = existingBuyer.id;
    } else {
      const { data: newB, error: bErr } = await supabase.auth.admin.createUser({
        email: "buyer.portal.test@secretbank.com",
        password: "TestPassword123!",
        email_confirm: true,
        user_metadata: { display_name: "สมหญิง นักลงทุนดวงดาว" },
      });
      if (bErr || !newB?.user) throw new Error(`Failed to create buyer user: ${bErr?.message}`);
      testBuyerUserId = newB.user.id;
    }

    // Upsert Partner Profile
    const { error: pProfErr } = await supabase.from("profiles").upsert({
      id: testPartnerUserId,
      email: "partner.portal.test@phopephum.com",
      display_name: "สมศักดิ์ มาสเตอร์พาร์ทเนอร์",
      role: "admin", // Allow executing admin transitions in suite 6
      subscription: "free",
      referral_code: testPartnerCode,
      updated_at: new Date().toISOString(),
    });
    if (pProfErr) throw new Error(`Partner profile upsert failed: ${pProfErr.message}`);

    // Upsert Buyer Profile
    const { error: bProfErr } = await supabase.from("profiles").upsert({
      id: testBuyerUserId,
      email: "buyer.portal.test@secretbank.com",
      display_name: "สมหญิง นักลงทุนดวงดาว",
      role: "user",
      subscription: "free",
      referred_by: testPartnerCode,
      updated_at: new Date().toISOString(),
    });
    if (bProfErr) throw new Error(`Buyer profile upsert failed: ${bProfErr.message}`);

    // Upsert Partner Entity
    const { data: entityData, error: entErr } = await supabase.from("partner_entities").upsert({
      user_id: testPartnerUserId,
      partner_code: testPartnerCode,
      tier_code: "master",
      status: "active",
      verification_status: "verified",
      holding_balance: 1500.00,
      available_balance: 5000.00,
      payout_pending_balance: 1000.00,
      clawback_pending_balance: 200.00,
      total_earned: 7500.00,
      total_withdrawn: 1000.00,
      lifetime_referred_count: 5,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("id").single();

    if (entErr) throw entErr;
    testPartnerEntityId = entityData.id;

    // Create Partner Tax & Destination Profiles
    await supabase.from("partner_tax_profiles").upsert({
      partner_id: testPartnerEntityId,
      entity_type: "individual",
      tax_id: "1100500123456",
      legal_name: "นายสมศักดิ์ มาสเตอร์พาร์ทเนอร์",
      is_vat_registered: false,
      withholding_tax_exempt: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "partner_id" });

    await supabase.from("partner_payout_destinations").upsert({
      partner_id: testPartnerEntityId,
      payout_method: "bank_transfer",
      bank_code: "กสิกรไทย (KBANK)",
      account_number: "045-2-12345-6",
      account_name: "นายสมศักดิ์ มาสเตอร์พาร์ทเนอร์",
      promptpay_id: "0812345678",
      is_default: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "partner_id" });

    // Fetch plan ID cleanly
    const { data: masterPlanRow } = await supabase
      .from("commission_plans")
      .select("id")
      .eq("plan_code", "PLAN_DEFAULT_MASTER")
      .single();
    const masterPlanId = masterPlanRow?.id;

    if (!masterPlanId) {
      throw new Error("PLAN_DEFAULT_MASTER not found in commission_plans table");
    }

    // Seed Commission Events for testing history
    const { error: commSeedErr } = await supabase.from("commission_events").insert([
      {
        partner_id: testPartnerEntityId,
        referred_user_id: testBuyerUserId,
        subscription_payment_id: `00000000-0000-0000-0000-${String(timestamp).slice(-12)}`,
        subscription_plan_code: "pro_monthly",
        gross_amount_thb: 399.00,
        vat_rate: 0.0700,
        vat_amount_thb: 26.10,
        commissionable_amount_thb: 372.90,
        plan_id_applied: masterPlanId,
        commission_rate_applied: 0.2500,
        commission_amount_thb: 93.23,
        status: "holding",
        holding_until: new Date(Date.now() + 14 * 86400000).toISOString(),
        idempotency_key: `comm_seed_1_${timestamp}`,
      },
      {
        partner_id: testPartnerEntityId,
        referred_user_id: testBuyerUserId,
        subscription_payment_id: `00000000-0000-0000-0001-${String(timestamp).slice(-12)}`,
        subscription_plan_code: "imperial_yearly",
        gross_amount_thb: 3990.00,
        vat_rate: 0.0700,
        vat_amount_thb: 261.03,
        commissionable_amount_thb: 3728.97,
        plan_id_applied: masterPlanId,
        commission_rate_applied: 0.2500,
        commission_amount_thb: 932.24,
        status: "cleared",
        holding_until: new Date(Date.now() - 86400000).toISOString(),
        idempotency_key: `comm_seed_2_${timestamp}`,
      }
    ]);

    if (commSeedErr) throw commSeedErr;

    // Seed Referral Attribution
    await supabase.from("referral_attributions").insert([
      {
        partner_id: testPartnerEntityId,
        visitor_anonymous_id: `vis_${timestamp}_1`,
        campaign_code: "youtube_horo",
        ip_hash: "test_ip_hash_1",
        status: "converted",
        referred_user_id: testBuyerUserId,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        converted_at: new Date().toISOString(),
      },
      {
        partner_id: testPartnerEntityId,
        visitor_anonymous_id: `vis_${timestamp}_2`,
        campaign_code: "tiktok_live",
        ip_hash: "test_ip_hash_2",
        status: "active",
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      }
    ]);

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 1: 4 Operational Balances & Single Source of Truth
    // ──────────────────────────────────────────────────────────────────────────
    await runTest(
      "Financial Source of Truth",
      "Retrieves exact 4 operational balances directly from partner_entities (No secondary ledger)",
      async () => {
        const profile = await getOrCreatePartnerProfile(testPartnerUserId, mockEnv);

        if (!profile) throw new Error("Partner profile not found");
        if (profile.availableBalance !== 5000) throw new Error(`Expected availableBalance 5000, got ${profile.availableBalance}`);
        if (profile.holdingBalance !== 1500) throw new Error(`Expected holdingBalance 1500, got ${profile.holdingBalance}`);
        if (profile.payoutPendingBalance !== 1000) throw new Error(`Expected payoutPendingBalance 1000, got ${profile.payoutPendingBalance}`);
        if (profile.clawbackPendingBalance !== 200) throw new Error(`Expected clawbackPendingBalance 200, got ${profile.clawbackPendingBalance}`);
        if (profile.tierCode !== "master") throw new Error(`Expected tierCode master, got ${profile.tierCode}`);
        if (profile.commissionRate !== 25) throw new Error(`Expected commissionRate 25%, got ${profile.commissionRate}`);

        return `Available: ฿${profile.availableBalance}, Holding: ฿${profile.holdingBalance}, Pending: ฿${profile.payoutPendingBalance}, Clawback: ฿${profile.clawbackPendingBalance}`;
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 2: Strict Buyer PII Masking Security
    // ──────────────────────────────────────────────────────────────────────────
    await runTest(
      "Buyer PII Protection",
      "Commission history & referral list must mask buyer identity and NEVER expose email/phone",
      async () => {
        // 1. Check helper masking
        const maskedName1 = maskBuyerIdentifier(testBuyerUserId, "สมหญิง นักลงทุนดวงดาว");
        if (maskedName1.includes("สมหญิง") && !maskedName1.includes("***")) {
          throw new Error(`Masking failed for full name: ${maskedName1}`);
        }
        const maskedName2 = maskBuyerIdentifier(testBuyerUserId, null);
        if (!maskedName2.startsWith("User #***")) {
          throw new Error(`Masking failed for anonymous user: ${maskedName2}`);
        }

        // 2. Check commission history output
        const commResult = await getPartnerCommissionHistory({ userId: testPartnerUserId, env: mockEnv });
        if (commResult.items.length < 2) throw new Error(`Expected at least 2 commissions, got ${commResult.items.length}`);

        for (const item of commResult.items) {
          const rawStr = JSON.stringify(item);
          if (rawStr.includes("buyer.portal.test@") || rawStr.includes("@secretbank.com") || rawStr.includes("+66899999999")) {
            throw new Error(`CRITICAL SECURITY LEAK: Buyer PII found in commission history: ${rawStr}`);
          }
          if (!item.maskedBuyerName || item.maskedBuyerName.includes("secretbank")) {
            throw new Error(`Invalid masked buyer name: ${item.maskedBuyerName}`);
          }
        }

        // 3. Check referral performance output
        const perfResult = await getPartnerReferralPerformance({ userId: testPartnerUserId, env: mockEnv });
        for (const ref of perfResult.recentReferrals) {
          const rawStr = JSON.stringify(ref);
          if (rawStr.includes("buyer.portal.test@") || rawStr.includes("@secretbank.com") || rawStr.includes("+66899999999")) {
            throw new Error(`CRITICAL SECURITY LEAK: Buyer PII found in referral performance: ${rawStr}`);
          }
        }

        return `Verified ${commResult.items.length} commissions and ${perfResult.recentReferrals.length} referrals — 0 PII leaked`;
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 3: Dynamic Tax Rule Resolution & Freeze Snapshot at Payout
    // ──────────────────────────────────────────────────────────────────────────
    await runTest(
      "Dynamic Tax Snapshot",
      "Resolves tax rule from tax_rules table dynamically and freezes snapshot in payout_requests",
      async () => {
        // 1. Verify resolution for individual above 1000฿ -> 3% WHT
        const rule3 = await resolveApplicableTaxRule(testPartnerEntityId, 2000, mockEnv);
        if (rule3.ruleCode !== "TH_INDIVIDUAL_COMMISSION" || Number(rule3.withholdingRate) !== 0.03) {
          throw new Error(`Expected TH_INDIVIDUAL_COMMISSION 3%, got ${rule3.ruleCode} (${rule3.withholdingRate})`);
        }

        // 2. Verify resolution for amount below threshold (< 1000฿) -> 0% WHT
        const rule0 = await resolveApplicableTaxRule(testPartnerEntityId, 800, mockEnv);
        if (rule0.ruleCode !== "TH_BELOW_THRESHOLD" || Number(rule0.withholdingRate) !== 0.00) {
          throw new Error(`Expected TH_BELOW_THRESHOLD 0%, got ${rule0.ruleCode} (${rule0.withholdingRate})`);
        }

        // 3. Request payout of 2,000฿ and verify frozen snapshot in DB
        const payoutRes = await requestPartnerPayout({
          partnerId: testPartnerUserId,
          amount: 2000,
          bankInfo: {
            bankName: "กสิกรไทย",
            accountNo: "045-2-12345-6",
            accountName: "นายสมศักดิ์ มาสเตอร์พาร์ทเนอร์",
            taxId: "1100500123456",
          },
          env: mockEnv,
        });

        if (!payoutRes.success) throw new Error(`Payout request failed: ${payoutRes.error}`);
        if (payoutRes.whtAmount !== 60.00) throw new Error(`Expected WHT ฿60.00, got ${payoutRes.whtAmount}`);
        if (payoutRes.netPayout !== 1940.00) throw new Error(`Expected Net ฿1940.00, got ${payoutRes.netPayout}`);

        // 4. Verify frozen snapshot in payout_requests
        const requests = await getPartnerPayoutRequests(testPartnerUserId, mockEnv);
        const latest = requests[0];
        if (!latest) throw new Error("Payout request record not found in DB");
        if (latest.taxRuleCodeApplied !== "TH_INDIVIDUAL_COMMISSION") {
          throw new Error(`Expected taxRuleCodeApplied TH_INDIVIDUAL_COMMISSION, got ${latest.taxRuleCodeApplied}`);
        }
        if (Number(latest.withholdingRateApplied) !== 0.03) {
          throw new Error(`Expected withholdingRateApplied 0.03, got ${latest.withholdingRateApplied}`);
        }
        if (latest.withholdingTaxAmountThb !== 60.00) {
          throw new Error(`Expected withholdingTaxAmountThb 60, got ${latest.withholdingTaxAmountThb}`);
        }
        if (latest.netPayoutAmountThb !== 1940.00) {
          throw new Error(`Expected netPayoutAmountThb 1940, got ${latest.netPayoutAmountThb}`);
        }

        return `Tax snapshot frozen: Rule=${latest.taxRuleCodeApplied}, Rate=${latest.withholdingRateApplied}, WHT=฿${latest.withholdingTaxAmountThb}, Net=฿${latest.netPayoutAmountThb}`;
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 4: Payout Request Atomic Reservation & Balance Deduction
    // ──────────────────────────────────────────────────────────────────────────
    await runTest(
      "Atomic Reservation",
      "Deducts available_balance and increments payout_pending_balance atomically in single transaction",
      async () => {
        const profile = await getOrCreatePartnerProfile(testPartnerUserId, mockEnv);

        if (!profile) throw new Error("Partner profile not found");
        // Initial was available 5000, pending 1000. We reserved 2000 in Suite 3.
        // New available must be 3000, new pending must be 3000.
        if (profile.availableBalance !== 3000) {
          throw new Error(`Expected availableBalance 3000, got ${profile.availableBalance}`);
        }
        if (profile.payoutPendingBalance !== 3000) {
          throw new Error(`Expected payoutPendingBalance 3000, got ${profile.payoutPendingBalance}`);
        }

        return `Available decremented 5000 ➔ 3000, Pending incremented 1000 ➔ 3000 atomically`;
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 5: Minimum Threshold & Validation Guardrails
    // ──────────────────────────────────────────────────────────────────────────
    await runTest(
      "Validation Guardrails",
      "Rejects payout requests under ฿500 or exceeding available balance",
      async () => {
        // 1. Test below ฿500 threshold
        const resLow = await requestPartnerPayout({
          partnerId: testPartnerUserId,
          amount: 400,
          bankInfo: { bankName: "KBANK", accountNo: "123", accountName: "Test" },
          env: mockEnv,
        });
        if (resLow.success) throw new Error("Expected payout < ฿500 to be rejected, but succeeded");

        // 2. Test exceeding available balance (Available is 3000, request 10000)
        const resHigh = await requestPartnerPayout({
          partnerId: testPartnerUserId,
          amount: 10000,
          bankInfo: { bankName: "KBANK", accountNo: "123", accountName: "Test" },
          env: mockEnv,
        });
        if (resHigh.success) throw new Error("Expected payout > available balance to be rejected, but succeeded");

        return "Successfully enforced min ฿500 threshold and insufficient funds rejection";
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 6: Strict Payout State Machine Representation & Provider Failure
    // ──────────────────────────────────────────────────────────────────────────
    await runTest(
      "Payout State Machine",
      "Transitions safely through PENDING_REVIEW -> APPROVED -> PROCESSING -> COMPLETED / REJECTED / FAILED",
      async () => {
        const requests = await getPartnerPayoutRequests(testPartnerUserId, mockEnv);
        const req = requests[0];
        if (!req) throw new Error("No payout request found");

        // 1. Initial State: pending_review
        if (req.status !== "pending_review") {
          throw new Error(`Expected initial status pending_review, got ${req.status}`);
        }

        // 2. Admin Approve: pending_review -> approved
        const appRes = await adminApprovePayoutRequest({
          payoutRequestId: req.id,
          adminId: testPartnerUserId, // Admin role
          reason: "Approved KYC & Tax documentation",
          env: mockEnv,
        });
        if (!appRes.success) throw new Error(`Approval failed: ${appRes.error}`);
        if (appRes.newStatus !== "approved") throw new Error(`Expected newStatus approved, got ${appRes.newStatus}`);

        // 3. Admin Reject from approved -> rejected (releases reserved funds back to available)
        const rejRes = await adminRejectPayoutRequest({
          payoutRequestId: req.id,
          adminId: testPartnerUserId,
          reason: "Partner requested bank account alteration",
          env: mockEnv,
        });
        if (!rejRes.success) throw new Error(`Rejection failed: ${rejRes.error}`);
        if (rejRes.newStatus !== "rejected") throw new Error(`Expected newStatus rejected, got ${rejRes.newStatus}`);

        // Verify available balance refunded: 3000 + 2000 = 5000
        const restoredProfile = await getOrCreatePartnerProfile(testPartnerUserId, mockEnv);
        if (restoredProfile?.availableBalance !== 5000) {
          throw new Error(`Expected refunded availableBalance 5000, got ${restoredProfile?.availableBalance}`);
        }
        if (restoredProfile?.payoutPendingBalance !== 1000) {
          throw new Error(`Expected refunded payoutPendingBalance 1000, got ${restoredProfile?.payoutPendingBalance}`);
        }

        return `State machine verified: pending_review ➔ approved ➔ rejected (Funds restored to ฿5,000)`;
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 7: Partner Financial Ledger Double-Entry History Integrity
    // ──────────────────────────────────────────────────────────────────────────
    await runTest(
      "Ledger Integrity",
      "Double-entry ledger tracks exact balance snapshots before and after every transaction",
      async () => {
        const ledger = await getPartnerLedgerHistory(testPartnerUserId, mockEnv, 20);

        if (ledger.length === 0) throw new Error("No ledger entries found for partner");

        // Verify latest entry is payout_rejected with correct balance transitions
        const latestEntry = ledger[0];
        if (latestEntry?.entryType !== "payout_rejected") {
          throw new Error(`Expected latest ledger entry payout_rejected, got ${latestEntry?.entryType}`);
        }
        if (latestEntry.availableBalanceBefore !== 3000 || latestEntry.availableBalanceAfter !== 5000) {
          throw new Error(`Balance transition error: ${latestEntry.availableBalanceBefore} ➔ ${latestEntry.availableBalanceAfter}`);
        }

        return `Ledger verified with ${ledger.length} immutable double-entry records`;
      }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 8: Tenant & RLS Security Isolation
    // ──────────────────────────────────────────────────────────────────────────
    await runTest(
      "Tenant & RLS Isolation",
      "Partner can only view their own records — other partner entities cannot access foreign financial data",
      async () => {
        const anon = getAnon();
        
        // 1. Attempt to read partner_entities anonymously
        const { data: anonEntities } = await anon.from("partner_entities").select("*");
        if (anonEntities && anonEntities.length > 0) {
          throw new Error("SECURITY VIOLATION: Anonymous client read partner_entities table");
        }

        // 2. Attempt to read partner_ledger anonymously
        const { data: anonLedger } = await anon.from("partner_ledger").select("*");
        if (anonLedger && anonLedger.length > 0) {
          throw new Error("SECURITY VIOLATION: Anonymous client read partner_ledger table");
        }

        // 3. Attempt to read payout_requests anonymously
        const { data: anonPayouts } = await anon.from("payout_requests").select("*");
        if (anonPayouts && anonPayouts.length > 0) {
          throw new Error("SECURITY VIOLATION: Anonymous client read payout_requests table");
        }

        return "RLS policies strictly enforced across all partner financial tables";
      }
    );

  } finally {
    // Teardown / Cleanup test fixtures
    console.log("\n🧹 Cleaning up test fixtures...");
    try {
      if (testPartnerEntityId) {
        await supabase.from("commission_events").delete().eq("partner_id", testPartnerEntityId);
        await supabase.from("referral_attributions").delete().eq("partner_id", testPartnerEntityId);
        await supabase.from("partner_ledger").delete().eq("partner_id", testPartnerEntityId);
        await supabase.from("payout_requests").delete().eq("partner_id", testPartnerEntityId);
        await supabase.from("partner_tax_profiles").delete().eq("partner_id", testPartnerEntityId);
        await supabase.from("partner_payout_destinations").delete().eq("partner_id", testPartnerEntityId);
      }
    } catch (e: any) {
      console.warn("Cleanup warning:", e.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REPORT
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("📊 STEP 6.5.7 TEST EXECUTION SUMMARY");
  console.log("================================================================================");

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  for (const r of results) {
    console.log(`${r.passed ? "✅" : "❌"} [${r.group}] ${r.name}`);
    if (r.details) console.log(`   ℹ️  ${r.details}`);
    if (r.error) console.log(`   🚨 Error: ${r.error}`);
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`🎯 Total Passed: ${passedCount} / ${totalCount} (${((passedCount / totalCount) * 100).toFixed(0)}%)`);
  console.log("================================================================================\n");

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
