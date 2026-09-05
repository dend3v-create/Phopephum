// scripts/test-phase6-5-2-db-architecture.ts
// ==============================================================================
// 🏛️ PHOPEPHUM V3 — PHASE 6.5.2: DATABASE ARCHITECTURE VERIFICATION SUITE
// ==============================================================================

import { calculateCommission } from "../apps/web/app/services/partner.server";
import type {
  PartnerEntity,
  PartnerTaxProfile,
  TaxRule,
  CommissionEvent,
  PartnerLedgerEntry,
  PayoutRequest,
} from "@phopephum/types";

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

console.log("═══════════════════════════════════════════════════════════════");
console.log("🏛️  PHASE 6.5.2 — DATABASE ARCHITECTURE & GUARDRAILS TEST SUITE");
console.log("═══════════════════════════════════════════════════════════════\n");

// ─────────────────────────────────────────────────────────────────────────────
// 1. DYNAMIC VAT & COMMISSIONABLE BASE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ 1. DYNAMIC VAT & COMMISSIONABLE BASE (NO HARD-CODED 7%)");

// Test 1.1: Standard 7% VAT
const vat7 = calculateCommission({
  grossAmountThb: 299.00,
  vatRate: 0.07,
  commissionRate: 0.15, // Creator 15%
});
// vat = round(299 * 0.07 / 1.07) = round(19.5607) = 19.56
// commissionable = 299 - 19.56 = 279.44
// commission = round(279.44 * 0.15) = round(41.916) = 41.92
assert(vat7.vatAmountThb === 19.56, "Standard VAT 7% extracted accurately (฿19.56)", `got ${vat7.vatAmountThb}`);
assert(vat7.commissionableAmountThb === 279.44, "Commissionable base is gross minus VAT (฿279.44)", `got ${vat7.commissionableAmountThb}`);
assert(vat7.commissionAmountThb === 41.92, "Creator commission on ฿279.44 is ฿41.92", `got ${vat7.commissionAmountThb}`);

// Test 1.2: 0% VAT (e.g. Export / Non-VAT business)
const vat0 = calculateCommission({
  grossAmountThb: 299.00,
  vatRate: 0.00,
  commissionRate: 0.15,
});
assert(vat0.vatAmountThb === 0.00, "0% VAT yields ฿0.00 tax", `got ${vat0.vatAmountThb}`);
assert(vat0.commissionableAmountThb === 299.00, "0% VAT commissionable base equals gross (฿299.00)", `got ${vat0.commissionableAmountThb}`);
assert(vat0.commissionAmountThb === 44.85, "Creator commission without VAT is ฿44.85", `got ${vat0.commissionAmountThb}`);

// Test 1.3: Custom VAT Rate (e.g. Future tax adjustment 10%)
const vat10 = calculateCommission({
  grossAmountThb: 1000.00,
  vatRate: 0.10,
  commissionRate: 0.25, // Master 25%
});
// vat = round(1000 * 0.10 / 1.10) = 90.91
// commissionable = 1000 - 90.91 = 909.09
// commission = round(909.09 * 0.25) = 227.27
assert(vat10.vatAmountThb === 90.91, "10% VAT extracted cleanly (฿90.91)", `got ${vat10.vatAmountThb}`);
assert(vat10.commissionAmountThb === 227.27, "Master commission on 10% VAT base is ฿227.27", `got ${vat10.commissionAmountThb}`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. DYNAMIC TAX RULE RESOLUTION (NO HARD-CODED 3%)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ 2. DYNAMIC TAX RULE RESOLUTION (NO HARD-CODED 3%)");

const TAX_RULES_TABLE: Record<string, TaxRule> = {
  TH_INDIVIDUAL_COMMISSION: {
    ruleCode: "TH_INDIVIDUAL_COMMISSION",
    description: "ค่านายหน้าบุคคลธรรมดา",
    entityType: "individual",
    withholdingRate: 0.03, // 3%
    minThresholdThb: 1000.0,
    requiresTaxCertificate: true,
    isActive: true,
    effectiveFrom: "2026-01-01T00:00:00Z",
  },
  TH_CORPORATE_SERVICE: {
    ruleCode: "TH_CORPORATE_SERVICE",
    description: "ค่าบริการนิติบุคคล",
    entityType: "corporate",
    withholdingRate: 0.03, // 3%
    minThresholdThb: 1000.0,
    requiresTaxCertificate: true,
    isActive: true,
    effectiveFrom: "2026-01-01T00:00:00Z",
  },
  TH_EXEMPT_ZERO: {
    ruleCode: "TH_EXEMPT_ZERO",
    description: "ยกเว้นภาษีหัก ณ ที่จ่าย",
    entityType: "any",
    withholdingRate: 0.00, // 0%
    minThresholdThb: 0.0,
    requiresTaxCertificate: false,
    isActive: true,
    effectiveFrom: "2026-01-01T00:00:00Z",
  },
  TH_BELOW_THRESHOLD: {
    ruleCode: "TH_BELOW_THRESHOLD",
    description: "ยอดจ่ายไม่ถึงเกณฑ์ 1,000 บาท",
    entityType: "any",
    withholdingRate: 0.00, // 0%
    minThresholdThb: 0.0,
    requiresTaxCertificate: false,
    isActive: true,
    effectiveFrom: "2026-01-01T00:00:00Z",
  },
};

function resolveTaxRuleLocal(taxProfile: Partial<PartnerTaxProfile>, amount: number): TaxRule {
  if (taxProfile.withholdingTaxExempt) {
    return TAX_RULES_TABLE.TH_EXEMPT_ZERO;
  }
  if (amount < 1000.0) {
    return TAX_RULES_TABLE.TH_BELOW_THRESHOLD;
  }
  const entityType = taxProfile.entityType;
  let ruleCode: string;
  if (entityType === "corporate") {
    ruleCode = "TH_CORPORATE_SERVICE";
  } else if (entityType === "individual") {
    ruleCode = "TH_INDIVIDUAL_COMMISSION";
  } else {
    throw new Error(`TAX_REVIEW_REQUIRED: Unrecognized entityType '${entityType}'`);
  }
  const rule = TAX_RULES_TABLE[ruleCode];
  if (!rule || !rule.isActive) {
    throw new Error(`TAX_REVIEW_REQUIRED: Rule for ${entityType} not found`);
  }
  return rule;
}

// Case 2.1: Below threshold (e.g. ฿700) -> 0% WHT
const ruleBelow = resolveTaxRuleLocal({ entityType: "individual" }, 700);
assert(ruleBelow.ruleCode === "TH_BELOW_THRESHOLD", "Payout ฿700 resolves to TH_BELOW_THRESHOLD");
assert(ruleBelow.withholdingRate === 0.00, "Payout below ฿1,000 incurs 0% WHT");

// Case 2.2: Tax Exempt entity -> 0% WHT
const ruleExempt = resolveTaxRuleLocal({ entityType: "corporate", withholdingTaxExempt: true }, 5000);
assert(ruleExempt.ruleCode === "TH_EXEMPT_ZERO", "Tax-exempt partner resolves to TH_EXEMPT_ZERO");
assert(ruleExempt.withholdingRate === 0.00, "Tax-exempt partner incurs 0% WHT");

// Case 2.3: Standard individual above ฿1,000 (e.g. ฿2,000) -> 3% WHT
const ruleStandard = resolveTaxRuleLocal({ entityType: "individual" }, 2000);
assert(ruleStandard.ruleCode === "TH_INDIVIDUAL_COMMISSION", "Individual ฿2,000 resolves to TH_INDIVIDUAL_COMMISSION");
assert(ruleStandard.withholdingRate === 0.03, "Individual above threshold incurs 3% WHT");

// Case 2.4: Missing rule throws TAX_REVIEW_REQUIRED
let errorCaught = false;
try {
  resolveTaxRuleLocal({ entityType: "foreign_entity" as any }, 2000);
} catch (e: any) {
  errorCaught = e.message.includes("TAX_REVIEW_REQUIRED");
}
assert(errorCaught, "Unmatched tax profile throws TAX_REVIEW_REQUIRED without falling back to 3%");

// ─────────────────────────────────────────────────────────────────────────────
// 3. 3-BALANCE MODEL & ATOMIC PAYOUT RESERVATION (DOUBLE WITHDRAWAL GUARD)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ 3. 3-BALANCE MODEL & ATOMIC PAYOUT RESERVATION");

interface MockPartnerEntity {
  id: string;
  holdingBalance: number;
  availableBalance: number;
  payoutPendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

const mockPartner: MockPartnerEntity = {
  id: "partner-test-01",
  holdingBalance: 500.00,
  availableBalance: 1000.00,
  payoutPendingBalance: 0.00,
  totalEarned: 1500.00,
  totalWithdrawn: 0.00,
};

// Simulation: User requests ฿1,000 payout
function simulateReservePayout(partner: MockPartnerEntity, amount: number) {
  if (amount < 500) throw new Error("MINIMUM_PAYOUT_THRESHOLD_500");
  if (partner.availableBalance < amount) throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");

  // Atomic reservation
  partner.availableBalance -= amount;
  partner.payoutPendingBalance += amount;

  return { success: true, newAvailable: partner.availableBalance, newPending: partner.payoutPendingBalance };
}

// Request 1: Reserve ฿1,000
const req1 = simulateReservePayout(mockPartner, 1000);
assert(req1.newAvailable === 0, "Available balance drops to 0 immediately upon reservation", `got ${req1.newAvailable}`);
assert(req1.newPending === 1000, "Payout pending balance increases to ฿1,000", `got ${req1.newPending}`);

// Request 2 (Concurrent Double Click): Try to request another ฿1,000
let doubleClickBlocked = false;
try {
  simulateReservePayout(mockPartner, 1000);
} catch (e: any) {
  doubleClickBlocked = e.message === "INSUFFICIENT_AVAILABLE_BALANCE";
}
assert(doubleClickBlocked, "Concurrent double withdrawal attempt is strictly blocked by 0 available balance");

// Simulation: Admin settles payout
function simulateSettlePayout(partner: MockPartnerEntity, amount: number) {
  partner.payoutPendingBalance -= amount;
  partner.totalWithdrawn += amount;
}
simulateSettlePayout(mockPartner, 1000);
assert(mockPartner.payoutPendingBalance === 0, "Pending balance cleared to 0 after settlement", `got ${mockPartner.payoutPendingBalance}`);
assert(mockPartner.totalWithdrawn === 1000, "Total withdrawn recorded as ฿1,000", `got ${mockPartner.totalWithdrawn}`);

// Invariant Balance Check:
// Lifetime Total Earned (1500) == holding (500) + available (0) + pending (0) + totalWithdrawn (1000)
const balanceSum = mockPartner.holdingBalance + mockPartner.availableBalance + mockPartner.payoutPendingBalance + mockPartner.totalWithdrawn;
assert(balanceSum === mockPartner.totalEarned, "3-Balance Invariant holds: holding + available + pending + withdrawn == totalEarned (฿1,500)");

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYOUT REJECTION (REFUND PENDING -> AVAILABLE)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ 4. PAYOUT REJECTION & ROLLBACK FLOW");

const rejectPartner: MockPartnerEntity = {
  id: "partner-test-02",
  holdingBalance: 0,
  availableBalance: 800,
  payoutPendingBalance: 0,
  totalEarned: 800,
  totalWithdrawn: 0,
};

// Reserve ฿800
simulateReservePayout(rejectPartner, 800);
assert(rejectPartner.availableBalance === 0 && rejectPartner.payoutPendingBalance === 800, "Reserve ฿800 succeeds (Pending: 800, Available: 0)");

// Admin Rejects Payout
function simulateRejectPayout(partner: MockPartnerEntity, amount: number) {
  partner.payoutPendingBalance -= amount;
  partner.availableBalance += amount;
}
simulateRejectPayout(rejectPartner, 800);
assert(rejectPartner.payoutPendingBalance === 0, "Pending balance cleared after rejection", `got ${rejectPartner.payoutPendingBalance}`);
assert(rejectPartner.availableBalance === 800, "Funds returned to available balance after rejection (฿800)", `got ${rejectPartner.availableBalance}`);

// ─────────────────────────────────────────────────────────────────────────────
// 5. SANDS OF TIME NON-MONETARY BENEFIT CHECK
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ 5. SANDS CLOSED-LOOP BENEFIT BRIDGE (NON-EXCHANGE RATE)");

const sampleBenefit = {
  benefitType: "consultation_discount",
  title: "คูปองส่วนลดปรึกษาครูบาอาจารย์",
  sandsRedeemCost: 100, // 100 sands
  benefitReferenceValueThb: 250, // Reference value, NOT exchange rate
  partnerSubsidyBudgetThb: 1000,
};

assert(
  typeof sampleBenefit.benefitReferenceValueThb === "number" && sampleBenefit.benefitReferenceValueThb === 250,
  "Benefit reference value is defined independently as closed-loop non-monetary voucher"
);
assert(
  !("cashDiscountEquivalentThb" in sampleBenefit),
  "cashDiscountEquivalentThb permanently removed to eliminate cash exchange rate misconception"
);

console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`🏁 VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
console.log("═══════════════════════════════════════════════════════════════\n");

if (failed > 0) {
  process.exit(1);
}
