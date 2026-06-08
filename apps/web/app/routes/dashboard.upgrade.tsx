/**
 * dashboard.upgrade.tsx
 * หน้ายื่นคำขออัปเกรดแพ็กเกจ (รองรับ GBPrimePay PromptPay)
 */
import { useState, useEffect } from "react";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData, useNavigation, useFetcher, useNavigate } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [{ title: "อัปเกรดแพ็กเกจ — PhopePhum" }];

const PLANS = [
  {
    id: "basic",
    name: "BASIC SAGE",
    price: "฿59 / เดือน",
    color: "#94A3B8",
    features: ["ยามอัฏฐกาล & ราหู (วันนี้)", "ผัง 7 ตัว 9 ฐาน (ดวงตนเอง)", "Life Report 1 ครั้ง/เดือน"],
  },
  {
    id: "pro",
    name: "PROFESSIONAL MASTER",
    price: "฿259 / เดือน",
    color: "#C6A96B",
    features: ["ยามอัฏฐกาลล่วงหน้า 7 วัน", "ระบบจรครบถ้วน", "Life Report 15 ครั้ง/เดือน", "บันทึกดวงผู้อื่น 15 รายชื่อ"],
  },
  {
    id: "imperial",
    name: "IMPERIAL EMPEROR",
    price: "฿789 / เดือน",
    color: "#4B6FAE",
    features: ["ทุกฟีเจอร์ไม่จำกัด", "ดวงสมพงษ์ & ปฏิทิน 100 ปี", "Life Report ไม่จำกัดครั้ง", "Export รายงาน PDF พรีเมียม"],
  },
] as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const { supabase } = createSupabaseClient(request, env);
  const { data: pending } = await supabase
    .from("subscription_requests")
    .select("id, plan, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return json({ profile, pending });
}

export default function UpgradePage() {
  const { profile, pending: initialPending } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const statusFetcher = useFetcher<any>();
  const navigate = useNavigate();
  
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  // ดึงค่า plan จาก URL มาเป็นค่าเริ่มต้น
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planFromUrl = urlParams.get("plan");
    if (planFromUrl && PLANS.some(p => p.id === planFromUrl)) {
      setSelectedPlan(planFromUrl);
    }
  }, []);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(initialPending?.id || null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes

  // เมื่อกดจ่ายเงิน (Stripe Checkout)
  const handleUpgrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    
    const formData = new FormData();
    formData.append("plan", selectedPlan);
    fetcher.submit(formData, { method: "post", action: "/api/payment/checkout" });
  };

  // เมื่อได้ Stripe URL ให้ Redirect ทันที
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.url) {
      window.location.href = fetcher.data.url;
    }
  }, [fetcher.data]);

  // ระบบ Polling ตรวจสอบสถานะการจ่ายเงิน
  useEffect(() => {
    let interval: any;
    if (showModal && requestId && paymentStatus === "pending") {
      interval = setInterval(() => {
        statusFetcher.load(`/api/payment/status/${requestId}`);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [showModal, requestId, paymentStatus]);

  // ตรวจสอบผลลัพธ์จากการ Polling
  useEffect(() => {
    if (statusFetcher.data?.status === "success") {
      setPaymentStatus("success");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    }
  }, [statusFetcher.data]);

  // ระบบนับเวลาถอยหลัง
  useEffect(() => {
    if (showModal && timeLeft > 0 && paymentStatus === "pending") {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showModal, timeLeft, paymentStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <Link to="/pricing" className="text-[#C6A96B] text-xs hover:underline transition-colors mb-4 inline-block tracking-widest uppercase font-bold">
          ← ดูตารางเปรียบเทียบสิทธิ์
        </Link>
        <h1 className="font-display text-4xl font-bold text-[#F8F6F1] mt-2">ยกระดับสู่ภูมิปัญญาขั้นสูง</h1>
        <p className="text-[#94A3B8] text-sm mt-3 max-w-md mx-auto">
          เลือกแพ็กเกจที่เหมาะสมเพื่อรับการพยากรณ์ที่แม่นยำและลึกซึ้งที่สุด
        </p>
      </div>

      <Form onSubmit={handleUpgrade} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <label key={plan.id} className="cursor-pointer group relative">
              <input 
                type="radio" 
                name="plan" 
                value={plan.id} 
                className="sr-only peer" 
                required 
                checked={selectedPlan === plan.id}
                onChange={(e) => setSelectedPlan(e.target.value)}
              />
              <div className="h-full rounded-3xl border border-white/10 p-6 transition-all duration-300 peer-checked:border-[var(--pc)] peer-checked:bg-white/[0.03] group-hover:border-white/20"
                style={{ "--pc": plan.color } as React.CSSProperties}>
                <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-white/10 peer-checked:bg-[var(--pc)] peer-checked:border-[var(--pc)] transition-colors flex items-center justify-center">
                   <div className="w-2 h-2 bg-[#020617] rounded-full opacity-0 peer-checked:opacity-100" />
                </div>
                <p className="font-display text-[13px] tracking-[0.3em] uppercase mb-1" style={{ color: plan.color }}>{plan.name}</p>
                <p className="text-[#F8F6F1] font-bold text-2xl mb-4">{plan.price}</p>
                <ul className="space-y-2.5 mb-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[#94A3B8] text-[14px] leading-relaxed">
                      <span className="text-base -mt-1" style={{ color: plan.color }}>✧</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </label>
          ))}
        </div>

        <div className="max-w-sm mx-auto">
          <button
            type="submit"
            disabled={fetcher.state !== "idle" || !selectedPlan}
            className="w-full py-4 rounded-2xl font-bold text-[#020617] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
          >
            {fetcher.state !== "idle" ? "กำลังพาไปหน้าชำระเงิน..." : `ชำระเงินแพ็กเกจ ${selectedPlan.toUpperCase()} →`}
          </button>
        </div>
      </Form>
    </div>
  );
}
