import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "ราคาสมาชิก — PhopePhum Wisdom Guidance" },
  { name: "description", content: "เริ่มต้นฟรีหรืออัปเกรดเป็น Wisdom รับคำแนะนำ AI ไม่จำกัด อ่านเส้นทางชีวิต และปฏิทินพลังงานรายวัน เพียง ฿159/เดือน" },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com/pricing" },
  { property: "og:title", content: "ราคาสมาชิก — PhopePhum" },
  { property: "og:description", content: "ที่ปรึกษาชีวิตส่วนตัว เริ่มฟรี อัปเกรด ฿159/เดือน" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },
  { name: "keywords", content: "สมัครสมาชิกภพภูมิ, ราคาภพภูมิ, PhopePhum Wisdom, ที่ปรึกษาชีวิต AI" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env);
  return json({ isLoggedIn: !!user });
}

// ─── Plan definitions (2 plans only) ─────────────────────────────────────────

const PLANS = [
  {
    tier: "FREE",
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
      { text: "ปฏิทินพลังงาน 7 วัน",              included: false },
      { text: "Wisdom AI ไม่จำกัด",               included: false },
      { text: "บันทึก & วางแผนชีวิต",             included: false },
    ],
    note: "* ต้องรอการอนุมัติจากแอดมินก่อนเข้าใช้งาน",
  },
  {
    tier: "WISDOM",
    name: "Wisdom",
    subtitle: "ที่ปรึกษาชีวิตเต็มประสิทธิภาพ",
    price: "159",
    priceLabel: "159",
    priceNote: "/ เดือน",
    tag: "แนะนำ",
    style: "wisdom" as const,
    ctaLabel: "เริ่มใช้ Wisdom ฿159/เดือน",
    ctaLoggedIn: "/dashboard/upgrade?plan=wisdom",
    ctaGuest: "/register?plan=wisdom",
    features: [
      { text: "ทุกฟีเจอร์ในแผนฟรี",               included: true },
      { text: "Wisdom AI ไม่จำกัด",               included: true },
      { text: "เส้นทางชีวิตครบถ้วนเชิงลึก",        included: true },
      { text: "ปฏิทินพลังงาน 7 วันล่วงหน้า",      included: true },
      { text: "บันทึก & วางแผนชีวิต",             included: true },
      { text: "ประวัติการวิเคราะห์ 30 วัน",        included: true },
      { text: "ยกเลิกได้ทุกเมื่อ",                included: true },
    ],
    note: null,
  },
] as const;

const COMPARE_ROWS = [
  { label: "Dashboard วันนี้",            free: "✅",        wisdom: "✅" },
  { label: "ข้อมูลชาตาส่วนตัว",          free: "พื้นฐาน",   wisdom: "✅ ครบถ้วน" },
  { label: "เส้นทางชีวิต",              free: "ภาพรวม",    wisdom: "✅ เชิงลึก" },
  { label: "Wisdom AI",                 free: "3/เดือน",   wisdom: "✅ ไม่จำกัด" },
  { label: "ปฏิทินพลังงาน 7 วัน",      free: "—",         wisdom: "✅" },
  { label: "บันทึก & วางแผน",           free: "—",         wisdom: "✅" },
  { label: "ประวัติการวิเคราะห์",        free: "—",         wisdom: "เก็บ 30 วัน" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();
  const showUpgradeBanner = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("upgrade") === "1"
    : false;

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: "#020617" }}>

      {/* ── Cosmic atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[800px] h-[800px] -top-80 left-1/2 -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(75,111,174,0.13) 0%, transparent 65%)" }} />
        <div className="absolute w-[600px] h-[600px] -bottom-40 -right-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(198,169,107,0.08) 0%, transparent 65%)" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 sm:py-24">

        {/* Back nav */}
        <div className="mb-8">
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="text-[#94A3B8] text-sm hover:text-[#C6A96B] transition-colors">
            ← {isLoggedIn ? "กลับหน้า Dashboard" : "กลับหน้าหลัก"}
          </Link>
        </div>

        {/* ── Upgrade Banner ── */}
        {showUpgradeBanner && (
          <div className="mb-10 rounded-2xl border border-[#C6A96B]/30 px-5 py-4 text-center"
            style={{ background: "rgba(198,169,107,0.07)" }}>
            <p className="text-[#C6A96B] text-sm font-semibold">
              ✦ เนื้อหานี้สำหรับสมาชิก Wisdom เท่านั้น — อัปเกรดด้านล่างเพื่อปลดล็อก
            </p>
          </div>
        )}

        {/* ── Header ── */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-[#C6A96B] text-sm">✦</span>
            <span className="font-display text-[#F8F6F1] font-bold text-xl">PhopePhum</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#F8F6F1] mb-4 leading-tight">
            เลือกแผนที่ใช่สำหรับคุณ
          </h1>
          <p className="text-[#94A3B8] text-base max-w-lg mx-auto leading-relaxed">
            เริ่มต้นฟรี หรืออัปเกรดรับประสบการณ์ Wisdom Guidance<br className="hidden sm:block" />
            เต็มประสิทธิภาพในราคาที่เข้าถึงได้
          </p>
        </div>

        {/* ── Pricing Cards — 2 plans ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16">
          {PLANS.map((plan) => (
            <PricingCard key={plan.tier} plan={plan} isLoggedIn={isLoggedIn} />
          ))}
        </div>

        {/* ── Comparison Table ── */}
        <div className="mb-16 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
            <p className="text-[#C6A96B] text-[10px] tracking-[0.3em] uppercase whitespace-nowrap">เปรียบเทียบฟีเจอร์</p>
            <div className="h-px flex-1" style={{ background: "rgba(198,169,107,0.2)" }} />
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/5"
            style={{ backdropFilter: "blur(24px)", background: "rgba(10,34,64,0.4)" }}>
            <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-widest border-b border-white/5 px-5 py-3">
              <div className="text-[#94A3B8]">ฟีเจอร์</div>
              <div className="text-center text-[#4A5568]">ฟรี</div>
              <div className="text-center text-[#C6A96B]">Wisdom</div>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div key={row.label}
                className={`grid grid-cols-3 px-5 py-3 text-sm ${i % 2 === 0 ? "bg-white/[0.02]" : ""} border-b border-white/[0.04] last:border-0`}>
                <div className="text-[#94A3B8]">{row.label}</div>
                <div className="text-center text-[#4A5568]">{row.free}</div>
                <div className="text-center text-[#C6A96B] font-semibold">{row.wisdom}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust signals ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {[
            { icon: "🔒", title: "ปลอดภัย 100%", desc: "ข้อมูลวันเกิดของคุณเข้ารหัสและไม่ถูกแชร์" },
            { icon: "⚡", title: "ยกเลิกได้ทุกเมื่อ", desc: "ไม่มีสัญญาผูกมัด ยกเลิกก่อนรอบถัดไปได้เสมอ" },
            { icon: "✦", title: "ภูมิปัญญาแท้ดั้งเดิม", desc: "ขับเคลื่อนด้วยศาสตร์โบราณที่ถูกพิสูจน์มาหลายศตวรรษ" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="text-center p-5 rounded-2xl border border-white/5"
              style={{ backdropFilter: "blur(12px)", background: "rgba(10,34,64,0.3)" }}>
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
              { q: "ยกเลิกได้ตอนไหน?", a: "ยกเลิกได้ทุกเมื่อก่อนรอบบิลถัดไป ไม่มีค่าใช้จ่ายเพิ่มเติม" },
              { q: "ชำระเงินแบบไหน?", a: "รองรับบัตรเครดิต/เดบิต และ QR PromptPay (เร็วๆ นี้)" },
              { q: "ทดลองใช้ฟรีได้นานแค่ไหน?", a: "สมาชิกฟรีใช้ได้ตลอดชีพ ไม่มีวันหมดอายุ" },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/5 px-5 py-4"
                style={{ background: "rgba(10,34,64,0.3)" }}>
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
  const isFree    = plan.style === "free";
  const isWisdom  = plan.style === "wisdom";

  const borderColor = isWisdom ? "rgba(198,169,107,0.40)" : "rgba(255,255,255,0.08)";
  const bg          = isWisdom ? "rgba(198,169,107,0.06)" : "rgba(10,34,64,0.45)";
  const glow        = isWisdom ? "0 0 60px rgba(198,169,107,0.12)" : "none";
  const priceColor  = isWisdom ? "#C6A96B" : "#4A5568";

  const ctaHref = isLoggedIn ? plan.ctaLoggedIn : plan.ctaGuest;

  return (
    <div
      className={`relative flex flex-col rounded-3xl p-7 transition-all duration-300 ${isWisdom ? "sm:-translate-y-2" : ""}`}
      style={{ backdropFilter: "blur(24px)", background: bg, border: `1px solid ${borderColor}`, boxShadow: glow }}
    >
      {/* Tag */}
      {plan.tag && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#020617" }}>
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
        <p className="text-[#94A3B8] text-sm mt-1">{plan.subtitle}</p>
      </div>

      {/* Price */}
      <div className="mb-6 flex items-end gap-1">
        {isFree ? (
          <span className="font-display text-4xl font-bold leading-none text-[#4A5568]">ฟรี</span>
        ) : (
          <>
            <span className="text-[#94A3B8] text-sm self-start mt-1">฿</span>
            <span className="font-display text-5xl font-bold leading-none" style={{ color: priceColor }}>
              {plan.priceLabel}
            </span>
            <span className="text-[#94A3B8] text-sm mb-1">{plan.priceNote}</span>
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-7 flex-1">
        {plan.features.map((f) => (
          <li key={f.text} className={`flex items-start gap-3 text-sm ${f.included ? "" : "opacity-35"}`}>
            <span className="shrink-0 mt-0.5 text-base leading-none" style={{ color: f.included ? (isFree ? "#4A5568" : "#C6A96B") : "#374151" }}>
              {f.included ? "✓" : "✕"}
            </span>
            <span className={f.included ? "text-[#D9CDB7]" : "text-[#4A5568] line-through"}>{f.text}</span>
          </li>
        ))}
      </ul>

      {/* Note */}
      {plan.note && (
        <p className="text-[#4A5568] text-xs mb-4 leading-relaxed">{plan.note}</p>
      )}

      {/* CTA */}
      <Link
        to={ctaHref}
        className="block text-center py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        style={isWisdom
          ? { background: "linear-gradient(135deg, #C6A96B, #D9BC82)", color: "#020617" }
          : { background: "rgba(255,255,255,0.05)", color: "#4A5568", border: "1px solid rgba(255,255,255,0.08)" }
        }
      >
        {plan.ctaLabel}
      </Link>
    </div>
  );
}
