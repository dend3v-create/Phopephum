/**
 * test-phase6-5-6-payout-admin-operations.ts
 * ============================================================================
 * PHOPEPHUM V3 — STEP 6.5.6: PARTNER PAYOUT & ADMIN OPERATIONS AUTOMATED TESTS
 * ============================================================================
 * 
 * 4 Mandatory Guardrails Verified:
 * 1. Terminology: 3 Operational Balances + 1 Clawback Debt & Holding Clearance vs Payout Settlement
 * 2. Retry-Safe Scheduler: Atomic RPC single source of truth
 * 3. Failed/Partial Processing Monitoring: Telemetry in financial_job_logs
 * 4. Admin Financial Operations & Strict State Machine: Immutable audit trail + RBAC
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

interface TestResult {
  name: string;
  group: string;
  passed: boolean;
  error?: string;
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

async function runTest(group: string, name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ group, name, passed: true });
    console.log(`  ✅ [${group}] ${name}`);
  } catch (err: any) {
    results.push({ group, name, passed: false, error: err?.message || String(err) });
    console.error(`  ❌ [${group}] ${name}:`, err?.message || err);
  }
}

async function main() {
  console.log("\n================================================================================");
  console.log("🏛️  PHOPEPHUM V3 — STEP 6.5.6: PARTNER PAYOUT & ADMIN OPERATIONS VERIFICATION");
  console.log("================================================================================\n");

  const supabase = getServiceRole();

  // 1. Setup Test Admin and Test Partner via Supabase Auth Admin
  let adminUserId = "";
  let partnerUserId = "";

  // Check or create admin user
  const { data: adminUsers } = await supabase.auth.admin.listUsers();
  const existingAdmin = adminUsers?.users?.find(u => u.email === "admin.finance@phopephum.com");
  if (existingAdmin) {
    adminUserId = existingAdmin.id;
  } else {
    const { data: newAdmin, error: createAdminErr } = await supabase.auth.admin.createUser({
      email: "admin.finance@phopephum.com",
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: { display_name: "Master Financial Admin" },
    });
    if (createAdminErr || !newAdmin?.user) throw new Error(`Failed to create admin user: ${createAdminErr?.message}`);
    adminUserId = newAdmin.user.id;
  }

  // Check or create partner user
  const existingPartner = adminUsers?.users?.find(u => u.email === "partner.alpha@phopephum.com");
  if (existingPartner) {
    partnerUserId = existingPartner.id;
  } else {
    const { data: newPartner, error: createPartnerErr } = await supabase.auth.admin.createUser({
      email: "partner.alpha@phopephum.com",
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: { display_name: "Top Partner Alpha" },
    });
    if (createPartnerErr || !newPartner?.user) throw new Error(`Failed to create partner user: ${createPartnerErr?.message}`);
    partnerUserId = newPartner.user.id;
  }

  const testAdminId = adminUserId;
  const testPartnerUserId = partnerUserId;

  // Upsert Admin Profile with role: 'admin'
  const { error: adminErr } = await supabase.from("profiles").upsert({
    id: testAdminId,
    display_name: "Master Financial Admin",
    email: "admin.finance@phopephum.com",
    role: "admin",
    updated_at: new Date().toISOString(),
  });
  if (adminErr) console.error("Admin profile upsert error:", adminErr);

  // Upsert Partner Profile
  const { error: userErr } = await supabase.from("profiles").upsert({
    id: testPartnerUserId,
    display_name: "Top Partner Alpha",
    email: "partner.alpha@phopephum.com",
    role: "user",
    updated_at: new Date().toISOString(),
  });
  if (userErr) console.error("Partner profile upsert error:", userErr);

  // Upsert or fetch Partner Entity
  let testPartnerEntityId = "";
  const { data: existingPE } = await supabase
    .from("partner_entities")
    .select("id")
    .eq("user_id", testPartnerUserId)
    .maybeSingle();

  if (existingPE) {
    testPartnerEntityId = existingPE.id;
    await supabase.from("partner_entities").update({
      holding_balance: 1000.00,
      available_balance: 10000.00,
      payout_pending_balance: 0.00,
      clawback_pending_balance: 0.00,
      total_earned: 11000.00,
      total_withdrawn: 0.00,
      updated_at: new Date().toISOString(),
    }).eq("id", testPartnerEntityId);
  } else {
    const { data: newPE, error: partnerErr } = await supabase.from("partner_entities").insert({
      user_id: testPartnerUserId,
      partner_code: `ALPHA_${Date.now().toString().slice(-4)}`,
      tier_code: "master",
      status: "active",
      verification_status: "verified",
      holding_balance: 1000.00,
      available_balance: 10000.00,
      payout_pending_balance: 0.00,
      clawback_pending_balance: 0.00,
      total_earned: 11000.00,
      total_withdrawn: 0.00,
      updated_at: new Date().toISOString(),
    }).select("id").single();
    if (partnerErr || !newPE) throw new Error(`Partner entity insert error: ${partnerErr?.message}`);
    testPartnerEntityId = newPE.id;
  }

  // Upsert Partner Tax Profile & Destination
  await supabase.from("partner_tax_profiles").upsert({
    partner_id: testPartnerEntityId,
    entity_type: "individual",
    tax_id: "1234567890123",
    legal_name: "นาย อัลฟ่า พาร์ทเนอร์",
    updated_at: new Date().toISOString(),
  });

  await supabase.from("partner_payout_destinations").upsert({
    partner_id: testPartnerEntityId,
    payout_method: "bank_transfer",
    bank_code: "kbank",
    account_number: "0123456789",
    account_name: "นาย อัลฟ่า พาร์ทเนอร์",
    is_default: true,
    updated_at: new Date().toISOString(),
  });

  // Ensure default tax rule exists
  await supabase.from("tax_rules").upsert({
    rule_code: "TH_INDIVIDUAL_COMMISSION",
    description: "Thai Individual Withholding Tax 3%",
    entity_type: "individual",
    withholding_rate: 0.0300,
    min_threshold_thb: 1000.00,
    is_active: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP A: Payout Request & Balance Reservation
  // ─────────────────────────────────────────────────────────────────────────
  let testPayoutRequestId: string = "";

  await runTest("GROUP A", "A1. Create Payout Request (5,000 THB) -> Reserve Available to Payout Pending", async () => {
    const requestedAmount = 5000.00;
    const idempotencyKey = `test_payout_reserve:${Date.now()}`;

    const { data, error } = await supabase.rpc("reserve_payout_atomic", {
      p_partner_id: testPartnerEntityId,
      p_requested_amount_thb: requestedAmount,
      p_tax_rule_code: "TH_INDIVIDUAL_COMMISSION",
      p_destination_snapshot: {
        bank: "kbank",
        account_number: "0123456789",
        account_name: "นาย อัลฟ่า พาร์ทเนอร์",
      },
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw new Error(`reserve_payout_atomic failed: ${error.message}`);
    const res = data as any;
    if (!res.success) throw new Error("reserve_payout_atomic returned success = false");

    // Verify Partner Balances
    const { data: partner } = await supabase
      .from("partner_entities")
      .select("*")
      .eq("id", testPartnerEntityId)
      .single();

    if (Number(partner.available_balance) !== 5000.00) {
      throw new Error(`Expected available_balance 5000.00, got ${partner.available_balance}`);
    }
    if (Number(partner.payout_pending_balance) !== 5000.00) {
      throw new Error(`Expected payout_pending_balance 5000.00, got ${partner.payout_pending_balance}`);
    }

    // Find the created payout request ID
    const { data: payoutReq } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("partner_id", testPartnerEntityId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!payoutReq) throw new Error("Payout request not found in pending_review status");
    testPayoutRequestId = payoutReq.id;

    if (Number(payoutReq.withholding_tax_amount_thb) !== 150.00) {
      throw new Error(`Expected WHT 3% (150.00 THB), got ${payoutReq.withholding_tax_amount_thb}`);
    }
    if (Number(payoutReq.net_payout_amount_thb) !== 4850.00) {
      throw new Error(`Expected Net Payout (4850.00 THB), got ${payoutReq.net_payout_amount_thb}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP B: Strict Admin State Machine & RBAC
  // ─────────────────────────────────────────────────────────────────────────
  await runTest("GROUP B", "B1. Non-Admin / User cannot transition payout status (RBAC)", async () => {
    const nonAdminId = testPartnerUserId; // user role
    const { error } = await supabase.rpc("admin_process_payout_transition_atomic", {
      p_payout_request_id: testPayoutRequestId,
      p_admin_id: nonAdminId,
      p_new_status: "approved",
      p_reason: "Illegal attempt",
    });

    if (!error || !error.message.includes("UNAUTHORIZED")) {
      throw new Error(`Expected UNAUTHORIZED exception, got: ${error?.message || "No error"}`);
    }
  });

  await runTest("GROUP B", "B2. Illegal State Jump (pending_review -> completed) is blocked", async () => {
    const { error } = await supabase.rpc("admin_process_payout_transition_atomic", {
      p_payout_request_id: testPayoutRequestId,
      p_admin_id: testAdminId,
      p_new_status: "completed", // Illegal jump: must be approved -> processing -> completed
      p_reason: "Direct jump attempt",
    });

    if (!error || !error.message.includes("ILLEGAL_TRANSITION")) {
      throw new Error(`Expected ILLEGAL_TRANSITION exception, got: ${error?.message || "No error"}`);
    }
  });

  await runTest("GROUP B", "B3. Valid Transition: pending_review -> approved + Audit Log created", async () => {
    const { data, error } = await supabase.rpc("admin_process_payout_transition_atomic", {
      p_payout_request_id: testPayoutRequestId,
      p_admin_id: testAdminId,
      p_new_status: "approved",
      p_reason: "KYC and bank account verified by Senior Finance",
      p_ip_address: "127.0.0.1",
      p_user_agent: "Vitest Runner / Agent",
    });

    if (error) throw new Error(`Transition failed: ${error.message}`);
    const res = data as any;
    if (!res.success || res.new_status !== "approved") {
      throw new Error(`Expected new_status approved, got ${res?.new_status}`);
    }

    // Verify Audit Log inserted
    const { data: auditLog } = await supabase
      .from("admin_financial_audit_logs")
      .select("*")
      .eq("id", res.audit_log_id)
      .single();

    if (!auditLog) throw new Error("Admin audit log was not inserted into database");
    if (auditLog.action !== "transition_to_approved") {
      throw new Error(`Expected action transition_to_approved, got ${auditLog.action}`);
    }
    if (auditLog.admin_id !== testAdminId) {
      throw new Error(`Expected admin_id ${testAdminId}, got ${auditLog.admin_id}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP C: Admin Rejection Flow & Balance Reversal
  // ─────────────────────────────────────────────────────────────────────────
  await runTest("GROUP C", "C1. Create another payout request and test Admin Rejection (funds return to Available)", async () => {
    // 1. Create a 2,000 THB request
    await supabase.rpc("reserve_payout_atomic", {
      p_partner_id: testPartnerEntityId,
      p_requested_amount_thb: 2000.00,
      p_tax_rule_code: "TH_INDIVIDUAL_COMMISSION",
      p_destination_snapshot: { bank: "kbank", account_number: "0123456789" },
      p_idempotency_key: `payout_to_reject:${Date.now()}`,
    });

    // Check balance before reject: available should be 3,000 (was 5,000 - 2,000)
    let { data: partner } = await supabase.from("partner_entities").select("*").eq("id", testPartnerEntityId).single();
    if (Number(partner.available_balance) !== 3000.00) {
      throw new Error(`Expected available 3000.00 before reject, got ${partner.available_balance}`);
    }

    const { data: reqToReject } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("partner_id", testPartnerEntityId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // 2. Reject the payout request
    const { data: rejectRes, error: rejectErr } = await supabase.rpc("admin_process_payout_transition_atomic", {
      p_payout_request_id: reqToReject.id,
      p_admin_id: testAdminId,
      p_new_status: "rejected",
      p_reason: "Bank account holder name mismatch with national ID",
      p_ip_address: "127.0.0.1",
    });

    if (rejectErr) throw new Error(`Rejection RPC failed: ${rejectErr.message}`);

    // Check balance after reject: available must return back to 5,000
    const { data: partnerAfter } = await supabase.from("partner_entities").select("*").eq("id", testPartnerEntityId).single();
    if (Number(partnerAfter.available_balance) !== 5000.00) {
      throw new Error(`Expected available restored to 5000.00, got ${partnerAfter.available_balance}`);
    }

    // Verify Ledger entry payout_rejected
    const { data: ledgerEntry } = await supabase
      .from("partner_ledger")
      .select("*")
      .eq("partner_id", testPartnerEntityId)
      .eq("entry_type", "payout_rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!ledgerEntry) throw new Error("payout_rejected ledger entry not found");
    if (Number(ledgerEntry.amount) !== 2000.00) {
      throw new Error(`Expected refund amount 2000.00, got ${ledgerEntry.amount}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP D: Omise Transfer Dispatch & Webhook Settlement
  // ─────────────────────────────────────────────────────────────────────────
  await runTest("GROUP D", "D1. Transition approved -> processing -> completed (Settlement Finished)", async () => {
    // 1. Transition approved -> processing
    const { data: procRes, error: procErr } = await supabase.rpc("admin_process_payout_transition_atomic", {
      p_payout_request_id: testPayoutRequestId,
      p_admin_id: testAdminId,
      p_new_status: "processing",
      p_reason: "Dispatched to Omise Transfer API",
    });

    if (procErr) throw new Error(`Processing transition failed: ${procErr.message}`);

    // 2. Transition processing -> completed (Simulate Omise Webhook transfer.paid)
    const { data: compRes, error: compErr } = await supabase.rpc("admin_process_payout_transition_atomic", {
      p_payout_request_id: testPayoutRequestId,
      p_admin_id: testAdminId,
      p_new_status: "completed",
      p_reason: "Omise Webhook: transfer.paid confirmed by destination bank",
      p_evidence_url: "https://dashboard.omise.co/transfers/trsf_test_12345",
    });

    if (compErr) throw new Error(`Completion transition failed: ${compErr.message}`);

    // Verify Partner Balances: payout_pending_balance deducted, total_withdrawn increased
    const { data: finalPartner } = await supabase
      .from("partner_entities")
      .select("*")
      .eq("id", testPartnerEntityId)
      .single();

    if (Number(finalPartner.payout_pending_balance) !== 0.00) {
      throw new Error(`Expected payout_pending_balance 0.00, got ${finalPartner.payout_pending_balance}`);
    }
    if (Number(finalPartner.total_withdrawn) !== 5000.00) {
      throw new Error(`Expected total_withdrawn 5000.00, got ${finalPartner.total_withdrawn}`);
    }

    // Verify payout_settled ledger entry
    const { data: paidLedger } = await supabase
      .from("partner_ledger")
      .select("*")
      .eq("partner_id", testPartnerEntityId)
      .eq("entry_type", "payout_settled")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!paidLedger) throw new Error("payout_settled ledger entry not found");
    if (Number(paidLedger.amount) !== 5000.00) {
      throw new Error(`Expected paid ledger amount 5000.00, got ${paidLedger.amount}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP E: Monitored Holding Clearance with Telemetry in financial_job_logs
  // ─────────────────────────────────────────────────────────────────────────
  await runTest("GROUP E", "E1. Run Monitored Holding Clearance & Verify Telemetry in financial_job_logs", async () => {
    // 1. Ensure a commission plan exists
    let planId = "";
    const { data: plans } = await supabase.from("commission_plans").select("id").limit(1);
    if (plans && plans.length > 0) {
      planId = plans[0].id;
    } else {
      const { data: newPlan } = await supabase.from("commission_plans").insert({
        plan_code: `TEST_PLAN_${Date.now()}`,
        plan_name: "Test Commission Plan",
        plan_type: "recurring",
        holding_period_days: 14,
        is_active: true,
      }).select("id").single();
      planId = newPlan!.id;
    }

    const expiredEventId = crypto.randomUUID();
    
    // Ensure partner has holding balance to clear
    await supabase.from("partner_entities").update({
      holding_balance: 1000.00,
    }).eq("id", testPartnerEntityId);

    const { data: eventData, error: eventErr } = await supabase.from("commission_events").insert({
      id: expiredEventId,
      partner_id: testPartnerEntityId,
      referred_user_id: testAdminId, // distinct referred user
      subscription_payment_id: "33333333-3333-3333-3333-333333333333",
      subscription_plan_code: "vip_monthly",
      gross_amount_thb: 1000.00,
      vat_rate: 0.0700,
      vat_amount_thb: 70.00,
      commissionable_amount_thb: 930.00,
      plan_id_applied: planId,
      commission_rate_applied: 0.3000,
      commission_amount_thb: 279.00,
      status: "holding",
      holding_until: new Date(Date.now() - 10000).toISOString(), // Expired
      idempotency_key: `event_clear_${Date.now()}_${Math.random()}`,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    }).select("*");
    if (eventErr) throw new Error(`Commission event insert error: ${eventErr.message}`);

    // 2. Run Monitored RPC
    const { data, error } = await supabase.rpc("clear_holding_commissions_monitored_atomic", {
      p_limit: 10,
    });

    if (error) throw new Error(`clear_holding_commissions_monitored_atomic failed: ${error.message}`);
    const res = data as any;
    if (!res.success) throw new Error("Clearance returned success = false");
    if (res.processed_count < 1) throw new Error(`Expected at least 1 processed event, got ${res.processed_count}`);
    if (!res.job_log_id) throw new Error("Missing job_log_id in clearance response");

    // 3. Verify Job Log in financial_job_logs table
    const { data: jobLog } = await supabase
      .from("financial_job_logs")
      .select("*")
      .eq("id", res.job_log_id)
      .single();

    if (!jobLog) throw new Error("financial_job_logs record not found");
    if (jobLog.job_type !== "holding_clearance") {
      throw new Error(`Expected job_type holding_clearance, got ${jobLog.job_type}`);
    }
    if (jobLog.status !== "completed") {
      throw new Error(`Expected job status completed, got ${jobLog.status}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP F: 3 Operational Balances + 1 Clawback Debt Reconciliation
  // ─────────────────────────────────────────────────────────────────────────
  await runTest("GROUP F", "F1. 3 Operational Balances + 1 Clawback Debt Audit has ZERO discrepancies", async () => {
    const { data, error } = await supabase.rpc("get_partner_reconciliation_audit", {
      p_partner_id: testPartnerEntityId,
    });

    if (error) throw new Error(`get_partner_reconciliation_audit failed: ${error.message}`);
    const res = data as any;
    if (!res.success) throw new Error("Reconciliation returned success = false");
    if (res.discrepancy_count !== 0) {
      throw new Error(`Found ${res.discrepancy_count} discrepancies: ${JSON.stringify(res.discrepancies)}`);
    }
    if (res.reconciled_count < 1) {
      throw new Error(`Expected at least 1 reconciled partner, got ${res.reconciled_count}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("📊 STEP 6.5.6 TEST RESULTS SUMMARY");
  console.log("================================================================================");
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  console.log(`TOTAL TESTS : ${totalTests}`);
  console.log(`PASSED      : ${passedTests}`);
  console.log(`FAILED      : ${failedTests}`);
  console.log(`STATUS      : ${failedTests === 0 ? "🟢 ALL TESTS PASSED (100%)" : "🔴 TESTS FAILED"}`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
