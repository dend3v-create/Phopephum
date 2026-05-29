import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "Investment — PhopePhum" },
  { name: "description", content: "เลือกระดับการเข้าถึงศาสตร์ยามอัฐกาลและชะตากรรมเชิงลึก ระดับจักรพรรดิ" },
];

const PLANS = [
  {
    tier: "BASIC INITIATION",
    subtitle: "เปิดประตูแห่งความรู้",
    price: "0",
    unit: "ตลอดชีพ",
    tag: null,
    features: [
      { icon: "☽", text: "ยามอัฐกาล 5 ครั้ง/วัน" },
      { icon: "✦", text: "จักรกำเนิดพื้นฐาน" },
      { icon: "◈", text: "Life Report 1 ครั้ง/เดือน" },
    ],
    cta: "เริ่มต้นใช้ฟรี",
    ctaTo: "/register",
    style: "basic",
  },
  {
    tier: "PROFESSIONAL SAGE",
    subtitle: "ปัญญาแห่งโหราจารย์",
    price: "149",
    unit: "เดือน",
    tag: "RECOMMENDED",
    features: [
      { icon: "☽", text: "ยามอัฐกาลไม่จำกัด" },
      { icon: "⊕", text: "ระบบจร (วัยจร/ปีจร) ครบถ้วน" },
      { icon: "◈", text: "Life Report 10 ครั้ง/เดือน" },
      { icon: "⟁", text: "Export รายงาน PDF พรีเมียม" },
    ],
    cta: "เลือกแพ็กเกจ PRO",
    ctaTo: "/register?plan=pro",
    style: "pro",
  },
  {
    tier: "IMPERIAL MASTER",
    subtitle: "อำนาจสูงสุดแห่งจักรพรรดิ",
    price: "299",
    unit: "เดือน",
    tag: null,
    features: [
      { icon: "⌘", text: "ทุกฟีเจอร์คำนวณไม่จำกัด" },
      { icon: "✦", text: "ศาสตร์เลข 7 ตัว 9 ฐาน (Core IP)" },
      { icon: "◈", text: "Life Report ไม่จำกัดครั้ง" },
      { icon: "⟁", text: "Priority Wisdom Support" },
    ],
    cta: "เลือกแพ็กเกจ IMPERIAL",
    ctaTo: "/register?plan=imperial",
    style: "imperial",
  },
] as const;

const COMPARE_ROWS = [
  { label: "ยามอัฐกาล",                basic: "5 ครั้ง/วัน",   pro: "ไม่จำกัด",   imperial: "ไม่จำกัด" },
  { label: "คำนวณจักรกำเนิด",         basic: "พื้นฐาน",       pro: "ครบถ้วน",     imperial: "ครบถ้วน" },
  { label: "ระบบจร (วัยจร/ปีจร)",     basic: "—",             pro: "✦",           imperial: "✦" },
  { label: "Life Report",              basic: "1/เดือน",       pro: "10/เดือน",    imperial: "ไม่จำกัด" },
  { label: "Export PDF พรีเมียม",      basic: "—",             pro: "✦",           imperial: "✦" },
  { label: "เลข 7 ตัว 9 ฐาน (Core)",  basic: "—",             pro: "—",           imperial: "✦" },
  { label: "Priority Wisdom Support",  basic: "—",             pro: "—",           imperial: "✦" },
];

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: "#020617" }}>

      {/* ── Cosmic atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[800px] h-[800px] -top-80 left-1/2 -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(75,111,174,0.13) 0%, transparent 65%)" }} />
        <div className="absolute w-[600px] h-[600px] -bottom-40 -right-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(198,169,107,0.08) 0%, transparent 65%)" }} />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 30% at 50% 20%, rgba(232,196,106,0.06) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 sm:py-24">

        {/* ── Header ── */}
        <div className="text-center mb-16">
          <p className="text-[#C6A96B] text-xs tracking-[0.3em] uppercase mb-4 font-bold">
            INVESTMENT · ระดับแห่งสิทธิ์การเข้าถึง
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#F8F6F1] mb-4 leading-tight">
            เลือกแผนงานที่<br className="sm:hidden" />เหมาะสมกับคุณ
          </h1>
          <p className="text-[#94A3B8] text-base max-w-xl mx-auto leading-relaxed">
            รับการพยากรณ์และทิศทางชีวิตเชิงลึก<br />
            ที่แม่นยำระดับจักรพรรดิ
          </p>
        </div>

        {/* ── Pricing Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan) => (
            <PricingCard key={plan.tier} plan={plan} />
          ))}
        </div>

        {/* ── Comparison Table ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
            <p className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase whitespace-nowrap">เปรียบเทียบฟีเจอร์</p>
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/5"
            style={{ backdropFilter: "blur(24px)", background: "rgba(10,34,64,0.4)" }}>
            {/* Table header */}
            <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] border-b border-white/5 px-4 py-3">
              <div>ฟีเจอร์</div>
              <div className="text-center">Basic</div>
              <div className="text-center text-[#C6A96B]">Pro</div>
              <div className="text-center">Imperial</div>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div key={row.label}
                className={`grid grid-cols-4 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-white/[0.02]" : ""} border-b border-white/[0.04] last:border-0`}>
                <div className="text-[#94A3B8] text-xs">{row.label}</div>
                <div className="text-center text-[#F8F6F1] text-xs">{row.basic}</div>
                <div className="text-center text-[#C6A96B] text-xs font-semibold">{row.pro}</div>
                <div className="text-center text-[#F8F6F1] text-xs">{row.imperial}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ / Trust signals ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {[
            { icon: "🔒", title: "ปลอดภัย 100%", desc: "ข้อมูลวันเกิดของคุณเข้ารหัสและไม่ถูกแชร์" },
            { icon: "⚡", title: "ยกเลิกได้ทุกเมื่อ", desc: "ไม่มีสัญญาผูกมัด ยกเลิกก่อนรอบถัดไปได้เสมอ" },
            { icon: "✦", title: "ศาสตร์แท้ดั้งเดิม", desc: "สูตรคำนวณจากตำราโหราศาสตร์ไทยโบราณแท้" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="text-center p-5 rounded-2xl border border-white/5"
              style={{ backdropFilter: "blur(12px)", background: "rgba(10,34,64,0.3)" }}>
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-[#F8F6F1] font-semibold text-sm mb-1">{title}</p>
              <p className="text-[#94A3B8] text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Back to home ── */}
        <div className="text-center">
          <Link to="/" className="text-[#94A3B8] text-sm hover:text-[#C6A96B] transition-colors">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </main>
  );
}

function PricingCard({ plan }: { plan: typeof PLANS[number] }) {
  const isPro      = plan.style === "pro";
  const isImperial = plan.style === "imperial";

  const cardBorder = isPro
    ? "border-[#C6A96B]/40"
    : isImperial
    ? "border-[#4B6FAE]/40"
    : "border-white/8";

  const cardBg = isPro
    ? "rgba(198,169,107,0.06)"
    : isImperial
    ? "rgba(75,111,174,0.08)"
    : "rgba(10,34,64,0.4)";

  const cardGlow = isPro
    ? "0 0 60px rgba(198,169,107,0.12)"
    : isImperial
    ? "0 0 60px rgba(75,111,174,0.10)"
    : "none";

  const priceColor = isPro ? "#C6A96B" : isImperial ? "#9AB3D9" : "#F8F6F1";

  const ctaBg = isPro
    ? "linear-gradient(135deg, #C6A96B, #D9BC82)"
    : isImperial
    ? "linear-gradient(135deg, #4B6FAE, #6D8FC7)"
    : "rgba(255,255,255,0.06)";

  const ctaColor   = isPro ? "#020617" : isImperial ? "#F8F6F1" : "#94A3B8";
  const ctaBorder  = isPro ? "none" : isImperial ? "none" : "1px solid rgba(255,255,255,0.12)";

  return (
    <div className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-300 ${cardBorder} ${isPro ? "md:-translate-y-4 md:scale-[1.03]" : ""}`}
      style={{ backdropFilter: "blur(24px)", background: cardBg, boxShadow: cardGlow }}>

      {/* Tag */}
      {plan.tag && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#020617" }}>
            {plan.tag}
          </span>
        </div>
      )}

      {/* Tier name */}
      <div className="mb-6">
        <p className="font-display text-xs tracking-[0.2em] uppercase mb-1" style={{ color: priceColor }}>
          {plan.tier}
        </p>
        <p className="text-[#94A3B8] text-xs">{plan.subtitle}</p>
      </div>

      {/* Price */}
      <div className="mb-7 flex items-end gap-1">
        <span className="text-[#94A3B8] text-sm self-start mt-2">฿</span>
        <span className="font-display text-5xl font-bold leading-none" style={{ color: priceColor }}>
          {plan.price}
        </span>
        <span className="text-[#94A3B8] text-xs mb-1 ml-1">/ {plan.unit}</span>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm">
            <span className="text-[#C6A96B] text-base leading-5 shrink-0">{icon}</span>
            <span className="text-[#D9CDB7] leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link to={plan.ctaTo}
        className="block text-center py-3 px-6 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        style={{ background: ctaBg, color: ctaColor, border: ctaBorder }}>
        {plan.cta}
      </Link>
    </div>
  );
}
