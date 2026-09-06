import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { getUser } from "~/services/auth.server";
import { SANDS_REFILL_PACKS } from "~/lib/plans";
import type { Env } from "~/env.server";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "ราคาสมาชิก & ปัญญาบารมี — PhopePhum Wisdom Guidance" },
  { name: "description", content: "เริ่มต้นฟรีหรืออัปเกรดเป็นระดับต่างๆ รับคำแนะนำ AI วิเคราะห์ดวงชะตา และปฏิทินพลังงานรายวัน เริ่มต้นเพียง ฿89/เดือน หรือเติมละอองทรายกาลเวลาตามต้องการ" },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com/pricing" },
  { property: "og:title", content: "ราคาสมาชิก & ปัญญาบารมี — PhopePhum" },
  { property: "og:description", content: "ที่ปรึกษาชีวิตส่วนตัว เริ่มฟรี หรือยกระดับสู่สัจธรรมชีวิตดวงดาว" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },
  { name: "keywords", content: "สมัครสมาชิกภพภูมิ, ราคาภพภูมิ, PhopePhum Wisdom, ที่ปรึกษาชีวิต AI, ทรายกาลเวลา" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env);
  const url = new URL(request.url);
  const showUpgradeBanner = url.searchParams.get("upgrade") === "1";
  const requiredPlan = url.searchParams.get("require") || null;

  return json({
    isLoggedIn: !!user,
    showUpgradeBanner,
    requiredPlan,
  });
}

// ─── Plan definitions ─────────────────────────────────────────────────────────────

const MONTHLY_PLANS = [
  {
    tier: "FREE",
    id: "free",
    name: "เริ่มต้น",
    subtitle: "สัมผัสภูมิปัญญา",
    price: "0",
    priceLabel: "ฟรี",
    priceNote: "ตลอดชีพ",
    tag: null,
    style: "free" as const,
    ctaLabel: "สมัครฟรีตอนนี้",
    ctaLoggedIn: "/dashboard",
    ctaGuest: "/register",
    features: [
      { text: "Dashboard พลังงานวันนี้",          included: true },
      { text: "ข้อมูลชาตาส่วนตัวเบื้องต้น",       included: true },
      { text: "เส้นทางชีวิต (ภาพรวม)",            included: true },
      { text: "Wisdom AI (จำกัด 3 ครั้ง/เดือน)",  included: true },
      { text: "ปฏิทินพลังงานรายวัน",              included: false },
      { text: "ระบบวิเคราะห์จรแบบสมบูรณ์",       included: false },
      { text: "ส่งออกรายงาน PDF พรีเมียม",        included: false },
    ],
    note: "* สมาชิกทดลองใช้งานฟรีตลอดชีพ",
  },
  {
    tier: "BASIC",
    id: "basic",
    name: "Basic Sage",
    subtitle: "ยกระดับการพยากรณ์เบื้องต้น",
    price: "89",
    priceLabel: "89",
    priceNote: "/ เดือน",
    tag: null,
    style: "basic" as const,
    ctaLabel: "เริ่มใช้ Basic ฿89/เดือน",
    ctaLoggedIn: "/dashboard/upgrade?plan=basic",
    ctaGuest: "/register?plan=basic",
    features: [
      { text: "ยามอัฏฐกาล & ราหู (วันนี้)",          included: true },
      { text: "ผัง 7 ตัว 9 ฐาน (ดวงตนเอง)",        included: true },
      { text: "Life Report 1 ครั้ง/เดือน",          included: true },
      { text: "ปฏิทินพลังงานรายวัน",                included: true },
      { text: "Wisdom AI (จำกัด 10 ครั้ง/เดือน)",   included: true },
      { text: "บันทึกดวงตนเอง + 3 โปรไฟล์",        included: true },
      { text: "ส่งออกรายงาน PDF พรีเมียม",        included: false },
    ],
    note: null,
  },
  {
    tier: "PRO",
    id: "pro",
    name: "Professional Master",
    subtitle: "ที่ปรึกษาชีวิตเต็มประสิทธิภาพ",
    price: "289",
    priceLabel: "289",
    priceNote: "/ เดือน",
    tag: "แนะนำ",
    style: "pro" as const,
    ctaLabel: "เริ่มใช้ Pro ฿289/เดือน",
    ctaLoggedIn: "/dashboard/upgrade?plan=pro",
    ctaGuest: "/register?plan=pro",
    features: [
      { text: "ยามอัฏฐกาลล่วงหน้า 7 วัน",          included: true },
      { text: "ระบบวิเคราะห์จรแบบสมบูรณ์",        included: true },
      { text: "Life Report 15 ครั้ง/เดือน",         included: true },
      { text: "บันทึกดวงผู้อื่น 15 รายชื่อ",          included: true },
      { text: "Wisdom AI ไม่จำกัด",                 included: true },
      { text: "ปฏิทิน 100 ปีดวงดาวเชิงลึก",          included: true },
      { text: "รับ Sands +150 ละอองทราย/เดือน",   included: true },
    ],
    note: null,
  },
  {
    tier: "IMPERIAL",
    id: "imperial",
    name: "Imperial Emperor",
    subtitle: "ที่สุดแห่งสัจธรรมพลังจักรวาล",
    price: "789",
    priceLabel: "789",
    priceNote: "ตลอดชีพ",
    tag: "สัจจะสูงสุด",
    style: "imperial" as const,
    ctaLabel: "เริ่มใช้ Imperial ฿789 ตลอดชีพ",
    ctaLoggedIn: "/dashboard/upgrade?plan=imperial",
    ctaGuest: "/register?plan=imperial",
    features: [
      { text: "ทุกฟีเจอร์ในระบบไม่จำกัดตลอดชีพ",     included: true },
      { text: "ดวงสมพงษ์ & ปฏิทิน 100 ปี",           included: true },
      { text: "Life Report ไม่จำกัดครั้ง",           included: true },
      { text: "Export รายงาน PDF พรีเมียม",          included: true },
      { text: "Wisdom AI แบบ Real-time",            included: true },
      { text: "รับ Sands +500 ละอองทรายโบนัส",     included: true },
    ],
    note: null,
  },
] as const;

const ANNUAL_PLANS = [
  {
    ...MONTHLY_PLANS[0],
  },
  {
    ...MONTHLY_PLANS[1],
  },
  {
    tier: "PRO",
    id: "pro_annual",
    name: "Professional Master (รายปี)",
    subtitle: "คุ้มค่าที่สุดสำหรับมืออาชีพ (ประหยัด ~20%)",
    price: "2790",
    priceLabel: "2,790",
    priceNote: "/ ปี (~฿232.50/ด.)",
    tag: "คุ้มค่าสูงสุด",
    style: "pro" as const,
    ctaLabel: "เริ่มใช้ Pro รายปี ฿2,790/ปี",
    ctaLoggedIn: "/dashboard/upgrade?plan=pro_annual",
    ctaGuest: "/register?plan=pro_annual",
    features: [
      { text: "สิทธิ์ Pro ครบถ้วนตลอด 1 ปีเต็ม",      included: true },
      { text: "ยามอัฏฐกาลล่วงหน้า 7 วัน",          included: true },
      { text: "ระบบวิเคราะห์จรแบบสมบูรณ์",        included: true },
      { text: "Life Report 15 ครั้ง/เดือน",         included: true },
      { text: "บันทึกดวงผู้อื่น 15 รายชื่อ",          included: true },
      { text: "Wisdom AI ไม่จำกัด",                 included: true },
      { text: "รับ Sands โบนัสพิเศษ +1,800 เม็ด",   included: true },
    ],
    note: "* ประหยัดกว่าการจ่ายรายเดือนถึง ฿678/ปี",
  },
  {
    ...MONTHLY_PLANS[3],
  },
] as const;

const COMPARE_ROWS = [
  { label: "Dashboard วันนี้",            free: "✅",        basic: "✅",       pro: "✅",        imperial: "✅" },
  { label: "ข้อมูลชาตาส่วนตัว",          free: "พื้นฐาน",   basic: "ตนเอง",     pro: "✅ ละเอียด",  imperial: "✅ ครบถ้วน" },
  { label: "เส้นทางชีวิต & รายงาน",       free: "ภาพรวม",    basic: "1 ครั้ง/ด.",  pro: "15 ครั้ง/ด.", imperial: "✅ ไม่จำกัด" },
  { label: "Wisdom AI",                 free: "3/เดือน",   basic: "10/เดือน",  pro: "✅ ไม่จำกัด",  imperial: "✅ ไม่จำกัด" },
  { label: "ยามและปฏิทินพลังงาน",        free: "—",         basic: "วันนี้",     pro: "7 วันล่วงหน้า", imperial: "100 ปีดาราศาสตร์" },
  { label: "บันทึกดวงผู้อื่น",            free: "—",         basic: "3 รายชื่อ",  pro: "15 รายชื่อ",  imperial: "✅ ไม่จำกัด" },
  { label: "Sands of Time รวมในแพ็ก",   free: "—",         basic: "+50/ด.",    pro: "+150/ด.",    imperial: "+500 ทันที" },
  { label: "ส่งออกรายงาน PDF",          free: "—",         basic: "—",         pro: "—",          imperial: "✅ พรีเมียม" },
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PricingPage() {
  const { isLoggedIn, showUpgradeBanner, requiredPlan } = useLoaderData<typeof loader>();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const plans = billingCycle === "monthly" ? MONTHLY_PLANS : ANNUAL_PLANS;

  return (
    <main className="relative min-h-screen overflow-hidden pb-24" style={{ background: "var(--bg-base)" }}>

      {/* ── Cosmic atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[800px] h-[800px] -top-80 left-1/2 -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(75,111,174,0.13) 0%, transparent 65%)" }} />
        <div className="absolute w-[600px] h-[600px] -bottom-40 -right-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(198,169,107,0.08) 0%, transparent 65%)" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:py-24">

        {/* Back nav */}
        <div className="mb-8">
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="text-[#94A3B8] text-sm hover:text-[#C6A96B] transition-colors">
            ← {isLoggedIn ? "กลับหน้า Dashboard" : "กลับหน้าหลัก"}
          </Link>
        </div>

        {/* ── Upgrade Banner ── */}
        {showUpgradeBanner && (
          <div className="mb-10 rounded-2xl border border-[#C6A96B]/30 px-5 py-4 text-center animate-in fade-in duration-300"
            style={{ background: "rgba(198,169,107,0.08)" }}>
            <p className="text-[#C6A96B] text-sm font-semibold">
              ✦ ฟังก์ชันนี้สำหรับสมาชิกแผน {requiredPlan ? requiredPlan.toUpperCase() : "พรีเมียม"} ขึ้นไป — เลือกแพ็กเกจด้านล่างเพื่อปลดล็อกได้ทันที
            </p>
          </div>
        )}

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-[#C6A96B] text-sm">✦</span>
            <span className="font-display text-[#F8F6F1] font-bold text-xl tracking-wider">PHOPEPHUM</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#F8F6F1] mb-4 leading-tight">
            เลือกแผนที่ใช่สำหรับคุณ
          </h1>
          <p className="text-[#94A3B8] text-base max-w-lg mx-auto leading-relaxed">
            เริ่มต้นฟรี หรืออัปเกรดรับประสบการณ์ Wisdom Guidance<br className="hidden sm:block" />
            เต็มประสิทธิภาพตามกำลังสัจบารมี
          </p>
        </div>

        {/* ── Billing Cycle Toggle ── */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 rounded-2xl border border-slate-300/80 dark:border-white/10 bg-slate-100/95 dark:bg-[#0B1528]/80 backdrop-blur-md shadow-lg">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8F6F1]"
              }`}
            >
              รายเดือน (Monthly)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                billingCycle === "annual"
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8F6F1]"
              }`}
            >
              <span>รายปี (Annual)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                billingCycle === "annual"
                  ? "bg-[#020617]/20 text-[#020617]"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
              }`}>
                ประหยัด -20%
              </span>
            </button>
          </div>
        </div>

        {/* ── Pricing Cards — 4 plans ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} isLoggedIn={isLoggedIn} />
          ))}
        </div>

        {/* ── Sands Micro-Economy Top-Up Showcase ── */}
        <div className="mb-20 max-w-4xl mx-auto rounded-3xl border border-[#C6A96B]/30 p-8 sm:p-10 relative overflow-hidden bg-gradient-to-b from-white/95 via-[#FAF8F5]/95 to-[#F5EFE6]/95 dark:from-[#0B1528]/85 dark:to-[#020617]/95 backdrop-blur-xl shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-2.5">
              <AstralIcon name="sandglass" size="xs" variant="gold" glow />
              <span>Sands of Time Micro-Economy</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1]">
              หรือเติมเฉพาะ ละอองทรายกาลเวลา ตามต้องการ
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-2 max-w-lg mx-auto leading-relaxed">
              ใช้สำหรับแลกรับ AI Report ฉบับเต็ม หรือเปิดสิทธิ์การวิเคราะห์พิเศษเฉพาะครั้ง โดยไม่ต้องสมัครรายเดือน
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {Object.values(SANDS_REFILL_PACKS).map((pack) => (
              <div
                key={pack.id}
                className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-300 ${
                  pack.popular
                    ? "border-[#C6A96B] bg-[#C6A96B]/10 dark:bg-[#C6A96B]/[0.08] shadow-xl shadow-[#C6A96B]/15 sm:-translate-y-1"
                    : "border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02]"
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md">
                    ยอดนิยม
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#C6A96B]/15 border border-[#C6A96B]/30 mb-2.5 shrink-0">
                  <AstralIcon name="sandglass" size="md" variant="gold" glow />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-[#F8F6F1]">{pack.name}</h3>
                <p className="text-xs text-[#8C6D2D] dark:text-[#C6A96B] font-semibold mt-0.5">{pack.bonusText}</p>

                <div className="my-3 pt-2 border-t border-slate-200 dark:border-white/10">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-[#F8F6F1]">฿{pack.priceThb}</span>
                  <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] block mt-0.5">
                    (~฿{pack.pricePerUnit.toFixed(2)} / ละอองทราย)
                  </span>
                </div>

                <Link
                  to={isLoggedIn ? `/dashboard/upgrade?tab=sands&plan=${pack.id}` : `/register?tab=sands&plan=${pack.id}`}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-center mt-auto transition-all ${
                    pack.popular
                      ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20 hover:opacity-95"
                      : "border border-slate-300 dark:border-white/20 text-slate-800 dark:text-[#F8F6F1] bg-white/60 dark:bg-transparent hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  เติม {pack.sandsAmount} ทราย →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison Table ── */}
        <div className="mb-20 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
            <p className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase whitespace-nowrap">เปรียบเทียบฟีเจอร์อย่างละเอียด</p>
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/5 overflow-x-auto"
            style={{ backdropFilter: "blur(24px)", background: "var(--card-dark-bg)" }}>
            <div className="min-w-[700px]">
              <div className="grid grid-cols-5 text-xs font-bold uppercase tracking-widest border-b border-white/5 px-5 py-3 text-center">
                <div className="text-left text-[#94A3B8]">ฟีเจอร์</div>
                <div className="text-[#4A5568]">ฟรี</div>
                <div className="text-[#94A3B8]">Basic</div>
                <div className="text-[#C6A96B]">Pro</div>
                <div className="text-[#4B6FAE]">Imperial</div>
              </div>
              {COMPARE_ROWS.map((row, i) => (
                <div key={row.label}
                  className={`grid grid-cols-5 px-5 py-3 text-sm text-center ${i % 2 === 0 ? "bg-white/[0.02]" : ""} border-b border-white/[0.04] last:border-0`}>
                  <div className="text-left text-[#94A3B8] font-medium">{row.label}</div>
                  <div className="text-[#4A5568]">{row.free}</div>
                  <div className="text-[#94A3B8]">{row.basic}</div>
                  <div className="text-[#C6A96B] font-semibold">{row.pro}</div>
                  <div className="text-[#4B6FAE] font-semibold">{row.imperial}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Trust signals ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {[
            { icon: "🔒", title: "ปลอดภัย 100%", desc: "ชำระเงินผ่าน Omise (Opn Payments) ด้วย PromptPay QR หรือบัตรเครดิตมาตรฐานระดับโลก" },
            { icon: "⚡", title: "ปลดล็อกทันที", desc: "ระบบ Atomic Webhook ยืนยันยอดและเปิดสิทธิ์ทันทีภายในไม่กี่วินาที" },
            { icon: "✦", title: "ภูมิปัญญาแท้ดั้งเดิม", desc: "เลข 7 ตัว 9 ฐาน + อัฏฐกาลที่แม่นยำ พร้อมการผสาน AI อัจฉริยะ" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="text-center p-5 rounded-2xl border border-white/5"
              style={{ backdropFilter: "blur(12px)", background: "var(--card-dark-bg)" }}>
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-[#F8F6F1] font-semibold text-sm mb-1">{title}</p>
              <p className="text-[#94A3B8] text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
            <p className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase whitespace-nowrap">คำถามที่พบบ่อย</p>
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
          </div>
          <div className="space-y-4">
            {[
              { q: "ยกเลิกการสมัครสมาชิกได้ตอนไหน?", a: "ยกเลิกได้ทุกเมื่อก่อนรอบบิลถัดไป ไม่มีสัญญาผูกมัดหรือค่าบริการยกเลิกเพิ่มเติม" },
              { q: "ช่องทางการชำระเงินรองรับแบบไหนบ้าง?", a: "เรารองรับ Thai PromptPay QR ทุกธนาคาร และบัตรเครดิต/เดบิต ผ่านเกตเวย์ Omise (Opn Payments) ที่มีความปลอดภัยระดับสากล" },
              { q: "ละอองทรายกาลเวลา (Sands of Time) คืออะไรและหมดอายุไหม?", a: "ละอองทรายกาลเวลาเป็นหน่วยแต้มปัญญาสำหรับแลกรับบทวิเคราะห์เชิงลึก โดยละอองทรายที่ซื้อเพิ่มจะไม่มีวันหมดอายุ และจะถูกเก็บสะสมไว้ในบัญชีของคุณตลอดไป" },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/5 px-5 py-4"
                style={{ background: "var(--card-dark-bg)" }}>
                <p className="text-[#F8F6F1] font-semibold text-sm mb-1">{q}</p>
                <p className="text-[#94A3B8] text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "PhopePhum Wisdom Guidance",
          "offers": [...MONTHLY_PLANS, ...ANNUAL_PLANS].map(p => ({
            "@type": "Offer",
            "name": p.name,
            "price": p.price,
            "priceCurrency": "THB",
          }))
        }) }}
      />
    </main>
  );
}

// ─── PricingCard Component ───────────────────────────────────────────────────

function PricingCard({
  plan,
  isLoggedIn,
}: {
  plan: typeof MONTHLY_PLANS[number] | typeof ANNUAL_PLANS[number];
  isLoggedIn: boolean;
}) {
  const isFree      = plan.style === "free";
  const isBasic     = plan.style === "basic";
  const isPro       = plan.style === "pro";
  const isImperial  = plan.style === "imperial";

  const borderColor = isPro 
    ? "rgba(198,169,107,0.40)" 
    : isImperial 
    ? "rgba(75,111,174,0.40)" 
    : "rgba(255,255,255,0.08)";
    
  const bg = isPro
    ? "rgba(198,169,107,0.06)"
    : isImperial
    ? "rgba(75,111,174,0.06)"
    : "var(--card-dark-bg)";
    
  const glow = isPro 
    ? "0 0 60px rgba(198,169,107,0.12)" 
    : isImperial 
    ? "0 0 60px rgba(75,111,174,0.12)" 
    : "none";
    
  const priceColor = isPro 
    ? "#C6A96B" 
    : isImperial 
    ? "#4B6FAE" 
    : isBasic 
    ? "#A3B3CC" 
    : "#4A5568";

  const ctaHref = isLoggedIn ? plan.ctaLoggedIn : plan.ctaGuest;

  return (
    <div
      className={`relative flex flex-col rounded-3xl p-6 transition-all duration-300 ${isPro || isImperial ? "sm:-translate-y-2 border-2" : ""}`}
      style={{ backdropFilter: "blur(24px)", background: bg, border: `1px solid ${borderColor}`, boxShadow: glow }}
    >
      {/* Tag */}
      {plan.tag && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase shadow-md"
            style={{ 
              background: isImperial ? "linear-gradient(135deg, #4B6FAE, #6D8FC7)" : "linear-gradient(135deg, #C6A96B, #D9BC82)", 
              color: "#020617" 
            }}>
            {plan.tag}
          </span>
        </div>
      )}

      {/* Tier label */}
      <div className="mb-5">
        <p className="font-display text-[9px] tracking-[0.3em] uppercase mb-1" style={{ color: priceColor }}>
          {plan.tier}
        </p>
        <p className="text-[#F8F6F1] text-xl font-bold leading-tight">{plan.name}</p>
        <p className="text-[#94A3B8] text-xs mt-1 min-h-[32px]">{plan.subtitle}</p>
      </div>

      {/* Price */}
      <div className="mb-6 flex items-end gap-1">
        {isFree ? (
          <span className="font-display text-4xl font-bold leading-none text-[#4A5568]">ฟรี</span>
        ) : (
          <>
            <span className="text-[#94A3B8] text-sm self-start mt-1">฿</span>
            <span className="font-display text-4xl font-bold leading-none" style={{ color: priceColor }}>
              {plan.priceLabel}
            </span>
            <span className="text-[#94A3B8] text-xs mb-1">{plan.priceNote}</span>
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-7 flex-1">
        {plan.features.map((f) => (
          <li key={f.text} className={`flex items-start gap-3 text-xs ${f.included ? "" : "opacity-35"}`}>
            <span className="shrink-0 mt-0.5 text-xs leading-none" style={{ color: f.included ? (isFree ? "#4A5568" : priceColor) : "#374151" }}>
              {f.included ? "✓" : "✕"}
            </span>
            <span className={f.included ? "text-[#D9CDB7] text-left" : "text-[#4A5568] line-through text-left"}>{f.text}</span>
          </li>
        ))}
      </ul>

      {/* Note */}
      {plan.note && (
        <p className="text-[#4A5568] text-[11px] mb-4 leading-relaxed text-left">{plan.note}</p>
      )}

      {/* CTA */}
      <Link
        to={ctaHref}
        className="block text-center py-3 px-4 rounded-xl text-xs font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        style={isPro 
          ? { background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#020617" }
          : isImperial
          ? { background: "linear-gradient(135deg, #4B6FAE, #6D8FC7)", color: "#F8F6F1" }
          : isBasic
          ? { background: "rgba(255,255,255,0.08)", color: "#F8F6F1", border: "1px solid rgba(255,255,255,0.15)" }
          : { background: "rgba(255,255,255,0.05)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.08)" }
        }
      >
        {plan.ctaLabel}
      </Link>
    </div>
  );
}
