import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import type { Env } from "~/env.server";
import { useState, useMemo } from "react";
import { 
  Users, 
  Award, 
  DollarSign, 
  Share2, 
  Copy, 
  Check, 
  History, 
  ArrowUpRight, 
  ShieldCheck, 
  Wallet,
  Coins,
  Send,
  HelpCircle,
  TrendingUp,
  Star,
  Clock,
  AlertTriangle,
  FileText,
  Lock,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  Building,
  CreditCard,
  QrCode,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  getOrCreatePartnerProfile,
  getPartnerLedgerHistory,
  getPartnerPayoutRequests,
  getPartnerCommissionHistory,
  getPartnerReferralPerformance,
  requestPartnerPayout,
  updatePartnerBankInfo,
  updatePartnerTaxProfile,
  getPartnerBenefits,
  getPartnerTermsStatus,
  acceptPartnerTerms,
} from "~/services/partner.server";
import type {
  PartnerProfileRecord,
  PartnerLedgerEntry,
  PayoutRequestRecord,
  PartnerCommissionItem,
  PartnerReferralPerformance,
  PartnerBenefit,
} from "@phopephum/types";

export const meta: MetaFunction = () => [
  { title: "ระบบพันธมิตร (Partner & Affiliate Portal) — PhopePhum" },
];

/**
 * Masking helper for client-side display safety
 */
function maskBankAccount(acc: string): string {
  if (!acc) return "—";
  const clean = acc.replace(/[\s-]/g, "");
  if (clean.length < 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

function maskName(name: string): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p.length <= 2 ? p : `${p[0]}*** ${p[p.length - 1]}`).join(" ");
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  let profile = await getProfile(user.id, request, env);
  const { supabase } = createSupabaseClient(request, env);

  // ตรวจสอบ referral_code ของ Profile หากยังไม่มี ให้สร้างขึ้นมา
  if (profile && !profile.referral_code) {
    const fallbackCode = user.id.replace(/-/g, "").substring(0, 8).toUpperCase();
    await supabase
      .from("profiles")
      .update({ referral_code: fallbackCode })
      .eq("id", user.id);
    profile = { ...profile, referral_code: fallbackCode };
  }

  // ดึงข้อมูล Partner ทั้งหมดจาก Single Source of Truth
  const [
    partnerProfile,
    partnerLedger,
    payoutRequests,
    commissionHistory,
    referralPerformance,
  ] = await Promise.all([
    getOrCreatePartnerProfile(user.id, env),
    getPartnerLedgerHistory(user.id, env, 50),
    getPartnerPayoutRequests(user.id, env),
    getPartnerCommissionHistory({ userId: user.id, limit: 50, env }),
    getPartnerReferralPerformance({ userId: user.id, env }),
  ]);

  const partnerBenefits = partnerProfile ? await getPartnerBenefits(partnerProfile.id, env) : [];
  const termsStatus = partnerProfile ? await getPartnerTermsStatus(partnerProfile.id, env) : { accepted: true, activeVersion: "v2026.1" };

  return json({
    user,
    profile,
    partnerProfile,
    partnerLedger,
    payoutRequests,
    commissionHistory: commissionHistory.items,
    commissionTotal: commissionHistory.total,
    referralPerformance,
    partnerBenefits,
    termsStatus,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // 0. ยอมรับข้อตกลงและเงื่อนไขพันธมิตร (Accept Partner Terms)
  if (intent === "accept_terms") {
    const partner = await getOrCreatePartnerProfile(user.id, env);
    if (!partner) {
      return json({ error: "ไม่พบข้อมูลพันธมิตร", success: false });
    }
    const termsVersion = (formData.get("termsVersion") as string) || "v2026.1";
    const res = await acceptPartnerTerms({
      partnerId: partner.id,
      termsVersion,
      request,
      env,
    });
    if (!res.success) {
      return json({ error: res.error || "ไม่สามารถบันทึกการยอมรับข้อตกลงได้", success: false });
    }
    return json({ success: true, message: `ยอมรับข้อตกลงพันธมิตร (${termsVersion}) เรียบร้อยแล้ว` });
  }

  // 1. ยื่นคำขอถอนเงินสด (Payout Request Atomic)
  if (intent === "request_payout") {
    const amountStr = formData.get("amount") as string;
    const amount = parseFloat(amountStr);
    const bankName = (formData.get("bankName") as string) || "";
    const accountNo = (formData.get("accountNo") as string) || "";
    const accountName = (formData.get("accountName") as string) || "";
    const taxId = (formData.get("taxId") as string) || "";

    if (isNaN(amount) || amount < 500) {
      return json({ error: "ยอดถอนขั้นต่ำคือ 500 บาท", success: false });
    }

    if (!bankName || !accountNo || !accountName) {
      return json({ error: "กรุณาระบุข้อมูลบัญชีธนาคารให้ครบถ้วนก่อนส่งคำขอถอนเงิน", success: false });
    }

    const res = await requestPartnerPayout({
      partnerId: user.id,
      amount,
      bankInfo: {
        bankName,
        accountNo,
        accountName,
        taxId,
      },
      env,
    });

    if (!res.success) {
      return json({ error: res.error || "ไม่สามารถทำรายการถอนเงินได้", success: false });
    }

    return json({
      success: true,
      message: `ยื่นคำขอถอนเงิน ฿${amount.toLocaleString()} สำเร็จ! ยอดโอนสุทธิ (หลังหักภาษีตามกฎหมาย) คือ ฿${res.netPayout?.toLocaleString()} ระบบจะดำเนินการในรอบบัญชีถัดไป`,
    });
  }

  // 2. อัปเดตข้อมูลบัญชีธนาคารรับเงิน (Payout Destination)
  if (intent === "update_bank_info") {
    const bankName = (formData.get("bankName") as string) || "";
    const bankAccountNo = (formData.get("bankAccountNo") as string) || "";
    const bankAccountName = (formData.get("bankAccountName") as string) || "";
    const promptpayId = (formData.get("promptpayId") as string) || undefined;

    if (!bankName || !bankAccountNo || !bankAccountName) {
      return json({ error: "กรุณาระบุข้อมูลบัญชีธนาคารให้ครบถ้วน", success: false });
    }

    const ok = await updatePartnerBankInfo({
      userId: user.id,
      bankName,
      bankAccountNo,
      bankAccountName,
      promptpayId,
      env,
    });

    if (!ok) {
      return json({ error: "ไม่สามารถบันทึกข้อมูลบัญชีธนาคารได้", success: false });
    }

    return json({ success: true, message: "บันทึกข้อมูลบัญชีรับเงินเรียบร้อยแล้ว" });
  }

  // 3. อัปเดตข้อมูลภาษี (Tax Compliance Profile)
  if (intent === "update_tax_profile") {
    const entityType = ((formData.get("entityType") as string) || "individual") as "individual" | "corporate";
    const taxId = (formData.get("taxId") as string) || "";
    const legalName = (formData.get("legalName") as string) || "";
    const isVatRegistered = formData.get("isVatRegistered") === "true";
    const withholdingTaxExempt = formData.get("withholdingTaxExempt") === "true";

    if (!taxId || !legalName) {
      return json({ error: "กรุณาระบุเลขประจำตัวผู้เสียภาษีและชื่อตามทะเบียนภาษี", success: false });
    }

    const ok = await updatePartnerTaxProfile({
      userId: user.id,
      entityType,
      taxId,
      legalName,
      isVatRegistered,
      withholdingTaxExempt,
      env,
    });

    if (!ok) {
      return json({ error: "ไม่สามารถบันทึกข้อมูลภาษีได้", success: false });
    }

    return json({ success: true, message: "บันทึกข้อมูลภาษีเรียบร้อยแล้ว" });
  }

  return json({ error: "Invalid intent", success: false });
}

export default function PartnerPortalPage() {
  const {
    user,
    profile,
    partnerProfile,
    partnerLedger,
    payoutRequests,
    commissionHistory,
    referralPerformance,
    termsStatus,
  } = useLoaderData<typeof loader>();

  const actionData = useActionData<{ error?: string; message?: string; success?: boolean }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "commissions" | "referrals" | "payouts" | "ledger" | "settings">("overview");
  const [commissionFilter, setCommissionFilter] = useState<"all" | "holding" | "cleared" | "clawback_refunded">("all");
  const [customCampaign, setCustomCampaign] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(1000);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // Financial Figures
  const availableBalance = partnerProfile?.availableBalance ?? 0;
  const holdingBalance = partnerProfile?.holdingBalance ?? 0;
  const payoutPendingBalance = partnerProfile?.payoutPendingBalance ?? 0;
  const clawbackDebt = partnerProfile?.clawbackPendingBalance ?? 0;
  const totalEarned = partnerProfile?.totalEarned ?? 0;
  const totalWithdrawn = partnerProfile?.totalWithdrawn ?? 0;
  const tier = partnerProfile?.tierCode || "affiliate";
  const commissionRate = partnerProfile?.commissionRate || 7;
  const partnerCode = partnerProfile?.partnerCode || profile?.referral_code || "PARTNER";

  // Base URL for referral links
  const origin = typeof window !== "undefined" ? window.location.origin : "https://phopephum.com";
  const baseReferralLink = `${origin}/r/${partnerCode}`;
  const dynamicReferralLink = useMemo(() => {
    if (!customCampaign.trim()) return baseReferralLink;
    const cleanTag = encodeURIComponent(customCampaign.trim().toLowerCase().replace(/\s+/g, "_"));
    return `${baseReferralLink}?utm_source=partner&utm_campaign=${cleanTag}`;
  }, [baseReferralLink, customCampaign]);

  // Partner Status Computation
  const partnerStatus = useMemo(() => {
    if (partnerProfile?.status === "suspended" || partnerProfile?.verificationStatus === "rejected") {
      return {
        type: "suspended",
        badge: "🔴 ระงับชั่วคราว (Suspended)",
        label: "บัญชีถูกระงับชั่วคราว",
        desc: "กรุณาติดต่อทีมงานเพื่อตรวจสอบสถานะบัญชี",
        color: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        icon: XCircle,
      };
    }
    if (payoutPendingBalance > 0 || payoutRequests.some(p => p.status === "pending_review" || p.status === "processing")) {
      return {
        type: "payout_review",
        badge: "🟠 อยู่ระหว่างตรวจสอบการถอนเงิน (Payout Review)",
        label: "มีรายการคำขอถอนเงินที่กำลังดำเนินการ",
        desc: "ระบบกำลังตรวจสอบและดำเนินการโอนเงินตามรอบบัญชี",
        color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        icon: Clock,
      };
    }
    if (!partnerProfile?.taxId || !partnerProfile?.legalName) {
      return {
        type: "tax_review",
        badge: "🟡 กรุณาอัปเดตข้อมูลภาษี (Tax Review Required)",
        label: "ยังระบุข้อมูลภาษีไม่ครบถ้วน",
        desc: "กรุณาระบุเลขประจำตัวผู้เสียภาษีเพื่อความถูกต้องในการออกหนังสือรับรองฯ (50 ทวิ)",
        color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
        icon: AlertCircle,
      };
    }
    return {
      type: "active",
      badge: "🟢 บัญชีปกติ พร้อมรับรายได้ (Active)",
      label: "บัญชีปกติ พร้อมรับรายได้และถอนเงิน",
      desc: "ข้อมูลบัญชีและภาษีครบถ้วน พร้อมรับคอมมิชชันและทำรายการถอนเงิน",
      color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      icon: ShieldCheck,
    };
  }, [partnerProfile, payoutPendingBalance, payoutRequests]);

  // Dynamic Tax Calculation for Payout Preview (Applied Rule Snapshot)
  const taxPreview = useMemo(() => {
    const isExempt = partnerProfile?.isVatRegistered || false;
    const ruleCode = partnerProfile?.entityType === "corporate" ? "TH_CORPORATE_SERVICE" : "TH_INDIVIDUAL_COMMISSION";
    let rate = 0.03; // กรมสรรพากร 3%
    if (isExempt) rate = 0.00;
    else if (payoutAmount < 1000) rate = 0.00; // ต่ำกว่า 1,000 บาท ไม่ถึงเกณฑ์หัก ณ ที่จ่าย

    const wht = Number((payoutAmount * rate).toFixed(2));
    const net = Number((payoutAmount - wht).toFixed(2));
    return {
      taxRuleCode: ruleCode,
      taxRatePercentage: (rate * 100).toFixed(0),
      whtAmount: wht,
      netAmount: net,
    };
  }, [payoutAmount, partnerProfile]);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(dynamicReferralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyCode = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(partnerCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // Filtered commissions
  const filteredCommissions = useMemo(() => {
    if (commissionFilter === "all") return commissionHistory;
    return commissionHistory.filter(c => c.status === commissionFilter);
  }, [commissionHistory, commissionFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* ── 1. Top Hero Header: Astral Imperial Flow ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1528]/95 via-[#070F1E]/90 to-[#020617] border border-[#C6A96B]/30 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#4B6FAE]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#C6A96B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#C6A96B]/20 text-[#D9BC82] border border-[#C6A96B]/40 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#D9BC82]" />
                {tier === "master" ? "👑 Master Partner (25%)" : tier === "creator" ? "✨ Creator Partner (15%)" : "🌟 Affiliate Partner (7%)"}
              </span>

              {/* Partner Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 shadow-sm ${partnerStatus.color}`}>
                <partnerStatus.icon className="w-3.5 h-3.5" />
                {partnerStatus.badge}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold font-serif text-[#F8F6F1] tracking-wide">
              ศูนย์ปฏิบัติการพันธมิตร <span className="text-[#C6A96B] font-light text-xl md:text-2xl">/ Partner Portal</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl font-light">
              ระบบบริหารจัดการรายได้ ผลตอบแทน และการบอกต่อแบบ Single Source of Truth ตรวจสอบความถูกต้องทางการเงินได้ 100%
            </p>
          </div>

          {/* Quick Share Code & Link */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">รหัสของคุณ:</span>
              <span className="font-mono font-bold text-[#D9BC82] text-sm tracking-wider">{partnerCode}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="คัดลอกรหัส"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="border-[#C6A96B]/50 hover:bg-[#C6A96B]/20 text-[#D9BC82] text-xs py-2 px-3.5 flex items-center justify-center gap-2"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>คัดลอกลิงก์แล้ว!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-[#D9BC82]" />
                  <span>คัดลอกลิงก์แนะนำ</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Action & Status Alerts */}
        {actionData?.error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{actionData.error}</span>
          </div>
        )}
        {actionData?.message && actionData?.success && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionData.message}</span>
          </div>
        )}

        {/* Versioned Terms Acceptance Banner (INV-PARTNER-23) */}
        {termsStatus && !termsStatus.accepted && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex flex-col md:flex-row md:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#D9BC82] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#F8F6F1]">
                  จำเป็นต้องยอมรับข้อตกลงพันธมิตรล่าสุด ({termsStatus.activeVersion})
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {termsStatus.termsTitle || "ข้อกำหนดและเงื่อนไขโปรแกรมพันธมิตร PhopePhum"} เพื่อรักษาสิทธิ์ในการเบิกถอนคอมมิชชัน
                </div>
              </div>
            </div>
            <Form method="post" className="shrink-0 flex items-center gap-2">
              <input type="hidden" name="intent" value="accept_terms" />
              <input type="hidden" name="termsVersion" value={termsStatus.activeVersion} />
              {termsStatus.documentUrl && (
                <a
                  href={termsStatus.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#D9BC82] underline hover:text-white px-2.5 py-1.5"
                >
                  อ่านข้อตกลง PDF
                </a>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#C6A96B] hover:bg-[#D9BC82] text-slate-950 font-bold text-xs px-4 py-1.5"
              >
                {isSubmitting ? "กำลังบันทึก..." : "ยอมรับข้อตกลง"}
              </Button>
            </Form>
          </div>
        )}
      </div>

      {/* ── 2. UX HIERARCHY LEVEL 1: สถานะการเงิน & ความพร้อมถอน (Financial Status) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#C6A96B]" />
            ระดับที่ 1 — สถานะการเงิน & ยอดคงเหลือ (Financial Status)
          </h2>
          <span className="text-xs text-slate-500">Source of Truth: partner_entities</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Balance 1: Available Balance (พร้อมถอน) */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0D241C]/90 to-[#05130E]/95 border border-emerald-500/30 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-2">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                พร้อมถอน (Available)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-mono text-emerald-200 tracking-tight">
              ฿{availableBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-emerald-500/15">
              <span className="text-[11px] text-emerald-400/80">ขั้นต่ำ ฿500</span>
              <Button
                type="button"
                onClick={() => setIsPayoutModalOpen(true)}
                disabled={availableBalance < 500}
                className="text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ขอถอนเงิน
              </Button>
            </div>
          </div>

          {/* Balance 2: Holding Balance (รอปลดล็อก 14 วัน) */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#241F0D]/90 to-[#141005]/95 border border-amber-500/30 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                รอปลดล็อก (Holding 14D)
              </span>
              <span className="text-[11px] text-amber-400/70 font-mono">14 วัน</span>
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-mono text-amber-200 tracking-tight">
              ฿{holdingBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-3 text-[11px] text-amber-400/70 pt-2 border-t border-amber-500/15">
              โอนเข้า Available อัตโนมัติเมื่อครบ 14 วัน
            </div>
          </div>

          {/* Balance 3: Payout Pending (กำลังโอน) */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0D1D2C]/90 to-[#060F17]/95 border border-sky-500/30 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-sky-400 font-medium mb-2">
              <span className="flex items-center gap-1.5">
                <Send className="w-4 h-4 text-sky-400" />
                กำลังดำเนินการ (In-Flight)
              </span>
              <span className="text-[11px] text-sky-400/70">คิวธนาคาร</span>
            </div>
            <div className="text-2xl lg:text-3xl font-bold font-mono text-sky-200 tracking-tight">
              ฿{payoutPendingBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-3 text-[11px] text-sky-400/70 pt-2 border-t border-sky-500/15">
              อยู่ระหว่างตรวจสอบ / รอผล Settlement
            </div>
          </div>

          {/* Balance 4: Clawback Debt & Lifetime Earned */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1F1116]/90 to-[#0D070A]/95 border border-pink-500/30 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-pink-400 font-medium mb-2">
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-pink-400" />
                หนี้รอหักกลบ (Clawback)
              </span>
              <span className="font-mono text-xs text-pink-300">฿{clawbackDebt.toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-400 mb-1">รายได้รวมสะสมตลอดชีพ</div>
            <div className="text-xl lg:text-2xl font-bold font-mono text-[#D9BC82]">
              ฿{totalEarned.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 pt-1.5 border-t border-pink-500/15 flex justify-between">
              <span>ถอนแล้วสะสม:</span>
              <span className="font-mono text-slate-300">฿{totalWithdrawn.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Navigation Tabs (3 Main Layers) ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-[#C6A96B] text-black font-semibold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          ภาพรวม & รายงาน
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("commissions")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "commissions"
              ? "bg-[#C6A96B] text-black font-semibold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          ประวัติคอมมิชชัน ({commissionHistory.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("referrals")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "referrals"
              ? "bg-[#C6A96B] text-black font-semibold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          ผู้ถูกแนะนำ & ลิงก์แคมเปญ
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payouts")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "payouts"
              ? "bg-[#C6A96B] text-black font-semibold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          ประวัติถอนเงิน ({payoutRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "ledger"
              ? "bg-[#C6A96B] text-black font-semibold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <History className="w-4 h-4" />
          สมุดบัญชีแยกประเภท (Ledger)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "settings"
              ? "bg-[#C6A96B] text-black font-semibold shadow-md"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Building className="w-4 h-4" />
          บัญชีรับเงิน & ภาษี
        </button>
      </div>

      {/* ── 4. Tab Content Panels ── */}

      {/* ── TAB 1: ภาพรวม & สรุปผลงาน (UX Hierarchy Level 2 Growth & Level 3 Details) ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* UX HIERARCHY LEVEL 2: Growth & Attribution Analytics */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 px-1">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              ระดับที่ 2 — สถิติการเติบโต & การแนะนำ (Growth & Attribution)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0A1628]/70 border border-white/10 backdrop-blur-md">
                <div className="text-xs text-slate-400 mb-1">ยอดคลิกลิงก์ทั้งหมด (Attribution Clicks)</div>
                <div className="text-3xl font-bold font-mono text-[#F8F6F1]">
                  {referralPerformance.totalClicks.toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-sky-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> First-Touch Attribution Engine
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0A1628]/70 border border-white/10 backdrop-blur-md">
                <div className="text-xs text-slate-400 mb-1">สมาชิกที่สมัครสำเร็จ (Conversions)</div>
                <div className="text-3xl font-bold font-mono text-emerald-400">
                  {referralPerformance.totalConverted.toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ผูกมิตรกับบัญชีของคุณตลอดชีพ
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0A1628]/70 border border-white/10 backdrop-blur-md">
                <div className="text-xs text-slate-400 mb-1">อัตราความสำเร็จ (Conversion Rate)</div>
                <div className="text-3xl font-bold font-mono text-[#D9BC82]">
                  {referralPerformance.conversionRate}%
                </div>
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                  สมาชิกปัจจุบัน {referralPerformance.activeReferralsCount} ท่าน
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Generator & Tier Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tier Perks Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0B1528] to-[#040914] border border-[#C6A96B]/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#F8F6F1] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#D9BC82]" />
                  ลำดับขั้นและสิทธิประโยชน์พันธมิตร
                </h3>
                <span className="text-xs text-[#D9BC82] font-mono font-bold">คอมมิชชัน {commissionRate}%</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                ท่านได้รับส่วนแบ่งรายได้ต่อเนื่องทุกเดือน (Recurring Commission) ตลอดระยะเวลาที่ผู้ถูกแนะนำยังคงสมัครใช้งานแพ็กเกจ Pro หรือ Imperial
              </p>

              <div className="space-y-2.5 pt-2">
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  tier === "affiliate" ? "bg-[#C6A96B]/15 border-[#C6A96B]/40 text-[#D9BC82]" : "bg-white/5 border-white/5 text-slate-400"
                }`}>
                  <div>
                    <span className="font-bold">Affiliate Level</span>
                    <p className="text-[11px] text-slate-400">สมาชิกทั่วไป แนะนำเพื่อนและกัลยาณมิตร</p>
                  </div>
                  <span className="font-mono font-bold">7% ทุกออเดอร์</span>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  tier === "creator" ? "bg-[#C6A96B]/15 border-[#C6A96B]/40 text-[#D9BC82]" : "bg-white/5 border-white/5 text-slate-400"
                }`}>
                  <div>
                    <span className="font-bold">Creator Level</span>
                    <p className="text-[11px] text-slate-400">คอนเทนต์ครีเอเตอร์ / โหราจารย์ผู้แบ่งปัน</p>
                  </div>
                  <span className="font-mono font-bold">15% ทุกออเดอร์</span>
                </div>

                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  tier === "master" ? "bg-[#C6A96B]/15 border-[#C6A96B]/40 text-[#D9BC82]" : "bg-white/5 border-white/5 text-slate-400"
                }`}>
                  <div>
                    <span className="font-bold">Master / Institutional</span>
                    <p className="text-[11px] text-slate-400">คุรุผู้เจริญญาณ / สำนักโหราศาสตร์พันธมิตร</p>
                  </div>
                  <span className="font-mono font-bold">25% ทุกออเดอร์</span>
                </div>
              </div>
            </div>

            {/* Campaign Generator & Link Share */}
            <div className="p-6 rounded-2xl bg-[#0A1628]/80 border border-white/10 space-y-4">
              <h3 className="text-base font-semibold text-[#F8F6F1] flex items-center gap-2">
                <Share2 className="w-5 h-5 text-sky-400" />
                สร้างลิงก์แคมเปญเฉพาะกิจ (Custom Campaign Link)
              </h3>
              <p className="text-xs text-slate-400">
                ระบุชื่อแคมเปญ (เช่น tiktok, line_oa, live_stream) เพื่อแยกวัดผลประสิทธิภาพของแต่ละช่องทาง
              </p>

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1.5 block">ชื่อแคมเปญ / Channel Tag:</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={customCampaign}
                    onChange={(e) => setCustomCampaign(e.target.value)}
                    placeholder="เช่น facebook_group, youtube"
                    className="bg-black/50 border-white/15 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    className="bg-[#C6A96B] hover:bg-[#D9BC82] text-black font-semibold text-xs py-2 px-4 shrink-0"
                  >
                    {copiedLink ? "คัดลอกแล้ว!" : "คัดลอก"}
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-slate-300 break-all select-all">
                {dynamicReferralLink}
              </div>
            </div>
          </div>

          {/* UX HIERARCHY LEVEL 3: Details & Audit Trail Quicklinks */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              ระดับที่ 3 — รายละเอียดประวัติและการตรวจสอบ (Details & Audit Trail)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("commissions")}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200">ประวัติคอมมิชชัน</div>
                  <div className="text-[11px] text-slate-400">{commissionHistory.length} รายการ</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D9BC82] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("payouts")}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200">ประวัติการถอนเงิน</div>
                  <div className="text-[11px] text-slate-400">{payoutRequests.length} รายการ</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D9BC82] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ledger")}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200">สมุดบัญชีแยกประเภท</div>
                  <div className="text-[11px] text-slate-400">{partnerLedger.length} รายการ Double-Entry</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#D9BC82] transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ประวัติคอมมิชชัน (Commissions History & Dynamic VAT) ── */}
      {activeTab === "commissions" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCommissionFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  commissionFilter === "all" ? "bg-white/20 text-white font-bold" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                ทั้งหมด ({commissionHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setCommissionFilter("holding")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  commissionFilter === "holding" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                กำลังกักยอด 14 วัน
              </button>
              <button
                type="button"
                onClick={() => setCommissionFilter("cleared")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  commissionFilter === "cleared" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                ปลดล็อกแล้ว (Available)
              </button>
              <button
                type="button"
                onClick={() => setCommissionFilter("clawback_refunded")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  commissionFilter === "clawback_refunded" ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                หักคืน (Clawback)
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ความปลอดภัยสูงสุด: Mask Buyer PII 100%</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0A1628]/80 backdrop-blur-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">วันที่ / รายการ</th>
                  <th className="p-3.5">ผู้ซื้อ (Masked PII)</th>
                  <th className="p-3.5">แพ็กเกจ</th>
                  <th className="p-3.5 text-right">ยอดรวม (Gross)</th>
                  <th className="p-3.5 text-right">ฐานคำนวณ (หัก VAT)</th>
                  <th className="p-3.5 text-right">คอมมิชชัน</th>
                  <th className="p-3.5 text-center">สถานะ</th>
                  <th className="p-3.5 text-right">กำหนดปลดล็อก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                      ยังไม่พบรายการคอมมิชชันในหมวดหมู่นี้
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((comm) => (
                    <tr key={comm.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 text-slate-300 font-sans">
                        <div>{new Date(comm.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{new Date(comm.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>
                      <td className="p-3.5 font-sans font-medium text-slate-200">
                        {comm.maskedBuyerName}
                      </td>
                      <td className="p-3.5 font-sans text-slate-300">
                        {comm.planName || comm.subscriptionPlanCode}
                      </td>
                      <td className="p-3.5 text-right text-slate-400">
                        ฿{comm.grossAmountThb.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-slate-300">
                        ฿{comm.commissionableAmountThb.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#D9BC82]">
                        +฿{comm.commissionAmountThb.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-500 block font-normal font-sans">({(comm.commissionRateApplied * 100).toFixed(0)}%)</span>
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        {comm.status === "holding" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            กักยอด 14 วัน
                          </span>
                        ) : comm.status === "cleared" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            ปลดล็อกแล้ว
                          </span>
                        ) : comm.status === "clawback_refunded" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/15 text-red-300 border border-red-500/30">
                            หักคืน (Refund)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-500/15 text-slate-400 border border-slate-500/30">
                            {comm.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-sans text-slate-400">
                        {comm.status === "holding" ? (
                          <div>
                            <span className="text-amber-300 font-mono">{new Date(comm.holdingUntil).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                            <span className="text-[10px] text-slate-500 block">อัตโนมัติ</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: ผู้ถูกแนะนำ & สถิติ ── */}
      {activeTab === "referrals" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent Referrals (Masked PII) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0A1628]/80 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#F8F6F1] flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  รายชื่อกัลยาณมิตรที่แนะนำล่าสุด
                </h3>
                <span className="text-xs text-slate-400">รวมทั้งหมด {referralPerformance.activeReferralsCount} ท่าน</span>
              </div>

              <div className="divide-y divide-white/5">
                {referralPerformance.recentReferrals.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    ยังไม่มีผู้ลงทะเบียนผ่านลิงก์ของท่าน เริ่มต้นแชร์ลิงก์เพื่อสร้างกัลยาณมิตรร่วมกัน
                  </div>
                ) : (
                  referralPerformance.recentReferrals.map((ref, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#C6A96B]/15 border border-[#C6A96B]/30 flex items-center justify-center font-bold text-[#D9BC82]">
                          {ref.maskedName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{ref.maskedName}</div>
                          <div className="text-[10px] text-slate-400">
                            เข้าร่วมเมื่อ {new Date(ref.joinedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                        {ref.tierOrPlan}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Top Campaigns */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#0A1628]/80 border border-white/10 space-y-3">
              <h3 className="text-sm font-semibold text-[#F8F6F1] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#D9BC82]" />
                สถิติแคมเปญ (Top Channels)
              </h3>

              <div className="space-y-2">
                {referralPerformance.topCampaigns.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    ยังไม่มีข้อมูลแคมเปญที่บันทึก
                  </div>
                ) : (
                  referralPerformance.topCampaigns.map((camp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-mono text-[#D9BC82] font-semibold">{camp.campaignCode}</span>
                        <div className="text-[10px] text-slate-400">{camp.clicks} ครั้งที่กดเข้าชม</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">{camp.conversions} สมาชิก</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: ประวัติการถอนเงิน & สถานะการโอน (Strict State Machine & Tax Breakdown) ── */}
      {activeTab === "payouts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#F8F6F1] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                คำขอถอนเงินและประวัติการโอน (Payout History & State Lifecycle)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ภาษีหัก ณ ที่จ่ายคำนวณตามกฎหมายภาษีที่ใช้กับบัญชีของคุณ และทำการ Freeze Snapshot ณ เวลาที่ยื่นคำขอ
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsPayoutModalOpen(true)}
              disabled={availableBalance < 500}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-md disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              ยื่นคำขอถอนเงิน (พร้อมถอน ฿{availableBalance.toLocaleString()})
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0A1628]/80 backdrop-blur-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">เลขที่คำขอ / วันที่</th>
                  <th className="p-3.5 text-right">ยอดที่ขอถอน</th>
                  <th className="p-3.5 text-right">ภาษีหัก ณ ที่จ่าย</th>
                  <th className="p-3.5 text-right">ยอดรับสุทธิ (Net)</th>
                  <th className="p-3.5">บัญชีปลายทาง (Masked)</th>
                  <th className="p-3.5 text-center">สถานะ</th>
                  <th className="p-3.5">รายละเอียด / กฎภาษี</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {payoutRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                      ยังไม่มีประวัติคำขอถอนเงิน
                    </td>
                  </tr>
                ) : (
                  payoutRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-sans">
                        <div className="font-mono font-bold text-slate-200">{req.requestNumber}</div>
                        <div className="text-[10px] text-slate-400">{new Date(req.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </td>
                      <td className="p-3.5 text-right text-slate-300">
                        ฿{req.requestedAmountThb.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-amber-400/90 font-sans">
                        -฿{req.withholdingTaxAmountThb.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-500 block font-mono">
                          ({(req.withholdingRateApplied * 100).toFixed(0)}% Tax)
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-300">
                        ฿{req.netPayoutAmountThb.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-sans text-slate-300">
                        <div>{(req.destinationSnapshot as any)?.bankName || (req.destinationSnapshot as any)?.bank_code || "ธนาคาร"}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {maskBankAccount((req.destinationSnapshot as any)?.accountNo || (req.destinationSnapshot as any)?.account_number)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {maskName((req.destinationSnapshot as any)?.accountName || (req.destinationSnapshot as any)?.account_name)}
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        {req.status === "pending_review" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1 mx-auto w-max">
                            <Clock className="w-3 h-3" /> รอตรวจสอบ
                          </span>
                        ) : req.status === "approved" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center justify-center gap-1 mx-auto w-max">
                            <Check className="w-3 h-3" /> อนุมัติแล้ว (รอคิวโอน)
                          </span>
                        ) : req.status === "processing" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center justify-center gap-1 mx-auto w-max animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> กำลังส่งคำสั่งโอน
                          </span>
                        ) : req.status === "completed" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1 mx-auto w-max">
                            <CheckCircle2 className="w-3 h-3" /> โอนเงินสำเร็จ
                          </span>
                        ) : req.status === "rejected" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30 flex items-center justify-center gap-1 mx-auto w-max">
                            <XCircle className="w-3 h-3" /> ปฏิเสธ (คืน Available)
                          </span>
                        ) : req.status === "failed" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center gap-1 mx-auto w-max">
                            <AlertCircle className="w-3 h-3" /> ขัดข้องที่ธนาคาร (รอแก้ไข)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] bg-slate-500/15 text-slate-400">
                            {req.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans text-slate-400 text-[11px]">
                        <div className="font-mono text-[10px] text-slate-300">
                          {req.taxRuleCodeApplied || "TH_INDIVIDUAL_COMMISSION"}
                        </div>
                        {req.status === "rejected" && req.rejectionReason ? (
                          <span className="text-red-300 font-medium">เหตุผล: {req.rejectionReason}</span>
                        ) : req.status === "failed" && req.failureMessage ? (
                          <span className="text-rose-300 font-medium">Error: {req.failureMessage}</span>
                        ) : req.status === "completed" ? (
                          <span className="text-emerald-400">หักภาษีตามกฎหมายและออกหนังสือรับรองฯ (50 ทวิ) แล้ว</span>
                        ) : (
                          <span>อยู่ในขั้นตอน Settlement</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: สมุดบัญชีรายได้ (Double-Entry Financial Ledger) ── */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#F8F6F1] flex items-center gap-2">
                <History className="w-5 h-5 text-sky-400" />
                สมุดบัญชีแยกประเภทคู่ (Partner Double-Entry Ledger)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                บันทึกการเปลี่ยนแปลงยอดเงินทั้ง 4 บัญชีอย่างละเอียด ทุกรายการไม่สามารถแก้ไขย้อนหลังได้ (Immutable Audit Trail)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0A1628]/80 backdrop-blur-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">วันและเวลา</th>
                  <th className="p-3.5">ประเภทธุรกรรม</th>
                  <th className="p-3.5 text-right">จำนวนเงิน</th>
                  <th className="p-3.5 text-right">Holding ก่อน/หลัง</th>
                  <th className="p-3.5 text-right">Available ก่อน/หลัง</th>
                  <th className="p-3.5 text-right">Pending ก่อน/หลัง</th>
                  <th className="p-3.5">บันทึกช่วยจำ (Notes)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {partnerLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                      ยังไม่มีรายการในสมุดบัญชีแยกประเภท
                    </td>
                  </tr>
                ) : (
                  partnerLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 text-slate-400 font-sans">
                        <div>{new Date(tx.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{new Date(tx.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          tx.entryType === "commission_holding_in"
                            ? "bg-amber-500/15 text-amber-300"
                            : tx.entryType === "commission_cleared"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : tx.entryType === "commission_clawback"
                            ? "bg-red-500/15 text-red-300"
                            : tx.entryType === "payout_reserved"
                            ? "bg-sky-500/15 text-sky-300"
                            : tx.entryType === "payout_settled"
                            ? "bg-purple-500/15 text-purple-300"
                            : "bg-slate-500/15 text-slate-300"
                        }`}>
                          {tx.entryType}
                        </span>
                      </td>
                      <td className={`p-3.5 text-right font-bold ${
                        tx.amount > 0 ? "text-emerald-300" : "text-slate-300"
                      }`}>
                        ฿{tx.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-slate-400 text-[11px]">
                        ฿{tx.holdingBalanceBefore.toFixed(2)} ➔ <span className="text-amber-300 font-bold">฿{tx.holdingBalanceAfter.toFixed(2)}</span>
                      </td>
                      <td className="p-3.5 text-right text-slate-400 text-[11px]">
                        ฿{tx.availableBalanceBefore.toFixed(2)} ➔ <span className="text-emerald-300 font-bold">฿{tx.availableBalanceAfter.toFixed(2)}</span>
                      </td>
                      <td className="p-3.5 text-right text-slate-400 text-[11px]">
                        ฿{tx.payoutPendingBefore.toFixed(2)} ➔ <span className="text-sky-300 font-bold">฿{tx.payoutPendingAfter.toFixed(2)}</span>
                      </td>
                      <td className="p-3.5 font-sans text-slate-300 text-[11px] max-w-xs truncate" title={tx.notes || ""}>
                        {tx.notes || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: บัญชีรับเงิน & ข้อมูลภาษี (Bank & Tax Profile Settings) ── */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form 1: Payout Destination */}
          <div className="p-6 rounded-2xl bg-[#0A1628]/80 border border-white/10 space-y-4">
            <h3 className="text-base font-semibold text-[#F8F6F1] flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" />
              ข้อมูลบัญชีรับเงินโอน (Payout Destination)
            </h3>
            <p className="text-xs text-slate-400">
              ยอดเงินจะถูกโอนเข้าบัญชีนี้เมื่อได้รับอนุมัติคำขอถอนเงิน โปรดระบุชื่อบัญชีให้ตรงกับบัตรประชาชน
            </p>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update_bank_info" />

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">ธนาคาร:</label>
                <Input
                  type="text"
                  name="bankName"
                  defaultValue={partnerProfile?.bankName || "กสิกรไทย (KBANK)"}
                  placeholder="เช่น กสิกรไทย, ไทยพาณิชย์, กรุงเทพ"
                  required
                  className="bg-black/50 border-white/15 text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">เลขที่บัญชีธนาคาร:</label>
                <Input
                  type="text"
                  name="bankAccountNo"
                  defaultValue={partnerProfile?.bankAccountNo || ""}
                  placeholder="เช่น 012-3-45678-9"
                  required
                  className="bg-black/50 border-white/15 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">ชื่อบัญชี (ตรงตามสมุดบัญชี):</label>
                <Input
                  type="text"
                  name="bankAccountName"
                  defaultValue={partnerProfile?.bankAccountName || profile?.display_name || ""}
                  placeholder="ชื่อ-นามสกุลเจ้าของบัญชี"
                  required
                  className="bg-black/50 border-white/15 text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">พร้อมเพย์ (ไม่บังคับ):</label>
                <Input
                  type="text"
                  name="promptpayId"
                  defaultValue={partnerProfile?.promptpayId || ""}
                  placeholder="เบอร์โทรศัพท์ หรือ เลขบัตร ปชช."
                  className="bg-black/50 border-white/15 text-xs font-mono"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md"
              >
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลบัญชีรับเงิน"}
              </Button>
            </Form>
          </div>

          {/* Form 2: Tax Compliance Profile */}
          <div className="p-6 rounded-2xl bg-[#0A1628]/80 border border-white/10 space-y-4">
            <h3 className="text-base font-semibold text-[#F8F6F1] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D9BC82]" />
              ข้อมูลภาษีและหนังสือรับรอง (Tax Compliance Profile)
            </h3>
            <p className="text-xs text-slate-400">
              ใช้สำหรับออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (ใบ 50 ทวิ) ตามกฎหมายภาษีที่ใช้กับบัญชีของคุณ
            </p>

            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update_tax_profile" />

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">ประเภทผู้เสียภาษี:</label>
                <select
                  name="entityType"
                  defaultValue={partnerProfile?.entityType || "individual"}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#C6A96B]"
                >
                  <option value="individual">บุคคลธรรมดา (หัก ณ ที่จ่ายตามเกณฑ์สรรพากร)</option>
                  <option value="corporate">นิติบุคคล / บริษัทจำกัด (หัก ณ ที่จ่ายตามเกณฑ์สรรพากร)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">เลขประจำตัวผู้เสียภาษี / บัตรประชาชน:</label>
                <Input
                  type="text"
                  name="taxId"
                  defaultValue={partnerProfile?.taxId || ""}
                  placeholder="เลข 13 หลัก"
                  required
                  className="bg-black/50 border-white/15 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">ชื่อ-นามสกุล / ชื่อนิติบุคคลตามทะเบียนภาษี:</label>
                <Input
                  type="text"
                  name="legalName"
                  defaultValue={partnerProfile?.legalName || partnerProfile?.bankAccountName || profile?.display_name || ""}
                  placeholder="ชื่อนิติบุคคลหรือชื่อบุคคลตามบัตร ปชช."
                  required
                  className="bg-black/50 border-white/15 text-xs"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isVatRegistered"
                    value="true"
                    defaultChecked={partnerProfile?.isVatRegistered}
                    className="rounded border-white/20 text-[#C6A96B] focus:ring-0"
                  />
                  <span>จดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#C6A96B] hover:bg-[#D9BC82] text-black text-xs font-bold py-2.5 rounded-xl shadow-md"
              >
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูลภาษี"}
              </Button>
            </Form>
          </div>
        </div>
      )}

      {/* ── 5. Payout Request Drawer / Modal with Live Dynamic Tax Calculation Preview ── */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#0B1528] to-[#040914] border border-[#C6A96B]/40 p-6 md:p-8 shadow-2xl space-y-6">
            <button
              type="button"
              onClick={() => setIsPayoutModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[11px] font-semibold tracking-wider text-[#D9BC82] uppercase bg-[#C6A96B]/15 px-2.5 py-0.5 rounded-full border border-[#C6A96B]/30">
                Atomic Payout Settlement
              </span>
              <h2 className="text-xl font-bold font-serif text-[#F8F6F1] mt-2">
                ยื่นคำขอถอนเงินสด (Payout Request)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ยอดเงินพร้อมถอนปัจจุบันของคุณคือ <span className="text-emerald-400 font-mono font-bold">฿{availableBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
              </p>
            </div>

            <Form method="post" onSubmit={() => setIsPayoutModalOpen(false)} className="space-y-4">
              <input type="hidden" name="intent" value="request_payout" />
              <input type="hidden" name="bankName" value={partnerProfile?.bankName || ""} />
              <input type="hidden" name="accountNo" value={partnerProfile?.bankAccountNo || ""} />
              <input type="hidden" name="accountName" value={partnerProfile?.bankAccountName || ""} />
              <input type="hidden" name="taxId" value={partnerProfile?.taxId || ""} />

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1.5 flex justify-between">
                  <span>ระบุจำนวนเงินที่ต้องการถอน (บาท):</span>
                  <span className="text-slate-400">ขั้นต่ำ ฿500</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    name="amount"
                    min={500}
                    max={availableBalance}
                    step={100}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    required
                    className="bg-black/60 border-white/20 text-lg font-mono font-bold text-[#F8F6F1] pl-8 py-2.5"
                  />
                  <span className="absolute left-3 top-3 text-slate-400 font-mono text-sm">฿</span>
                </div>
              </div>

              {/* Live Dynamic Tax Breakdown */}
              <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>ยอดที่ขอถอน:</span>
                  <span className="font-mono">฿{payoutAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-amber-400/90">
                  <span>ภาษีหัก ณ ที่จ่ายตามกฎภาษีที่ใช้กับบัญชีของคุณ ({taxPreview.taxRatePercentage}%):</span>
                  <span className="font-mono">-฿{taxPreview.whtAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Applied Rule: {taxPreview.taxRuleCode} (อัตรา {taxPreview.taxRatePercentage}%)
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-emerald-300 font-bold text-sm">
                  <span>ยอดโอนเข้าบัญชีสุทธิ:</span>
                  <span className="font-mono text-base">฿{taxPreview.netAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Destination Summary (Masked PII) */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-slate-200">โอนเข้าบัญชีปลายทาง:</div>
                <div className="flex justify-between text-slate-400">
                  <span>{partnerProfile?.bankName || "ยังไม่ได้ตั้งค่าบัญชี"}</span>
                  <span className="font-mono text-slate-200">{maskBankAccount(partnerProfile?.bankAccountNo || "")}</span>
                </div>
                <div className="text-slate-400 text-[11px]">{maskName(partnerProfile?.bankAccountName || profile?.display_name || "")}</div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="flex-1 border-white/15 text-slate-300 text-xs py-2.5 rounded-xl"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={payoutAmount < 500 || payoutAmount > availableBalance || !partnerProfile?.bankAccountNo}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ยืนยันการถอนเงิน
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
