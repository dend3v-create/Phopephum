import { json } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher, Link, useSearchParams } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import {
  getAdminPayoutQueue,
  getFinancialJobLogs,
  getAdminFinancialAuditLogs,
} from "~/services/payoutOperations.server";
import { getPartnerReconciliationAudit } from "~/services/settlement.server";
import type { Env } from "~/env.server";
import { useState } from "react";
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldCheck,
  Send,
  Eye,
  FileText,
  Building2,
  TrendingUp,
  History,
  Activity,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "ระบบการเงินพันธมิตร & อนุมัติถอนเงิน — PhopePhum Admin" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  if (!profile || !["admin", "finance_officer"].includes(profile.role)) {
    throw new Response("Forbidden: สำหรับผู้ดูแลระบบการเงินเท่านั้น", { status: 403 });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "all";
  const activeTab = url.searchParams.get("tab") || "queue";

  const [payoutsData, jobLogsData, auditLogsData, reconAudit] = await Promise.all([
    getAdminPayoutQueue({ status: statusFilter, limit: 100, env }),
    getFinancialJobLogs({ limit: 30, env }),
    getAdminFinancialAuditLogs({ limit: 50, env }),
    getPartnerReconciliationAudit({ env }).catch(() => null),
  ]);

  // Calculate Summary Metrics
  const allItems = payoutsData.items || [];
  const pendingReviewItems = allItems.filter((p: any) => p.status === "pending_review");
  const approvedItems = allItems.filter((p: any) => p.status === "approved");
  const processingItems = allItems.filter((p: any) => p.status === "processing");
  const completedItems = allItems.filter((p: any) => p.status === "completed");

  const totalPendingThb = pendingReviewItems.reduce((acc: number, p: any) => acc + Number(p.net_payout_amount_thb || 0), 0);
  const totalApprovedThb = approvedItems.reduce((acc: number, p: any) => acc + Number(p.net_payout_amount_thb || 0), 0);
  const totalProcessingThb = processingItems.reduce((acc: number, p: any) => acc + Number(p.net_payout_amount_thb || 0), 0);
  const totalCompletedThb = completedItems.reduce((acc: number, p: any) => acc + Number(p.net_payout_amount_thb || 0), 0);

  return json({
    profile,
    statusFilter,
    activeTab,
    payouts: payoutsData.items || [],
    totalPayouts: payoutsData.total || 0,
    jobLogs: jobLogsData.items || [],
    auditLogs: auditLogsData.items || [],
    reconAudit,
    metrics: {
      pendingReviewCount: pendingReviewItems.length,
      pendingReviewThb: totalPendingThb,
      approvedCount: approvedItems.length,
      approvedThb: totalApprovedThb,
      processingCount: processingItems.length,
      processingThb: totalProcessingThb,
      completedCount: completedItems.length,
      completedThb: totalCompletedThb,
    },
  });
}

export default function AdminPayoutsPage() {
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<any>();

  const currentTab = searchParams.get("tab") || "queue";
  const currentStatus = searchParams.get("status") || "all";

  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"detail" | "approve" | "reject" | "transfer" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [selectedJobLog, setSelectedJobLog] = useState<any | null>(null);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params);
  };

  const handleStatusFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("status", status);
    setSearchParams(params);
  };

  const isSubmitting = fetcher.state !== "idle";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> รอตรวจสอบ</span>;
      case "approved":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> อนุมัติแล้ว (พร้อมโอน)</span>;
      case "processing":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 animate-pulse"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังโอน (Omise)</span>;
      case "completed":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> โอนสำเร็จ</span>;
      case "rejected":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> ปฏิเสธ (คืนยอดแล้ว)</span>;
      case "failed":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> โอนไม่สำเร็จ</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-4 pb-24 px-4 sm:px-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#C6A96B]">
            <span>ADMIN FINANCIAL OPERATIONS</span>
            <span>•</span>
            <span>STEP 6.5.6</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F8F6F1] mt-1">
            ระบบการเงินพันธมิตร & คิวอนุมัติถอนเงิน
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            จัดการคำขอถอนเงิน, ตรวจสอบภาษีหัก ณ ที่จ่าย 3%, ส่งคำสั่งโอนผ่าน Omise Transfer และติดตาม Audit Trail
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <fetcher.Form method="post" action="/api/admin/payout-action">
            <input type="hidden" name="intent" value="run_clearance" />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#C6A96B]/40 bg-[#C6A96B]/10 hover:bg-[#C6A96B]/20 text-[#C6A96B] transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
              <span>รัน Holding Clearance ทันที</span>
            </button>
          </fetcher.Form>

          <Link
            to="/admin"
            className="px-4 py-2 text-xs font-bold rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            ← กลับแดชบอร์ด
          </Link>
        </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 card-glass-premium">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>รอตรวจสอบ (Review)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-200">
            ฿{data.metrics.pendingReviewThb.toLocaleString()}
          </div>
          <div className="text-xs text-[#94A3B8] mt-1">
            {data.metrics.pendingReviewCount} รายการรอดำเนินการ
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 card-glass-premium">
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
            <span>อนุมัติแล้ว (Approved)</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-200">
            ฿{data.metrics.approvedThb.toLocaleString()}
          </div>
          <div className="text-xs text-[#94A3B8] mt-1">
            {data.metrics.approvedCount} รายการพร้อมโอน
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 card-glass-premium">
          <div className="flex items-center justify-between text-xs text-purple-400 font-semibold">
            <span>กำลังโอน (Processing)</span>
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-200">
            ฿{data.metrics.processingThb.toLocaleString()}
          </div>
          <div className="text-xs text-[#94A3B8] mt-1">
            {data.metrics.processingCount} รายการในระบบ Omise
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 card-glass-premium">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>โอนสำเร็จสะสม (Settled)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-200">
            ฿{data.metrics.completedThb.toLocaleString()}
          </div>
          <div className="text-xs text-[#94A3B8] mt-1">
            {data.metrics.completedCount} รายการเสร็จสิ้น
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => handleTabChange("queue")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            currentTab === "queue"
              ? "bg-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
              : "text-[#94A3B8] hover:text-white hover:bg-white/5"
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>คิวอนุมัติถอนเงิน ({data.totalPayouts})</span>
        </button>

        <button
          onClick={() => handleTabChange("monitoring")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            currentTab === "monitoring"
              ? "bg-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
              : "text-[#94A3B8] hover:text-white hover:bg-white/5"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Holding Clearance Logs</span>
        </button>

        <button
          onClick={() => handleTabChange("audit")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            currentTab === "audit"
              ? "bg-[#C6A96B] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
              : "text-[#94A3B8] hover:text-white hover:bg-white/5"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Admin Audit Trail ({data.auditLogs.length})</span>
        </button>
      </div>

      {/* ── TAB 1: PAYOUT QUEUE ── */}
      {currentTab === "queue" && (
        <div className="space-y-4">
          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#94A3B8] font-semibold">กรองสถานะ:</span>
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "pending_review", label: "รอตรวจสอบ" },
              { id: "approved", label: "อนุมัติแล้ว" },
              { id: "processing", label: "กำลังโอน" },
              { id: "completed", label: "โอนสำเร็จ" },
              { id: "failed", label: "ล้มเหลว" },
              { id: "rejected", label: "ปฏิเสธ" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => handleStatusFilterChange(st.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  currentStatus === st.id
                    ? "bg-[#C6A96B]/20 text-[#C6A96B] border border-[#C6A96B]/50"
                    : "bg-white/5 text-[#94A3B8] hover:text-white border border-transparent"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Payouts Table */}
          <div className="rounded-2xl border border-white/10 overflow-hidden card-glass-premium shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E2E8F0]">
                <thead className="bg-white/5 text-[11px] font-bold text-[#C6A96B] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3.5">พันธมิตร</th>
                    <th className="px-4 py-3.5">บัญชีธนาคาร</th>
                    <th className="px-4 py-3.5">ยอดขอถอน (Gross)</th>
                    <th className="px-4 py-3.5">หัก WHT 3%</th>
                    <th className="px-4 py-3.5 font-black text-emerald-400">ยอดโอนสุทธิ (Net)</th>
                    <th className="px-4 py-3.5">สถานะ</th>
                    <th className="px-4 py-3.5">วันที่ขอ</th>
                    <th className="px-4 py-3.5 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.payouts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#64748B]">
                        ไม่มีรายการคำขอถอนเงินในสถานะนี้
                      </td>
                    </tr>
                  ) : (
                    data.payouts.map((p: any) => {
                      const partner = p.partner_entities;
                      const profileUser = partner?.profiles;
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-white">
                              {profileUser?.display_name || "ไม่ระบุชื่อ"}
                            </div>
                            <div className="text-[10px] text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[#C6A96B]">
                                {partner?.partner_code || "N/A"}
                              </span>
                              <span>• {profileUser?.email}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-200">
                              {partner?.bank_account_brand?.toUpperCase()} {partner?.bank_account_number}
                            </div>
                            <div className="text-[10px] text-[#94A3B8]">
                              {partner?.bank_account_name}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-bold text-slate-300">
                            ฿{Number(p.requested_amount_thb).toLocaleString()}
                          </td>

                          <td className="px-4 py-3.5 text-amber-400 font-medium">
                            ฿{Number(p.wht_amount_thb).toLocaleString()}
                          </td>

                          <td className="px-4 py-3.5 font-black text-emerald-300 text-sm">
                            ฿{Number(p.net_payout_amount_thb).toLocaleString()}
                          </td>

                          <td className="px-4 py-3.5">
                            {getStatusBadge(p.status)}
                          </td>

                          <td className="px-4 py-3.5 text-[#94A3B8] text-[11px]">
                            {new Date(p.created_at).toLocaleString("th-TH", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => {
                                  setSelectedPayout(p);
                                  setModalMode("detail");
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-colors"
                                title="ดูรายละเอียดพันธมิตร"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* State: Pending Review -> Approve or Reject */}
                              {p.status === "pending_review" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedPayout(p);
                                      setModalMode("approve");
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 transition-colors"
                                  >
                                    อนุมัติ
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedPayout(p);
                                      setRejectReason("");
                                      setEvidenceUrl("");
                                      setModalMode("reject");
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] border border-rose-500/30 transition-colors"
                                  >
                                    ปฏิเสธ
                                  </button>
                                </>
                              )}

                              {/* State: Approved or Failed -> Execute Transfer */}
                              {(p.status === "approved" || p.status === "failed") && (
                                <button
                                  onClick={() => {
                                    setSelectedPayout(p);
                                    setModalMode("transfer");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#C6A96B] hover:bg-[#D4BC84] text-[#020617] font-black text-[11px] shadow-md transition-colors flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{p.status === "failed" ? "ลองโอนใหม่" : "โอนเงิน"}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MONITORING (HOLDING CLEARANCE JOB LOGS) ── */}
      {currentTab === "monitoring" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#F8F6F1]">
              ประวัติการรัน Monitored Holding Clearance (14-Day Holding)
            </h2>
            <span className="text-xs text-[#94A3B8]">
              3 Operational Balances + 1 Clawback Debt Architecture
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden card-glass-premium shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E2E8F0]">
                <thead className="bg-white/5 text-[11px] font-bold text-[#C6A96B] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3.5">Job ID & เวลา</th>
                    <th className="px-4 py-3.5">ประเภท Job</th>
                    <th className="px-4 py-3.5">สถานะ</th>
                    <th className="px-4 py-3.5">สำเร็จ (Processed)</th>
                    <th className="px-4 py-3.5">ซ้ำ (Duplicate)</th>
                    <th className="px-4 py-3.5">ล้มเหลว (Failed)</th>
                    <th className="px-4 py-3.5">ยอดเงินที่ปลดล็อก</th>
                    <th className="px-4 py-3.5 text-right">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.jobLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#64748B]">
                        ยังไม่มีประวัติการรัน Job
                      </td>
                    </tr>
                  ) : (
                    data.jobLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-[10px] text-slate-400">
                            {log.id.slice(0, 8)}...
                          </div>
                          <div className="text-[11px] text-slate-300">
                            {new Date(log.createdAt).toLocaleString("th-TH")}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-bold text-white">
                          {log.jobType}
                        </td>

                        <td className="px-4 py-3.5">
                          {log.status === "completed" ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              สมบูรณ์ (100%)
                            </span>
                          ) : log.status === "partial" ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              สำเร็จบางส่วน (Partial)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              ล้มเหลว (Failed)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-bold text-emerald-300">
                          {log.processedCount} รายการ
                        </td>

                        <td className="px-4 py-3.5 text-slate-400">
                          {log.duplicateCount} รายการ
                        </td>

                        <td className="px-4 py-3.5 font-bold text-rose-400">
                          {log.failedCount} รายการ
                        </td>

                        <td className="px-4 py-3.5 font-black text-[#C6A96B]">
                          ฿{log.totalAmountThb.toLocaleString()}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {log.failureDetails && log.failureDetails.length > 0 ? (
                            <button
                              onClick={() => setSelectedJobLog(log)}
                              className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/40"
                            >
                              ดูข้อผิดพลาด ({log.failureDetails.length})
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ADMIN FINANCIAL AUDIT TRAIL ── */}
      {currentTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#F8F6F1]">
              บันทึกประวัติการกระทำของ Admin (Immutable Financial Audit Log)
            </h2>
            <span className="text-xs text-[#94A3B8]">
              บันทึกทุกการ Approve, Reject, Transfer, และ Balance Transition
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden card-glass-premium shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E2E8F0]">
                <thead className="bg-white/5 text-[11px] font-bold text-[#C6A96B] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3.5">เวลา & ผู้ดำเนินการ</th>
                    <th className="px-4 py-3.5">การกระทำ (Action)</th>
                    <th className="px-4 py-3.5">การเปลี่ยนสถานะ</th>
                    <th className="px-4 py-3.5">ยอดเงิน</th>
                    <th className="px-4 py-3.5">เหตุผล / หลักฐาน</th>
                    <th className="px-4 py-3.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#64748B]">
                        ยังไม่มีบันทึก Audit Log
                      </td>
                    </tr>
                  ) : (
                    data.auditLogs.map((a: any) => (
                      <tr key={a.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-white">
                            {a.adminProfile?.displayName || "Admin User"}
                          </div>
                          <div className="text-[10px] text-[#94A3B8]">
                            {new Date(a.createdAt).toLocaleString("th-TH")}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-[#C6A96B]">
                          {a.action}
                        </td>

                        <td className="px-4 py-3.5 text-[11px]">
                          <span className="text-slate-400">{a.previousStatus || "none"}</span>
                          <span className="mx-1 text-[#C6A96B]">→</span>
                          <span className="font-bold text-white">{a.newStatus}</span>
                        </td>

                        <td className="px-4 py-3.5 font-bold text-emerald-300">
                          {a.amountThb ? `฿${a.amountThb.toLocaleString()}` : "-"}
                        </td>

                        <td className="px-4 py-3.5 text-slate-300">
                          <div>{a.reason || "-"}</div>
                          {a.evidenceUrl && (
                            <a
                              href={a.evidenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <ExternalLink className="w-3 h-3" /> หลักฐานแนบ
                            </a>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">
                          {a.ipAddress || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PARTNER FINANCIAL DETAIL & KYC INSPECTOR ── */}
      {modalMode === "detail" && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-[#C6A96B]/40 bg-[#0A1628] p-6 space-y-4 shadow-2xl card-glass-premium">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-black text-lg text-white">
                ข้อมูลพันธมิตร & 3 Operational Balances
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">ชื่อพันธมิตร</span>
                  <span className="font-bold text-white text-sm">
                    {selectedPayout.partner_entities?.profiles?.display_name}
                  </span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">รหัสพันธมิตร</span>
                  <span className="font-mono font-bold text-[#C6A96B]">
                    {selectedPayout.partner_entities?.partner_code}
                  </span>
                </div>
              </div>

              {/* 3 Operational Balances + 1 Clawback Debt */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
                <div className="text-[11px] font-bold text-[#C6A96B] uppercase tracking-wider">
                  สถานะทางบัญชี (3 Operational Balances + 1 Clawback Debt)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-slate-400 block text-[10px]">1. Holding Balance (14d)</span>
                    <span className="font-bold text-white">
                      ฿{Number(selectedPayout.partner_entities?.holding_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-emerald-300 block text-[10px]">2. Available Balance</span>
                    <span className="font-bold text-emerald-200">
                      ฿{Number(selectedPayout.partner_entities?.available_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="text-purple-300 block text-[10px]">3. Payout Pending</span>
                    <span className="font-bold text-purple-200">
                      ฿{Number(selectedPayout.partner_entities?.payout_pending_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-rose-300 block text-[10px]">4. Clawback Debt (ภาระหนี้)</span>
                    <span className="font-bold text-rose-200">
                      ฿{Number(selectedPayout.partner_entities?.clawback_pending_balance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank & Tax Details */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="text-[11px] font-bold text-white">ข้อมูลบัญชีธนาคารสำหรับโอน</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ธนาคาร:</span>
                  <span className="font-bold text-white">
                    {selectedPayout.partner_entities?.bank_account_brand?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">เลขที่บัญชี:</span>
                  <span className="font-mono font-bold text-[#C6A96B]">
                    {selectedPayout.partner_entities?.bank_account_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ชื่อบัญชี:</span>
                  <span className="font-bold text-white">
                    {selectedPayout.partner_entities?.bank_account_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">เลขประจำตัวผู้เสียภาษี:</span>
                  <span className="font-mono text-slate-300">
                    {selectedPayout.partner_entities?.tax_id || "ไม่ได้ระบุ"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: APPROVE CONFIRMATION ── */}
      {modalMode === "approve" && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/40 bg-[#0A1628] p-6 space-y-4 shadow-2xl card-glass-premium">
            <div className="flex items-center gap-2 text-emerald-400 font-display font-black text-lg">
              <ShieldCheck className="w-5 h-5" />
              <span>ยืนยันการอนุมัติคำขอถอนเงิน</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">พันธมิตร:</span>
                <span className="font-bold text-white">
                  {selectedPayout.partner_entities?.profiles?.display_name} ({selectedPayout.partner_entities?.partner_code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ยอดขอถอน (Gross):</span>
                <span className="font-bold text-slate-200">
                  ฿{Number(selectedPayout.requested_amount_thb).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">หักภาษี ณ ที่จ่าย 3% (WHT):</span>
                <span className="font-bold text-amber-400">
                  ฿{Number(selectedPayout.wht_amount_thb).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-white/10">
                <span className="text-emerald-300">ยอดเงินที่ต้องโอนสุทธิ (Net):</span>
                <span className="text-emerald-400">
                  ฿{Number(selectedPayout.net_payout_amount_thb).toLocaleString()}
                </span>
              </div>
            </div>

            <fetcher.Form
              method="post"
              action="/api/admin/payout-action"
              onSubmit={() => setModalMode(null)}
              className="space-y-3"
            >
              <input type="hidden" name="intent" value="approve" />
              <input type="hidden" name="payoutRequestId" value={selectedPayout.id} />
              <input
                type="text"
                name="reason"
                defaultValue="อนุมัติการถอนเงินหลังตรวจสอบ KYC/ภาษีถูกต้อง"
                placeholder="ระบุหมายเหตุการอนุมัติ (ถ้ามี)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C6A96B]"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-500/20"
                >
                  ยืนยันอนุมัติคำขอ
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      )}

      {/* ── MODAL: REJECT CONFIRMATION ── */}
      {modalMode === "reject" && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-[#0A1628] p-6 space-y-4 shadow-2xl card-glass-premium">
            <div className="flex items-center gap-2 text-rose-400 font-display font-black text-lg">
              <XCircle className="w-5 h-5" />
              <span>ปฏิเสธคำขอถอนเงิน (คืนยอดเข้า Available)</span>
            </div>

            <p className="text-xs text-[#94A3B8]">
              เมื่อปฏิเสธ ยอดเงินจำนวน ฿{Number(selectedPayout.requested_amount_thb).toLocaleString()} จะถูกคืนกลับเข้า <b>Available Balance</b> ของพันธมิตรทันที และบันทึก Audit Log
            </p>

            <fetcher.Form
              method="post"
              action="/api/admin/payout-action"
              onSubmit={() => setModalMode(null)}
              className="space-y-3 text-xs"
            >
              <input type="hidden" name="intent" value="reject" />
              <input type="hidden" name="payoutRequestId" value={selectedPayout.id} />

              <div>
                <label className="block text-[11px] font-bold text-rose-300 mb-1">
                  เหตุผลในการปฏิเสธ (บังคับระบุ) *
                </label>
                <textarea
                  name="reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="เช่น ข้อมูลบัญชีธนาคารไม่ตรงกับชื่อผู้สมัคร หรือหลักฐาน KYC ไม่ผ่าน"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-rose-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ลิงก์หลักฐานแนบ (ถ้ามี)
                </label>
                <input
                  type="url"
                  name="evidenceUrl"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C6A96B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  ยืนยันปฏิเสธคำขอ
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      )}

      {/* ── MODAL: EXECUTE OMISE TRANSFER ── */}
      {modalMode === "transfer" && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-[#C6A96B]/50 bg-[#0A1628] p-6 space-y-4 shadow-2xl card-glass-premium">
            <div className="flex items-center gap-2 text-[#C6A96B] font-display font-black text-lg">
              <Send className="w-5 h-5" />
              <span>ส่งคำสั่งโอนเงินออก (Omise Transfer API)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">ผู้รับเงิน:</span>
                <span className="font-bold text-white">
                  {selectedPayout.partner_entities?.bank_account_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ธนาคาร & เลขบัญชี:</span>
                <span className="font-mono font-bold text-[#C6A96B]">
                  {selectedPayout.partner_entities?.bank_account_brand?.toUpperCase()} {selectedPayout.partner_entities?.bank_account_number}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-white/10">
                <span className="text-emerald-300">ยอดเงินโอนสุทธิ (Net Payout):</span>
                <span className="text-emerald-400">
                  ฿{Number(selectedPayout.net_payout_amount_thb).toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#94A3B8]">
              ระบบจะสร้างคำสั่งโอนเงินผ่าน Omise Transfer API ไปยังธนาคารปลายทาง โดยเงินจะเข้าบัญชีตามรอบเวลาของธนาคาร (T+1 Banking Day)
            </p>

            <fetcher.Form
              method="post"
              action="/api/admin/payout-action"
              onSubmit={() => setModalMode(null)}
              className="flex items-center justify-end gap-2 pt-2"
            >
              <input type="hidden" name="intent" value="transfer" />
              <input type="hidden" name="payoutRequestId" value={selectedPayout.id} />

              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#C6A96B] hover:bg-[#D4BC84] text-[#020617] font-black text-xs shadow-lg shadow-[#C6A96B]/20"
              >
                ยืนยันส่งคำสั่งโอนเงิน
              </button>
            </fetcher.Form>
          </div>
        </div>
      )}

      {/* ── MODAL: JOB FAILURE DETAILS ── */}
      {selectedJobLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-rose-500/40 bg-[#0A1628] p-6 space-y-4 shadow-2xl card-glass-premium">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertTriangle className="w-5 h-5" />
                <span>รายละเอียดรายการที่ไม่สำเร็จ (Failure Details)</span>
              </div>
              <button
                onClick={() => setSelectedJobLog(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
              {selectedJobLog.failureDetails.map((f: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 font-mono text-[11px] text-rose-200">
                  <div className="text-white font-bold">Event ID: {f.event_id}</div>
                  <div>Partner ID: {f.partner_id}</div>
                  <div>Amount: ฿{f.amount_thb}</div>
                  <div className="text-rose-400 font-semibold mt-1">Error: {f.error}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedJobLog(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
