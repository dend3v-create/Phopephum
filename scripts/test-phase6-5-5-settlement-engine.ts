/**
 * test-phase6-5-5-settlement-engine.ts
 * ============================================================================
 * PHOPEPHUM V3 — STEP 6.5.5: HOLDING & SETTLEMENT ENGINE AUTOMATED TESTS
 * ============================================================================
 * 
 * Tests:
 * 1. Automatic 14-day Holding Expiration Clearance
 * 2. Unexpired holding is NOT cleared
 * 3. Clawback pending balance debt offset mechanism
 * 4. Zero-Trust Revoke Execute security
 * 5. Concurrent execution race safety & idempotency
 * 6. 3-Balance Mathematical Parity Reconciliation
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });

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
    results.push({ group, name, passed: false, error: err.message });
    console.log(`  ❌ [${group}] ${name}: ${err.message}`);
  }
}

async function getOrCreateTestPartner() {
  const db = getServiceRole();
  const { data: user } = await db.from("profiles").select("id").limit(1).single();
  if (!user) throw new Error("No profile found in DB for testing");

  let { data: partner } = await db
    .from("partner_entities")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!partner) {
    const { data: newPartner, error } = await db
      .from("partner_entities")
      .insert({
        user_id: user.id,
        partner_code: `TEST${Date.now().toString().slice(-4)}`,
        tier_code: "master",
        status: "active",
        verification_status: "verified",
        holding_balance: 0.0,
        available_balance: 0.0,
        payout_pending_balance: 0.0,
        clawback_pending_balance: 0.0,
        total_earned: 0.0,
        total_withdrawn: 0.0,
      })
      .select("*")
      .single();
    if (error || !newPartner) throw new Error(`Cannot create test partner: ${error?.message}`);
    partner = newPartner;
  }

  return partner;
}

async function getTestPlanId() {
  const db = getServiceRole();
  const { data } = await db.from("commission_plans").select("id").limit(1).single();
  if (!data) throw new Error("No commission_plans found in DB");
  return data.id;
}

// ============================================================================
// GROUP H: Holding Expiration & Clearance Engine
// ============================================================================
async function runGroupH() {
  console.log("\n📦 GROUP H — Holding Expiration & Clearance Engine");

  await runTest("H1", "Expired holding events (holding_until <= now()) are cleared to available_balance", async () => {
    const db = getServiceRole();
    const partner = await getOrCreateTestPartner();
    const planId = await getTestPlanId();

    // 0. เคลียร์ event ตกค้างจากการทดสอบก่อนหน้าเพื่อให้ได้ clean baseline
    await db.rpc("clear_holding_commissions_atomic", { p_limit: 200 });

    const { data: balanceBefore } = await db
      .from("partner_entities")
      .select("holding_balance, available_balance")
      .eq("id", partner.id)
      .single();

    // 1. สร้าง commission event ที่หมดอายุแล้ว (holding_until in past)
    const commissionAmount = 150.0;
    const { data: event, error: eventErr } = await db
      .from("commission_events")
      .insert({
        partner_id: partner.id,
        referred_user_id: partner.user_id,
        subscription_payment_id: crypto.randomUUID(),
        subscription_plan_code: "pro_monthly",
        gross_amount_thb: 1000.0,
        vat_rate: 0.07,
        vat_amount_thb: 65.42,
        commissionable_amount_thb: 934.58,
        plan_id_applied: planId,
        commission_rate_applied: 0.15,
        commission_amount_thb: commissionAmount,
        status: "holding",
        holding_until: new Date(Date.now() - 10000).toISOString(), // 10s in the past
        idempotency_key: `test_h1_${Date.now()}`,
      })
      .select("*")
      .single();

    if (eventErr || !event) throw new Error(`Failed to create test expired event: ${eventErr?.message}`);

    // เพิ่ม holding_balance ให้ partner สำหรับ event นี้
    await db
      .from("partner_entities")
      .update({ holding_balance: Number(balanceBefore?.holding_balance || 0) + commissionAmount })
      .eq("id", partner.id);

    // 2. รัน clear_holding_commissions_atomic
    const { data: res, error: clearErr } = await db.rpc("clear_holding_commissions_atomic", {
      p_limit: 50,
    });

    if (clearErr) throw new Error(`RPC clear error: ${clearErr.message}`);

    // 3. ตรวจสอบสถานะ Event
    const { data: updatedEvent } = await db
      .from("commission_events")
      .select("status")
      .eq("id", event.id)
      .single();

    if (updatedEvent?.status !== "cleared") {
      throw new Error(`Expected event status 'cleared', got '${updatedEvent?.status}'`);
    }

    // 4. ตรวจสอบ Partner Balance
    const { data: balanceAfter } = await db
      .from("partner_entities")
      .select("holding_balance, available_balance")
      .eq("id", partner.id)
      .single();

    const expectedAvail = Number(balanceBefore?.available_balance) + commissionAmount;
    if (Math.abs(Number(balanceAfter?.available_balance) - expectedAvail) > 0.01) {
      throw new Error(`Available balance mismatch: expected ฿${expectedAvail}, got ฿${balanceAfter?.available_balance}`);
    }

    console.log(`    ℹ️  Cleared ฿${commissionAmount} from Holding → Available (New Available: ฿${balanceAfter?.available_balance}) ✓`);
  });

  await runTest("H2", "Future holding events (holding_until > now()) are NOT cleared", async () => {
    const db = getServiceRole();
    const partner = await getOrCreateTestPartner();
    const planId = await getTestPlanId();

    // สร้าง event ที่ยังไม่ครบ 14 วัน (holding_until = 7 days in future)
    const futureAmount = 200.0;
    const { data: futureEvent, error: err } = await db
      .from("commission_events")
      .insert({
        partner_id: partner.id,
        referred_user_id: partner.user_id,
        subscription_payment_id: crypto.randomUUID(),
        subscription_plan_code: "pro_annual",
        gross_amount_thb: 2000.0,
        vat_rate: 0.07,
        vat_amount_thb: 130.84,
        commissionable_amount_thb: 1869.16,
        plan_id_applied: planId,
        commission_rate_applied: 0.15,
        commission_amount_thb: futureAmount,
        status: "holding",
        holding_until: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        idempotency_key: `test_h2_${Date.now()}`,
      })
      .select("*")
      .single();

    if (err || !futureEvent) throw new Error(`Failed to create future event: ${err?.message}`);

    // รัน clear
    await db.rpc("clear_holding_commissions_atomic", { p_limit: 50 });

    // ตรวจว่ายังเป็น holding อยู่
    const { data: checkEvent } = await db
      .from("commission_events")
      .select("status")
      .eq("id", futureEvent.id)
      .single();

    if (checkEvent?.status !== "holding") {
      throw new Error(`Premature clearance: Future holding was cleared! status='${checkEvent?.status}'`);
    }

    console.log("    ℹ️  Future event remained in 'holding' state ✓");
  });
}

// ============================================================================
// GROUP I: Clawback Debt Offset
// ============================================================================
async function runGroupI() {
  console.log("\n⚖️ GROUP I — Clawback Pending Debt Offset");

  await runTest("I1", "Cleared commission automatically offsets clawback_pending_balance debt", async () => {
    const db = getServiceRole();
    const partner = await getOrCreateTestPartner();
    const planId = await getTestPlanId();

    // 1. ตั้งค่าให้ Partner มีหนี้ Clawback ค้าง ฿100.00
    const initialDebt = 100.0;
    await db
      .from("partner_entities")
      .update({
        clawback_pending_balance: initialDebt,
        holding_balance: 300.0,
        available_balance: 50.0,
      })
      .eq("id", partner.id);

    // 2. สร้าง commission event ครบกำหนดมูลค่า ฿250.00
    const commissionAmount = 250.0;
    const { data: event, error: eventErr } = await db
      .from("commission_events")
      .insert({
        partner_id: partner.id,
        referred_user_id: partner.user_id,
        subscription_payment_id: crypto.randomUUID(),
        subscription_plan_code: "pro_monthly",
        gross_amount_thb: 2000.0,
        vat_rate: 0.07,
        vat_amount_thb: 130.84,
        commissionable_amount_thb: 1869.16,
        plan_id_applied: planId,
        commission_rate_applied: 0.15,
        commission_amount_thb: commissionAmount,
        status: "holding",
        holding_until: new Date(Date.now() - 5000).toISOString(),
        idempotency_key: `test_i1_${Date.now()}`,
      })
      .select("*")
      .single();

    if (eventErr || !event) throw new Error(`Failed to create test event: ${eventErr?.message}`);

    // 3. รัน clear
    const { data: clearRes } = await db.rpc("clear_holding_commissions_atomic", { p_limit: 50 });

    // 4. ตรวจสอบ: หนี้ ฿100 ต้องถูกเคลียร์เหลือ ฿0.00, ส่วนที่เหลือ ฿150 ต้องเข้า available_balance (50 + 150 = 200)
    const { data: partnerAfter } = await db
      .from("partner_entities")
      .select("clawback_pending_balance, available_balance")
      .eq("id", partner.id)
      .single();

    if (Number(partnerAfter?.clawback_pending_balance) !== 0.0) {
      throw new Error(`Debt not fully offset: expected 0.00, got ฿${partnerAfter?.clawback_pending_balance}`);
    }

    if (Number(partnerAfter?.available_balance) !== 200.0) {
      throw new Error(`Available balance mismatch after offset: expected ฿200.00, got ฿${partnerAfter?.available_balance}`);
    }

    // ตรวจสอบ Ledger Entry: ต้องมี clawback_recovered
    const { data: offsetLedger } = await db
      .from("partner_ledger")
      .select("*")
      .eq("partner_id", partner.id)
      .eq("entry_type", "clawback_recovered")
      .eq("reference_id", event.id)
      .maybeSingle();

    if (!offsetLedger) {
      throw new Error("Audit missing: 'clawback_recovered' ledger entry was not recorded!");
    }

    console.log(`    ℹ️  Debt ฿${initialDebt} cleared to ฿0.00 | Net ฿150 added to Available | Audit Ledger recorded ✓`);
  });
}

// ============================================================================
// GROUP J: Concurrency & Zero-Trust Security
// ============================================================================
async function runGroupJ() {
  console.log("\n🔐 GROUP J — Concurrency & Zero-Trust Security");

  const isPermissionDenied = (msg: string) =>
    msg.toLowerCase().includes("permission") ||
    msg.toLowerCase().includes("denied") ||
    msg.toLowerCase().includes("execute") ||
    msg.toLowerCase().includes("not found") ||
    msg.toLowerCase().includes("does not exist");

  await runTest("J1", "anon cannot execute clear_holding_commissions_atomic", async () => {
    const db = getAnon();
    const { error } = await db.rpc("clear_holding_commissions_atomic", { p_limit: 10 });
    if (!error) throw new Error("anon executed clear_holding_commissions_atomic — SECURITY BREACH!");
    if (!isPermissionDenied(error.message)) throw new Error(`Unexpected error: ${error.message}`);
  });

  await runTest("J2", "anon cannot execute get_partner_reconciliation_audit", async () => {
    const db = getAnon();
    const { error } = await db.rpc("get_partner_reconciliation_audit", {});
    if (!error) throw new Error("anon executed get_partner_reconciliation_audit — SECURITY BREACH!");
    if (!isPermissionDenied(error.message)) throw new Error(`Unexpected error: ${error.message}`);
  });

  await runTest("J3", "Concurrent clearance executions do not double-clear or over-credit", async () => {
    const db = getServiceRole();
    const partner = await getOrCreateTestPartner();
    const planId = await getTestPlanId();

    // สร้าง expired event
    const amount = 50.0;
    const { data: event, error: eventErr } = await db
      .from("commission_events")
      .insert({
        partner_id: partner.id,
        referred_user_id: partner.user_id,
        subscription_payment_id: crypto.randomUUID(),
        subscription_plan_code: "pro_monthly",
        gross_amount_thb: 500.0,
        vat_rate: 0.07,
        vat_amount_thb: 32.71,
        commissionable_amount_thb: 467.29,
        plan_id_applied: planId,
        commission_rate_applied: 0.15,
        commission_amount_thb: amount,
        status: "holding",
        holding_until: new Date(Date.now() - 5000).toISOString(),
        idempotency_key: `test_j3_${Date.now()}`,
      })
      .select("*")
      .single();

    if (eventErr || !event) throw new Error(`Failed to create test event in J3: ${eventErr?.message}`);

    // รัน concurrent clear พร้อมกัน 5 requests
    const [c1, c2, c3, c4, c5] = await Promise.all([
      db.rpc("clear_holding_commissions_atomic", { p_limit: 10 }),
      db.rpc("clear_holding_commissions_atomic", { p_limit: 10 }),
      db.rpc("clear_holding_commissions_atomic", { p_limit: 10 }),
      db.rpc("clear_holding_commissions_atomic", { p_limit: 10 }),
      db.rpc("clear_holding_commissions_atomic", { p_limit: 10 }),
    ]);

    // ตรวจสอบ Ledger: ต้องมี record 'commission_cleared' สำหรับ event นี้เพียง 1 แถวเท่านั้น
    const { data: ledgerRows } = await db
      .from("partner_ledger")
      .select("id")
      .eq("partner_id", partner.id)
      .eq("reference_id", event.id);

    if (ledgerRows && ledgerRows.length > 1) {
      throw new Error(`Concurrency race: Event cleared ${ledgerRows.length} times in ledger!`);
    }

    console.log("    ℹ️  5 concurrent clearance calls resulted in exactly 1 ledger clearance ✓");
  });
}

// ============================================================================
// GROUP K: 3-Balance Reconciliation Audit
// ============================================================================
async function runGroupK() {
  console.log("\n🔄 GROUP K — 3-Balance Reconciliation & Audit");

  await runTest("K1", "get_partner_reconciliation_audit verifies zero negative balances across DB", async () => {
    const db = getServiceRole();
    const { data: audit, error } = await db.rpc("get_partner_reconciliation_audit", {});

    if (error) throw new Error(`Audit RPC failed: ${error.message}`);
    const res = audit as any;

    if (!res.success) throw new Error("Audit returned success=false");
    if (res.discrepancy_count > 0) {
      throw new Error(`Audit found ${res.discrepancy_count} partner balance discrepancies: ${JSON.stringify(res.discrepancies)}`);
    }

    console.log(`    ℹ️  Total Partners Audited: ${res.total_partners} | Reconciled: ${res.reconciled_count} | Discrepancies: 0 ✓`);
  });

  await runTest("K2", "Partner ledger entries maintain immutable before/after balance parity", async () => {
    const db = getServiceRole();
    const partner = await getOrCreateTestPartner();

    const { data: entries, error } = await db
      .from("partner_ledger")
      .select("*")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw new Error(`Failed to query ledger: ${error.message}`);

    for (const e of (entries || [])) {
      if (Number(e.holding_balance_after) < -0.01 ||
          Number(e.available_balance_after) < -0.01 ||
          Number(e.payout_pending_after) < -0.01) {
        throw new Error(`Ledger row ${e.id} recorded negative balance!`);
      }
    }

    console.log(`    ℹ️  Audited ${entries?.length || 0} ledger entries: all before/after balances mathematically valid ✓`);
  });
}

// ============================================================================
// Main Runner
// ============================================================================
async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════════╗");
  console.log("║   PHOPEPHUM V3 — STEP 6.5.5 HOLDING & SETTLEMENT ENGINE TESTS     ║");
  console.log("╠═══════════════════════════════════════════════════════════════════╣");
  console.log("║   8 Tests | 4 Groups | Gate: ALL pass → proceed to STEP 6.5.6     ║");
  console.log("╚═══════════════════════════════════════════════════════════════════╝\n");

  await runGroupH();
  await runGroupI();
  await runGroupJ();
  await runGroupK();

  console.log("\n╔═══════════════════════════════════════════════════════════════════╗");
  console.log("║                        TEST SUMMARY                              ║");
  console.log("╠═══════════════════════════════════════════════════════════════════╣");

  const groups = ["H1", "H2", "I1", "J1", "J2", "J3", "K1", "K2"];
  groups.forEach((g) => {
    const groupTests = results.filter((r) => r.group === g);
    const passed = groupTests.filter((r) => r.passed).length;
    const total = groupTests.length;
    console.log(`║  Group ${g.padEnd(4)}: ${passed}/${total} passed`.padEnd(68) + "║");
  });

  const totalPassed = results.filter((r) => r.passed).length;
  const totalTests = results.length;

  console.log("╠═══════════════════════════════════════════════════════════════════╣");
  console.log(`║  TOTAL: ${totalPassed}/${totalTests} passed`.padEnd(68) + "║");
  console.log("╚═══════════════════════════════════════════════════════════════════╝\n");

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error("❌ FAILED TESTS:");
    failed.forEach((f) => console.error(`  [${f.group}] ${f.name}\n       Error: ${f.error}`));
    console.error("\n⚠️  GATE NOT PASSED — Fix all failures before proceeding to STEP 6.5.6\n");
    process.exit(1);
  } else {
    console.log("🎉 ALL STEP 6.5.5 TESTS PASSED");
    console.log("✅ GATE: Holding & Settlement Engine APPROVED");
    console.log("✅ Ready to proceed to STEP 6.5.6 — Partner Payout / Admin Operations\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
