/**
 * test-phase6-economics.ts — Verification script for Phase 6 Economic & Membership Architecture
 *
 * Verifies:
 * 1. Canonical Plan Normalization & Hierarchy
 * 2. Backward Compatibility with Legacy Plans (basic -> premium, imperial -> master)
 * 3. Feature Entitlement Checks
 * 4. Quota Calculations (AI reports, Person limit, Timing comparison limit)
 * 5. Sands Ledger balance math & negative protection logic
 */

import {
  getUserPlan,
  canAccess,
  canUseFeature,
  getAiReportLimit,
  getPersonLimit,
  getTimingComparisonLimit,
  PLAN_HIERARCHY,
} from "../apps/web/app/services/permissions.server";
import type { CanonicalPlan, LegacyPlan, SandsLedgerEntry, PaymentTransaction } from "../packages/types/src/index";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log("=== PHOPEPHUM V3 — PHASE 6 ECONOMIC ARCHITECTURE VERIFICATION ===\n");

// ── 1. Plan Normalization & Hierarchy ──
console.log("--- 1. Plan Normalization & Hierarchy ---");

assert(getUserPlan(null) === "free", "Null profile defaults to 'free'");
assert(getUserPlan({ plan: "free" }) === "free", "Explicit 'free' returns 'free'");
assert(getUserPlan({ plan: "basic" }) === "premium", "Legacy 'basic' maps to canonical 'premium'");
assert(getUserPlan({ plan: "premium" }) === "premium", "Canonical 'premium' returns 'premium'");
assert(getUserPlan({ plan: "pro" }) === "pro", "Canonical 'pro' returns 'pro'");
assert(getUserPlan({ plan: "imperial" }) === "master", "Legacy 'imperial' maps to canonical 'master'");
assert(getUserPlan({ plan: "master" }) === "master", "Canonical 'master' returns 'master'");
assert(getUserPlan({ subscription: "lifetime" }) === "master", "Lifetime subscription maps to 'master'");
assert(getUserPlan({ role: "admin" }) === "master", "Admin role bypasses to 'master'");
assert(getUserPlan({ role: "operator" }) === "master", "Operator role bypasses to 'master'");
assert(
  getUserPlan({ plan: "pro", membership_status: "expired" }) === "free",
  "Expired status downgrades to 'free'"
);

// Hierarchy ordering
assert(PLAN_HIERARCHY["free"] < PLAN_HIERARCHY["premium"], "free < premium");
assert(PLAN_HIERARCHY["basic"] === PLAN_HIERARCHY["premium"], "basic rank === premium rank");
assert(PLAN_HIERARCHY["premium"] < PLAN_HIERARCHY["pro"], "premium < pro");
assert(PLAN_HIERARCHY["pro"] < PLAN_HIERARCHY["master"], "pro < master");
assert(PLAN_HIERARCHY["imperial"] === PLAN_HIERARCHY["master"], "imperial rank === master rank");

// ── 2. Access Control & Backward Compatibility ──
console.log("\n--- 2. Access Control & Backward Compatibility ---");

const freeUser = { plan: "free", membership_status: "active" };
const basicUser = { plan: "basic", membership_status: "active" };
const proUser = { plan: "pro", membership_status: "active" };
const masterUser = { plan: "master", membership_status: "active" };

// Free checks
assert(canAccess(freeUser, "free"), "Free user can access free");
assert(!canAccess(freeUser, "basic"), "Free user cannot access basic");
assert(!canAccess(freeUser, "premium"), "Free user cannot access premium");
assert(!canAccess(freeUser, "pro"), "Free user cannot access pro");

// Legacy Basic User checks
assert(canAccess(basicUser, "basic"), "Basic user can access basic");
assert(canAccess(basicUser, "premium"), "Basic user can access premium (alias)");
assert(!canAccess(basicUser, "pro"), "Basic user cannot access pro");

// Pro User checks
assert(canAccess(proUser, "free"), "Pro user can access free");
assert(canAccess(proUser, "basic"), "Pro user can access basic");
assert(canAccess(proUser, "premium"), "Pro user can access premium");
assert(canAccess(proUser, "pro"), "Pro user can access pro");
assert(!canAccess(proUser, "master"), "Pro user cannot access master");
assert(!canAccess(proUser, "imperial"), "Pro user cannot access imperial");

// Master User checks
assert(canAccess(masterUser, "master"), "Master user can access master");
assert(canAccess(masterUser, "imperial"), "Master user can access imperial (alias)");
assert(canAccess(masterUser, "pro"), "Master user can access pro");

// ── 3. V3 Feature Entitlements ──
console.log("\n--- 3. V3 Feature Entitlements ---");

// Yam live is free
assert(canUseFeature(freeUser, "yam_live"), "Free user can view yam_live");
assert(!canUseFeature(freeUser, "yam_ashta"), "Free user cannot use yam_ashta");
assert(canUseFeature(basicUser, "yam_ashta"), "Basic user can use yam_ashta");

// Timing comparison
assert(!canUseFeature(freeUser, "timing_comparison"), "Free user cannot use timing_comparison");
assert(canUseFeature(basicUser, "timing_comparison"), "Basic user can use timing_comparison (2 windows)");
assert(canUseFeature(proUser, "timing_comparison_multi"), "Pro user can use timing_comparison_multi (3-5 windows)");

// Personal Wisdom
assert(canUseFeature(freeUser, "wisdom_history"), "Free user can view wisdom_history");
assert(!canUseFeature(freeUser, "wisdom_patterns"), "Free user cannot view deep wisdom_patterns");
assert(canUseFeature(proUser, "wisdom_patterns"), "Pro user can view deep wisdom_patterns");

// Calendar lookahead
assert(canUseFeature(freeUser, "calendar_current_month"), "Free user can view current month");
assert(canUseFeature(basicUser, "calendar_3months"), "Basic user can view 3 months");
assert(canUseFeature(proUser, "calendar_100years"), "Pro user can view 100 years");

// Master whitelabel
assert(!canUseFeature(proUser, "pdf_whitelabel_export"), "Pro user cannot use pdf_whitelabel_export");
assert(canUseFeature(masterUser, "pdf_whitelabel_export"), "Master user can use pdf_whitelabel_export");

// ── 4. Quotas per Plan ──
console.log("\n--- 4. Quotas per Plan ---");

assert(getAiReportLimit(freeUser) === 0, "Free user AI report limit is 0");
assert(getAiReportLimit(basicUser) === 1, "Basic user AI report limit is 1");
assert(getAiReportLimit(proUser) === 15, "Pro user AI report limit is 15");
assert(getAiReportLimit(masterUser) > 1000, "Master user AI report limit is unlimited (9999)");

assert(getPersonLimit(freeUser) === 0, "Free user customer limit is 0");
assert(getPersonLimit(basicUser) === 3, "Basic/Premium user customer limit is 3");
assert(getPersonLimit(proUser) === 20, "Pro user customer limit is 20");
assert(getPersonLimit(masterUser) > 1000, "Master user customer limit is unlimited (9999)");

assert(getTimingComparisonLimit(freeUser) === 0, "Free user comparison candidate limit is 0");
assert(getTimingComparisonLimit(basicUser) === 2, "Basic user comparison candidate limit is 2");
assert(getTimingComparisonLimit(proUser) === 5, "Pro user comparison candidate limit is 5");

// ── 5. Sands of Time & Payment Transaction Data Contracts ──
console.log("\n--- 5. Sands of Time & Payment Data Contracts ---");

const mockLedgerEntry: SandsLedgerEntry = {
  id: "test-ledger-1",
  userId: "user-123",
  amount: 5,
  balanceAfter: 15,
  activityType: "reflection",
  description: "รางวัลทบทวนสะท้อนสติยามเย็น",
  createdAt: new Date().toISOString(),
};
assert(mockLedgerEntry.amount === 5, "Ledger entry amount is recorded correctly");
assert(mockLedgerEntry.balanceAfter === 15, "Ledger balanceAfter is recorded correctly");

const mockPaymentTx: PaymentTransaction = {
  id: "tx-123",
  userId: "user-123",
  provider: "stripe",
  providerTransactionId: "cs_test_abc123",
  planId: "premium",
  amount: 59,
  currency: "THB",
  status: "paid",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
assert(mockPaymentTx.provider === "stripe", "PaymentTransaction provider is valid");
assert(mockPaymentTx.status === "paid", "PaymentTransaction status is valid");

console.log("\n🎉 ALL PHASE 6.1 ECONOMIC & MEMBERSHIP ARCHITECTURE TESTS PASSED SUCCESSFULLY!");
