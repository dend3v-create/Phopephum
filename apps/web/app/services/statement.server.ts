import { createClient } from "@supabase/supabase-js";
import type { Env } from "../env.server";
import type {
  PartnerMonthlyStatement,
  PartnerStatementLineItem,
  Wht50TawiCertificateRecord,
  Wht50TawiReport,
  FinanceOperationsSummary,
} from "@phopephum/types";

// ==============================================================================
// 🏛️ PHOPEPHUM V3 — STEP 7.2F: PARTNER STATEMENT & 50 TAWI REPORTING SERVICES
// ==============================================================================
// 1. Statements derived 100% from Double-Entry Immutable Partner Ledger
// 2. Strict Zero Buyer PII Leakage in public/partner-facing exports
// 3. RFC 4180 CSV Export with UTF-8 BOM (\uFEFF) for Excel / Google Sheets
// ==============================================================================

function getServiceRoleClient(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * 1. สร้างใบแจ้งยอดบัญชีรายเดือนของพันธมิตร (Derived 100% from partner_ledger)
 */
export async function generatePartnerMonthlyStatement(options: {
  partnerId: string;
  year: number;
  month: number; // 1 - 12
  env: Env;
}): Promise<PartnerMonthlyStatement | null> {
  const { partnerId, year, month, env } = options;
  const supabase = getServiceRoleClient(env);

  // ดึงข้อมูล Partner Entity
  const { data: partner } = await supabase
    .from("partner_entities")
    .select("id, partner_code, tier_code")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partner) return null;

  // กำหนดช่วงเวลา (UTC)
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const periodLabel = `${year}-${String(month).padStart(2, "0")}`;

  // 1. คำนวณ Opening Balances จาก Ledger ก่อน startDate
  const { data: priorEntries } = await supabase
    .from("partner_ledger")
    .select("holding_balance_after, available_balance_after, created_at")
    .eq("partner_id", partnerId)
    .lt("created_at", startDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  const openingHoldingBalance = priorEntries && priorEntries.length > 0 ? Number(priorEntries[0].holding_balance_after || 0) : 0.0;
  const openingAvailableBalance = priorEntries && priorEntries.length > 0 ? Number(priorEntries[0].available_balance_after || 0) : 0.0;

  // 2. ดึงรายการเคลื่อนไหวทั้งหมดในงวด (In-period ledger entries)
  const { data: periodEntries } = await supabase
    .from("partner_ledger")
    .select(`
      *,
      payout_requests (
        requested_amount_thb,
        withholding_rate_applied,
        withholding_tax_amount_thb,
        net_payout_amount_thb
      )
    `)
    .eq("partner_id", partnerId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: true });

  let totalNewCommissionEarned = 0.0;
  let totalHoldingReleased = 0.0;
  let totalHoldingRefunded = 0.0;
  let totalPayoutsReserved = 0.0;
  let totalPayoutReversals = 0.0;
  let totalClawbackOffset = 0.0;

  const lineItems: PartnerStatementLineItem[] = [];

  for (const entry of periodEntries || []) {
    const amount = Number(entry.amount || 0);
    const holdingDelta = Number(entry.holding_balance_after || 0) - Number(entry.holding_balance_before || 0);
    const availableDelta = Number(entry.available_balance_after || 0) - Number(entry.available_balance_before || 0);
    const payoutPendingDelta = Number(entry.payout_pending_after || 0) - Number(entry.payout_pending_before || 0);
    const pr = Array.isArray(entry.payout_requests) ? entry.payout_requests[0] : entry.payout_requests;

    if (entry.entry_type === "commission_holding_in") {
      totalNewCommissionEarned += amount;
    } else if (entry.entry_type === "commission_cleared") {
      totalHoldingReleased += amount;
    } else if (entry.entry_type === "holding_refund_reversed") {
      totalHoldingRefunded += amount;
    } else if (entry.entry_type === "payout_reserved") {
      totalPayoutsReserved += amount;
    } else if (entry.entry_type === "payout_rejected_refund") {
      totalPayoutReversals += amount;
    } else if (entry.entry_type === "clawback_offset") {
      totalClawbackOffset += amount;
    }

    lineItems.push({
      id: entry.id,
      timestamp: entry.created_at,
      entryType: entry.entry_type,
      description: entry.notes || entry.entry_type,
      holdingDeltaThb: holdingDelta,
      availableDeltaThb: availableDelta,
      payoutPendingDeltaThb: payoutPendingDelta,
      clawbackDebtDeltaThb: 0.0,
      whtRate: pr?.withholding_rate_applied ? Number(pr.withholding_rate_applied) : null,
      whtAmountThb: pr?.withholding_tax_amount_thb ? Number(pr.withholding_tax_amount_thb) : null,
      netPayoutThb: pr?.net_payout_amount_thb ? Number(pr.net_payout_amount_thb) : null,
      referenceId: entry.reference_id,
      referenceType: entry.reference_type,
      runningHoldingBalance: Number(entry.holding_balance_after || 0),
      runningAvailableBalance: Number(entry.available_balance_after || 0),
    });
  }

  // 3. คำนวณ Closing Balances ตามสมการคณิตศาสตร์
  const closingHoldingBalance = Number((openingHoldingBalance + totalNewCommissionEarned - totalHoldingReleased - totalHoldingRefunded).toFixed(2));
  const closingAvailableBalance = Number((openingAvailableBalance + totalHoldingReleased - totalClawbackOffset - totalPayoutsReserved + totalPayoutReversals).toFixed(2));

  return {
    partnerId: partner.id,
    partnerCode: partner.partner_code,
    tierCode: partner.tier_code,
    periodYear: year,
    periodMonth: month,
    periodLabel,
    openingHoldingBalance: Number(openingHoldingBalance.toFixed(2)),
    openingAvailableBalance: Number(openingAvailableBalance.toFixed(2)),
    totalNewCommissionEarned: Number(totalNewCommissionEarned.toFixed(2)),
    totalHoldingReleased: Number(totalHoldingReleased.toFixed(2)),
    totalHoldingRefunded: Number(totalHoldingRefunded.toFixed(2)),
    totalPayoutsReserved: Number(totalPayoutsReserved.toFixed(2)),
    totalPayoutReversals: Number(totalPayoutReversals.toFixed(2)),
    totalClawbackOffset: Number(totalClawbackOffset.toFixed(2)),
    closingHoldingBalance,
    closingAvailableBalance,
    lineItems,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 2. ส่งออกใบแจ้งยอดรายเดือนเป็น CSV (RFC 4180 + UTF-8 BOM)
 */
export function exportPartnerStatementCsv(statement: PartnerMonthlyStatement): string {
  const headers = [
    "Transaction Date (UTC)",
    "Transaction ID",
    "Entry Type",
    "Description",
    "Holding Delta (THB)",
    "Available Delta (THB)",
    "Payout Pending Delta (THB)",
    "Running Holding Balance (THB)",
    "Running Available Balance (THB)",
    "WHT Rate",
    "WHT Amount (THB)",
    "Net Payout (THB)",
    "Reference ID",
  ];

  const rows = statement.lineItems.map((item) => [
    item.timestamp,
    item.id,
    item.entryType,
    `"${(item.description || "").replace(/"/g, '""')}"`,
    item.holdingDeltaThb.toFixed(2),
    item.availableDeltaThb.toFixed(2),
    item.payoutPendingDeltaThb.toFixed(2),
    item.runningHoldingBalance.toFixed(2),
    item.runningAvailableBalance.toFixed(2),
    item.whtRate ? `${(item.whtRate * 100).toFixed(0)}%` : "-",
    item.whtAmountThb !== null && item.whtAmountThb !== undefined ? item.whtAmountThb.toFixed(2) : "-",
    item.netPayoutThb !== null && item.netPayoutThb !== undefined ? item.netPayoutThb.toFixed(2) : "-",
    item.referenceId || "-",
  ]);

  const summaryHeader = [
    `# PHOPEPHUM PARTNER MONTHLY STATEMENT - ${statement.periodLabel}`,
    `# Partner Code: ${statement.partnerCode} | Tier: ${statement.tierCode}`,
    `# Opening Available: ฿${statement.openingAvailableBalance.toFixed(2)} | Closing Available: ฿${statement.closingAvailableBalance.toFixed(2)}`,
    `# Opening Holding: ฿${statement.openingHoldingBalance.toFixed(2)} | Closing Holding: ฿${statement.closingHoldingBalance.toFixed(2)}`,
    `# Total Commission Earned: ฿${statement.totalNewCommissionEarned.toFixed(2)} | Total Payout Reserved: ฿${statement.totalPayoutsReserved.toFixed(2)}`,
    "",
  ];

  const csvBody = [summaryHeader.join("\n"), headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  // Prepend UTF-8 BOM for Thai Excel support
  return `\uFEFF${csvBody}`;
}

/**
 * 3. สร้างรายงานการหักภาษี ณ ที่จ่าย 50 ทวิ (WHT 50 Tawi Report)
 */
export async function generateWht50TawiReport(options: {
  year: number;
  month: number;
  env: Env;
}): Promise<Wht50TawiReport> {
  const { year, month, env } = options;
  const supabase = getServiceRoleClient(env);

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const periodLabel = `${year}-${String(month).padStart(2, "0")}`;

  // ดึงรายการคำขอถอนเงินที่จ่ายเงินแล้ว (status = 'completed') ในงวด
  const { data: payouts } = await supabase
    .from("payout_requests")
    .select(`
      id,
      request_number,
      partner_id,
      requested_amount_thb,
      withholding_rate_applied,
      withholding_tax_amount_thb,
      net_payout_amount_thb,
      updated_at,
      partner_entities (
        partner_code,
        partner_tax_profiles (
          tax_id,
          legal_name,
          entity_type,
          registered_address
        )
      ),
      omise_transfers (
        omise_transfer_id,
        paid_at
      )
    `)
    .eq("status", "completed")
    .gte("updated_at", startDate.toISOString())
    .lte("updated_at", endDate.toISOString())
    .order("updated_at", { ascending: true });

  const records: Wht50TawiCertificateRecord[] = [];
  let totalGross = 0.0;
  let totalWht = 0.0;
  let totalNet = 0.0;

  for (const row of payouts || []) {
    const partner = Array.isArray(row.partner_entities) ? row.partner_entities[0] : row.partner_entities;
    const taxProfile = partner?.partner_tax_profiles
      ? Array.isArray(partner.partner_tax_profiles)
        ? partner.partner_tax_profiles[0]
        : partner.partner_tax_profiles
      : null;
    const trsf = Array.isArray(row.omise_transfers) ? row.omise_transfers[0] : row.omise_transfers;

    const gross = Number(row.requested_amount_thb || 0);
    const wht = Number(row.withholding_tax_amount_thb || 0);
    const net = Number(row.net_payout_amount_thb || 0);

    totalGross += gross;
    totalWht += wht;
    totalNet += net;

    records.push({
      payoutRequestId: row.id,
      requestNumber: row.request_number,
      partnerId: row.partner_id,
      partnerCode: partner?.partner_code || "UNKNOWN",
      taxId: taxProfile?.tax_id || "UNREGISTERED",
      legalName: taxProfile?.legal_name || "Partner Legal Name",
      entityType: (taxProfile?.entity_type as "individual" | "corporate") || "individual",
      registeredAddress: taxProfile?.registered_address || {},
      paymentDate: trsf?.paid_at || row.updated_at,
      incomeType: "commission_income",
      grossAmountThb: gross,
      whtRateApplied: Number(row.withholding_rate_applied || 0),
      whtAmountThb: wht,
      netPaidAmountThb: net,
      whtCertificateNumber: `WHT-${periodLabel}-${row.request_number.slice(-6)}`,
      omiseTransferId: trsf?.omise_transfer_id || null,
    });
  }

  return {
    periodYear: year,
    periodMonth: month,
    periodLabel,
    totalCertificatesCount: records.length,
    totalGrossIncomeThb: Number(totalGross.toFixed(2)),
    totalWhtRemittedThb: Number(totalWht.toFixed(2)),
    totalNetPaidThb: Number(totalNet.toFixed(2)),
    records,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 4. ส่งออกรายงาน 50 ทวิเป็น CSV สำหรับสรรพากร/ผู้สอบบัญชี
 */
export function exportWht50TawiCsv(report: Wht50TawiReport): string {
  const headers = [
    "ลำดับ",
    "เลขที่ใบรับรอง (50 ทวิ)",
    "หมายเลขคำขอเบิกเงิน",
    "รหัสพันธมิตร",
    "เลขประจำตัวผู้เสียภาษี",
    "ชื่อผู้มีเงินได้ตามทะเบียนภาษี",
    "ประเภทบุคคล",
    "วันที่จ่ายเงิน",
    "ประเภทเงินได้",
    "จำนวนเงินได้พึงประเมิน (บาท)",
    "อัตราภาษีหัก ณ ที่จ่าย",
    "จำนวนภาษีที่หักและนำส่ง (บาท)",
    "ยอดเงินโอนสุทธิ (บาท)",
    "รหัสธุรกรรม Omise",
  ];

  const rows = report.records.map((r, index) => [
    index + 1,
    r.whtCertificateNumber || "-",
    r.requestNumber,
    r.partnerCode,
    `'${r.taxId}`,
    `"${(r.legalName || "").replace(/"/g, '""')}"`,
    r.entityType === "corporate" ? "นิติบุคคล" : "บุคคลธรรมดา",
    r.paymentDate,
    "ค่าคอมมิชชันและบริการตามสัญญาพันธมิตร",
    r.grossAmountThb.toFixed(2),
    `${(r.whtRateApplied * 100).toFixed(0)}%`,
    r.whtAmountThb.toFixed(2),
    r.netPaidAmountThb.toFixed(2),
    r.omiseTransferId || "-",
  ]);

  const summaryHeader = [
    `# รายงานสรุปการหักภาษี ณ ที่จ่าย (ใบ 50 ทวิ) ประจำงวด ${report.periodLabel}`,
    `# จำนวนรายการ: ${report.totalCertificatesCount} รายการ`,
    `# รวมเงินได้พึงประเมิน: ฿${report.totalGrossIncomeThb.toFixed(2)} | รวมภาษีหักนำส่ง: ฿${report.totalWhtRemittedThb.toFixed(2)} | รวมยอดจ่ายสุทธิ: ฿${report.totalNetPaidThb.toFixed(2)}`,
    "",
  ];

  const csvBody = [summaryHeader.join("\n"), headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  return `\uFEFF${csvBody}`;
}

/**
 * 5. ดึงภาพรวมสถิติการเงินสำหรับฝ่ายปฏิบัติการ (Finance Operations Overview)
 */
export async function getFinanceOperationsOverview(options: {
  env: Env;
}): Promise<FinanceOperationsSummary> {
  const { env } = options;
  const supabase = getServiceRoleClient(env);

  // 1. ดึงสถิติ Partner Entities
  const { data: partners } = await supabase
    .from("partner_entities")
    .select("status, holding_balance, available_balance, payout_pending_balance, total_earned, total_withdrawn");

  const allPartners = partners || [];
  const activePartnersCount = allPartners.filter((p) => p.status === "active").length;
  const totalHolding = allPartners.reduce((s, p) => s + Number(p.holding_balance || 0), 0);
  const totalAvailable = allPartners.reduce((s, p) => s + Number(p.available_balance || 0), 0);
  const totalPending = allPartners.reduce((s, p) => s + Number(p.payout_pending_balance || 0), 0);
  const totalEarned = allPartners.reduce((s, p) => s + Number(p.total_earned || 0), 0);
  const totalWithdrawn = allPartners.reduce((s, p) => s + Number(p.total_withdrawn || 0), 0);

  // 2. ดึงคำขอถอนเงินที่รอดำเนินการ
  const { data: pendingPayouts } = await supabase
    .from("payout_requests")
    .select("requested_amount_thb")
    .in("status", ["pending_review", "approved", "processing"]);

  const allPendingPayouts = pendingPayouts || [];
  const pendingAmount = allPendingPayouts.reduce((s, p) => s + Number(p.requested_amount_thb || 0), 0);

  // 3. ดึงสถานะ Reconciliation ล่าสุด
  const { data: lastRun } = await supabase
    .from("financial_reconciliation_runs")
    .select("status")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. ดึงจำนวน Discrepancies ที่เปิดอยู่
  const { count: openDiscCount } = await supabase
    .from("financial_reconciliation_discrepancies")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return {
    activePartnersCount,
    totalHoldingBalanceThb: Number(totalHolding.toFixed(2)),
    totalAvailableBalanceThb: Number(totalAvailable.toFixed(2)),
    totalPayoutPendingThb: Number(totalPending.toFixed(2)),
    totalLifetimeEarnedThb: Number(totalEarned.toFixed(2)),
    totalLifetimeWithdrawnThb: Number(totalWithdrawn.toFixed(2)),
    pendingPayoutRequestsCount: allPendingPayouts.length,
    pendingPayoutAmountThb: Number(pendingAmount.toFixed(2)),
    lastReconciliationStatus: (lastRun?.status as "green" | "yellow" | "red") || "green",
    openDiscrepanciesCount: openDiscCount || 0,
  };
}
