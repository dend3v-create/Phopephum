import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "แผนสมาชิกและสิทธิ์การเข้าถึงระดับจักรพรรดิ — PhopePhum" },
  { name: "description", content: "เลือกระดับการเข้าถึงระบบภูมิปัญญาพยากรณ์ ภพภูมิ (PhopePhum) ตารางยามอัฏฐกาลไม่จำกัด เลข 7 ตัว 9 ฐาน และบทวิเคราะห์พยากรณ์ชีวิตระดับจักรพรรดิ" },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com/pricing" },
  { property: "og:title", content: "แผนสมาชิกและสิทธิ์การเข้าถึงระดับจักรพรรดิ — PhopePhum" },
  { property: "og:description", content: "เลือกระดับการเข้าถึงระบบภูมิปัญญาพยากรณ์ ภพภูมิ" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "keywords", content: "สมัครสมาชิกภพภูมิ, ราคาภพภูมิ, PhopePhum Premium, ยามอัฏฐกาลไม่จำกัด, ผังดวงจักรพรรดิ" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env);
  return json({ isLoggedIn: !!user });
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

const PLANS = [
  {
    tier: "FREE",
    name: "สมาชิกทั่วไป",
    subtitle: "เริ่มต้นสัมผัสภูมิปัญญา",
    price: "0",
    unit: "ฟรีตลอดไป",
    tag: null,
    style: "free" as const,
    ctaLabel: "สมัครฟรีตอนนี้",
    ctaLoggedIn: "/dashboard",
    ctaGuest: "/register",
    features: [
      { icon: "☽", text: "ยามอัฏฐกาลขณะนี้ (widget หน้าหลัก)", included: true },
      { icon: "◈", text: "ข้อมูลชาตาส่วนตัว", included: true },
      { icon: "✦", text: "ดูหน้า Dashboard ภาพรวมเท่านั้น", included: true },
      { icon: "⊗", text: "ไม่มีตาราง ยามอัฏฐกาลล่วงหน้า", included: false },
      { icon: "⊗", text: "ไม่มีผัง 7 ตัว 9 ฐาน", included: false },
      { icon: "⊗", text: "ไม่มี AI Life Reports", included: false },
    ],
    note: "* ต้องรอการอนุมัติจากแอดมินก่อนเข้าใช้งาน",
  },
  {
    tier: "BASIC",
    name: "BASIC SAGE",
    subtitle: "เริ่มต้นเส้นทางภูมิปัญญา",
    price: "9",
    unit: "เดือน",
    tag: null,
    style: "basic" as const,
    ctaLabel: "เริ่มต้นเพียง 9 บาท",
    ctaLoggedIn: "/dashboard/upgrade?plan=basic",
    ctaGuest: "/register?plan=basic",
    features: [
      { icon: "☽", text: "ยามอัฏฐกาล & ราหูวันนี้", included: true },
      { icon: "✦", text: "ผัง 7 ตัว 9 ฐาน (ดวงตนเอง)", included: true },
      { icon: "◈", text: "AI Life Report 1 ครั้ง/เดือน", included: true },
      { icon: "⊗", text: "ไม่มีระบบจร (วัยจร/ปีจร)", included: false },
      { icon: "⊗", text: "ไม่มีบันทึกดวงผู้อื่น", included: false },
    ],
    note: null,
  },
  {
    tier: "PRO",
    name: "PROFESSIONAL MASTER",
    subtitle: "เจาะลึกรหัสชีวิตสมบูรณ์",
    price: "259",
    unit: "เดือน",
    tag: "RECOMMENDED",
    style: "pro" as const,
    ctaLabel: "เลือกแพ็กเกจ PRO",
    ctaLoggedIn: "/dashboard/upgrade?plan=pro",
    ctaGuest: "/register?plan=pro",
    features: [
      { icon: "☽", text: "ยามอัฏฐกาลล่วงหน้า 7 วัน", included: true },
      { icon: "⊕", text: "ระบบจร (วัยจร/ปีจร) ครบถ้วน", included: true },
      { icon: "◈", text: "AI Life Report 15 ครั้ง/เดือน", included: true },
      { icon: "⟁", text: "บันทึกดวงผู้อื่น 15 รายชื่อ", included: true },
      { icon: "✦", text: "ประวัติการคำนวณ 30 วัน", included: true },
    ],
    note: null,
  },
  {
    tier: "IMPERIAL",
    name: "IMPERIAL EMPEROR",
    subtitle: "อำนาจสูงสุดระดับจักรพรรดิ",
    price: "789",
    unit: "เดือน",
    tag: "PREMIUM",
    style: "imperial" as const,
    ctaLabel: "เลือกแพ็กเกจ IMPERIAL",
    ctaLoggedIn: "/dashboard/upgrade?plan=imperial",
    ctaGuest: "/register?plan=imperial",
    features: [
      { icon: "⌘", text: "ทุกฟีเจอร์คำนวณไม่จำกัด", included: true },
      { icon: "✦", text: "ดวงสมพงษ์ & ปฏิทิน 100 ปี", included: true },
      { icon: "◈", text: "AI Life Report ไม่จำกัดครั้ง", included: true },
      { icon: "⟁", text: "Export รายงาน PDF พรีเมียม", included: true },
      { icon: "♾", text: "เก็บประวัติการคำนวณถาวร", included: true },
    ],
    note: null,
  },
] as const;

const COMPARE_ROWS = [
  { label: "ดูหน้า Dashboard",           free: "✅",          basic: "✅",          pro: "✅",              imperial: "✅" },
  { label: "ยามอัฏฐกาลปัจจุบัน",        free: "Widget เท่านั้น", basic: "✅",        pro: "ล่วงหน้า 7 วัน",   imperial: "ไม่จำกัด" },
  { label: "ราหูค้นทรัพย์",             free: "—",           basic: "✅ วันนี้",   pro: "✅ ล่วงหน้า",      imperial: "✅ ไม่จำกัด" },
  { label: "ผัง 7 ตัว 9 ฐาน",           free: "—",           basic: "ตนเอง",       pro: "15 รายชื่อ",       imperial: "ไม่จำกัด" },
  { label: "ระบบจร (วัยจร/ปีจร)",       free: "—",           basic: "—",           pro: "✅",               imperial: "✅" },
  { label: "AI Life Report",            free: "—",           basic: "1/เดือน",     pro: "15/เดือน",          imperial: "ไม่จำกัด" },
  { label: "วางแผนชีวิต (Planner)",     free: "—",           basic: "✅",          pro: "✅",               imperial: "✅" },
  { label: "ดวงสมพงษ์ (Match)",         free: "—",           basic: "—",           pro: "—",                imperial: "✅" },
  { label: "Export PDF พรีเมียม",        free: "—",           basic: "—",           pro: "—",                imperial: "✅" },
  { label: "ประวัติการคำนวณ",            free: "—",           basic: "ไม่เก็บ",     pro: "เก็บ 30 วัน",       imperial: "เก็บถาวร" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();
  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const showUpgradeBanner = url?.searchParams.get("upgrade") === "1";

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: "#020617" }}>

      {/* ── Cosmic atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[800px] h-[800px] -top-80 left-1/2 -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(75,111,174,0.13) 0%, transparent 65%)" }} />
        <div className="absolute w-[600px] h-[600px] -bottom-40 -right-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(198,169,107,0.08) 0%, transparent 65%)" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:py-24">

        {/* ── Upgrade Banner (ถ้าถูก redirect มาเพราะ free plan) ── */}
        {showUpgradeBanner && (
          <div className="mb-10 rounded-2xl border border-[#C6A96B]/30 px-5 py-4 text-center"
            style={{ background: "rgba(198,169,107,0.07)" }}>
            <p className="text-[#C6A96B] text-sm font-semibold">
              ✦ เนื้อหานี้สำหรับสมาชิกแบบชำระเงินเท่านั้น — เลือกแพ็กเกจด้านล่างเพื่อปลดล็อก
            </p>
          </div>
        )}

        {/* ── Header ── */}
        <div className="text-center mb-16">
          <p className="text-[#C6A96B] text-xs tracking-[0.3em] uppercase mb-4 font-bold">
            INVESTMENT · ระดับแห่งสิทธิ์การเข้าถึง
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#F8F6F1] mb-4 leading-tight">
            เลือกแผนที่เหมาะกับคุณ
          </h1>
          <p className="text-[#94A3B8] text-base max-w-xl mx-auto leading-relaxed">
            เริ่มจากสมาชิกฟรี หรืออัปเกรดทันทีเพื่อรับการพยากรณ์เชิงลึก<br />
            ระดับจักรพรรดิ
          </p>
        </div>

        {/* ── Pricing Cards — 4 tier ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {PLANS.map((plan) => (
            <PricingCard key={plan.tier} plan={plan} isLoggedIn={isLoggedIn} />
          ))}
        </div>

        {/* ── Comparison Table ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
            <p className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase whitespace-nowrap">เปรียบเทียบฟีเจอร์ทั้งหมด</p>
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/5"
            style={{ backdropFilter: "blur(24px)", background: "rgba(10,34,64,0.4)" }}>
            {/* Header row */}
            <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-widest border-b border-white/5 px-4 py-3">
              <div className="text-[#94A3B8]">ฟีเจอร์</div>
              <div className="text-center text-[#4A5568]">Free</div>
              <div className="text-center text-[#94A3B8]">Basic</div>
              <div className="text-center text-[#C6A96B]">Pro</div>
              <div className="text-center text-[#9AB3D9]">Imperial</div>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div key={row.label}
                className={`grid grid-cols-5 px-4 py-3 text-xs ${i % 2 === 0 ? "bg-white/[0.02]" : ""} border-b border-white/[0.04] last:border-0`}>
                <div className="text-[#94A3B8]">{row.label}</div>
                <div className="text-center text-[#4A5568]">{row.free}</div>
                <div className="text-center text-[#F8F6F1]">{row.basic}</div>
                <div className="text-center text-[#C6A96B] font-semibold">{row.pro}</div>
                <div className="text-center text-[#9AB3D9]">{row.imperial}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust signals ── */}
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
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="text-[#94A3B8] text-sm hover:text-[#C6A96B] transition-colors">
            ← {isLoggedIn ? "กลับหน้า Dashboard" : "กลับหน้าหลัก"}
          </Link>
        </div>
      </div>

      {/* ── Schema JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "ภพภูมิ (PhopePhum) Access Plans",
          "offers": PLANS.map(p => ({
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

// ─── PricingCard ──────────────────────────────────────────────────────────────

function PricingCard({
  plan,
  isLoggedIn,
}: {
  plan: typeof PLANS[number];
  isLoggedIn: boolean;
}) {
  const isFree     = plan.style === "free";
  const isPro      = plan.style === "pro";
  const isImperial = plan.style === "imperial";

  const borderColor = isPro
    ? "rgba(198,169,107,0.40)"
    : isImperial
    ? "rgba(75,111,174,0.40)"
    : isFree
    ? "rgba(255,255,255,0.06)"
    : "rgba(255,255,255,0.10)";

  const bg = isPro
    ? "rgba(198,169,107,0.06)"
    : isImperial
    ? "rgba(75,111,174,0.08)"
    : "rgba(10,34,64,0.40)";

  const glow = isPro
    ? "0 0 50px rgba(198,169,107,0.12)"
    : isImperial
    ? "0 0 50px rgba(75,111,174,0.10)"
    : "none";

  const priceColor = isPro
    ? "#C6A96B"
    : isImperial
    ? "#9AB3D9"
    : isFree
    ? "#4A5568"
    : "#F8F6F1";

  const ctaHref = isLoggedIn ? plan.ctaLoggedIn : plan.ctaGuest;

  const ctaBg = isFree
    ? "rgba(255,255,255,0.05)"
    : isPro
    ? "linear-gradient(135deg, #C6A96B, #D9BC82)"
    : isImperial
    ? "linear-gradient(135deg, #4B6FAE, #6D8FC7)"
    : "rgba(255,255,255,0.08)";

  const ctaColor   = isPro ? "#020617" : isFree ? "#4A5568" : "#F8F6F1";
  const ctaBorder  = isFree || (!isPro && !isImperial) ? "1px solid rgba(255,255,255,0.10)" : "none";

  return (
    <div
      className={`relative flex flex-col rounded-3xl p-6 transition-all duration-300 ${isPro ? "lg:-translate-y-3 lg:scale-[1.02]" : ""}`}
      style={{ backdropFilter: "blur(24px)", background: bg, border: `1px solid ${borderColor}`, boxShadow: glow }}
    >
      {/* Tag */}
      {plan.tag && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#020617" }}>
            {plan.tag}
          </span>
        </div>
      )}

      {/* Tier */}
      <div className="mb-5">
        <p className="font-display text-[9px] tracking-[0.25em] uppercase mb-0.5" style={{ color: priceColor }}>
          {plan.tier}
        </p>
        <p className="text-[#F8F6F1] text-sm font-bold leading-tight">{plan.name}</p>
        <p className="text-[#94A3B8] text-[10px] mt-0.5">{plan.subtitle}</p>
      </div>

      {/* Price */}
      <div className="mb-5 flex items-end gap-1">
        {plan.price === "0" ? (
          <span className="font-display text-3xl font-bold leading-none text-[#4A5568]">ฟรี</span>
        ) : (
          <>
            <span className="text-[#94A3B8] text-xs self-start mt-1">฿</span>
            <span className="font-display text-4xl font-bold leading-none" style={{ color: priceColor }}>{plan.price}</span>
            <span className="text-[#94A3B8] text-[10px] mb-1">/ {plan.unit}</span>
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f.text} className={`flex items-start gap-2.5 text-xs ${f.included ? "" : "opacity-40"}`}>
            <span className="text-sm leading-4 shrink-0" style={{ color: f.included ? (isFree ? "#4A5568" : "#C6A96B") : "#374151" }}>
              {f.included ? f.icon : "✕"}
            </span>
            <span className={f.included ? "text-[#D9CDB7]" : "text-[#4A5568] line-through"}>{f.text}</span>
          </li>
        ))}
      </ul>

      {/* Note */}
      {plan.note && (
        <p className="text-[#4A5568] text-[9px] mb-4 leading-relaxed">{plan.note}</p>
      )}

      {/* CTA */}
      <Link
        to={ctaHref}
        className="block text-center py-3 px-4 rounded-xl text-xs font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        style={{ background: ctaBg, color: ctaColor, border: ctaBorder }}
      >
        {plan.ctaLabel}
      </Link>
    </div>
  );
}
