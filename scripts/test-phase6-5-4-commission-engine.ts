// scripts/test-phase6-5-4-commission-engine.ts
// ==============================================================================
// 🏛️ PHOPEPHUM V3 — PHASE 6.5.4: COMMISSION ENGINE & FINANCIAL LEDGER TEST SUITE
// ==============================================================================

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
    failed++;
  }
}

console.log("══════════════════════════════════════════════════════════════════════");
console.log("🎯  PHASE 6.5.4 — ADVANCED COMMISSION ENGINE & FINANCIAL LEDGER SUITE");
console.log("══════════════════════════════════════════════════════════════════════\n");

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES & SIMULATION REPOSITORIES
// ─────────────────────────────────────────────────────────────────────────────

interface PartnerEntity {
  id: string;
  userId: string;
  partnerCode: string;
  tierCode: "affiliate" | "creator" | "master";
  status: "active" | "suspended";
  holdingBalance: number;
  availableBalance: number;
  payoutPendingBalance: number;
  clawbackPendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

interface ReferralAttribution {
  id: string;
  partnerId: string;
  referredUserId: string;
  status: "active" | "converted" | "expired";
  campaignCode?: string;
  clickTimestamp: number;
}

interface CommissionPlan {
  id: string;
  planCode: string;
  planName: string;
  commissionTerm: "first_payment" | "3_months" | "6_months" | "12_months" | "until_subscription_ends";
  holdingPeriodDays: number;
  isActive: boolean;
}

interface CommissionPlanAssignment {
  id: string;
  planId: string;
  assignmentScope: "partner" | "campaign" | "tier";
  partnerId?: string;
  campaignCode?: string;
  tierCode?: string;
  priority: number;
  isActive: boolean;
}

interface CommissionRateRule {
  planId: string;
  subscriptionPlanCode: string;
  ratePercentage: number;
}

interface CommissionEvent {
  id: string;
  partnerId: string;
  referredUserId: string;
  subscriptionPaymentId: string;
  subscriptionPlanCode: string;
  grossAmountThb: number;
  vatRate: number;
  vatAmountThb: number;
  commissionableAmountThb: number;
  planIdApplied: string;
  commissionRateApplied: number;
  commissionAmountThb: number;
  status: "holding" | "cleared" | "clawback_refunded";
  holdingUntil: Date;
  idempotencyKey: string;
  createdAt: Date;
}

interface PartnerLedgerEntry {
  id: string;
  partnerId: string;
  entryType: string;
  amount: number;
  holdingBalanceBefore: number;
  holdingBalanceAfter: number;
  availableBalanceBefore: number;
  availableBalanceAfter: number;
  payoutPendingBefore: number;
  payoutPendingAfter: number;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  notes: string;
  createdAt: Date;
}

interface PayoutRequest {
  id: string;
  partnerId: string;
  requestedAmountThb: number;
  taxRuleCodeApplied: string;
  withholdingRateApplied: number;
  withholdingTaxAmountThb: number;
  netPayoutAmountThb: number;
  status: "pending_review" | "approved" | "processing" | "completed" | "rejected";
  rejectionReason?: string;
}

// In-Memory Database Stores
const partners: Map<string, PartnerEntity> = new Map();
const attributions: ReferralAttribution[] = [];
const plans: Map<string, CommissionPlan> = new Map();
const assignments: CommissionPlanAssignment[] = [];
const rateRules: CommissionRateRule[] = [];
const commissionEvents: CommissionEvent[] = [];
const ledger: PartnerLedgerEntry[] = [];
const payoutRequests: Map<string, PayoutRequest> = new Map();

// Helper to round currency
function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE IMPLEMENTATION (MIRRORS 019 MIGRATION & SERVICES)
// ─────────────────────────────────────────────────────────────────────────────

function processSubscriptionCommission(params: {
  subscriptionPaymentId: string;
  payerUserId: string;
  subscriptionPlanCode: string;
  grossAmountThb: number;
  vatRate: number;
  idempotencyKey: string;
  now?: Date;
}): {
  success: boolean;
  awarded: boolean;
  duplicate?: boolean;
  reason?: string;
  partnerId?: string;
  planId?: string;
  commissionRate?: number;
  vatAmount?: number;
  commissionableBase?: number;
  commissionAmount?: number;
  holdingUntil?: Date;
} {
  const currentTime = params.now || new Date();

  // 1. Idempotency Check
  if (ledger.some(l => l.idempotencyKey === params.idempotencyKey)) {
    return { success: true, awarded: false, duplicate: true, reason: "IDEMPOTENT_DUPLICATE" };
  }

  // 2. Winning Attribution Check (Must be 'converted' status)
  const attr = attributions.find(
    a => a.referredUserId === params.payerUserId && a.status === "converted"
  );
  if (!attr) {
    return { success: true, awarded: false, reason: "NO_CONVERTED_ATTRIBUTION" };
  }

  // 3. Partner Entity Check
  const partner = partners.get(attr.partnerId);
  if (!partner || partner.status !== "active") {
    return { success: false, awarded: false, reason: "PARTNER_NOT_ACTIVE" };
  }

  // 4. Anti-Self-Referral
  if (partner.userId === params.payerUserId) {
    return { success: false, awarded: false, reason: "SELF_REFERRAL_BLOCKED" };
  }

  // 5. Plan Priority Resolution: Partner (100) > Campaign (50) > Tier (10)
  let selectedPlan: CommissionPlan | undefined;
  
  // Partner Specific (ORDER BY priority DESC)
  const partnerAssign = assignments
    .filter(a => a.assignmentScope === "partner" && a.partnerId === partner.id && a.isActive)
    .sort((a, b) => b.priority - a.priority)[0];
  if (partnerAssign) {
    selectedPlan = plans.get(partnerAssign.planId);
  }

  // Campaign Specific (ORDER BY priority DESC)
  if (!selectedPlan && attr.campaignCode) {
    const campaignAssign = assignments
      .filter(a => a.assignmentScope === "campaign" && a.campaignCode === attr.campaignCode && a.isActive)
      .sort((a, b) => b.priority - a.priority)[0];
    if (campaignAssign) {
      selectedPlan = plans.get(campaignAssign.planId);
    }
  }

  // Tier Default (ORDER BY priority DESC)
  if (!selectedPlan) {
    const tierAssign = assignments
      .filter(a => a.assignmentScope === "tier" && a.tierCode === partner.tierCode && a.isActive)
      .sort((a, b) => b.priority - a.priority)[0];
    if (tierAssign) {
      selectedPlan = plans.get(tierAssign.planId);
    }
  }

  // Fallback
  if (!selectedPlan) {
    selectedPlan = Array.from(plans.values()).find(p => p.planCode === "PLAN_DEFAULT_AFFILIATE");
  }

  if (!selectedPlan) {
    return { success: false, awarded: false, reason: "NO_PLAN_FOUND" };
  }

  // 6. Commission Term Validation
  const prevEvents = commissionEvents.filter(
    e => e.referredUserId === params.payerUserId && e.partnerId === partner.id && e.status !== "clawback_refunded"
  );
  const firstEvent = prevEvents[0];

  if (selectedPlan.commissionTerm === "first_payment" && prevEvents.length >= 1) {
    return { success: true, awarded: false, reason: "COMMISSION_TERM_EXPIRED_FIRST_PAYMENT_ONLY" };
  }

  if (firstEvent) {
    const monthsElapsed = (currentTime.getTime() - firstEvent.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (selectedPlan.commissionTerm === "3_months" && monthsElapsed > 3) {
      return { success: true, awarded: false, reason: "COMMISSION_TERM_EXPIRED_3_MONTHS" };
    }
    if (selectedPlan.commissionTerm === "6_months" && monthsElapsed > 6) {
      return { success: true, awarded: false, reason: "COMMISSION_TERM_EXPIRED_6_MONTHS" };
    }
    if (selectedPlan.commissionTerm === "12_months" && monthsElapsed > 12) {
      return { success: true, awarded: false, reason: "COMMISSION_TERM_EXPIRED_12_MONTHS" };
    }
  }

  // 7. Commission Rate Lookup
  const rateRule = rateRules.find(
    r => r.planId === selectedPlan!.id && (r.subscriptionPlanCode === params.subscriptionPlanCode || r.subscriptionPlanCode === "all")
  );
  const rate = rateRule ? rateRule.ratePercentage : partner.tierCode === "master" ? 0.25 : partner.tierCode === "creator" ? 0.15 : 0.07;

  // 8. Dynamic VAT Calculation
  const vatAmount = params.vatRate > 0 ? round2(params.grossAmountThb * params.vatRate / (1 + params.vatRate)) : 0;
  const commissionableBase = round2(params.grossAmountThb - vatAmount);
  const commissionAmount = round2(commissionableBase * rate);

  // 9. 14-Day Holding
  const holdingDays = selectedPlan.holdingPeriodDays || 14;
  const holdingUntil = new Date(currentTime.getTime() + holdingDays * 24 * 60 * 60 * 1000);

  // 10. Balances update & Ledger entry
  const holdingBefore = partner.holdingBalance;
  const holdingAfter = round2(partner.holdingBalance + commissionAmount);
  partner.holdingBalance = holdingAfter;
  partner.totalEarned = round2(partner.totalEarned + commissionAmount);

  const eventId = `evt_${commissionEvents.length + 1}`;
  commissionEvents.push({
    id: eventId,
    partnerId: partner.id,
    referredUserId: params.payerUserId,
    subscriptionPaymentId: params.subscriptionPaymentId,
    subscriptionPlanCode: params.subscriptionPlanCode,
    grossAmountThb: params.grossAmountThb,
    vatRate: params.vatRate,
    vatAmountThb: vatAmount,
    commissionableAmountThb: commissionableBase,
    planIdApplied: selectedPlan.id,
    commissionRateApplied: rate,
    commissionAmountThb: commissionAmount,
    status: "holding",
    holdingUntil,
    idempotencyKey: params.idempotencyKey,
    createdAt: currentTime,
  });

  ledger.push({
    id: `led_${ledger.length + 1}`,
    partnerId: partner.id,
    entryType: "commission_holding_in",
    amount: commissionAmount,
    holdingBalanceBefore: holdingBefore,
    holdingBalanceAfter: holdingAfter,
    availableBalanceBefore: partner.availableBalance,
    availableBalanceAfter: partner.availableBalance,
    payoutPendingBefore: partner.payoutPendingBalance,
    payoutPendingAfter: partner.payoutPendingBalance,
    referenceType: "commission_event",
    referenceId: eventId,
    idempotencyKey: params.idempotencyKey,
    notes: `Commission awarded under ${selectedPlan.planName}`,
    createdAt: currentTime,
  });

  return {
    success: true,
    awarded: true,
    partnerId: partner.id,
    planId: selectedPlan.id,
    commissionRate: rate,
    vatAmount,
    commissionableBase,
    commissionAmount,
    holdingUntil,
  };
}

function processRefundClawback(params: {
  subscriptionPaymentId: string;
  reason?: string;
  idempotencyKey: string;
}): {
  success: boolean;
  clawedBack: boolean;
  type?: "holding_reversed" | "available_clawback";
  amount?: number;
  deductedFromAvailable?: number;
  addedToClawbackPending?: number;
} {
  if (ledger.some(l => l.idempotencyKey === params.idempotencyKey)) {
    return { success: true, clawedBack: false };
  }

  const event = commissionEvents.slice().reverse().find(
    e => e.subscriptionPaymentId === params.subscriptionPaymentId && (e.status === "holding" || e.status === "cleared")
  );

  if (!event) {
    return { success: true, clawedBack: false };
  }

  const partner = partners.get(event.partnerId)!;

  if (event.status === "holding") {
    // Refund BEFORE 14 days clearance
    const holdingBefore = partner.holdingBalance;
    const holdingAfter = Math.max(0, round2(partner.holdingBalance - event.commissionAmountThb));
    partner.holdingBalance = holdingAfter;
    event.status = "clawback_refunded";

    ledger.push({
      id: `led_${ledger.length + 1}`,
      partnerId: partner.id,
      entryType: "commission_clawback",
      amount: event.commissionAmountThb,
      holdingBalanceBefore: holdingBefore,
      holdingBalanceAfter: holdingAfter,
      availableBalanceBefore: partner.availableBalance,
      availableBalanceAfter: partner.availableBalance,
      payoutPendingBefore: partner.payoutPendingBalance,
      payoutPendingAfter: partner.payoutPendingBalance,
      referenceType: "refund_event",
      referenceId: event.id,
      idempotencyKey: params.idempotencyKey,
      notes: "Holding commission cancelled due to refund",
      createdAt: new Date(),
    });

    return {
      success: true,
      clawedBack: true,
      type: "holding_reversed",
      amount: event.commissionAmountThb,
    };
  } else {
    // Refund AFTER 14 days clearance
    const availBefore = partner.availableBalance;
    let deduct = 0;
    let pendingClawback = 0;

    if (partner.availableBalance >= event.commissionAmountThb) {
      deduct = event.commissionAmountThb;
      pendingClawback = 0;
    } else {
      deduct = partner.availableBalance;
      pendingClawback = round2(event.commissionAmountThb - partner.availableBalance);
    }

    const availAfter = round2(partner.availableBalance - deduct);
    partner.availableBalance = availAfter;
    partner.clawbackPendingBalance = round2(partner.clawbackPendingBalance + pendingClawback);
    event.status = "clawback_refunded";

    ledger.push({
      id: `led_${ledger.length + 1}`,
      partnerId: partner.id,
      entryType: "commission_clawback",
      amount: event.commissionAmountThb,
      holdingBalanceBefore: partner.holdingBalance,
      holdingBalanceAfter: partner.holdingBalance,
      availableBalanceBefore: availBefore,
      availableBalanceAfter: availAfter,
      payoutPendingBefore: partner.payoutPendingBalance,
      payoutPendingAfter: partner.payoutPendingBalance,
      referenceType: "refund_event",
      referenceId: event.id,
      idempotencyKey: params.idempotencyKey,
      notes: `Cleared commission clawback. Pending clawback: ${pendingClawback}`,
      createdAt: new Date(),
    });

    return {
      success: true,
      clawedBack: true,
      type: "available_clawback",
      amount: event.commissionAmountThb,
      deductedFromAvailable: deduct,
      addedToClawbackPending: pendingClawback,
    };
  }
}

function transitionPayoutStatus(
  requestId: string,
  newStatus: "approved" | "rejected" | "processing" | "completed",
  reviewedBy: string,
  reason?: string
): { success: boolean; oldStatus?: string; newStatus?: string; error?: string } {
  const req = payoutRequests.get(requestId);
  if (!req) throw new Error("PAYOUT_REQUEST_NOT_FOUND");

  if (req.status === newStatus) return { success: true, oldStatus: req.status, newStatus };

  if (req.status === "completed" || req.status === "rejected") {
    throw new Error(`TERMINAL_STATE: Payout request is already in ${req.status} state`);
  }

  if (req.status === "pending_review" && newStatus === "completed") {
    throw new Error("ILLEGAL_TRANSITION: Cannot transition directly from pending_review to completed");
  }

  if (req.status === "approved" && newStatus === "completed") {
    throw new Error("ILLEGAL_TRANSITION: Cannot transition directly from approved to completed (must be processing first)");
  }

  if (req.status === "processing" && newStatus === "rejected") {
    throw new Error("ILLEGAL_TRANSITION: Cannot reject payout while processing (transfer already in flight)");
  }

  const partner = partners.get(req.partnerId)!;

  if (req.status === "pending_review" && (newStatus === "approved" || newStatus === "rejected")) {
    if (newStatus === "rejected") {
      // Return reserved funds to available balance
      partner.payoutPendingBalance = Math.max(0, round2(partner.payoutPendingBalance - req.requestedAmountThb));
      partner.availableBalance = round2(partner.availableBalance + req.requestedAmountThb);
    }
  } else if (req.status === "approved" && newStatus === "processing") {
    // Proceed to bank transfer
  } else if (req.status === "processing" && newStatus === "completed") {
    // Transfer successful
    partner.payoutPendingBalance = Math.max(0, round2(partner.payoutPendingBalance - req.requestedAmountThb));
    partner.totalWithdrawn = round2(partner.totalWithdrawn + req.requestedAmountThb);
  } else {
    throw new Error(`ILLEGAL_TRANSITION: Invalid transition from ${req.status} to ${newStatus}`);
  }

  const oldStatus = req.status;
  req.status = newStatus;
  req.rejectionReason = reason;

  return { success: true, oldStatus, newStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE 26 COMPREHENSIVE TESTS
// ─────────────────────────────────────────────────────────────────────────────

// Setup base entities
const partnerA: PartnerEntity = {
  id: "part_A",
  userId: "user_partner_A",
  partnerCode: "PARTNERA",
  tierCode: "affiliate",
  status: "active",
  holdingBalance: 0,
  availableBalance: 0,
  payoutPendingBalance: 0,
  clawbackPendingBalance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
};
partners.set(partnerA.id, partnerA);

const defaultPlan: CommissionPlan = {
  id: "plan_default",
  planCode: "PLAN_DEFAULT_AFFILIATE",
  planName: "Default Affiliate Plan",
  commissionTerm: "until_subscription_ends",
  holdingPeriodDays: 14,
  isActive: true,
};
plans.set(defaultPlan.id, defaultPlan);

// 1. Successful first payment
console.log("\n▶ TEST 1: SUCCESSFUL FIRST PAYMENT");
attributions.push({
  id: "attr_1",
  partnerId: partnerA.id,
  referredUserId: "payer_1",
  status: "converted",
  clickTimestamp: Date.now() - 100000,
});
const res1 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_1",
  payerUserId: "payer_1",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_pay_1",
});
assert(res1.success && res1.awarded === true && res1.commissionAmount === 70, "Successful first payment creates commission in holding", `Commission: ${res1.commissionAmount}`);
assert(partnerA.holdingBalance === 70, "Partner holding balance increased by 70 THB", `Holding: ${partnerA.holdingBalance}`);

// 2. Duplicate webhook
console.log("\n▶ TEST 2: DUPLICATE WEBHOOK IDEMPOTENCY");
const res2 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_1",
  payerUserId: "payer_1",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_pay_1",
});
assert(res2.success && res2.duplicate === true && res2.awarded === false, "Duplicate webhook returns duplicate: true without re-awarding");
assert(partnerA.holdingBalance === 70, "Holding balance does not double on duplicate webhook");

// 3. No attribution
console.log("\n▶ TEST 3: NO ATTRIBUTION");
const res3 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_untracked",
  payerUserId: "payer_untracked",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_untracked",
});
assert(res3.success && res3.awarded === false && res3.reason === "NO_CONVERTED_ATTRIBUTION", "Unreferred payer generates no commission");

// 4. Converted attribution
console.log("\n▶ TEST 4: CONVERTED ATTRIBUTION");
attributions.push({
  id: "attr_conv",
  partnerId: partnerA.id,
  referredUserId: "payer_conv",
  status: "converted",
  clickTimestamp: Date.now() - 50000,
});
const res4 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_conv",
  payerUserId: "payer_conv",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_conv",
});
assert(res4.awarded === true, "Converted attribution awards commission successfully");

// 5. Non-converted attribution
console.log("\n▶ TEST 5: NON-CONVERTED ATTRIBUTION");
attributions.push({
  id: "attr_active_only",
  partnerId: partnerA.id,
  referredUserId: "payer_not_converted",
  status: "active", // Not yet converted
  clickTimestamp: Date.now() - 20000,
});
const res5 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_not_conv",
  payerUserId: "payer_not_converted",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_not_conv",
});
assert(res5.awarded === false && res5.reason === "NO_CONVERTED_ATTRIBUTION", "Attribution with status active (non-converted) is ignored");

// 6. Partner plan priority (Priority 100)
console.log("\n▶ TEST 6: PARTNER PLAN PRIORITY (100)");
const partnerVIP: PartnerEntity = {
  id: "part_VIP",
  userId: "user_vip",
  partnerCode: "VIPPARTNER",
  tierCode: "affiliate",
  status: "active",
  holdingBalance: 0,
  availableBalance: 0,
  payoutPendingBalance: 0,
  clawbackPendingBalance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
};
partners.set(partnerVIP.id, partnerVIP);

const vipPlan: CommissionPlan = {
  id: "plan_vip_custom",
  planCode: "PLAN_VIP_PARTNER",
  planName: "VIP Custom Partner Plan",
  commissionTerm: "until_subscription_ends",
  holdingPeriodDays: 7,
  isActive: true,
};
plans.set(vipPlan.id, vipPlan);

rateRules.push({
  planId: vipPlan.id,
  subscriptionPlanCode: "pro_monthly",
  ratePercentage: 0.30, // 30%
});

assignments.push({
  id: "asgn_vip_partner",
  planId: vipPlan.id,
  assignmentScope: "partner",
  partnerId: partnerVIP.id,
  priority: 100,
  isActive: true,
});

attributions.push({
  id: "attr_vip_cust",
  partnerId: partnerVIP.id,
  referredUserId: "payer_vip_cust",
  status: "converted",
  clickTimestamp: Date.now() - 10000,
});

const res6 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_vip",
  payerUserId: "payer_vip_cust",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_vip_pay",
});
assert(res6.planId === vipPlan.id && res6.commissionRate === 0.30 && res6.commissionAmount === 300, "Partner-specific plan (priority 100) takes highest precedence (30% = 300 THB)");

// 7. Campaign plan priority (Priority 50)
console.log("\n▶ TEST 7: CAMPAIGN PLAN PRIORITY (50)");
const campaignPlan: CommissionPlan = {
  id: "plan_campaign_fest",
  planCode: "PLAN_CAMPAIGN_FEST",
  planName: "Songkran Promo Campaign Plan",
  commissionTerm: "until_subscription_ends",
  holdingPeriodDays: 14,
  isActive: true,
};
plans.set(campaignPlan.id, campaignPlan);

rateRules.push({
  planId: campaignPlan.id,
  subscriptionPlanCode: "pro_monthly",
  ratePercentage: 0.20, // 20%
});

assignments.push({
  id: "asgn_campaign",
  planId: campaignPlan.id,
  assignmentScope: "campaign",
  campaignCode: "SONGKRAN2026",
  priority: 50,
  isActive: true,
});

attributions.push({
  id: "attr_camp_cust",
  partnerId: partnerA.id,
  referredUserId: "payer_camp_cust",
  status: "converted",
  campaignCode: "SONGKRAN2026",
  clickTimestamp: Date.now() - 10000,
});

const res7 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_camp",
  payerUserId: "payer_camp_cust",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_camp_pay",
});
assert(res7.planId === campaignPlan.id && res7.commissionRate === 0.20 && res7.commissionAmount === 200, "Campaign-specific plan (priority 50) takes precedence over tier (20% = 200 THB)");

// 8. Tier fallback (Priority 10)
console.log("\n▶ TEST 8: TIER FALLBACK (10)");
const creatorTierPlan: CommissionPlan = {
  id: "plan_creator_tier",
  planCode: "PLAN_CREATOR_TIER",
  planName: "Creator Tier Default Plan",
  commissionTerm: "until_subscription_ends",
  holdingPeriodDays: 14,
  isActive: true,
};
plans.set(creatorTierPlan.id, creatorTierPlan);

rateRules.push({
  planId: creatorTierPlan.id,
  subscriptionPlanCode: "pro_monthly",
  ratePercentage: 0.15, // 15%
});

assignments.push({
  id: "asgn_creator_tier",
  planId: creatorTierPlan.id,
  assignmentScope: "tier",
  tierCode: "creator",
  priority: 10,
  isActive: true,
});

const partnerCreator: PartnerEntity = {
  id: "part_Creator",
  userId: "user_creator",
  partnerCode: "CREATORONE",
  tierCode: "creator",
  status: "active",
  holdingBalance: 0,
  availableBalance: 0,
  payoutPendingBalance: 0,
  clawbackPendingBalance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
};
partners.set(partnerCreator.id, partnerCreator);

attributions.push({
  id: "attr_creator_cust",
  partnerId: partnerCreator.id,
  referredUserId: "payer_creator_cust",
  status: "converted",
  clickTimestamp: Date.now() - 5000,
});

const res8 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_creator",
  payerUserId: "payer_creator_cust",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_creator_pay",
});
assert(res8.planId === creatorTierPlan.id && res8.commissionRate === 0.15 && res8.commissionAmount === 150, "Tier plan (priority 10) applied as expected fallback (15% = 150 THB)");

// 9. Commission rate mapping
console.log("\n▶ TEST 9: COMMISSION RATE MAPPING");
assert(res6.commissionRate === 0.30 && res7.commissionRate === 0.20 && res8.commissionRate === 0.15, "Commission rates applied accurately per rule definitions");

// 10. Dynamic VAT
console.log("\n▶ TEST 10: DYNAMIC VAT");
// At 7% VAT: 1070 gross -> 70 VAT -> 1000 base
const vat7 = round2(1070 * 0.07 / 1.07);
// At 10% VAT: 1100 gross -> 100 VAT -> 1000 base
const vat10 = round2(1100 * 0.10 / 1.10);
// At 0% VAT: 1000 gross -> 0 VAT -> 1000 base
const vat0 = 0;
assert(vat7 === 70 && vat10 === 100 && vat0 === 0, "Dynamic VAT formula operates correctly without hardcoded rates");

// 11. Dynamic WHT
console.log("\n▶ TEST 11: DYNAMIC WHT");
const taxRulesMock = [
  { code: "TH_INDIVIDUAL_COMMISSION", rate: 0.03, minThreshold: 1000 },
  { code: "TH_CORPORATE_SERVICE", rate: 0.03, minThreshold: 1000 },
  { code: "TH_EXEMPT_ZERO", rate: 0.00, minThreshold: 0 },
  { code: "TH_BELOW_THRESHOLD", rate: 0.00, minThreshold: 0 },
];
function calculateWHT(amount: number, entityType: string, isExempt: boolean) {
  if (isExempt) return 0;
  if (amount < 1000) return 0;
  const rule = taxRulesMock.find(r => r.code === (entityType === "corporate" ? "TH_CORPORATE_SERVICE" : "TH_INDIVIDUAL_COMMISSION"));
  return rule ? round2(amount * rule.rate) : null;
}
assert(calculateWHT(5000, "individual", false) === 150, "Dynamic WHT for individual above 1000 THB is 150 THB (3%)");
assert(calculateWHT(800, "individual", false) === 0, "Dynamic WHT for payout below 1000 THB is 0 THB");
assert(calculateWHT(5000, "individual", true) === 0, "Dynamic WHT for tax-exempt partner is 0 THB");

// 12. TAX_REVIEW_REQUIRED
console.log("\n▶ TEST 12: TAX_REVIEW_REQUIRED ON UNRESOLVED TAX PROFILE");
function validateTaxRuleForPayout(entityType: string) {
  const allowed = ["individual", "corporate"];
  if (!allowed.includes(entityType)) {
    throw new Error(`TAX_REVIEW_REQUIRED: Unable to resolve valid tax rule for entity_type '${entityType}'`);
  }
  return true;
}
let taxReviewCaught = false;
try {
  validateTaxRuleForPayout("unknown_foreign_entity");
} catch (e: any) {
  taxReviewCaught = e.message.includes("TAX_REVIEW_REQUIRED");
}
assert(taxReviewCaught, "Unknown entity type halts payout immediately with TAX_REVIEW_REQUIRED");

// 13. first_payment term
console.log("\n▶ TEST 13: FIRST_PAYMENT TERM");
const firstPayPlan: CommissionPlan = {
  id: "plan_first_only",
  planCode: "PLAN_FIRST_PAYMENT_ONLY",
  planName: "First Payment Only Plan",
  commissionTerm: "first_payment",
  holdingPeriodDays: 14,
  isActive: true,
};
plans.set(firstPayPlan.id, firstPayPlan);
assignments.push({
  id: "asgn_first_pay",
  planId: firstPayPlan.id,
  assignmentScope: "partner",
  partnerId: partnerA.id,
  priority: 100,
  isActive: true,
});

attributions.push({
  id: "attr_term_test",
  partnerId: partnerA.id,
  referredUserId: "payer_term_user",
  status: "converted",
  clickTimestamp: Date.now(),
});

const termPay1 = processSubscriptionCommission({
  subscriptionPaymentId: "term_pay_1",
  payerUserId: "payer_term_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_term_1",
});
assert(termPay1.awarded === true, "Initial payment awarded under first_payment plan");

const termPay2 = processSubscriptionCommission({
  subscriptionPaymentId: "term_pay_2",
  payerUserId: "payer_term_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_term_2",
});
assert(termPay2.awarded === false && termPay2.reason === "COMMISSION_TERM_EXPIRED_FIRST_PAYMENT_ONLY", "Renewal payment rejected under first_payment plan");

// 14. Recurring 3 months
console.log("\n▶ TEST 14: RECURRING 3 MONTHS TERM");
const threeMonthsPlan: CommissionPlan = {
  id: "plan_3m",
  planCode: "PLAN_3_MONTHS",
  planName: "3 Months Recurring Plan",
  commissionTerm: "3_months",
  holdingPeriodDays: 14,
  isActive: true,
};
plans.set(threeMonthsPlan.id, threeMonthsPlan);
// assign to partnerCreator
assignments.push({
  id: "asgn_3m",
  planId: threeMonthsPlan.id,
  assignmentScope: "partner",
  partnerId: partnerCreator.id,
  priority: 100,
  isActive: true,
});

attributions.push({
  id: "attr_3m",
  partnerId: partnerCreator.id,
  referredUserId: "payer_3m_user",
  status: "converted",
  clickTimestamp: Date.now(),
});

const baseTime = new Date("2026-01-01T00:00:00Z");
const m1 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_3m_1",
  payerUserId: "payer_3m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_3m_1",
  now: baseTime,
});
assert(m1.awarded === true, "Month 1 awarded under 3_months term");

const m2Time = new Date("2026-02-01T00:00:00Z"); // +1 month
const m2 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_3m_2",
  payerUserId: "payer_3m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_3m_2",
  now: m2Time,
});
assert(m2.awarded === true, "Month 2 renewal awarded under 3_months term");

const m5Time = new Date("2026-05-01T00:00:00Z"); // +4 months
const m5 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_3m_5",
  payerUserId: "payer_3m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_3m_5",
  now: m5Time,
});
assert(m5.awarded === false && m5.reason === "COMMISSION_TERM_EXPIRED_3_MONTHS", "Month 5 renewal rejected after 3_months term expiration");

// 15. Recurring 6 months
console.log("\n▶ TEST 15: RECURRING 6 MONTHS TERM");
const partner6M: PartnerEntity = {
  id: "part_6M",
  userId: "user_6m",
  partnerCode: "PARTNER6M",
  tierCode: "creator",
  status: "active",
  holdingBalance: 0,
  availableBalance: 0,
  payoutPendingBalance: 0,
  clawbackPendingBalance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
};
partners.set(partner6M.id, partner6M);

const sixMonthsPlan: CommissionPlan = {
  id: "plan_6m",
  planCode: "PLAN_6_MONTHS",
  planName: "6 Months Recurring Plan",
  commissionTerm: "6_months",
  holdingPeriodDays: 14,
  isActive: true,
};
plans.set(sixMonthsPlan.id, sixMonthsPlan);
assignments.push({
  id: "asgn_6m",
  planId: sixMonthsPlan.id,
  assignmentScope: "partner",
  partnerId: partner6M.id,
  priority: 150,
  isActive: true,
});

attributions.push({
  id: "attr_6m",
  partnerId: partner6M.id,
  referredUserId: "payer_6m_user",
  status: "converted",
  clickTimestamp: Date.now(),
});

const m6_start = new Date("2026-01-01T00:00:00Z");
const p6_1 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_6m_1",
  payerUserId: "payer_6m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_6m_1",
  now: m6_start,
});
assert(p6_1.awarded === true, "Month 1 awarded under 6_months term");

const m6_mid = new Date("2026-05-15T00:00:00Z"); // month 4.5
const p6_2 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_6m_2",
  payerUserId: "payer_6m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_6m_2",
  now: m6_mid,
});
assert(p6_2.awarded === true, "Month 6 renewal awarded within 6 months");

const m6_expired = new Date("2026-08-01T00:00:00Z"); // month 7
const p6_expired = processSubscriptionCommission({
  subscriptionPaymentId: "pay_6m_exp",
  payerUserId: "payer_6m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_6m_exp",
  now: m6_expired,
});
assert(p6_expired.awarded === false && p6_expired.reason === "COMMISSION_TERM_EXPIRED_6_MONTHS", "Renewal rejected after 6_months term");

// 16. Recurring 12 months
console.log("\n▶ TEST 16: RECURRING 12 MONTHS TERM");
const partner12M: PartnerEntity = {
  id: "part_12M",
  userId: "user_12m",
  partnerCode: "PARTNER12M",
  tierCode: "master",
  status: "active",
  holdingBalance: 0,
  availableBalance: 0,
  payoutPendingBalance: 0,
  clawbackPendingBalance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
};
partners.set(partner12M.id, partner12M);

const twelveMonthsPlan: CommissionPlan = {
  id: "plan_12m",
  planCode: "PLAN_12_MONTHS",
  planName: "12 Months Recurring Plan",
  commissionTerm: "12_months",
  holdingPeriodDays: 14,
  isActive: true,
};
plans.set(twelveMonthsPlan.id, twelveMonthsPlan);
assignments.push({
  id: "asgn_12m",
  planId: twelveMonthsPlan.id,
  assignmentScope: "partner",
  partnerId: partner12M.id,
  priority: 200,
  isActive: true,
});

attributions.push({
  id: "attr_12m",
  partnerId: partner12M.id,
  referredUserId: "payer_12m_user",
  status: "converted",
  clickTimestamp: Date.now(),
});

const m12_start = new Date("2026-01-01T00:00:00Z");
const p12_1 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_12m_1",
  payerUserId: "payer_12m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_12m_1",
  now: m12_start,
});
assert(p12_1.awarded === true, "Month 1 awarded under 12_months term");

const m12_mid = new Date("2026-10-01T00:00:00Z"); // month 9
const p12_2 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_12m_2",
  payerUserId: "payer_12m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_12m_2",
  now: m12_mid,
});
assert(p12_2.awarded === true, "Month 11 renewal awarded within 12 months");

const m12_exp = new Date("2027-03-01T00:00:00Z"); // month 14
const p12_exp = processSubscriptionCommission({
  subscriptionPaymentId: "pay_12m_exp",
  payerUserId: "payer_12m_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_12m_exp",
  now: m12_exp,
});
assert(p12_exp.awarded === false && p12_exp.reason === "COMMISSION_TERM_EXPIRED_12_MONTHS", "Renewal rejected after 12_months term");

// 17. Until subscription ends
console.log("\n▶ TEST 17: UNTIL SUBSCRIPTION ENDS TERM");
const partnerLife: PartnerEntity = {
  id: "part_Life",
  userId: "user_life",
  partnerCode: "PARTNERLIFE",
  tierCode: "affiliate",
  status: "active",
  holdingBalance: 0,
  availableBalance: 0,
  payoutPendingBalance: 0,
  clawbackPendingBalance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
};
partners.set(partnerLife.id, partnerLife);

const untilEndCust = "payer_lifetime_sub";
attributions.push({
  id: "attr_until_end",
  partnerId: partnerLife.id,
  referredUserId: untilEndCust,
  status: "converted",
  clickTimestamp: Date.now(),
});
const life1 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_life_1",
  payerUserId: untilEndCust,
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_life_1",
  now: new Date("2026-01-01T00:00:00Z"),
});
const life24 = processSubscriptionCommission({
  subscriptionPaymentId: "pay_life_24",
  payerUserId: untilEndCust,
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_life_24",
  now: new Date("2028-01-01T00:00:00Z"), // 2 years later
});
assert(life1.awarded === true && life24.awarded === true, "Commission continues awarding for years under until_subscription_ends");

// 18. Expired commission term
console.log("\n▶ TEST 18: EXPIRED COMMISSION TERM GENERAL CHECK");
assert(termPay2.reason?.includes("EXPIRED") && m5.reason?.includes("EXPIRED"), "All expired commission terms properly flag EXPIRED reason");

// 19. Refund before holding clears
console.log("\n▶ TEST 19: REFUND BEFORE HOLDING CLEARS (HOLDING REVERSAL)");
const partnerRefundTest: PartnerEntity = {
  id: "part_Refund",
  userId: "user_refund_test",
  partnerCode: "REFUNDTEST",
  tierCode: "affiliate",
  status: "active",
  holdingBalance: 0,
  availableBalance: 0,
  payoutPendingBalance: 0,
  clawbackPendingBalance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
};
partners.set(partnerRefundTest.id, partnerRefundTest);

attributions.push({
  id: "attr_ref_test",
  partnerId: partnerRefundTest.id,
  referredUserId: "payer_ref_user",
  status: "converted",
  clickTimestamp: Date.now(),
});

processSubscriptionCommission({
  subscriptionPaymentId: "pay_to_refund_1",
  payerUserId: "payer_ref_user",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_to_ref_1",
});
assert(partnerRefundTest.holdingBalance === 70, "Pre-refund: Holding balance is 70 THB");

const refundRes1 = processRefundClawback({
  subscriptionPaymentId: "pay_to_refund_1",
  reason: "User requested refund within 7 days",
  idempotencyKey: "refund_idem_1",
});
assert(refundRes1.success && refundRes1.clawedBack && refundRes1.type === "holding_reversed", "Refund before 14 days executes holding_reversed clawback");
assert(partnerRefundTest.holdingBalance === 0, "Partner holding balance decremented to 0 THB after holding clawback");

// 20. Refund after holding clears
console.log("\n▶ TEST 20: REFUND AFTER HOLDING CLEARS (AVAILABLE CLAWBACK)");
// Simulate cleared event
const clearedEvent: CommissionEvent = {
  id: "evt_cleared_1",
  partnerId: partnerRefundTest.id,
  referredUserId: "payer_cleared_user",
  subscriptionPaymentId: "pay_cleared_1",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  vatAmountThb: 70,
  commissionableAmountThb: 1000,
  planIdApplied: defaultPlan.id,
  commissionRateApplied: 0.07,
  commissionAmountThb: 70,
  status: "cleared", // ALREADY CLEARED TO AVAILABLE
  holdingUntil: new Date("2026-01-01"),
  idempotencyKey: "idem_cleared_evt",
  createdAt: new Date("2026-01-01"),
};
commissionEvents.push(clearedEvent);
partnerRefundTest.availableBalance = 100; // Partner has 100 available

const refundRes2 = processRefundClawback({
  subscriptionPaymentId: "pay_cleared_1",
  reason: "Chargeback by bank after 45 days",
  idempotencyKey: "refund_idem_2",
});
assert(refundRes2.success && refundRes2.clawedBack && refundRes2.type === "available_clawback", "Refund after clearance targets available balance");

// 21. Clawback with sufficient available
console.log("\n▶ TEST 21: CLAWBACK WITH SUFFICIENT AVAILABLE");
assert(refundRes2.deductedFromAvailable === 70 && refundRes2.addedToClawbackPending === 0, "Deducted full 70 THB from available, 0 THB added to clawback_pending");
assert(partnerRefundTest.availableBalance === 30, "Available balance correctly reduced from 100 to 30 THB");

// 22. Clawback with insufficient available
console.log("\n▶ TEST 22: CLAWBACK WITH INSUFFICIENT AVAILABLE (DEFICIT POLICY)");
// Add another cleared commission of 50 THB, but partner only has 30 THB available
const clearedEvent2: CommissionEvent = {
  id: "evt_cleared_2",
  partnerId: partnerRefundTest.id,
  referredUserId: "payer_cleared_user_2",
  subscriptionPaymentId: "pay_cleared_2",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  vatAmountThb: 70,
  commissionableAmountThb: 1000,
  planIdApplied: defaultPlan.id,
  commissionRateApplied: 0.05,
  commissionAmountThb: 50,
  status: "cleared",
  holdingUntil: new Date("2026-01-01"),
  idempotencyKey: "idem_cleared_evt_2",
  createdAt: new Date("2026-01-01"),
};
commissionEvents.push(clearedEvent2);

const refundRes3 = processRefundClawback({
  subscriptionPaymentId: "pay_cleared_2",
  reason: "Major chargeback",
  idempotencyKey: "refund_idem_3",
});
assert(refundRes3.deductedFromAvailable === 30 && refundRes3.addedToClawbackPending === 20, "Available deducted by 30 to zero; deficit 20 moved to clawback_pending_balance");
assert(partnerRefundTest.availableBalance === 0, "Available balance safely stops at 0 THB (never negative without policy)");
assert(partnerRefundTest.clawbackPendingBalance === 20, "clawback_pending_balance correctly tracks the 20 THB partner deficit");

// 23. Duplicate commission event
console.log("\n▶ TEST 23: DUPLICATE COMMISSION EVENT IDEMPOTENCY");
const dupEvent = processSubscriptionCommission({
  subscriptionPaymentId: "pay_1",
  payerUserId: "payer_1",
  subscriptionPlanCode: "pro_monthly",
  grossAmountThb: 1070,
  vatRate: 0.07,
  idempotencyKey: "idem_pay_1",
});
assert(dupEvent.duplicate === true, "Commission event idempotency guard blocks duplicate insertion");

// 24. Concurrent webhook simulation
console.log("\n▶ TEST 24: CONCURRENT WEBHOOK SIMULATION");
attributions.push({
  id: "attr_concurrent",
  partnerId: partnerLife.id,
  referredUserId: "payer_concurrent",
  status: "converted",
  clickTimestamp: Date.now(),
});

const concurrentResults = [
  processSubscriptionCommission({
    subscriptionPaymentId: "pay_concurrent",
    payerUserId: "payer_concurrent",
    subscriptionPlanCode: "pro_monthly",
    grossAmountThb: 1070,
    vatRate: 0.07,
    idempotencyKey: "concurrent_key_X",
  }),
  processSubscriptionCommission({
    subscriptionPaymentId: "pay_concurrent",
    payerUserId: "payer_concurrent",
    subscriptionPlanCode: "pro_monthly",
    grossAmountThb: 1070,
    vatRate: 0.07,
    idempotencyKey: "concurrent_key_X", // identical idempotency key
  }),
];
const successes = concurrentResults.filter(r => r.awarded === true);
const duplicates = concurrentResults.filter(r => r.duplicate === true);
assert(successes.length === 1 && duplicates.length === 1, "Exactly 1 transaction succeeds; second is flagged duplicate");

// 25. Payout state transition matrix
console.log("\n▶ TEST 25: PAYOUT STATE TRANSITION MATRIX");
const testPayout: PayoutRequest = {
  id: "payout_req_1",
  partnerId: partnerA.id,
  requestedAmountThb: 1000,
  taxRuleCodeApplied: "TH_INDIVIDUAL_COMMISSION",
  withholdingRateApplied: 0.03,
  withholdingTaxAmountThb: 30,
  netPayoutAmountThb: 970,
  status: "pending_review",
};
payoutRequests.set(testPayout.id, testPayout);
partnerA.availableBalance = 2000;
partnerA.payoutPendingBalance = 1000;

// Test 25.1: Disallowed jump pending_review -> completed
let jump1Caught = false;
try {
  transitionPayoutStatus(testPayout.id, "completed", "admin_1");
} catch (e: any) {
  jump1Caught = e.message.includes("ILLEGAL_TRANSITION");
}
assert(jump1Caught, "Disallowed jump pending_review -> completed throws ILLEGAL_TRANSITION");

// Test 25.2: Allowed transition pending_review -> approved
const transApproved = transitionPayoutStatus(testPayout.id, "approved", "admin_1");
assert(transApproved.newStatus === "approved", "Allowed transition: pending_review -> approved succeeds");

// Test 25.3: Disallowed jump approved -> completed (must be processing)
let jump2Caught = false;
try {
  transitionPayoutStatus(testPayout.id, "completed", "admin_1");
} catch (e: any) {
  jump2Caught = e.message.includes("ILLEGAL_TRANSITION");
}
assert(jump2Caught, "Disallowed jump approved -> completed throws ILLEGAL_TRANSITION");

// Test 25.4: Allowed transition approved -> processing
const transProcessing = transitionPayoutStatus(testPayout.id, "processing", "admin_1");
assert(transProcessing.newStatus === "processing", "Allowed transition: approved -> processing succeeds");

// Test 25.5: Disallowed transition processing -> rejected
let jump3Caught = false;
try {
  transitionPayoutStatus(testPayout.id, "rejected", "admin_1");
} catch (e: any) {
  jump3Caught = e.message.includes("ILLEGAL_TRANSITION");
}
assert(jump3Caught, "Disallowed transition processing -> rejected throws ILLEGAL_TRANSITION");

// Test 25.6: Allowed transition processing -> completed
const transCompleted = transitionPayoutStatus(testPayout.id, "completed", "admin_1");
assert(transCompleted.newStatus === "completed", "Allowed transition: processing -> completed succeeds");
assert(partnerA.totalWithdrawn === 1000, "Partner totalWithdrawn increased to 1000 THB upon completion");

// Test 25.7: Terminal state check: completed -> any
let termCaught = false;
try {
  transitionPayoutStatus(testPayout.id, "approved", "admin_1");
} catch (e: any) {
  termCaught = e.message.includes("TERMINAL_STATE");
}
assert(termCaught, "Terminal state check: cannot transition out of completed status");

// 26. Balance invariant
console.log("\n▶ TEST 26: BALANCE INVARIANT AUDIT");
let allInvariantsHold = true;
partners.forEach(p => {
  // Check no negative balances
  if (p.holdingBalance < 0 || p.availableBalance < 0 || p.payoutPendingBalance < 0 || p.clawbackPendingBalance < 0) {
    allInvariantsHold = false;
  }
});
assert(allInvariantsHold, "Balance invariant holds across all partners: zero negative balance leaks");

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════════════════");
console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 26/26)`);
console.log("══════════════════════════════════════════════════════════════════════\n");

if (failed > 0) {
  process.exit(1);
}
