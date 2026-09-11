import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { getUser } from "~/services/auth.server";
import { SANDS_REFILL_PACKS } from "~/lib/plans";
import type { Env } from "~/env.server";
import { AstralIcon } from "~/components/ui/AstralIcon";
import { PublicLayout } from "~/components/public/PublicLayout";

export const meta: MetaFunction = () => [
  { title: "ราคา & แพ็กเกจสมาชิก — PhoPePhum OS | Data Science ของชีวิต" },
  {
    name: "description",
    content:
      "เริ่มต้นฟรี หรือยกระดับสู่เครื่องมือวิเคราะห์เชิงกลยุทธ์ระดับมืออาชีพ แพ็กเกจรายเดือนไม่มีสัญญาผูกมัด ผสานวิชาเลข ๗ ตัว ๙ ฐาน 35 ภพเรือน ฐานกำลังพระเคราะห์ 19 ฐาน และคัมภีร์สุริยยาตร์แท้",
  },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com/pricing" },
  { property: "og:title", content: "ราคา & แพ็กเกจสมาชิก — PhoPePhum OS" },
  {
    property: "og:description",
    content:
      "เลือกแผนที่ใช่สำหรับคุณ เริ่มต้นฟรี หรือยกระดับสู่เครื่องมือวิเคราะห์เชิงกลยุทธ์ระดับมืออาชีพและโหราจารย์ คิดค่าบริการตามรอบบิลที่เลือก โปร่งใส ชัดเจน",
  },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },
  { name: "keywords", content: "ราคาภพภูมิ, สมัครสมาชิกภพภูมิ, PhoPePhum OS, แพ็กเกจดูดวง AI, ทรายกาลเวลา, เลข 7 ตัว 9 ฐาน" },
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
    name: "เริ่มทดลอง",
    subtitle: "สัมผัสพลังงานชีวิตและกาลชะตาเบื้องต้น",
    price: "0",
    priceLabel: "ฟรี",
    priceNote: "",
    tag: null,
    style: "free" as const,
    ctaLabel: "สมัครใช้งานฟรี",
    ctaLoggedIn: "/dashboard",
    ctaGuest: "/register",
    features: [
      { text: "สัมผัสพลังงานชีวิตและกาลชะตาเบื้องต้น", included: true },
      { text: "ผังดวงวิชาเลข ๗ ตัว ๙ ฐานเบื้องต้น", included: true },
      { text: "กาลชะตาวันนี้ & ยามปัจจุบัน", included: true },
      { text: "Dashboard สรุปพลังงานประจำวัน", included: true },
      { text: "Wisdom AI (ทดลองใช้งาน)", included: true },
      { text: "รับทรายกาลเวลา (Sands) ฟรีทุกวัน", included: true },
      { text: "ผังจักรพรรดิ 35 ภพ 19 ฐาน", included: false },
    ],
    note: "* เริ่มต้นใช้งานฟรี ไม่มีข้อผูกมัดใดๆ",
  },
  {
    tier: "PREMIUM",
    id: "premium",
    name: "ยกระดับชีวิต",
    subtitle: "วางแผนชีวิตและการเงินส่วนบุคคล",
    price: "89",
    priceLabel: "89",
    priceNote: "/ เดือน",
    tag: null,
    style: "basic" as const,
    ctaLabel: "เริ่มใช้ Premium ฿89/เดือน",
    ctaLoggedIn: "/dashboard/upgrade?plan=premium",
    ctaGuest: "/register?plan=premium",
    features: [
      { text: "ยามอัฏฐกาลเต็มผัง (กลางวัน-กลางคืน)", included: true },
      { text: "วิชาเลข ๗ ตัว ๙ ฐาน 35 ภพเรือน ฐานกำลังพระเคราะห์ 19 ฐาน (ตนเอง)", included: true },
      { text: "ปฏิทินจันทรคติไทย 100 ปีแท้ (สุริยยาตร์)", included: true },
      { text: "AI Life Report 1 ครั้ง/เดือน", included: true },
      { text: "Wisdom AI 10 ครั้ง/เดือน", included: true },
      { text: "บันทึกดวงตนเอง + 3 โปรไฟล์", included: true },
      { text: "รับ Sands +50 ละอองทราย/เดือน", included: true },
    ],
    note: null,
  },
  {
    tier: "PROFESSIONAL",
    id: "pro",
    name: "มืออาชีพ",
    subtitle: "วางแผนงานเฉพาะวิชาชีพ สามารถใช้งานระบบแบบ Custom มากขึ้น",
    price: "289",
    priceLabel: "289",
    priceNote: "/ เดือน",
    tag: "แนะนำยอดนิยม",
    style: "pro" as const,
    ctaLabel: "เริ่มใช้ Pro ฿289/เดือน",
    ctaLoggedIn: "/dashboard/upgrade?plan=pro",
    ctaGuest: "/register?plan=pro",
    features: [
      { text: "วางแผนงานเฉพาะวิชาชีพ Custom ระบบได้มากขึ้น", included: true },
      { text: "KARNCHATA ENGINE V2.0 เต็มระบบ", included: true },
      { text: "Multi-select Overlay Filter บนผังจักรพรรดิ", included: true },
      { text: "ยามพรายกระซิบ 12 ภพ & ราหูค้นทรัพย์", included: true },
      { text: "AI Life Report 15 ครั้ง/เดือน", included: true },
      { text: "บันทึกดวงผู้อื่น 15 รายชื่อ", included: true },
      { text: "รับ Sands +150 ละอองทราย/เดือน", included: true },
    ],
    note: null,
  },
  {
    tier: "MASTER",
    id: "master",
    name: "โหราจารย์",
    subtitle: "ปลดล็อคเครื่องมือสำหรับนักพยากรณ์ เข้าถึงหลักวิชาและหลักการโหราศาสตร์เพื่อใช้ในการพยากรณ์ได้อย่างลึกซึ้งมากขึ้น",
    price: "1289",
    priceLabel: "1,289",
    priceNote: "/ เดือน",
    tag: "Master Class",
    style: "imperial" as const,
    ctaLabel: "เริ่มใช้ Master ฿1,289/เดือน",
    ctaLoggedIn: "/dashboard/upgrade?plan=master",
    ctaGuest: "/register?plan=master",
    features: [
      { text: "ปลดล็อคเครื่องมือสำหรับนักพยากรณ์ เข้าถึงหลักวิชาลึกซึ้ง", included: true },
      { text: "ผังดวงจักรพรรดิ 35 ภพ 19 ฐาน + สุริยยาตร์แท้", included: true },
      { text: "ส่งออกรายงาน AI Life Report พรีเมียม (PDF)", included: true },
      { text: "Pro Tools: 16 ยาม + ยามพรายกระซิบ + ราหูค้นทรัพย์", included: true },
      { text: "บันทึกดวงไม่จำกัดโปรไฟล์", included: true },
      { text: "Wisdom AI แบบ Real-time ไม่จำกัด", included: true },
      { text: "รับ Sands +500 ละอองทราย/เดือน", included: true },
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
    id: "premium",
    priceNote: "/ เดือน (รอบบิลรายเดือน)",
    note: "* แผน Premium ให้บริการรอบบิลรายเดือน ฿89/เดือน",
  },
  {
    ...MONTHLY_PLANS[2],
    id: "pro_annual",
    name: "มืออาชีพ (รายปี)",
    subtitle: "วางแผนงานเฉพาะวิชาชีพ Custom ระบบได้มากขึ้น (ประหยัด 20%)",
    price: "2770",
    priceLabel: "2,770",
    priceNote: "/ ปี (~฿230.80/ด.)",
    tag: "แนะนำยอดนิยม",
    ctaLabel: "เริ่มใช้ Pro รายปี ฿2,770/ปี",
    ctaLoggedIn: "/dashboard/upgrade?plan=pro_annual",
    ctaGuest: "/register?plan=pro_annual",
    note: "* ประหยัดกว่าการจ่ายรายเดือนถึง ฿698/ปี",
  },
  {
    ...MONTHLY_PLANS[3],
    id: "master",
    priceNote: "/ เดือน (รอบบิลรายเดือน)",
    note: "* แผน Master ให้บริการรอบบิลรายเดือน ฿1,289/เดือน",
  },
] as const;

const COMPARE_ROWS = [
  { label: "Dashboard สรุปพลังงานประจำวัน", free: "✅", premium: "✅", pro: "✅", master: "✅" },
  { label: "ผังวิชาเลข ๗ ตัว ๙ ฐาน", free: "พื้นฐาน", premium: "35 ภพ 19 ฐาน (ตนเอง)", pro: "✅ ผังจักรพรรดิละเอียด", master: "✅ สุริยยาตร์แท้ครบมิติ" },
  { label: "AI Life Report & วางแผนชีวิต", free: "ภาพรวม", premium: "1 ครั้ง/ด.", pro: "15 ครั้ง/ด.", master: "✅ ไม่จำกัด (พรีเมียม PDF)" },
  { label: "Wisdom AI Assistant", free: "ทดลองใช้", premium: "10 ครั้ง/ด.", pro: "✅ ไม่จำกัด", master: "✅ Real-time ไม่จำกัด" },
  { label: "ยามอัฏฐกาล & ปฏิทินกาลเวลา", free: "ยามปัจจุบัน", premium: "เต็มผัง 16 ยาม", pro: "7 วันล่วงหน้า", master: "100 ปีแท้ + พรายกระซิบ 12 ภพ" },
  { label: "บันทึกดวงชะตา", free: "ดวงตนเอง", premium: "ตนเอง + 3 โปรไฟล์", pro: "15 รายชื่อ", master: "✅ ไม่จำกัดโปรไฟล์" },
  { label: "ละอองทราย Sands รวมในแพ็ก", free: "ฟรีทุกวัน", premium: "+50/ด.", pro: "+150/ด.", master: "+500/ด." },
  { label: "เครื่องมือ Pro (ราหูค้นทรัพย์ & ยามพรายกระซิบ)", free: "—", premium: "—", pro: "✅ เต็มระบบ", master: "✅ Master Class" },
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PricingPage() {
  const { isLoggedIn, showUpgradeBanner, requiredPlan } = useLoaderData<typeof loader>();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const plans = billingCycle === "monthly" ? MONTHLY_PLANS : ANNUAL_PLANS;

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:py-16">

        {/* Back nav */}
        <div className="mb-8">
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="text-slate-500 dark:text-[#94A3B8] text-sm hover:text-[#C6A96B] transition-colors">
            ← {isLoggedIn ? "กลับหน้า Dashboard" : "กลับหน้าหลัก"}
          </Link>
        </div>

        {/* ── Upgrade Banner ── */}
        {showUpgradeBanner && (
          <div className="mb-10 rounded-2xl border border-[#C6A96B]/30 px-5 py-4 text-center animate-in fade-in duration-300"
            style={{ background: "rgba(198,169,107,0.08)" }}>
            <p className="text-[#8C6D2D] dark:text-[#C6A96B] text-sm font-semibold">
              ✦ ฟังก์ชันนี้สำหรับสมาชิกแผน {requiredPlan ? requiredPlan.toUpperCase() : "พรีเมียม"} ขึ้นไป — เลือกแพ็กเกจด้านล่างเพื่อปลดล็อกได้ทันที
            </p>
          </div>
        )}

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-[#8C6D2D] dark:text-[#C6A96B] text-sm">✦</span>
            <span className="font-display text-slate-900 dark:text-[#F8F6F1] font-bold text-xl tracking-wider">PHOPEPHUM</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4 leading-tight">
            เลือกแผนที่ใช่สำหรับคุณ
          </h1>
          <p className="text-slate-600 dark:text-[#94A3B8] text-base max-w-lg mx-auto leading-relaxed">
            เริ่มต้นใช้งานฟรี หรือยกระดับสู่เครื่องมือวิเคราะห์เชิงกลยุทธ์ระดับมืออาชีพ<br className="hidden sm:block" />
            ตามกำลังสัจบารมี โปร่งใส ชัดเจน และไม่มีข้อผูกมัดระยะยาว
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
        <div
          id="sands"
          className="mb-20 max-w-4xl mx-auto rounded-3xl border border-amber-400/30 dark:border-[#D4AF37]/35 p-7 sm:p-10 relative overflow-hidden bg-white/95 dark:bg-[#07172A]/95 backdrop-blur-2xl shadow-2xl scroll-mt-24"
        >
          {/* Top Luminous Accent Line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent pointer-events-none" />

          {/* Ambient Cosmic Gold Aura (No white banding in dark mode) */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[radial-gradient(circle,_rgba(212,175,55,0.12)_0%,_transparent_70%)] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[radial-gradient(circle,_rgba(75,111,174,0.10)_0%,_transparent_70%)] pointer-events-none" />

          {/* Section Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-[#F6D88C] text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">
              <AstralIcon name="sandglass" size="xs" variant="gold" glow />
              <span>ระบบเศรษฐกิจ Sands of Time</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1]">
              หรือเติมเฉพาะ ละอองทรายกาลเวลา ตามต้องการ
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#CBD5E1] mt-2 max-w-2xl mx-auto leading-relaxed font-sarabun">
              ขับเคลื่อนการวิเคราะห์ด้วย ระบบเศรษฐกิจ Sands of Time — ใช้ ละอองทรายกาลเวลา เพื่อแลกรับ AI Report ฉบับเต็ม หรือเปิดสิทธิ์การวิเคราะห์พิเศษเฉพาะครั้ง โดยไม่ต้องสมัครสมาชิกรายเดือน
            </p>
          </div>

          {/* 3 Sands Refill Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
            {Object.values(SANDS_REFILL_PACKS).map((pack) => (
              <div
                key={pack.id}
                className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                  pack.popular
                    ? "border-2 border-[#D4AF37] bg-white dark:bg-gradient-to-b dark:from-[#122444] dark:to-[#0A182E] shadow-2xl shadow-[#D4AF37]/20 sm:-translate-y-1.5"
                    : "border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0B1A30]/85 hover:border-[#D4AF37]/50 shadow-md"
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-3 right-4 px-3.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] via-[#F6D88C] to-[#C6A96B] text-[#020617] shadow-lg shadow-[#D4AF37]/30">
                    ยอดนิยม
                  </span>
                )}
                
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shrink-0 ${
                  pack.popular
                    ? "bg-[#D4AF37]/25 border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                    : "bg-[#D4AF37]/15 border border-[#D4AF37]/30"
                }`}>
                  <AstralIcon name="sandglass" size="md" variant="gold" glow />
                </div>

                {/* Title & Badge */}
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-[#F8F6F1]">{pack.name}</h3>
                <div className="mt-1">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                    pack.popular
                      ? "bg-[#D4AF37]/20 text-[#D4AF37] dark:text-[#F6D88C] border border-[#D4AF37]/40"
                      : "bg-amber-500/10 dark:bg-[#D4AF37]/15 text-[#8C6D2D] dark:text-[#F6D88C] border border-amber-500/20 dark:border-[#D4AF37]/30"
                  }`}>
                    {pack.bonusText}
                  </span>
                </div>

                {/* Pricing Block */}
                <div className="my-5 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-[#8C6D2D] dark:text-[#D4AF37]">฿</span>
                    <span className={`text-3xl font-black tracking-tight ${
                      pack.popular
                        ? "text-slate-900 dark:text-[#F6D88C]"
                        : "text-slate-900 dark:text-[#F8F6F1]"
                    }`}>
                      {pack.priceThb}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] block mt-1 font-sarabun">
                    (~฿{pack.pricePerUnit.toFixed(2)} / ละอองทราย)
                  </span>
                </div>

                {/* CTA Link */}
                <Link
                  to={isLoggedIn ? `/dashboard/upgrade?tab=sands&plan=${pack.id}` : `/register?tab=sands&plan=${pack.id}`}
                  className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-center mt-auto transition-all ${
                    pack.popular
                      ? "bg-gradient-to-r from-[#D4AF37] via-[#F6D88C] to-[#C6A96B] text-[#020617] shadow-lg shadow-[#D4AF37]/25 hover:brightness-110 active:scale-[0.98]"
                      : "border border-slate-300 dark:border-white/15 text-slate-800 dark:text-[#F8F6F1] bg-white dark:bg-white/[0.06] hover:bg-[#D4AF37]/15 hover:border-[#D4AF37]/50 hover:text-slate-900 dark:hover:text-[#F6D88C] active:scale-[0.98]"
                  }`}
                >
                  เติม {pack.sandsAmount} ละอองทราย →
                </Link>
              </div>
            ))}
          </div>

          {/* Microcopy & CTA Trust Highlights */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-center gap-y-2.5 gap-x-6 text-xs text-slate-600 dark:text-[#CBD5E1] font-sarabun text-center font-medium relative z-10">
            <span className="flex items-center gap-1.5">
              <span className="text-[#D4AF37] font-bold text-sm">✦</span> ใช้ ละอองทรายกาลเวลา ปลดล็อกสิทธิ์วิเคราะห์พิเศษทันที
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#D4AF37] font-bold text-sm">✦</span> แลก AI Report ฉบับเต็มด้วย ละอองทรายกาลเวลา
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#D4AF37] font-bold text-sm">✦</span> รับบทวิเคราะห์พิเศษเฉพาะครั้ง (ใช้ Sands of Time)
            </span>
          </div>
        </div>

        {/* ── Comparison Table ── */}
        <div className="mb-20 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C6A96B]/30 to-transparent" />
            <p className="text-[#8C6D2D] dark:text-[#D4AF37] text-[11px] font-bold tracking-[0.25em] uppercase whitespace-nowrap">
              เปรียบเทียบฟีเจอร์อย่างละเอียด
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C6A96B]/30 to-transparent" />
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07172A]/90 backdrop-blur-2xl shadow-2xl overflow-x-auto">
            <div className="min-w-[720px]">
              {/* Header Row */}
              <div className="grid grid-cols-5 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/10 px-5 py-4 text-center bg-slate-100/90 dark:bg-white/[0.04]">
                <div className="text-left text-slate-700 dark:text-slate-300 font-bold">ฟีเจอร์</div>
                <div className="text-slate-700 dark:text-slate-300 font-bold">เริ่มทดลอง</div>
                <div className="text-sky-600 dark:text-sky-300 font-extrabold">PREMIUM</div>
                <div className="text-amber-700 dark:text-[#F6D88C] font-extrabold flex items-center justify-center gap-1">
                  <span>PROFESSIONAL</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-[#F6D88C] border border-amber-500/30">
                    แนะนำ
                  </span>
                </div>
                <div className="text-indigo-600 dark:text-[#A5C2F0] font-extrabold">MASTER</div>
              </div>

              {/* Data Rows */}
              {COMPARE_ROWS.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-5 px-5 py-3.5 text-xs sm:text-sm text-center items-center ${
                    i % 2 === 0 ? "bg-slate-50/60 dark:bg-white/[0.02]" : "bg-transparent"
                  } hover:bg-amber-500/5 dark:hover:bg-white/[0.04] transition-colors border-b border-slate-100 dark:border-white/[0.05] last:border-0`}
                >
                  {/* Column 1: Feature Label */}
                  <div className="text-left text-slate-800 dark:text-[#F8F6F1] font-medium font-sarabun pr-2">
                    {row.label}
                  </div>

                  {/* Column 2: Free */}
                  <div className="text-slate-600 dark:text-[#CBD5E1] font-sarabun">
                    {row.free === "✅" ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        ✓
                      </span>
                    ) : row.free === "—" ? (
                      <span className="text-slate-400 dark:text-slate-600 font-mono">—</span>
                    ) : (
                      row.free
                    )}
                  </div>

                  {/* Column 3: Premium */}
                  <div className="text-slate-700 dark:text-sky-200 font-sarabun">
                    {row.premium === "✅" ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        ✓
                      </span>
                    ) : row.premium === "—" ? (
                      <span className="text-slate-400 dark:text-slate-600 font-mono">—</span>
                    ) : (
                      row.premium
                    )}
                  </div>

                  {/* Column 4: Professional */}
                  <div className="text-amber-800 dark:text-[#F6D88C] font-semibold font-sarabun">
                    {row.pro === "✅" ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-[#F6D88C] font-bold text-xs shadow-[0_0_10px_rgba(212,175,55,0.25)]">
                        ✓
                      </span>
                    ) : row.pro.startsWith("✅ ") ? (
                      <span className="inline-flex items-center gap-1.5 justify-center">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-[#F6D88C] font-bold text-[10px]">
                          ✓
                        </span>
                        <span>{row.pro.replace("✅ ", "")}</span>
                      </span>
                    ) : (
                      row.pro
                    )}
                  </div>

                  {/* Column 5: Master */}
                  <div className="text-indigo-600 dark:text-[#CBD5E1] font-semibold font-sarabun">
                    {row.master === "✅" ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-500 dark:text-[#A5C2F0] font-bold text-xs">
                        ✓
                      </span>
                    ) : row.master.startsWith("✅ ") ? (
                      <span className="inline-flex items-center gap-1.5 justify-center">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 dark:text-[#A5C2F0] font-bold text-[10px]">
                          ✓
                        </span>
                        <span className="text-indigo-600 dark:text-[#A5C2F0]">{row.master.replace("✅ ", "")}</span>
                      </span>
                    ) : (
                      row.master
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Trust signals ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          {[
            { icon: "🔒", title: "ปลอดภัย 100%", desc: "ชำระเงินผ่าน Omise (Opn Payments) ด้วย PromptPay QR หรือบัตรเครดิตมาตรฐานระดับสากล" },
            { icon: "⚡", title: "ปลดล็อกทันที", desc: "ระบบ Atomic Webhook ยืนยันยอดและเปิดสิทธิ์ทันทีภายในไม่กี่วินาที" },
            { icon: "✦", title: "ภูมิปัญญาแท้ดั้งเดิม", desc: "วิชาเลข ๗ ตัว ๙ ฐาน 35 ภพเรือน ฐานกำลังพระเคราะห์ 19 ฐาน + สุริยยาตร์แท้ ผสาน AI อัจฉริยะ" },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="text-center p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07172A]/80 backdrop-blur-xl shadow-lg"
            >
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-slate-900 dark:text-[#F8F6F1] font-bold text-sm mb-1.5">{title}</p>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-sarabun">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C6A96B]/30 to-transparent" />
            <p className="text-[#8C6D2D] dark:text-[#D4AF37] text-[11px] font-bold tracking-[0.25em] uppercase whitespace-nowrap">
              คำถามที่พบบ่อย
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C6A96B]/30 to-transparent" />
          </div>
          <div className="space-y-4">
            {[
              { q: "ยกเลิกการสมัครสมาชิกได้ตอนไหน?", a: "ยกเลิกได้ทุกเมื่อก่อนรอบบิลถัดไป ไม่มีสัญญาผูกมัดหรือค่าบริการยกเลิกเพิ่มเติม" },
              { q: "ช่องทางการชำระเงินรองรับแบบไหนบ้าง?", a: "เรารองรับ Thai PromptPay QR ทุกธนาคาร และบัตรเครดิต/เดบิต ผ่านเกตเวย์ Omise (Opn Payments) ที่มีความปลอดภัยระดับสากล" },
              { q: "ละอองทรายกาลเวลา (Sands of Time) คืออะไรและหมดอายุไหม?", a: "ละอองทรายกาลเวลาเป็นหน่วยแต้มปัญญาสำหรับแลกรับบทวิเคราะห์เชิงลึก โดยละอองทรายที่ซื้อเพิ่มจะไม่มีวันหมดอายุ และจะถูกเก็บสะสมไว้ในบัญชีของคุณตลอดไป" },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-2xl border border-slate-200 dark:border-white/10 px-5 py-4 bg-white/95 dark:bg-[#07172A]/80 backdrop-blur-xl shadow-md"
              >
                <p className="text-slate-900 dark:text-[#F8F6F1] font-bold text-sm mb-1">{q}</p>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-sarabun">{a}</p>
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
    </PublicLayout>
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
    ? "rgba(198,169,107,0.45)" 
    : isImperial 
    ? "rgba(75,111,174,0.45)" 
    : "rgba(255,255,255,0.12)";
    
  const bg = isPro
    ? "rgba(198,169,107,0.08)"
    : isImperial
    ? "rgba(75,111,174,0.08)"
    : "var(--card-dark-bg)";
    
  const glow = isPro 
    ? "0 0 60px rgba(198,169,107,0.15)" 
    : isImperial 
    ? "0 0 60px rgba(75,111,174,0.15)" 
    : "none";
    
  const priceColor = isPro 
    ? "#C6A96B" 
    : isImperial 
    ? "#759CE0" 
    : isBasic 
    ? "#A3B3CC" 
    : "#94A3B8";

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
              color: isImperial ? "#F8F6F1" : "#020617" 
            }}>
            {plan.tag}
          </span>
        </div>
      )}

      {/* Tier label */}
      <div className="mb-5">
        <p className="font-display text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-1 font-bold" style={{ color: priceColor }}>
          {plan.tier}
        </p>
        <p className="text-slate-900 dark:text-[#F8F6F1] text-xl font-bold leading-tight">{plan.name}</p>
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1 min-h-[40px] leading-relaxed font-sarabun">{plan.subtitle}</p>
      </div>

      {/* Price */}
      <div className="mb-6 flex items-end gap-1">
        {isFree ? (
          <span className="font-display text-4xl font-bold leading-none text-slate-800 dark:text-[#F8F6F1]">ฟรี</span>
        ) : (
          <>
            <span className="text-slate-500 dark:text-slate-400 text-sm self-start mt-1">฿</span>
            <span className="font-display text-4xl font-bold leading-none" style={{ color: priceColor }}>
              {plan.priceLabel}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-1 font-sarabun">{plan.priceNote}</span>
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-7 flex-1">
        {plan.features.map((f) => (
          <li key={f.text} className={`flex items-start gap-3 text-xs sm:text-sm ${f.included ? "" : "opacity-35"}`}>
            <span className="shrink-0 mt-0.5 text-xs sm:text-sm leading-none font-bold" style={{ color: f.included ? (isFree ? "#8C6D2D" : priceColor) : "#64748B" }}>
              {f.included ? "✓" : "✕"}
            </span>
            <span className={f.included ? "text-slate-700 dark:text-slate-200 text-left font-sarabun" : "text-slate-400 dark:text-slate-500 line-through text-left font-sarabun"}>{f.text}</span>
          </li>
        ))}
      </ul>

      {/* Note */}
      {plan.note && (
        <p className="text-slate-600 dark:text-[#F6D88C] text-xs mb-4 leading-relaxed text-left font-sarabun">{plan.note}</p>
      )}

      {/* CTA */}
      <Link
        to={ctaHref}
        className={`block text-center py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98] ${
          isPro
            ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/20"
            : isImperial
            ? "bg-gradient-to-r from-[#4B6FAE] to-[#6D8FC7] text-white shadow-lg shadow-[#4B6FAE]/20"
            : isBasic
            ? "bg-amber-500/10 dark:bg-white/10 text-amber-900 dark:text-[#F8F6F1] border border-amber-500/30 dark:border-white/15 hover:bg-amber-500/15"
            : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#94A3B8] border border-slate-200 dark:border-white/10 hover:bg-slate-200"
        }`}
      >
        {plan.ctaLabel}
      </Link>
    </div>
  );
}
