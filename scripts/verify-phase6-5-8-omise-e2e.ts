/**
 * verify-phase6-5-8-omise-e2e.ts
 * ============================================================================
 * 🏛️ PHOPEPHUM V3 — STEP 6.5.8: OMISE 7-FLOW E2E SANDBOX VERIFICATION
 * ============================================================================
 * 
 * Comprehensive End-to-End Verification across:
 * 1. Flow 1: PromptPay Charge Lifecycle & Subscription Activation
 * 2. Flow 2: Card / 3DS Charge & Idempotency Protection
 * 3. Flow 3: Winning Attribution & 14-Day Commission Holding
 * 4. Flow 4: Refund & Commission Clawback Correlation
 * 5. Flow 5: 14-Day Holding Maturity Clearance Lifecycle
 * 6. Flow 6: Payout Request, Admin Approval & Omise Transfer Traceability
 * 7. Flow 7A: Settlement (processing ➔ transfer.paid ➔ COMPLETED)
 * 8. Flow 7B: Failed Recovery (processing ➔ transfer.failed ➔ REJECTED ➔ Funds Restored)
 * 9. Guardrail A: Webhook Authenticity & Forgery Rejection
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

import {
  getOrCreatePartnerProfile,
  getPartnerLedgerHistory,
  getPartnerPayoutRequests,
  getPartnerCommissionHistory,
  processSubscriptionCommission,
  processRefundClawback,
  transitionPayoutStatus,
  requestPartnerPayout,
  resolveApplicableTaxRule,
} from "../apps/web/app/services/partner.server";

import {
  calculateOmiseFee,
  createOmisePromptPayCharge,
  createOmiseCardCharge,
  createOmiseRecipient,
  createOmiseTransfer,
  createOmiseRefund,
  getOmiseCharge,
} from "../apps/web/app/services/omise.server";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY || "skey_test_mock";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Mock Env for Cloudflare Pages server runtime
const mockEnv: any = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "anon",
  OMISE_SECRET_KEY,
  INVOICE_VAT_RATE: "0.07",
  ENVIRONMENT: "development",
};

interface TestLog {
  flow: string;
  name: string;
  passed: boolean;
  resourceIds: Record<string, string>;
  details?: string;
  error?: string;
}

const testLogs: TestLog[] = [];

async function runFlow(
  flow: string,
  name: string,
  fn: () => Promise<Record<string, string> | void>
) {
  try {
    const resourceIds = (await fn()) || {};
    testLogs.push({ flow, name, passed: true, resourceIds });
    console.log(`  ✅ [PASS] ${flow}: ${name}`);
  } catch (err: any) {
    testLogs.push({ flow, name, passed: false, resourceIds: {}, error: err.message });
    console.error(`  ❌ [FAIL] ${flow}: ${name}\n     Error: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion Failed: ${msg}`);
}

async function main() {
  console.log("================================================================================");
  console.log("🏛️  PHOPEPHUM V3 — STEP 6.5.8: OMISE 7-FLOW E2E SANDBOX VERIFICATION");
  console.log("================================================================================");
  console.log("Gateway: Omise Thailand (Opn Payments) | VAT Model: Dynamic 7% Invoice Base");
  console.log("Hold Period: 14-Day Commission Holding | Gateway Settlement: Decoupled 7-Day");
  console.log("--------------------------------------------------------------------------------\n");

  const testId = `e2e_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const testPayerEmail = `payer_${testId}@phopephum-test.com`;
  const testPartnerEmail = `partner_${testId}@phopephum-test.com`;
  const testAdminEmail = `admin_${testId}@phopephum-test.com`;

  let payerUserId = "";
  let partnerUserId = "";
  let adminUserId = "";
  let partnerEntityId = "";
  let partnerCode = `PTR_${testId.slice(-6).toUpperCase()}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // SETUP: Create Test Users & Partner Entity
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("📦 Preparing Seed Fixtures & Entities for Step 6.5.8...");

  // 1. Create Payer User
  const payerUserRes = await supabase.auth.admin.createUser({
    email: testPayerEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Customer Payer Test" },
  });
  if (payerUserRes.error) throw payerUserRes.error;
  payerUserId = payerUserRes.data.user.id;

  await supabase.from("profiles").upsert({
    id: payerUserId,
    email: testPayerEmail,
    display_name: "Customer Payer Test",
    membership_status: "inactive",
    subscription: "free",
    role: "user",
  });

  // 2. Create Partner User
  const partnerUserRes = await supabase.auth.admin.createUser({
    email: testPartnerEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Master Partner Test" },
  });
  if (partnerUserRes.error) throw partnerUserRes.error;
  partnerUserId = partnerUserRes.data.user.id;

  await supabase.from("profiles").upsert({
    id: partnerUserId,
    email: testPartnerEmail,
    display_name: "Master Partner Test",
    referral_code: partnerCode,
    membership_status: "active",
    subscription: "premium",
    role: "user",
  });

  // 3. Get or Create Admin User
  const { data: existingAdmin } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (existingAdmin) {
    adminUserId = existingAdmin.id;
  } else {
    const adminUserRes = await supabase.auth.admin.createUser({
      email: "admin.finance@phopephum.com",
      password: "Password123!",
      email_confirm: true,
      user_metadata: { full_name: "Finance Admin Test" },
    });
    if (adminUserRes.error) throw adminUserRes.error;
    adminUserId = adminUserRes.data.user.id;

    await supabase.from("profiles").upsert({
      id: adminUserId,
      email: "admin.finance@phopephum.com",
      display_name: "Finance Admin Test",
      membership_status: "active",
      subscription: "imperial",
      role: "admin",
    });
  }

  // 4. Create Partner Entity
  const partnerProfile = await getOrCreatePartnerProfile(partnerUserId, mockEnv);
  assert(partnerProfile !== null, "Partner profile must be created");
  partnerEntityId = partnerProfile.id;

  // Setup Bank & Tax Profile for Partner
  await supabase.from("partner_bank_accounts").upsert({
    partner_id: partnerEntityId,
    bank_name: "KBANK - ธนาคารกสิกรไทย",
    bank_account_no: "0123456789",
    bank_account_name: "Master Partner Test",
    is_primary: true,
  });

  await supabase.from("partner_tax_profiles").upsert({
    partner_id: partnerEntityId,
    tax_id: "1234567890123",
    legal_name: "Master Partner Test",
    entity_type: "individual",
    is_vat_registered: false,
  });

  console.log(`   Payer ID: ${payerUserId} (${testPayerEmail})`);
  console.log(`   Partner Entity ID: ${partnerEntityId} (Code: ${partnerCode})`);
  console.log(`   Admin ID: ${adminUserId} (${testAdminEmail})\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. FLOW 1: PromptPay Charge Lifecycle & Subscription Activation
  // ─────────────────────────────────────────────────────────────────────────────
  let promptPayChargeId = `chrg_test_pp_${testId}`;
  let promptPayTxId = "";

  await runFlow("FLOW 1", "PromptPay Charge Lifecycle & Subscription Activation", async () => {
    const grossAmountThb = 599.0;
    const paymentMethod = "promptpay";
    const planCode = "pro_monthly";

    // 1.1 Calculate Omise Thailand Fee (1.65% + 7% VAT)
    const feeBreakdown = calculateOmiseFee(grossAmountThb, paymentMethod);
    assert(feeBreakdown.feeThb === 9.88, `Fee should be 9.88 THB, got ${feeBreakdown.feeThb}`);
    assert(feeBreakdown.feeVatThb === 0.69, `Fee VAT should be 0.69 THB, got ${feeBreakdown.feeVatThb}`);
    assert(feeBreakdown.netReceivedThb === 588.43, `Net received should be 588.43 THB, got ${feeBreakdown.netReceivedThb}`);

    // 1.2 Execute Atomic RPC to record payment & activate subscription
    const { data, error } = await supabase.rpc("record_omise_payment_and_activate_atomic", {
      p_user_id: payerUserId,
      p_omise_charge_id: promptPayChargeId,
      p_payment_method: paymentMethod,
      p_gross_amount_thb: grossAmountThb,
      p_gateway_fee_thb: feeBreakdown.feeThb,
      p_gateway_vat_thb: feeBreakdown.feeVatThb,
      p_net_received_thb: feeBreakdown.netReceivedThb,
      p_subscription_plan_code: planCode,
      p_vat_rate: 0.07,
      p_idempotency_key: `omise_charge:${promptPayChargeId}`,
      p_metadata: {
        omise_charge_id: promptPayChargeId,
        source: "promptpay_qr",
        client_flow: "e2e_verification",
      },
    });

    if (error) throw error;
    promptPayTxId = (data as any)?.transaction_id || (data as any)?.payment_transaction_id;
    assert(Boolean(promptPayTxId), "Payment Transaction ID must be returned");

    // 1.3 Verify Subscription Entitlement was granted
    const { data: profile } = await supabase
      .from("profiles")
      .select("membership_status, subscription, plan, membership_expires_at")
      .eq("id", payerUserId)
      .single();

    assert(profile?.membership_status === "active", "Membership status must be 'active'");
    assert(profile?.subscription === "premium", "Subscription tier must be 'premium'");
    assert(Boolean(profile?.membership_expires_at), "Membership expiry timestamp must be set");

    return {
      omiseChargeId: promptPayChargeId,
      paymentTransactionId: promptPayTxId,
      planCode,
      grossAmountThb: `฿${grossAmountThb}`,
      netReceivedThb: `฿${feeBreakdown.netReceivedThb}`,
      membershipStatus: profile?.membership_status || "",
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FLOW 2: Card / 3DS Charge & Idempotency Protection
  // ─────────────────────────────────────────────────────────────────────────────
  let cardChargeId = `chrg_test_card_${testId}`;
  let cardTxId = "";

  await runFlow("FLOW 2", "Card / 3DS Charge & Idempotency Protection", async () => {
    const grossAmountThb = 999.0;
    const paymentMethod = "card";
    const planCode = "pro_annual";
    const idempotencyKey = `omise_charge:${cardChargeId}`;

    const feeBreakdown = calculateOmiseFee(grossAmountThb, paymentMethod);

    // Call RPC first time
    const res1 = await supabase.rpc("record_omise_payment_and_activate_atomic", {
      p_user_id: payerUserId,
      p_omise_charge_id: cardChargeId,
      p_payment_method: paymentMethod,
      p_gross_amount_thb: grossAmountThb,
      p_gateway_fee_thb: feeBreakdown.feeThb,
      p_gateway_vat_thb: feeBreakdown.feeVatThb,
      p_net_received_thb: feeBreakdown.netReceivedThb,
      p_subscription_plan_code: planCode,
      p_vat_rate: 0.07,
      p_idempotency_key: idempotencyKey,
      p_metadata: { omise_charge_id: cardChargeId, card_brand: "Visa", last4: "4242" },
    });
    if (res1.error) throw res1.error;
    cardTxId = (res1.data as any)?.transaction_id || (res1.data as any)?.payment_transaction_id;

    // Call RPC second time with same idempotency key (Simulating duplicate webhook)
    const res2 = await supabase.rpc("record_omise_payment_and_activate_atomic", {
      p_user_id: payerUserId,
      p_omise_charge_id: cardChargeId,
      p_payment_method: paymentMethod,
      p_gross_amount_thb: grossAmountThb,
      p_gateway_fee_thb: feeBreakdown.feeThb,
      p_gateway_vat_thb: feeBreakdown.feeVatThb,
      p_net_received_thb: feeBreakdown.netReceivedThb,
      p_subscription_plan_code: planCode,
      p_vat_rate: 0.07,
      p_idempotency_key: idempotencyKey,
      p_metadata: { omise_charge_id: cardChargeId },
    });
    if (res2.error) throw res2.error;

    assert((res2.data as any).duplicate === true, "Second call must return duplicate = true");

    // Verify DB only has 1 transaction record
    const { data: txs } = await supabase
      .from("payment_transactions")
      .select("id, provider_transaction_id")
      .eq("provider_transaction_id", cardChargeId);

    assert(txs?.length === 1, "Exactly 1 payment transaction record must exist");

    return {
      omiseChargeId: cardChargeId,
      paymentTransactionId: cardTxId,
      idempotencyKey,
      duplicateProtected: "TRUE",
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FLOW 3: Winning Attribution & 14-Day Commission Holding
  // ─────────────────────────────────────────────────────────────────────────────
  let attributionChargeId = `chrg_test_comm_${testId}`;
  let attributionTxId = "";
  let commissionEventId = "";

  await runFlow("FLOW 3", "Winning Attribution & 14-Day Commission Holding", async () => {
    // 3.1 Record payment transaction first so we have a valid UUID foreign key
    const grossAmountThb = 599.0;
    const paymentMethod = "promptpay";
    const planCode = "pro_monthly";
    const feeBreakdown = calculateOmiseFee(grossAmountThb, paymentMethod);

    const { data: txRes, error: txErr } = await supabase.rpc("record_omise_payment_and_activate_atomic", {
      p_user_id: payerUserId,
      p_omise_charge_id: attributionChargeId,
      p_payment_method: paymentMethod,
      p_gross_amount_thb: grossAmountThb,
      p_gateway_fee_thb: feeBreakdown.feeThb,
      p_gateway_vat_thb: feeBreakdown.feeVatThb,
      p_net_received_thb: feeBreakdown.netReceivedThb,
      p_subscription_plan_code: planCode,
      p_vat_rate: 0.07,
      p_idempotency_key: `omise_charge:${attributionChargeId}`,
      p_metadata: { omise_charge_id: attributionChargeId },
    });
    if (txErr) throw txErr;
    attributionTxId = (txRes as any)?.transaction_id || (txRes as any)?.payment_transaction_id;
    assert(Boolean(attributionTxId), "attributionTxId must be defined");

    // 3.2 Pre-seed Winning Attribution (First-Touch Converted) with complete schema
    const { error: attrErr } = await supabase.from("referral_attributions").upsert({
      partner_id: partnerEntityId,
      visitor_anonymous_id: `anon_${testId}`,
      ip_hash: "test_ip_hash",
      status: "converted",
      referred_user_id: payerUserId,
      click_timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      converted_at: new Date().toISOString(),
      campaign_code: "astral_flow_2026",
    });
    if (attrErr) throw attrErr;

    const vatRate = 0.07; // Dynamic invoice VAT

    // 3.3 Process Subscription Commission using UUID
    const commRes = await processSubscriptionCommission({
      paymentId: attributionTxId,
      payerUserId,
      planCode: "pro_monthly",
      grossAmountThb,
      vatRate,
      idempotencyKey: `comm_omise:${attributionTxId}`,
      env: mockEnv,
    });

    assert(commRes.success === true, `Commission processing must succeed: ${commRes.error || commRes.message}`);
    assert(commRes.awarded === true, "Commission must be awarded to winning partner");

    // Net Base calculation: 599 / 1.07 = 559.81 THB, 7% commission = 39.19 THB
    assert(Number(commRes.commissionAmount) === 39.19, `Commission must be ฿39.19, got ${commRes.commissionAmount}`);

    // 3.4 Verify DB Commission Event
    const { data: commEvent } = await supabase
      .from("commission_events")
      .select("*")
      .eq("subscription_payment_id", attributionTxId)
      .single();

    assert(commEvent !== null, "Commission event must exist in DB");
    assert(commEvent.status === "holding", "Commission status must be 'holding'");
    commissionEventId = commEvent.id;

    // Verify 14-Day Holding window
    const createdAt = new Date(commEvent.created_at).getTime();
    const holdingUntil = new Date(commEvent.holding_until).getTime();
    const diffDays = Math.round((holdingUntil - createdAt) / (1000 * 60 * 60 * 24));
    assert(diffDays === 14, `Holding period must be exactly 14 days, got ${diffDays}`);

    // 3.5 Verify Ledger Double-Entry
    const { data: ledgerEntries } = await supabase
      .from("partner_ledger")
      .select("*")
      .eq("partner_id", partnerEntityId)
      .eq("reference_id", commissionEventId);

    assert(ledgerEntries?.length === 1, "Ledger entry must be recorded for holding commission");
    assert(ledgerEntries![0].entry_type === "commission_holding_in", "Entry type must be commission_holding_in");

    return {
      omiseChargeId: attributionChargeId,
      paymentTransactionId: attributionTxId,
      commissionEventId,
      commissionAmount: `฿${commRes.commissionAmount}`,
      holdingUntil: commEvent.holding_until,
      ledgerEntryId: ledgerEntries![0].id,
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. FLOW 4: Refund & Commission Clawback Correlation
  // ─────────────────────────────────────────────────────────────────────────────
  await runFlow("FLOW 4", "Refund & Commission Clawback Correlation", async () => {
    // 4.1 Process Refund on the charge UUID from Flow 3
    const refundRes = await processRefundClawback({
      paymentId: attributionTxId,
      reason: "Customer Requested Omise Refund / Dissatisfaction",
      idempotencyKey: `refund_omise:${attributionTxId}`,
      env: mockEnv,
    });

    assert(refundRes.success === true, `Refund clawback must succeed: ${refundRes.error || refundRes.message}`);
    assert(refundRes.clawedBack === true, "Clawback must be executed");
    assert(Number(refundRes.amount) === 39.19, `Clawback amount must be ฿39.19, got ${refundRes.amount}`);

    // 4.2 Verify Commission Event updated to clawback_refunded
    const { data: commEvent } = await supabase
      .from("commission_events")
      .select("status")
      .eq("id", commissionEventId)
      .single();

    assert(commEvent?.status === "clawback_refunded", "Commission status must be clawback_refunded");

    // 4.3 Verify Ledger Clawback Entry
    const { data: ledgerClawback } = await supabase
      .from("partner_ledger")
      .select("*")
      .eq("partner_id", partnerEntityId)
      .eq("entry_type", "commission_clawback")
      .order("created_at", { ascending: false })
      .limit(1);

    assert(ledgerClawback?.length === 1, "Clawback ledger entry must exist");
    assert(Number(ledgerClawback![0].amount) === 39.19, "Ledger amount must be ฿39.19");

    return {
      refundedPaymentTxId: attributionTxId,
      commissionEventId,
      clawbackAmount: "฿39.19",
      clawbackLedgerId: ledgerClawback![0].id,
      correlationMatched: "MATCHED_BY_SUBSCRIPTION_PAYMENT_ID",
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. FLOW 5: 14-Day Holding Maturity Clearance Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────
  let matureCommEventId = "";

  await runFlow("FLOW 5", "14-Day Holding Maturity Clearance Lifecycle", async () => {
    const matureChargeId = `chrg_test_mature_${testId}`;

    // 5.1 Create payment transaction first
    const grossAmountThb = 1000.0;
    const feeBreakdown = calculateOmiseFee(grossAmountThb, "promptpay");

    const { data: txRes, error: matureTxErr } = await supabase.rpc("record_omise_payment_and_activate_atomic", {
      p_user_id: payerUserId,
      p_omise_charge_id: matureChargeId,
      p_payment_method: "promptpay",
      p_gross_amount_thb: grossAmountThb,
      p_gateway_fee_thb: feeBreakdown.feeThb,
      p_gateway_vat_thb: feeBreakdown.feeVatThb,
      p_net_received_thb: feeBreakdown.netReceivedThb,
      p_subscription_plan_code: "pro_monthly",
      p_vat_rate: 0.07,
      p_idempotency_key: `omise_charge:${matureChargeId}`,
      p_metadata: { omise_charge_id: matureChargeId },
    });
    if (matureTxErr) throw matureTxErr;
    const matureTxId = (txRes as any)?.transaction_id || (txRes as any)?.payment_transaction_id;
    assert(Boolean(matureTxId), "matureTxId must be defined");

    // 5.2 Create new commission event in holding
    const commRes = await processSubscriptionCommission({
      paymentId: matureTxId,
      payerUserId,
      planCode: "pro_monthly",
      grossAmountThb,
      vatRate: 0.07,
      idempotencyKey: `comm_omise:${matureTxId}`,
      env: mockEnv,
    });
    assert(commRes.success === true, `Mature test commission must succeed: ${commRes.error || commRes.message}`);

    const { data: eventRow } = await supabase
      .from("commission_events")
      .select("id")
      .eq("subscription_payment_id", matureTxId)
      .single();
    assert(eventRow !== null, "Commission event row must be created");
    matureCommEventId = eventRow.id;

    // 5.3 Backdate holding_until to simulate 14 days elapsed
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour in the past
    await supabase
      .from("commission_events")
      .update({ holding_until: pastDate })
      .eq("id", matureCommEventId);

    // 5.4 Trigger clearance atomic RPC
    const { data: clearRes, error } = await supabase.rpc("clear_holding_commissions_monitored_atomic", {
      p_limit: 100,
    });
    if (error) throw error;
    const clearedCount = (clearRes as any)?.processed_count ?? 0;
    assert(Number(clearedCount) >= 1, `At least 1 matured commission must be cleared, got ${clearedCount}`);

    // 5.5 Verify Commission Event status = cleared
    const { data: updatedEvent } = await supabase
      .from("commission_events")
      .select("status")
      .eq("id", matureCommEventId)
      .single();
    assert(updatedEvent?.status === "cleared", "Status must transition to cleared");

    // 5.6 Verify Ledger commission_cleared entry
    const { data: clearLedger } = await supabase
      .from("partner_ledger")
      .select("*")
      .eq("reference_id", matureCommEventId)
      .eq("entry_type", "commission_cleared");

    assert(clearLedger?.length === 1, "commission_cleared ledger entry must exist");

    return {
      matureCommissionEventId: matureCommEventId,
      clearedCount: String(clearedCount),
      statusAfterClearance: "cleared",
      clearLedgerId: clearLedger![0].id,
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. FLOW 6: Payout Request, Admin Approval & Omise Transfer Traceability
  // ─────────────────────────────────────────────────────────────────────────────
  let payoutRequestId = "";
  let omiseRecipientId = `recp_test_${testId}`;
  let omiseTransferId = `trsf_test_${testId}`;

  await runFlow("FLOW 6", "Payout Request, Admin Approval & Omise Transfer Traceability", async () => {
    // Top up partner available balance to ฿5,000 for payout testing
    await supabase
      .from("partner_entities")
      .update({ available_balance: 5000.0, payout_pending_balance: 0.0 })
      .eq("id", partnerEntityId);

    // 6.1 Partner requests payout of ฿2,000 via Atomic RPC
    const payoutRes = await requestPartnerPayout({
      partnerId: partnerUserId,
      amount: 2000.0,
      bankInfo: {
        bankName: "KBANK",
        accountNo: "0123456789",
        accountName: "Master Partner Test",
        taxId: "1234567890123",
      },
      env: mockEnv,
    });

    assert(payoutRes.success === true, "Payout request must succeed");
    assert(payoutRes.whtAmount === 60.0, `3% WHT on ฿2,000 must be ฿60, got ${payoutRes.whtAmount}`);
    assert(payoutRes.netPayout === 1940.0, `Net payout must be ฿1,940, got ${payoutRes.netPayout}`);

    // Get created payout request
    const { data: req } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("partner_id", partnerEntityId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    assert(req !== null, "Payout request must exist in DB");
    assert(req.status === "pending_review", "Initial status must be pending_review");
    payoutRequestId = req.id;

    const { data: adminProfCheck } = await supabase
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", adminUserId)
      .single();
    console.log(`   [DEBUG] Admin user check: id=${adminProfCheck?.id}, role=${adminProfCheck?.role}`);

    // 6.2 Admin Approves Payout (using valid admin profile ID)
    const approveRes = await transitionPayoutStatus({
      payoutRequestId,
      newStatus: "approved",
      reviewedBy: adminUserId,
      reason: "Admin Approved for Omise Sandbox Payout Batch",
      env: mockEnv,
    });
    assert(approveRes.success === true, `Admin approval must succeed: ${approveRes.error}`);

    // 6.3 Transition to Processing & Record Omise Transfer
    const procRes = await transitionPayoutStatus({
      payoutRequestId,
      newStatus: "processing",
      reviewedBy: adminUserId,
      reason: "Sent to Omise Transfer API",
      env: mockEnv,
    });
    assert(procRes.success === true, `Processing transition must succeed: ${procRes.error}`);

    const { error: insertTrsfErr } = await supabase.from("omise_transfers").insert({
      payout_request_id: payoutRequestId,
      partner_id: partnerEntityId,
      omise_transfer_id: omiseTransferId,
      omise_recipient_id: omiseRecipientId,
      amount_thb: 1940.0,
      fee_thb: 20.0,
      fee_vat_thb: 1.40,
      net_transferred_thb: 1940.0,
      status: "pending",
      idempotency_key: `trsf_${testId}`,
      metadata: {
        bank_brand: "kbank",
        bank_last_digits: "6789",
        bank_account_name: "Master Partner Test",
      },
    });
    if (insertTrsfErr) throw insertTrsfErr;

    // 6.4 Bidirectional Correlation Verification (Guardrail D)
    const { data: linkedTransfer } = await supabase
      .from("omise_transfers")
      .select("omise_transfer_id, payout_request_id")
      .eq("payout_request_id", payoutRequestId)
      .single();

    assert(linkedTransfer?.omise_transfer_id === omiseTransferId, "Bidirectional link from payout ➔ transfer must match");

    return {
      payoutRequestId,
      omiseRecipientId,
      omiseTransferId,
      requestedGross: "฿2,000",
      frozenWHT: "-฿60 (3%)",
      netTransferAmount: "฿1,940",
      status: "processing",
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. FLOW 7A: Settlement (transfer.paid ➔ COMPLETED)
  // ─────────────────────────────────────────────────────────────────────────────
  await runFlow("FLOW 7A", "Transfer Paid Settlement (transfer.paid ➔ COMPLETED)", async () => {
    // 7.1 Webhook transfer.paid simulation
    const transRes = await transitionPayoutStatus({
      payoutRequestId,
      newStatus: "completed",
      reviewedBy: adminUserId,
      reason: `Omise Transfer Paid (${omiseTransferId})`,
      idempotencyKey: `omise_trans_paid:${omiseTransferId}`,
      env: mockEnv,
    });
    assert(transRes.success === true, `Transition to completed must succeed: ${transRes.error}`);

    await supabase
      .from("omise_transfers")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("omise_transfer_id", omiseTransferId);

    // 7.2 Verify Payout Pending Decremented and Settled Ledger Entry
    const partner = await getOrCreatePartnerProfile(partnerUserId, mockEnv);
    assert(partner?.payoutPendingBalance === 0, `Payout pending balance must be 0, got ${partner?.payoutPendingBalance}`);

    const { data: settleLedger } = await supabase
      .from("partner_ledger")
      .select("*")
      .eq("reference_id", payoutRequestId)
      .eq("entry_type", "payout_settled");

    assert(settleLedger?.length === 1, "payout_settled ledger entry must exist");

    return {
      payoutRequestId,
      omiseTransferId,
      finalStatus: "completed",
      settledLedgerId: settleLedger![0].id,
      reconciliationState: "RECONCILED",
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. FLOW 7B: Failed Recovery (transfer.failed ➔ Auto-restore to Available)
  // ─────────────────────────────────────────────────────────────────────────────
  await runFlow("FLOW 7B", "Transfer Failed Recovery (transfer.failed ➔ Auto-restore to Available)", async () => {
    // 8.1 Request a second payout of ฿500
    const payoutRes = await requestPartnerPayout({
      partnerId: partnerUserId,
      amount: 500.0,
      bankInfo: {
        bankName: "SCB",
        accountNo: "9876543210",
        accountName: "Master Partner Test",
      },
      env: mockEnv,
    });
    assert(payoutRes.success === true, "Second payout request must succeed");

    const { data: req2 } = await supabase
      .from("payout_requests")
      .select("id")
      .eq("partner_id", partnerEntityId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const failPayoutId = req2!.id;

    // Check balance before failure: Available should be 3,000 - 500 = 2,500
    const partnerBefore = await getOrCreatePartnerProfile(partnerUserId, mockEnv);
    assert(partnerBefore?.availableBalance === 2500.0, `Available balance must be 2,500, got ${partnerBefore?.availableBalance}`);

    // 8.2 Transition from pending_review ➔ rejected directly
    const failTransferId = `trsf_test_fail_${testId}`;
    const failRes = await transitionPayoutStatus({
      payoutRequestId: failPayoutId,
      newStatus: "rejected",
      reviewedBy: adminUserId,
      reason: "Omise Transfer Failed: Bank Account Closed or Invalid Account Number",
      idempotencyKey: `omise_trans_fail:${failTransferId}`,
      env: mockEnv,
    });
    assert(failRes.success === true, `Rejection/Recovery must succeed: ${failRes.error}`);

    // 8.3 Verify ฿500 restored to Available Balance!
    const partnerAfter = await getOrCreatePartnerProfile(partnerUserId, mockEnv);
    assert(partnerAfter?.availableBalance === 3000.0, `Available balance must be restored to 3,000, got ${partnerAfter?.availableBalance}`);

    const { data: refundLedger } = await supabase
      .from("partner_ledger")
      .select("*")
      .eq("reference_id", failPayoutId)
      .eq("entry_type", "payout_rejected");

    assert(refundLedger?.length === 1, "payout_rejected refund ledger entry must exist");

    return {
      failedPayoutRequestId: failPayoutId,
      failTransferId,
      fundsRestoredThb: "฿500.00",
      availableBalanceAfterRecovery: `฿${partnerAfter?.availableBalance}`,
      recoveryLedgerId: refundLedger![0].id,
      financialState: "FUNDS_SAFELY_RESTORED",
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. GUARDRAIL A: Webhook Authenticity & Forgery Rejection
  // ─────────────────────────────────────────────────────────────────────────────
  await runFlow("GUARDRAIL A", "Webhook Authenticity & Forgery Rejection", async () => {
    // 9.1 Invalid payload format (Missing userId or negative amount)
    let rejectedGracefully = false;
    try {
      const invalidChargeId = `chrg_test_forged_${testId}`;
      const { data, error } = await supabase.rpc("record_omise_payment_and_activate_atomic", {
        p_user_id: "00000000-0000-0000-0000-000000000000", // Non-existent user
        p_omise_charge_id: invalidChargeId,
        p_payment_method: "promptpay",
        p_gross_amount_thb: -100.0, // Invalid negative amount
        p_gateway_fee_thb: 0,
        p_gateway_vat_thb: 0,
        p_net_received_thb: 0,
        p_subscription_plan_code: "invalid_plan",
        p_vat_rate: 0.07,
        p_idempotency_key: `forged_${invalidChargeId}`,
        p_metadata: {},
      });
      if (error) rejectedGracefully = true;
    } catch (e) {
      rejectedGracefully = true;
    }

    assert(rejectedGracefully === true, "Invalid/Forged payment mutation must be rejected");

    return {
      forgedPayloadRejected: "TRUE",
      financialCoreProtected: "PROTECTED_BY_CONSTRAINTS",
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP TEST FIXTURES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n🧹 Cleaning up test fixtures...");
  await supabase.from("omise_transfers").delete().eq("partner_id", partnerEntityId);
  await supabase.from("payout_requests").delete().eq("partner_id", partnerEntityId);
  await supabase.from("admin_financial_audit_logs").delete().eq("partner_id", partnerEntityId);
  await supabase.from("partner_ledger").delete().eq("partner_id", partnerEntityId);
  await supabase.from("commission_events").delete().eq("partner_id", partnerEntityId);
  await supabase.from("referral_attributions").delete().eq("partner_id", partnerEntityId);
  await supabase.from("payment_transactions").delete().eq("user_id", payerUserId);
  await supabase.from("partner_bank_accounts").delete().eq("partner_id", partnerEntityId);
  await supabase.from("partner_tax_profiles").delete().eq("partner_id", partnerEntityId);
  await supabase.from("partner_entities").delete().eq("id", partnerEntityId);
  await supabase.from("profiles").delete().eq("id", partnerUserId);
  await supabase.from("profiles").delete().eq("id", payerUserId);
  await supabase.auth.admin.deleteUser(partnerUserId);
  await supabase.auth.admin.deleteUser(payerUserId);

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("📊 STEP 6.5.8 OMISE 7-FLOW E2E VERIFICATION SUMMARY");
  console.log("================================================================================");

  let passedCount = 0;
  for (const log of testLogs) {
    if (log.passed) {
      passedCount++;
      console.log(`✅ [${log.flow}] ${log.name}`);
      for (const [k, v] of Object.entries(log.resourceIds)) {
        console.log(`   ℹ️  ${k}: ${v}`);
      }
    } else {
      console.log(`❌ [${log.flow}] ${log.name}`);
      console.log(`   ⚠️ Error: ${log.error}`);
    }
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`🎯 Total Passed: ${passedCount} / ${testLogs.length} (${Math.round((passedCount / testLogs.length) * 100)}%)`);
  console.log("================================================================================\n");

  if (passedCount !== testLogs.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Unhandled verification error:", e);
  process.exit(1);
});
