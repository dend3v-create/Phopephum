/**
 * dashboard.upgrade.tsx — PhopePhum V3 Membership & Monetization Center
 * รองรับการอัปเกรดแผนสมาชิก (Subscriptions) และการเติมละอองทรายกาลเวลา (Sands Packs)
 * ขับเคลื่อนด้วย Stripe Checkout (รองรับ PromptPay QR, บัตรเครดิต/เดบิต, Apple Pay, Google Pay)
 */
import { useState, useEffect } from "react";
import { json, type MetaFunction, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import { requireAuth, getProfile } from "~/services/auth.server";
import { getUserPlan } from "~/services/permissions.server";
import {
  SUBSCRIPTION_PLANS,
  SANDS_REFILL_PACKS,
  type SubscriptionPlanDef,
  type SandsRefillPackDef,
} from "~/lib/plans";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "อัปเกรดสมาชิก & เติมทรายกาลเวลา — PhopePhum" },
  { name: "description", content: "ยกระดับสิทธิประโยชน์ ปลดล็อกปัญญาดวงดาวและการพยากรณ์ระดับสูงสุดด้วยระบบชำระเงิน Stripe ปลอดภัยมาตรฐานสากล" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const currentPlan = getUserPlan(profile);
  const { supabase } = createSupabaseClient(request, env);

  const { data: pending } = await supabase
    .from("subscription_requests")
    .select("id, plan, type, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return json({
    profile,
    currentPlan,
    pending,
  });
}

export default function UpgradePage() {
  const { profile, currentPlan, pending: initialPending } = useLoaderData<typeof loader>();
  const checkoutFetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"membership" | "sands">("membership");
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [selectedSandsPack, setSelectedSandsPack] = useState<string>("sands_150");

  // State สำหรับ Modal / Redirect ชำระเงิน Stripe
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(initialPending?.id || null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending");

  // ดึงค่า plan จาก URL parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const planFromUrl = urlParams.get("plan");
      const tabFromUrl = urlParams.get("tab");
      const isSuccess = urlParams.get("payment") === "success";

      if (isSuccess) {
        setPaymentStatus("success");
      }
      if (tabFromUrl === "sands") {
        setActiveTab("sands");
      }
      if (planFromUrl) {
        const normalized = planFromUrl === "premium" ? "basic" : planFromUrl === "master" ? "imperial" : planFromUrl;
        if (SUBSCRIPTION_PLANS[normalized]) {
          setSelectedPlan(normalized);
          setActiveTab("membership");
        } else if (SANDS_REFILL_PACKS[normalized]) {
          setSelectedSandsPack(normalized);
          setActiveTab("sands");
        }
      }
    }
  }, []);

  // เมื่อกดปุ่มชำระเงิน
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const planToPay = activeTab === "membership" ? selectedPlan : selectedSandsPack;
    if (!planToPay) return;

    const formData = new FormData();
    formData.append("plan", planToPay);
    formData.append("method", "card");

    checkoutFetcher.submit(formData, {
      method: "post",
      action: "/api/payment/checkout",
    });
  };

  // รับผลลัพธ์จาก Checkout API และ Redirect ไปยัง Stripe Hosted Checkout
  useEffect(() => {
    if (checkoutFetcher.data?.success && checkoutFetcher.data?.checkoutUrl) {
      const data = checkoutFetcher.data;
      setCheckoutUrl(data.checkoutUrl);
      setSessionId(data.sessionId);
      setRequestId(data.requestId);
      setShowRedirectModal(true);

      // Redirect ไปยัง Stripe Checkout ทันที
      window.location.assign(data.checkoutUrl);
    }
  }, [checkoutFetcher.data]);

  // ระบบ Polling ตรวจสอบสถานะการชำระเงิน
  useEffect(() => {
    let interval: any;
    if ((sessionId || requestId) && paymentStatus === "pending") {
      const pollId = sessionId || requestId;
      interval = setInterval(() => {
        statusFetcher.load(`/api/payment/status/${pollId}`);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [sessionId, requestId, paymentStatus]);

  // ตรวจสอบผลลัพธ์จาก Status Polling
  useEffect(() => {
    if (statusFetcher.data?.status === "success") {
      setPaymentStatus("success");
      const timer = setTimeout(() => {
        navigate("/dashboard?payment=success");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [statusFetcher.data, navigate]);

  const isSubmitting = checkoutFetcher.state !== "idle";

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-8 md:py-12">
      {/* ── Header Navigation ── */}
      <div className="text-center mb-10">
        <Link
          to="/pricing"
          className="text-[#C6A96B] text-xs hover:underline transition-colors mb-3 inline-flex items-center gap-1 tracking-widest uppercase font-bold"
        >
          <span>←</span> ดูตารางเปรียบเทียบสิทธิประโยชน์ฉบับเต็ม
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F8F6F1] mt-1">
          ศูนย์บริการสมาชิก & ปัญญาบารมี
        </h1>
        <p className="text-[#94A3B8] text-sm mt-2 max-w-lg mx-auto leading-relaxed">
          ยกระดับสิทธิประโยชน์เพื่อรับคำแนะนำที่ลึกซึ้งที่สุด หรือเติมละอองทรายกาลเวลาเพื่อปลดล็อกฟังก์ชันเฉพาะคราว
        </p>

        {/* Current Plan Status Pill */}
        <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-xs">
          <span className="text-[#94A3B8]">สถานะปัจจุบัน:</span>
          <span className="font-bold text-[#C6A96B] uppercase">{currentPlan}</span>
          <span className="text-white/20">|</span>
          <span className="text-[#94A3B8]">ละอองทราย:</span>
          <span className="font-bold text-amber-400 font-mono">{profile?.time_sands ?? 0}</span>
          {profile?.membership_expires_at && currentPlan !== "free" && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-[#94A3B8]">
                หมดอายุ: {new Date(profile.membership_expires_at).toLocaleDateString("th-TH")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Switcher (Subscriptions vs Sands Packs) ── */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 rounded-2xl border border-white/10 bg-[var(--pp-surface-0b1528)]/80 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab("membership")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "membership"
                ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
                : "text-[#94A3B8] hover:text-[#F8F6F1]"
            }`}
          >
            <AstralIcon name="crown" variant={activeTab === "membership" ? "current" : "gold"} size={16} glow={activeTab === "membership"} />
            <span>แผนสมาชิกพรีเมียม (Subscriptions)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sands")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "sands"
                ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
                : "text-[#94A3B8] hover:text-[#F8F6F1]"
            }`}
          >
            <AstralIcon name="sandglass" variant={activeTab === "sands" ? "current" : "gold"} size={16} glow={activeTab === "sands"} />
            <span>เติมละอองทรายกาลเวลา (Sands Packs)</span>
          </button>
        </div>
      </div>

      {/* ── Form Section ── */}
      <form onSubmit={handleCheckout} className="space-y-8">
        {/* 1. Subscriptions Tab */}
        {activeTab === "membership" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Object.values(SUBSCRIPTION_PLANS).map((plan: SubscriptionPlanDef) => {
              const isSelected = selectedPlan === plan.id;
              const isCurrent = currentPlan === plan.canonicalPlan;

              return (
                <label
                  key={plan.id}
                  className={`cursor-pointer group relative flex flex-col rounded-3xl border p-5 sm:p-6 transition-all duration-300 ${
                    isSelected
                      ? "border-[#C6A96B] bg-[#C6A96B]/[0.06] shadow-xl shadow-[#C6A96B]/10 scale-[1.02]"
                      : "border-white/10 bg-[var(--pp-surface-0b1528)]/40 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => setSelectedPlan(plan.id)}
                  />

                  {plan.tag && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#C6A96B] text-[#020617] text-[10px] font-bold tracking-wider uppercase shadow-md">
                      {plan.tag}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-lg text-[#F8F6F1]">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">
                        แผนปัจจุบัน
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#94A3B8] mb-4 min-h-[32px]">{plan.subtitle}</p>

                  <div className="my-2">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-[#F8F6F1]">
                      ฿{plan.priceThb.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#94A3B8]">
                      /{plan.interval === "year" ? "ปี" : "เดือน"}
                    </span>
                  </div>

                  <ul className="space-y-2.5 my-6 text-xs text-[#94A3B8] border-t border-white/5 pt-4">
                    {plan.features.slice(0, 5).map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#C6A96B] font-bold">✓</span>
                        <span className="leading-tight">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div
                    className={`w-full py-2 rounded-xl text-xs font-bold text-center mt-auto transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617]"
                        : "border border-white/10 text-[#94A3B8]"
                    }`}
                  >
                    {isSelected ? "เลือกแพ็กเกจนี้ ✓" : "เลือกแพ็กเกจ"}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* 2. Sands Packs Tab */}
        {activeTab === "sands" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.values(SANDS_REFILL_PACKS).map((pack: SandsRefillPackDef) => {
                const isSelected = selectedSandsPack === pack.id;

                return (
                  <label
                    key={pack.id}
                    className={`cursor-pointer group relative flex flex-col rounded-3xl border p-6 transition-all duration-300 ${
                      isSelected
                        ? "border-[#C6A96B] bg-[#C6A96B]/[0.06] shadow-xl shadow-[#C6A96B]/10 scale-[1.02]"
                        : "border-white/10 bg-[var(--pp-surface-0b1528)]/40 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sandsPack"
                      value={pack.id}
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => setSelectedSandsPack(pack.id)}
                    />

                    {pack.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#C6A96B] text-[#020617] text-[10px] font-bold tracking-wider uppercase shadow-md">
                        ยอดนิยม
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-bold text-lg text-[#F8F6F1]">{pack.name}</h3>
                      <span className="text-xl">✨</span>
                    </div>

                    <p className="text-xs text-[#94A3B8] mb-4">{pack.bonusText || "ละอองทรายกาลเวลา"}</p>

                    <div className="flex items-baseline gap-2 my-2">
                      <span className="text-3xl font-bold font-mono text-amber-400">
                        +{pack.sandsAmount.toLocaleString()}
                      </span>
                      <span className="text-xs text-[#94A3B8]">ละอองทราย</span>
                    </div>

                    <div className="my-2">
                      <span className="text-2xl font-bold font-mono text-[#F8F6F1]">
                        ฿{pack.priceThb.toLocaleString()}
                      </span>
                    </div>

                    <div
                      className={`w-full py-2 rounded-xl text-xs font-bold text-center mt-auto transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617]"
                          : "border border-white/10 text-[#94A3B8]"
                      }`}
                    >
                      {isSelected ? "เลือกแพ็กนี้ ✓" : "เลือกแพ็ก"}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Microcopy Trust Strip */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-5 text-[11px] text-[#94A3B8] font-sarabun text-center">
              <span className="flex items-center gap-1">
                <span className="text-[#C6A96B]">✦</span> ใช้ ละอองทรายกาลเวลา ปลดล็อกสิทธิ์วิเคราะห์พิเศษทันที
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#C6A96B]">✦</span> แลก AI Report ฉบับเต็มด้วย ละอองทรายกาลเวลา
              </span>
              <span className="flex items-center gap-1">
                <span className="text-[#C6A96B]">✦</span> รับบทวิเคราะห์พิเศษเฉพาะครั้ง (ใช้ Sands of Time)
              </span>
            </div>
          </div>
        )}

        {/* ── Submit Button ── */}
        <div className="max-w-md mx-auto pt-4 text-center">
          {checkoutFetcher.data?.error && (
            <div className="mb-4 p-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-3 text-left">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-bold">เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe:</p>
                <p>{checkoutFetcher.data.error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl font-bold text-base text-[#020617] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-[#C6A96B]/20 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
                กำลังเตรียมระบบชำระเงิน Stripe...
              </span>
            ) : (
              <span>
                ดำเนินการชำระเงิน (฿
                {(activeTab === "membership"
                  ? SUBSCRIPTION_PLANS[selectedPlan]?.priceThb
                  : SANDS_REFILL_PACKS[selectedSandsPack]?.priceThb
                )?.toLocaleString() || 0}
                ) →
              </span>
            )}
          </button>
          <div className="flex items-center justify-center gap-3 text-[11px] text-[#94A3B8] mt-3">
            <span>🔒 ปลอดภัยสูงสุดด้วย Stripe (PCI-DSS Level 1)</span>
            <span>·</span>
            <span>PromptPay QR</span>
            <span>·</span>
            <span>Visa / Mastercard / JCB</span>
          </div>
        </div>
      </form>

      {/* ── Modal: Redirecting to Stripe Checkout ── */}
      {showRedirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-[#C6A96B]/40 bg-[var(--pp-surface-0b1528)] p-6 sm:p-8 text-center shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-20"
              style={{ background: "radial-gradient(circle, #C6A96B 0%, transparent 70%)" }}
            />

            <div className="py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#C6A96B]/10 border border-[#C6A96B]/30 flex items-center justify-center text-[#C6A96B] text-2xl">
                💳
              </div>
              <h3 className="font-display text-xl font-bold text-[#F8F6F1]">
                กำลังนำท่านสู่หน้าชำระเงินที่ปลอดภัย
              </h3>
              <p className="text-sm text-[#94A3B8]">
                ระบบ Stripe กำลังเปิดหน้าต่างชำระเงินที่รองรับทั้ง Thai PromptPay QR และบัตรเครดิต/เดบิต
              </p>

              {checkoutUrl && (
                <div className="pt-2">
                  <a
                    href={checkoutUrl}
                    className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold text-xs uppercase tracking-wider shadow-lg"
                  >
                    คลิกที่นี่หากหน้าต่างไม่เปิดอัตโนมัติ →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
