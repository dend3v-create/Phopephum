/**
 * dashboard.upgrade.tsx — PhopePhum V3 Membership & Monetization Center (STEP 6.6)
 * รองรับการอัปเกรดแผนสมาชิก (Subscriptions) และการเติมละอองทรายกาลเวลา (Sands Packs)
 * ผ่าน Omise PromptPay Instant QR พร้อมระบบ Auto-Polling สถานะแบบ Real-time
 */
import { useState, useEffect } from "react";
import { json, type MetaFunction, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import { requireAuth, getProfile } from "~/services/auth.server";
import { getUserPlan } from "~/services/permissions.server";
import {
  SUBSCRIPTION_PLANS,
  SANDS_REFILL_PACKS,
} from "~/lib/plans";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "อัปเกรดสมาชิก & เติมทรายกาลเวลา — PhopePhum" },
  { name: "description", content: "ยกระดับสิทธิประโยชน์ ปลดล็อกปัญญาดวงดาวและการพยากรณ์ระดับสูงสุด" },
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

  // State สำหรับ Modal ชำระเงิน PromptPay QR
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(initialPending?.id || null);
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentItemName, setPaymentItemName] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending");
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 นาที

  // ดึงค่า plan จาก URL parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const planFromUrl = urlParams.get("plan");
      const tabFromUrl = urlParams.get("tab");

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
    formData.append("method", "promptpay");

    checkoutFetcher.submit(formData, {
      method: "post",
      action: "/api/payment/checkout",
    });
  };

  // รับผลลัพธ์จาก Checkout API
  useEffect(() => {
    if (checkoutFetcher.data?.success) {
      const data = checkoutFetcher.data;
      setQrCodeUrl(data.qrCodeUrl);
      setRequestId(data.requestId);
      setChargeId(data.chargeId);
      setPaymentAmount(data.amount);
      setPaymentItemName(data.itemName || "PhopePhum Service");
      setTimeLeft(data.expiresInSeconds || 900);
      setPaymentStatus("pending");
      setShowQrModal(true);
    }
  }, [checkoutFetcher.data]);

  // ระบบ Polling ตรวจสอบสถานะการชำระเงินทุก 3 วินาที
  useEffect(() => {
    let interval: any;
    if (showQrModal && (requestId || chargeId) && paymentStatus === "pending") {
      const pollId = requestId || chargeId;
      interval = setInterval(() => {
        statusFetcher.load(`/api/payment/status/${pollId}`);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showQrModal, requestId, chargeId, paymentStatus]);

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

  // ระบบนับเวลาถอยหลัง 15 นาที
  useEffect(() => {
    if (showQrModal && timeLeft > 0 && paymentStatus === "pending") {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showQrModal, timeLeft, paymentStatus]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
        <div className="inline-flex p-1 rounded-2xl border border-white/10 bg-[#0B1528]/80 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab("membership")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "membership"
                ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
                : "text-[#94A3B8] hover:text-[#F8F6F1]"
            }`}
          >
            <span>👑</span>
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
            <span>⏳</span>
            <span>เติมละอองทรายกาลเวลา (Sands Packs)</span>
          </button>
        </div>
      </div>

      {/* ── Form Section ── */}
      <form onSubmit={handleCheckout} className="space-y-8">
        {/* 1. Subscriptions Tab */}
        {activeTab === "membership" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isCurrent = currentPlan === plan.canonicalPlan;

              return (
                <label
                  key={plan.id}
                  className={`cursor-pointer group relative flex flex-col rounded-3xl border p-5 sm:p-6 transition-all duration-300 ${
                    isSelected
                      ? "border-[#C6A96B] bg-[#C6A96B]/[0.06] shadow-xl shadow-[#C6A96B]/10 scale-[1.02]"
                      : "border-white/10 bg-[#0B1528]/40 hover:border-white/20"
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

                  {/* Top Badge */}
                  {plan.tag && (
                    <span
                      className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-md"
                      style={{
                        background: "linear-gradient(135deg, #C6A96B, #D9BC82)",
                        color: "#020617",
                      }}
                    >
                      {plan.tag}
                    </span>
                  )}

                  {isCurrent && (
                    <span className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-[#F8F6F1] border border-white/20">
                      แผนของคุณ
                    </span>
                  )}

                  {/* Header */}
                  <div className="mb-4">
                    <p
                      className="font-display text-xs tracking-[0.25em] uppercase font-bold mb-1"
                      style={{ color: plan.color }}
                    >
                      {plan.name}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] line-clamp-1">{plan.subtitle}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-5 pb-4 border-b border-white/10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#F8F6F1]">
                        ฿{plan.priceThb.toLocaleString()}
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        / {plan.interval === "lifetime" ? "ตลอดชีพ" : plan.interval === "year" ? "ปี" : "เดือน"}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[#94A3B8] leading-relaxed">
                        <span className="text-[#C6A96B] shrink-0 mt-0.5">✧</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Radio Selector Visual */}
                  <div
                    className={`w-full py-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20"
                        : "border border-white/10 text-[#94A3B8] group-hover:border-white/30"
                    }`}
                  >
                    {isSelected ? "เลือกแพ็กเกจนี้ ✓" : "เลือกแพ็กเกจ"}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* 2. Sands Refill Packs Tab */}
        {activeTab === "sands" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-center mb-6">
              <p className="text-xs text-[#94A3B8]">
                ละอองทรายกาลเวลาใช้สำหรับแลกรับ AI Report ฉบับเต็ม หรือเปิดสิทธิ์การวิเคราะห์พิเศษเฉพาะครั้ง
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {Object.values(SANDS_REFILL_PACKS).map((pack) => {
                const isSelected = selectedSandsPack === pack.id;

                return (
                  <label
                    key={pack.id}
                    className={`cursor-pointer group relative flex flex-col rounded-3xl border p-6 transition-all duration-300 ${
                      isSelected
                        ? "border-[#C6A96B] bg-[#C6A96B]/[0.08] shadow-xl shadow-[#C6A96B]/15 scale-[1.02]"
                        : "border-white/10 bg-[#0B1528]/40 hover:border-white/20"
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
                      <span
                        className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-md"
                        style={{
                          background: "linear-gradient(135deg, #C6A96B, #D9BC82)",
                          color: "#020617",
                        }}
                      >
                        แนะนำ
                      </span>
                    )}

                    <div className="text-3xl mb-2">⏳</div>
                    <p className="font-display text-base font-bold text-[#F8F6F1]">{pack.name}</p>
                    <p className="text-[11px] text-[#C6A96B] font-semibold mt-0.5">{pack.bonusText}</p>

                    <div className="my-4 pt-3 border-t border-white/10">
                      <span className="text-2xl font-extrabold text-[#F8F6F1]">
                        ฿{pack.priceThb.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] block mt-0.5">
                        (~฿{pack.pricePerUnit.toFixed(2)} / ละอองทราย)
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
          </div>
        )}

        {/* ── Submit Button ── */}
        <div className="max-w-md mx-auto pt-4 text-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl font-bold text-base text-[#020617] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-[#C6A96B]/20 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />
                กำลังสร้าง QR Code...
              </span>
            ) : (
              <span>
                ชำระเงินผ่าน PromptPay QR (฿
                {(activeTab === "membership"
                  ? SUBSCRIPTION_PLANS[selectedPlan]?.priceThb
                  : SANDS_REFILL_PACKS[selectedSandsPack]?.priceThb
                )?.toLocaleString() || 0}
                ) →
              </span>
            )}
          </button>
          <p className="text-[11px] text-[#94A3B8] mt-3">
            🔒 รองรับ PromptPay ทุกธนาคาร · ปลอดภัยด้วย Omise (Opn Payments) · ปลดล็อกสิทธิ์ทันทีหลังชำระ
          </p>
        </div>
      </form>

      {/* ── Modal: Omise PromptPay Live QR Code ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-[#C6A96B]/40 bg-[#0B1528] p-6 sm:p-8 text-center shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Background Glow */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none opacity-20"
              style={{ background: "radial-gradient(circle, #C6A96B 0%, transparent 70%)" }}
            />

            {/* Close Button */}
            {paymentStatus !== "success" && (
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 text-[#94A3B8] hover:text-[#F8F6F1] flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            )}

            {/* Success State */}
            {paymentStatus === "success" ? (
              <div className="py-8 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 text-4xl animate-bounce">
                  ✓
                </div>
                <h3 className="font-display text-2xl font-bold text-[#F8F6F1]">
                  ชำระเงินสำเร็จเรียบร้อย!
                </h3>
                <p className="text-sm text-[#94A3B8] max-w-xs mx-auto">
                  ระบบได้เปิดใช้งานสิทธิประโยชน์ของคุณแล้ว กำลังพาท่านกลับสู่หน้าแดชบอร์ด...
                </p>
              </div>
            ) : (
              /* Pending / QR Display State */
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs text-[#C6A96B] font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Thai PromptPay QR</span>
                </div>

                <h3 className="font-display text-xl font-bold text-[#F8F6F1]">{paymentItemName}</h3>
                <p className="text-3xl font-extrabold text-[#C6A96B] font-mono">
                  ฿{paymentAmount.toLocaleString()}.00
                </p>

                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-2xl mx-auto w-64 h-64 flex items-center justify-center shadow-inner border-4 border-[#C6A96B]/20">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="PromptPay QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-800">
                      <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span className="text-xs font-bold">กำลังโหลด QR Code...</span>
                    </div>
                  )}
                </div>

                {/* Instructions & Timer */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
                    <span>หมดอายุภายใน:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {formatCountdown(timeLeft)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    สแกน QR Code ด้านบนด้วยแอพพลิเคชันธนาคารใดก็ได้ เมื่อชำระเสร็จระบบจะปลดล็อกอัตโนมัติทันที
                  </p>
                </div>

                {/* Live Polling Indicator */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] text-[#94A3B8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ระบบกำลังรอรับยอดเงินอัตโนมัติ...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
