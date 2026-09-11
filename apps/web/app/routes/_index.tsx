import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { captureReferralClick } from "~/services/attribution.server";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { HeroAuspiciousWidget } from "~/components/public/HeroAuspiciousWidget";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "ภพภูมิ (PHOPEPHUM OS) — ปัญญาและกาลเวลาชีวิต | Life Guidance Platform" },
  {
    name: "description",
    content:
      "วันนี้คุณควรทำอะไร และช่วงเวลาไหนดีที่สุด? PHOPEPHUM OS ผสานศาสตร์สุริยยาตร์แท้กับ Wisdom AI ถอดรหัสช่วงเวลาทอง (Golden Window) เฉพาะบุคคล เพื่อการตัดสินใจที่มั่นใจและลงมือทำอย่างแม่นยำ",
  },
  { tagName: "link", rel: "canonical", href: "https://phopephum.com" },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com" },
  { property: "og:title", content: "PHOPEPHUM OS — วันนี้คุณควรทำอะไร และช่วงเวลาไหนดีที่สุด?" },
  {
    property: "og:description",
    content:
      "ค้นพบช่วงเวลาทอง (Golden Window) ของคุณด้วยระบบคำนวณสุริยยาตร์แท้และ Wisdom AI วางแผนงาน เจรจาธุรกิจ การเงิน และการตัดสินใจสำคัญ เริ่มต้นใช้งานฟรี",
  },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "ภพภูมิ (PHOPEPHUM OS) — ปัญญาและกาลเวลาชีวิต" },
  {
    name: "twitter:description",
    content:
      "ถอดรหัสจังหวะเวลาแห่งความสำเร็จ (Timing is Strategy) ด้วยศาสตร์แห่งกาลชะตาและ Wisdom AI เริ่มต้นใช้งานฟรี",
  },
  {
    name: "keywords",
    content:
      "ภพภูมิ, PhoPePhum OS, หาฤกษ์วันนี้, ช่วงเวลาทอง, Golden Window, ยามอัฏฐกาล, สุริยยาตร์, เลข 7 ตัว 9 ฐาน, AI ดูดวง, โหราศาสตร์ไทย, ฤกษ์เจรจา, ฤกษ์เปิดตัวงาน",
  },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const campaign = url.searchParams.get("c") || url.searchParams.get("utm_campaign") || null;
  const env = context.cloudflare.env as Env;

  const user = await getUser(request, env).catch(() => null);

  if (ref) {
    const { headers } = await captureReferralClick({
      request,
      partnerCode: ref,
      campaignCode: campaign,
      env,
    });
    return json({ isLoggedIn: !!user }, { headers });
  }

  return json({ isLoggedIn: !!user });
}

export default function IndexPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const ctaTarget = isLoggedIn ? "/dashboard" : "/register";
  const ctaText = isLoggedIn ? "เข้าสู่ Dashboard ของคุณ" : "เริ่มต้นใช้งานฟรี";

  const faqs = [
    {
      q: "PHOPEPHUM แตกต่างจากเว็บดูดวงทั่วไปอย่างไร?",
      a: "PHOPEPHUM ไม่ใช่เว็บดูดวงที่เน้นคำทำนายแบบกว้างๆ หรืองมงาย แต่เป็นระบบปฏิบัติการช่วยวางแผนชีวิต (Life Guidance Platform) ที่ใช้ตรรกะคำนวณสุริยยาตร์แท้ผสานกับปัญญาประดิษฐ์ (Wisdom AI) เน้นตอบคำถามว่า 'วันนี้ควรทำอะไร และช่วงเวลาไหนดีที่สุด' เพื่อให้คุณนำไปตัดสินใจและลงมือทำอย่างมีสติ (Confident, Action, Proactive)",
    },
    {
      q: "ใช้งานฟรีได้จริงไหม มีข้อผูกมัดหรือแอบตัดเงินหรือไม่?",
      a: "ใช้งานฟรีได้จริง 100% ครับ แผน 'เริ่มทดลอง' (Free ฿0) ไม่ต้องกรอกบัตรเครดิต คุณสามารถเข้าดูผังดวงเลข ๗ ตัว ๙ ฐานเบื้องต้น ตรวจสอบยามมงคลประจำวัน รับสรุปพลังงาน และรับละอองทรายกาลเวลา (Sands) ฟรีทุกวัน โดยไม่มีวันหมดอายุและไม่มีการเรียกเก็บเงินย้อนหลัง",
    },
    {
      q: "ถ้าไม่ทราบเวลาเกิดที่แน่นอน สามารถใช้งานได้ไหม?",
      a: "สามารถใช้งานได้ครับ ระบบรองรับการคำนวณด้วยวัน เดือน ปีเกิด แม้ไม่ทราบเวลาตกฟากที่แน่นอน โดยระบบจะคำนวณผังฐานหลักและกาลชะตาประจำวันให้ และหากคุณทราบเวลาเกิดในภายหลัง ก็สามารถเข้ามาอัปเดตข้อมูลในหน้าโปรไฟล์เพื่อเปิดฟังก์ชันคำนวณระดับลัคนาและ 35 ภพเรือนแบบละเอียดได้ตลอดเวลา",
    },
    {
      q: "ละอองทรายกาลเวลา (Sands of Time) คืออะไร และหมดอายุไหม?",
      a: "ละอองทรายกาลเวลาคือหน่วยพลังงานดิจิทัลภายในระบบ ใช้สำหรับปลดล็อกบทวิเคราะห์พิเศษเฉพาะครั้ง เช่น การสร้าง AI Life Report เชิงลึก หรือการปรึกษา Wisdom AI เพิ่มเติม คุณจะได้รับ Sands ฟรีทุกวันเมื่อเข้าสู่ระบบ หรือเลือกเติม Sands Pack ตามต้องการ โดยไม่มีวันหมดอายุ",
    },
    {
      q: "ข้อมูลส่วนบุคคลและวันเดือนปีเกิดปลอดภัยแค่ไหน?",
      a: "ปลอดภัยตามมาตรฐานสูงสุดครับ เราปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ข้อมูลของคุณถูกเก็บรักษาในฐานข้อมูลที่มีระบบ Row Level Security (RLS) ที่แยกสิทธิ์เฉพาะเจ้าของบัญชีเท่านั้น และระบบ AI Proxy ของเราไม่เก็บหรือนำข้อมูลส่วนตัวของคุณไปใช้เทรนโมเดล AI สาธารณะอย่างเด็ดขาด",
    },
    {
      q: "หากต้องการอัปเกรดหรือเปลี่ยนแพ็กเกจ มีขั้นตอนอย่างไร?",
      a: "คุณสามารถเข้าสู่หน้าศูนย์บริการสมาชิก (/pricing หรือ /dashboard/upgrade) เพื่อเลือกแพ็กเกจที่ต้องการได้ทันที ชำระเงินสะดวกผ่าน PromptPay QR Code หรือบัตรเครดิต โดยทุกแพ็กเกจคิดค่าบริการตามรอบบิลที่เลือก โปร่งใส และไม่มีสัญญาผูกมัดระยะยาว",
    },
  ];

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      {/* ──────────────────────────────────────────────────────────────────────────
          01 — HERO SECTION: Value Prop + Immediate Clarity
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#C6A96B]/15 via-[#4B6FAE]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/[0.08] backdrop-blur-md mb-6 shadow-sm">
            <span className="text-[#C6A96B] text-xs">✦</span>
            <span className="text-[11px] sm:text-xs font-semibold text-[#8C6D2D] dark:text-[#F6D88C] tracking-wide">
              ระบบวิเคราะห์กาลชะตาเฉพาะบุคคล · Ancient Wisdom × Modern AI
            </span>
          </div>

          {/* Primary Core Headline */}
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-[#F8F6F1] tracking-tight leading-[1.2] mb-6">
            วันนี้คุณควรทำอะไร <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8C6D2D] via-[#D4AF37] to-[#F6D88C] dark:from-[#C6A96B] dark:via-[#F6D88C] dark:to-[#C6A96B]">
              และช่วงเวลาไหนดีที่สุด?
            </span>
          </h1>

          {/* Value Prop Subheadline */}
          <p className="font-sarabun text-base sm:text-lg text-slate-600 dark:text-[#94A3B8] max-w-2xl mx-auto leading-relaxed mb-8">
            <strong className="text-slate-900 dark:text-[#F8F6F1] font-semibold">PHOPEPHUM OS</strong>{" "}
            ถอดรหัสจังหวะชีวิตเฉพาะบุคคล ผสานสูตรคำนวณสุริยยาตร์แท้กับ Wisdom AI เพื่อบอก{" "}
            <span className="text-[#8C6D2D] dark:text-[#C6A96B] font-semibold">“ช่วงเวลาทอง” (Golden Window)</span>{" "}
            ให้ทุกการตัดสินใจของคุณเฉียบคม แม่นยำ และลงมือทำได้อย่างมั่นใจ
          </p>

          {/* Primary CTA Cluster */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
            <Link
              to={ctaTarget}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] via-[#D9BC82] to-[#C6A96B] text-[#020617] shadow-xl shadow-[#C6A96B]/20 hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <span>{ctaText}</span>
              <span className="text-base">→</span>
            </Link>

            <a
              href="#auspicious-demo"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm border border-slate-300 dark:border-white/15 bg-white/60 dark:bg-white/[0.04] text-slate-700 dark:text-[#F8F6F1] hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2"
            >
              <span>ทดลองหาฤกษ์สด</span>
              <span className="text-xs text-[#C6A96B]">▼</span>
            </a>
          </div>

          {/* Micro-Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-500 dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> เริ่มต้นฟรี ไม่ต้องใช้บัตรเครดิต
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> ปลอดภัยตามมาตรฐาน PDPA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> สูตรคำนวณสุริยยาตร์แท้ 100 ปี
            </span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          02 — PRODUCT PREVIEW: Interactive Golden Window & Auspicious Widget
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="auspicious-demo" className="relative py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
            Product Experience
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-2">
            สัมผัสประสบการณ์จริง: ค้นหาช่วงเวลาทองทันที
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] max-w-xl mx-auto">
            เลือกกิจกรรมที่คุณต้องการทำในวันนี้หรือพรุ่งนี้ ระบบจะคำนวณยามมงคลและจัดอันดับ 3 ช่วงเวลาที่ดีที่สุดให้แบบสดๆ
          </p>
        </div>

        {/* Embedded Interactive Demo Component */}
        <HeroAuspiciousWidget />
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          03 — REAL-LIFE USE CASES: What PHOPEPHUM Solves
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 bg-slate-50/70 dark:bg-[#07172A]/40 border-y border-slate-200/80 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
              Real-life Use Cases
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-3">
              แก้ปัญหาที่ต้องพบเจอในชีวิตจริง
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-xl mx-auto font-sarabun">
              เพราะจังหวะเวลา (Timing) คือ 50% ของความสำเร็จ PHOPEPHUM จึงออกแบบมาเพื่อช่วยคุณตัดสินใจใน 4 สถานการณ์สำคัญ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Case 1: Work & Deals */}
            <div className="rounded-2xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 backdrop-blur-md shadow-sm hover:shadow-md hover:border-[#C6A96B]/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <AstralIcon name="career" variant="amber" size={24} glow />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                การงาน & ปิดดีลธุรกิจ
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                รู้ช่วงเวลายื่นข้อเสนอ นัดหมายเจรจา เซ็นสัญญา หรือส่งมอบงาน เพื่อลดความขัดแย้งและเพิ่มโอกาสได้รับการอนุมัติสูงที่สุด
              </p>
            </div>

            {/* Case 2: Wealth & Finance */}
            <div className="rounded-2xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 backdrop-blur-md shadow-sm hover:shadow-md hover:border-[#C6A96B]/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <AstralIcon name="finance" variant="emerald" size={24} glow />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                การเงิน & การลงทุน
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                จับจังหวะการเปิดร้าน ค้าขาย โยกย้ายพอร์ต หรือทวงถามหนี้สิน สอดคล้องกับผังราหูค้นทรัพย์และพลังงานการเงินประจำวัน
              </p>
            </div>

            {/* Case 3: Relationships */}
            <div className="rounded-2xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 backdrop-blur-md shadow-sm hover:shadow-md hover:border-[#C6A96B]/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 border border-rose-500/30 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <AstralIcon name="relationship" variant="rose" size={24} glow />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                ความสัมพันธ์ & ผู้ใหญ่
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                เลือกช่วงเวลาเข้าหาผู้ใหญ่ ขอความเมตตา หรือปรับความเข้าใจในครอบครัวและคู่ชีวิต ด้วยยามดาวศุภเคราะห์ที่เปี่ยมไมตรี
              </p>
            </div>

            {/* Case 4: Major Life Decisions */}
            <div className="rounded-2xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 backdrop-blur-md shadow-sm hover:shadow-md hover:border-[#C6A96B]/50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-500/5 border border-sky-500/30 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                <AstralIcon name="compass" variant="sky" size={24} glow />
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                ทางแยกและการตัดสินใจ
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                เมื่อต้องเลือกระหว่างการรุกหรือถอย เปลี่ยนสายงาน หรือเริ่มต้นสิ่งใหม่ Wisdom AI จะสรุปข้อดี-ข้อควรระวังให้คุณเห็นภาพชัดเจน
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          04 — WHAT YOU GET: Immediate Value Breakdown
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
            Value Proposition
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-3">
            สิ่งที่คุณจะได้รับทันทีเมื่อเป็นสมาชิก
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-lg mx-auto font-sarabun">
            เริ่มต้นใช้งานฟรีวันนี้ พร้อมรับ 6 เครื่องมือหลักช่วยวางแผนชีวิต
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 flex gap-4 group hover:border-[#C6A96B]/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br from-[#C6A96B]/25 to-[#C6A96B]/5 border border-[#C6A96B]/30 shadow-md shadow-[#C6A96B]/10 group-hover:scale-105 transition-transform">
              <AstralIcon name="spark" variant="gold" size={24} glow />
            </div>
            <div>
              <h4 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1] mb-1.5">
                สรุปพลังงานประจำวัน (Daily Energy)
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                เกจวัดระดับพลังงานและแนวโน้มชีวิตแบบรายวัน ช่วยให้คุณรู้ว่าวันไหนควรรุก วันไหนควรตั้งรับ
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 flex gap-4 group hover:border-sky-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br from-sky-500/25 to-sky-500/5 border border-sky-500/30 shadow-md shadow-sky-500/10 group-hover:scale-105 transition-transform">
              <AstralIcon name="yam" variant="sky" size={24} glow />
            </div>
            <div>
              <h4 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1] mb-1.5">
                ยามอัฏฐกาล Real-time ละเอียดระดับนาที
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                นาฬิกาคำนวณช่วงเวลายามกลางวัน-กลางคืน พร้อมตัวนับถอยหลังบอกเวลาสิ้นสุดยามปัจจุบัน
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 flex gap-4 group hover:border-indigo-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/25 to-indigo-500/5 border border-indigo-500/30 shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform">
              <AstralIcon name="matrix" variant="mystic" size={24} glow />
            </div>
            <div>
              <h4 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1] mb-1.5">
                ผังวิชาเลข ๗ ตัว ๙ ฐาน 35 ภพเรือน
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                โครงสร้างผังดวงมาตรฐานสุริยยาตร์แท้ สะท้อนตัวตน จุดแข็ง วาสนา และข้อควรระวังในชีวิต
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 flex gap-4 group hover:border-rose-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br from-rose-500/25 to-rose-500/5 border border-rose-500/30 shadow-md shadow-rose-500/10 group-hover:scale-105 transition-transform">
              <AstralIcon name="wisdom" variant="rose" size={24} glow />
            </div>
            <div>
              <h4 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1] mb-1.5">
                Wisdom AI ผู้ช่วยวางแผนชีวิต
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                ผู้ช่วย AI ที่ถูกฝึกฝนด้วยหลักวิชาโหราศาสตร์ เพื่อสังเคราะห์คำแนะนำที่ปฏิบัติได้จริง
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 flex gap-4 group hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br from-emerald-500/25 to-emerald-500/5 border border-emerald-500/30 shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform">
              <AstralIcon name="report" variant="emerald" size={24} glow />
            </div>
            <div>
              <h4 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1] mb-1.5">
                AI Life Report ฉบับสรุปทิศทาง
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                รายงานเจาะลึกมิติต่างๆ ของชีวิต เช่น การเงิน การงาน ความรัก พร้อมกลยุทธ์เชิงรุก
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 flex gap-4 group hover:border-amber-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br from-amber-500/25 to-amber-500/5 border border-amber-500/30 shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform">
              <AstralIcon name="sandglass" variant="amber" size={24} glow />
            </div>
            <div>
              <h4 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1] mb-1.5">
                ละอองทรายกาลเวลา (Sands of Time) ฟรี
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                รับ Sands ฟรีทุกวันจากการเช็คอิน นำไปแลกใช้สิทธิ์วิเคราะห์พิเศษได้ตามต้องการ
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          05 — HOW IT WORKS: 3 Simple Steps
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 bg-slate-100/60 dark:bg-[#07172A]/70 border-y border-slate-200/80 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
              Onboarding Process
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-3">
              เริ่มต้นใช้งานง่ายใน 3 ขั้นตอน
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
              ไม่ต้องติดตั้งแอปพลิเคชัน ใช้งานได้ทันทีบนเบราว์เซอร์ทุกอุปกรณ์
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#C6A96B]/15 border border-[#C6A96B]/40 text-[#8C6D2D] dark:text-[#C6A96B] font-display text-2xl font-bold flex items-center justify-center mb-4 shadow-md">
                1
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                สมัครสมาชิกฟรี
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                กรอกอีเมลและตั้งรหัสผ่านใน 1 นาที ไม่ต้องใช้บัตรเครดิต ไม่มีค่าใช้จ่ายแอบแฝง
              </p>
            </div>

            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#C6A96B]/15 border border-[#C6A96B]/40 text-[#8C6D2D] dark:text-[#C6A96B] font-display text-2xl font-bold flex items-center justify-center mb-4 shadow-md">
                2
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                ระบุข้อมูลวันเกิด
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                ใส่วัน เดือน ปีเกิด และเวลาตกฟาก (ถ้าทราบ) เพื่อให้ระบบสร้างผังดวงเฉพาะตัวคุณ
              </p>
            </div>

            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#C6A96B]/15 border border-[#C6A96B]/40 text-[#8C6D2D] dark:text-[#C6A96B] font-display text-2xl font-bold flex items-center justify-center mb-4 shadow-md">
                3
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                รับแผนที่ชีวิต & ฤกษ์ทอง
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun">
                เข้าถึง Dashboard สรุปจังหวะเวลาทองและรับคำแนะนำเชิงกลยุทธ์ได้ทันทีทุกวัน
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to={ctaTarget}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/20 hover:scale-[1.02] transition-all"
            >
              <span>{ctaText}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          06 — ANCIENT WISDOM × MODERN AI: Calculation First, AI Explains
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl border border-[#C6A96B]/30 bg-gradient-to-br from-white via-[#FAF8F5] to-[#F5EFE6] dark:from-[#0B1528] dark:via-[#07172A] dark:to-[#040D1A] p-8 sm:p-12 shadow-xl dark:shadow-2xl shadow-amber-900/5 relative overflow-hidden transition-colors">
          <div className="max-w-2xl">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
              Core Methodology
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-2 mb-4 leading-tight">
              สูตรคำนวณทางดาราศาสตร์เป็นหลัก <br />
              <span className="text-[#8C6D2D] dark:text-[#C6A96B]">AI ช่วยอธิบายอย่างมีเหตุผล</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-700 dark:text-[#CBD5E1] font-sarabun leading-relaxed mb-6">
              ต่างจากระบบ AI ทั่วไปที่มักแต่งเรื่องขึ้นเอง (Hallucination) PHOPEPHUM OS
              ยึดหลักการคำนวณตำแหน่งดาวและกาลชะตาจากคัมภีร์สุริยยาตร์ไทยแท้ 100 ปีอย่างเคร่งครัด
              เมื่อโครงสร้างตัวเลขถูกต้องแม่นยำแล้ว AI จึงทำหน้าที่แปลงความหมายโบราณให้กลายเป็น
              คำแนะนำภาษาคนร่วมสมัย ไม่ทำให้กลัว ไม่อวดอ้าง และเน้นการลงมือทำจริง
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-white/90 dark:bg-[#07172A]/90 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="text-[#8C6D2D] dark:text-[#C6A96B] font-bold mb-1">✓ Ancient Precision</div>
                <div className="text-slate-700 dark:text-[#CBD5E1] font-sarabun">สุริยยาตร์แท้ ปฏิทินจันทรคติ 100 ปี และ 35 ภพเรือน</div>
              </div>
              <div className="p-4 rounded-xl bg-white/90 dark:bg-[#07172A]/90 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="text-[#8C6D2D] dark:text-[#C6A96B] font-bold mb-1">✓ Empowering Guidance</div>
                <div className="text-slate-700 dark:text-[#CBD5E1] font-sarabun">เปลี่ยนคำทำนายให้เป็นยุทธศาสตร์วางแผนชีวิตเชิงรุก</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          07 — FEATURE SHOWCASE: Real Product Capabilities
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 bg-slate-50/70 dark:bg-[#07172A]/40 border-y border-slate-200/80 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
              System Features
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-3">
              เครื่องมือวิเคราะห์ระดับมืออาชีพ
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-lg mx-auto font-sarabun">
              พัฒนาขึ้นเพื่อตอบโจทย์ทั้งผู้ใช้ทั่วไปและนักพยากรณ์ที่ต้องการความแม่นยำสูงสุด
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/50 p-6 sm:p-7 shadow-sm">
              <div className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase mb-1">01 · Real-time Timing</div>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                นาฬิกากาลชะตา & ยามอัฏฐกาลสด
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun mb-4">
                ตรวจสอบสภาพพลังงานปัจจุบันได้ตลอด 24 ชั่วโมง พร้อมระบบคำนวณยามพรายกระซิบและราหูค้นทรัพย์เพื่อจับจังหวะมงคล
              </p>
              <div className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B]">
                ✦ มีให้ใช้งานตั้งแต่แผนเริ่มต้น (Free)
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/50 p-6 sm:p-7 shadow-sm">
              <div className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase mb-1">02 · Full Astrological Matrix</div>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                ผังดวงจักรพรรดิ 35 ภพเรือน 19 ฐาน
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun mb-4">
                แสดงความสัมพันธ์ของดวงดาวแบบ Multi-select Overlay Filter เพื่อวิเคราะห์รากเหง้าของปัญหาและแนวทางแก้ไขลึกซึ้ง
              </p>
              <div className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B]">
                ✦ แผน Professional & Master
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/50 p-6 sm:p-7 shadow-sm">
              <div className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase mb-1">03 · Deep Synthesis</div>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                AI Life Report รายงานวิเคราะห์ชีวิต
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun mb-4">
                สร้างบทวิเคราะห์ส่วนบุคคลแบบเจาะจงมิติที่ต้องการ พร้อมข้อเสนอแนะในการปรับเปลี่ยนพฤติกรรมและการวางแผนกลยุทธ์
              </p>
              <div className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B]">
                ✦ ส่งออกเป็นเอกสารพรีเมียม (PDF)
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/50 p-6 sm:p-7 shadow-sm">
              <div className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase mb-1">04 · Interactive Consultation</div>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                Wisdom Chat สนทนาถาม-ตอบเฉพาะเรื่อง
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun mb-4">
                สอบถามข้อข้องใจเกี่ยวกับการตัดสินใจในชีวิตประจำวัน ปรึกษาช่วงเวลาที่เหมาะสม โดยผูกข้อมูลดวงของคุณประกอบการตอบ
              </p>
              <div className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B]">
                ✦ ถาม-ตอบแบบ Real-time
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          08 — PRICING & PLANS: 4 Transparent Levels (Source of Truth)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
            Transparent Pricing
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-3">
            แผนบริการที่เหมาะกับความต้องการของคุณ
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] max-w-lg mx-auto font-sarabun">
            เริ่มต้นฟรีได้ทันที หรือเลือกยกระดับสู่เครื่องมือวิเคราะห์เชิงกลยุทธ์ ไม่มีข้อผูกมัดระยะยาว
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {/* 1. Free */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 p-6 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">เริ่มทดลอง</span>
              <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mt-1 mb-1">Free</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sarabun mb-4 min-h-[36px]">
                สัมผัสพลังงานชีวิตและกาลชะตาเบื้องต้น
              </p>
              <div className="mb-6">
                <span className="font-display text-4xl font-bold text-slate-900 dark:text-[#F8F6F1]">฿0</span>
                <span className="text-xs text-slate-500 ml-1">ฟรีตลอดไป</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sarabun mb-6">
                <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold">✓</span> ผังดวงวิชาเลข ๗ ตัว ๙ ฐานเบื้องต้น</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold">✓</span> กาลชะตาวันนี้ & ยามปัจจุบัน</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold">✓</span> Dashboard สรุปพลังงานประจำวัน</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold">✓</span> Wisdom AI ทดลองใช้งาน</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 font-bold">✓</span> รับทรายกาลเวลา (Sands) ฟรีทุกวัน</li>
              </ul>
            </div>
            <Link
              to={ctaTarget}
              className="w-full text-center py-3.5 rounded-xl font-bold text-sm border border-slate-300 dark:border-white/20 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              เริ่มต้นใช้งานฟรี
            </Link>
          </div>

          {/* 2. Premium */}
          <div className="rounded-3xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#0B1528]/80 p-6 flex flex-col justify-between shadow-md">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">ยกระดับชีวิต</span>
              <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mt-1 mb-1">Premium</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sarabun mb-4 min-h-[36px]">
                วางแผนชีวิตและการเงินส่วนบุคคล
              </p>
              <div className="mb-6">
                <span className="font-display text-4xl font-bold text-slate-900 dark:text-[#F8F6F1]">฿89</span>
                <span className="text-xs text-slate-500 ml-1">/ เดือน</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sarabun mb-6">
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> ยามอัฏฐกาลเต็มผัง กลางวัน–กลางคืน</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> ผังเลข ๗ ตัว ๙ ฐาน 35 ภพ 19 ฐาน</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> ปฏิทินจันทรคติไทย 100 ปีแท้</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> AI Life Report 1 ครั้ง/เดือน</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> Wisdom AI 10 ครั้ง/เดือน</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> บันทึกดวงตนเอง + 3 โปรไฟล์</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 font-bold">✓</span> รับ Sands +50 / เดือน</li>
              </ul>
            </div>
            <Link
              to="/pricing"
              className="w-full text-center py-3.5 rounded-xl font-bold text-sm bg-slate-900 text-white dark:bg-white/10 dark:text-white hover:bg-slate-800 transition-colors"
            >
              เลือกแผน Premium
            </Link>
          </div>

          {/* 3. Professional (Featured) */}
          <div className="rounded-3xl border-2 border-[#C6A96B] bg-white dark:bg-[#0B1528] p-6 flex flex-col justify-between shadow-xl shadow-[#C6A96B]/15 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md">
              แนะนำยอดนิยม
            </span>
            <div>
              <span className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase tracking-wider">มืออาชีพ</span>
              <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mt-1 mb-1">Professional</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sarabun mb-4 min-h-[36px]">
                วางแผนงานเฉพาะวิชาชีพ สามารถใช้งานระบบแบบ Custom มากขึ้น
              </p>
              <div className="mb-6">
                <span className="font-display text-4xl font-bold text-slate-900 dark:text-[#F8F6F1]">฿289</span>
                <span className="text-xs text-slate-500 ml-1">/ เดือน</span>
                <div className="text-xs text-[#8C6D2D] dark:text-[#C6A96B] font-bold mt-1">
                  หรือ ฿2,770 / ปี (ประหยัด 20%)
                </div>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sarabun mb-6">
                <li className="flex items-start gap-2"><span className="text-[#C6A96B] font-bold">✓</span> KARNCHATA ENGINE V2.0 เต็มระบบ</li>
                <li className="flex items-start gap-2"><span className="text-[#C6A96B] font-bold">✓</span> Multi-select Overlay Filter บนผังจักรพรรดิ</li>
                <li className="flex items-start gap-2"><span className="text-[#C6A96B] font-bold">✓</span> ยามพรายกระซิบ 12 ภพ & ราหูค้นทรัพย์</li>
                <li className="flex items-start gap-2"><span className="text-[#C6A96B] font-bold">✓</span> AI Life Report 15 ครั้ง/เดือน</li>
                <li className="flex items-start gap-2"><span className="text-[#C6A96B] font-bold">✓</span> บันทึกดวง 15 รายชื่อ</li>
                <li className="flex items-start gap-2"><span className="text-[#C6A96B] font-bold">✓</span> รับ Sands +150 / เดือน</li>
              </ul>
            </div>
            <Link
              to="/pricing"
              className="w-full text-center py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/25 hover:scale-[1.02] transition-all"
            >
              เลือกแผน Professional
            </Link>
          </div>

          {/* 4. Master */}
          <div className="rounded-3xl border border-purple-400/40 dark:border-purple-500/30 bg-white dark:bg-[#0B1528]/80 p-6 flex flex-col justify-between shadow-md">
            <div>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">โหราจารย์</span>
              <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mt-1 mb-1">Master</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sarabun mb-4 min-h-[36px]">
                เครื่องมือสำหรับนักพยากรณ์ เข้าถึงหลักวิชาและหลักการโหราศาสตร์
              </p>
              <div className="mb-6">
                <span className="font-display text-4xl font-bold text-slate-900 dark:text-[#F8F6F1]">฿1,289</span>
                <span className="text-xs text-slate-500 ml-1">/ เดือน</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sarabun mb-6">
                <li className="flex items-start gap-2"><span className="text-purple-500 font-bold">✓</span> ผังดวงจักรพรรดิ 35 ภพ 19 ฐาน สุริยยาตร์แท้</li>
                <li className="flex items-start gap-2"><span className="text-purple-500 font-bold">✓</span> ส่งออกรายงาน AI Life Report พรีเมียม (PDF)</li>
                <li className="flex items-start gap-2"><span className="text-purple-500 font-bold">✓</span> Pro Tools: 16 ยาม, พรายกระซิบ, ราหูค้นทรัพย์</li>
                <li className="flex items-start gap-2"><span className="text-purple-500 font-bold">✓</span> บันทึกดวงไม่จำกัดโปรไฟล์</li>
                <li className="flex items-start gap-2"><span className="text-purple-500 font-bold">✓</span> Wisdom AI Real-time ไม่จำกัด</li>
                <li className="flex items-start gap-2"><span className="text-purple-500 font-bold">✓</span> รับ Sands +500 / เดือน</li>
              </ul>
            </div>
            <Link
              to="/pricing"
              className="w-full text-center py-3.5 rounded-xl font-bold text-sm bg-slate-900 text-white dark:bg-white/10 dark:text-white hover:bg-slate-800 transition-colors"
            >
              เลือกแผน Master
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/pricing" className="text-xs sm:text-sm font-semibold text-[#8C6D2D] dark:text-[#C6A96B] hover:underline">
            ดูตารางเปรียบเทียบสิทธิประโยชน์อย่างละเอียดทุกมิติ →
          </Link>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          09 — SANDS OF TIME: Micro-Economy Clarification
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 bg-slate-100/60 dark:bg-[#07172A]/70 border-y border-slate-200/80 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
              Sands of Time Economy
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-3">
              ระบบเศรษฐกิจละอองทรายกาลเวลา
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-xl mx-auto font-sarabun">
              ไม่ต้องการสมัครรายเดือน? คุณสามารถใช้ละอองทรายกาลเวลาเพื่อปลดล็อกฟังก์ชันเฉพาะคราวได้ตามใจ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 text-center group hover:border-amber-500/40 transition-colors shadow-sm">
              <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 mb-3 shadow-sm group-hover:scale-105 transition-transform">
                <AstralIcon name="sandglass" variant="amber" size={24} glow />
              </div>
              <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1]">50 ละอองทราย</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 font-sarabun">เริ่มต้นทดลองใช้</p>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono mb-4">฿59</div>
              <Link to="/pricing" className="text-sm text-[#8C6D2D] dark:text-[#C6A96B] hover:underline font-semibold">
                เติมทรายแพ็กนี้ →
              </Link>
            </div>

            <div className="p-6 rounded-2xl border-2 border-[#C6A96B] bg-white dark:bg-[#0B1528] text-center shadow-md relative group hover:shadow-lg transition-shadow">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-[#C6A96B] text-[#020617] uppercase tracking-wider">
                คุ้มค่ายอดนิยม
              </span>
              <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#C6A96B]/25 to-[#C6A96B]/5 border border-[#C6A96B]/40 mb-3 shadow-md shadow-[#C6A96B]/10 group-hover:scale-105 transition-transform">
                <AstralIcon name="sandglass" variant="gold" size={26} glow />
              </div>
              <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1]">150 ละอองทราย</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 font-sarabun">ยอดนิยม (คุ้มค่า)</p>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono mb-4">฿149</div>
              <Link to="/pricing" className="text-sm text-[#8C6D2D] dark:text-[#C6A96B] hover:underline font-semibold">
                เติมทรายแพ็กนี้ →
              </Link>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 text-center group hover:border-amber-500/40 transition-colors shadow-sm">
              <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500/25 to-amber-500/5 border border-amber-500/30 mb-3 shadow-md group-hover:scale-105 transition-transform">
                <AstralIcon name="gem" variant="amber" size={26} glow />
              </div>
              <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-[#F8F6F1]">500 ละอองทราย</h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 font-sarabun">แพ็กเกจจุใจ + ประหยัด 32%</p>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono mb-4">฿399</div>
              <Link to="/pricing" className="text-sm text-[#8C6D2D] dark:text-[#C6A96B] hover:underline font-semibold">
                เติมทรายแพ็กนี้ →
              </Link>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center text-xs sm:text-sm text-slate-800 dark:text-[#F8F6F1] flex items-center justify-center gap-2.5 font-sarabun leading-relaxed">
            <AstralIcon name="spark" variant="gold" size={18} glow className="shrink-0" />
            <span><strong className="text-amber-800 dark:text-amber-300">รับทรายฟรีทุกวัน:</strong> สมาชิกทุกระดับ (รวมถึง Free) เพียงเข้าสู่ระบบและบันทึกพลังงานประจำวัน จะได้รับทรายกาลเวลาฟรีวันละ 1 เม็ดสะสมได้ตลอดไป</span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          10 — SECURITY, PRIVACY & DATA ETHICS: Verifiable Trust
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Privacy & Trust
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-3">
            ข้อมูลส่วนบุคคลของคุณ ปลอดภัยในระดับสูงสุด
          </h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 max-w-lg mx-auto font-sarabun">
            เราให้ความสำคัญกับความเป็นส่วนตัวและจริยธรรมข้อมูลเป็นอันดับหนึ่ง
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 shadow-sm group hover:border-emerald-500/40 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-3.5 text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
              <AstralIcon name="lock" variant="emerald" size={22} glow />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-1.5">Row Level Security</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sarabun">
              ข้อมูลดวงชะตาและโปรไฟล์ถูกแยกการเข้าถึงด้วย RLS บนฐานข้อมูล มีเพียงคุณคนเดียวที่เข้าถึงได้
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 shadow-sm group hover:border-emerald-500/40 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-3.5 text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
              <AstralIcon name="shield" variant="emerald" size={22} glow />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-1.5">AI Zero Training Policy</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sarabun">
              คำถามและข้อมูลส่วนบุคคลไม่ถูกนำไปใช้เทรนโมเดล AI สาธารณะ ผ่านสถาปัตยกรรม AI Proxy ปลอดภัย
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 shadow-sm group hover:border-emerald-500/40 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-3.5 text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
              <AstralIcon name="scroll" variant="emerald" size={22} glow />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-1.5">PDPA Compliant</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sarabun">
              ปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคลของไทย พร้อมสิทธิ์ในการขอลบข้อมูลได้ตลอดเวลา
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/40 shadow-sm group hover:border-emerald-500/40 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-3.5 text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
              <AstralIcon name="card" variant="emerald" size={22} glow />
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-1.5">Secure Payment</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sarabun">
              ธุรกรรมชำระเงินผ่านผู้ให้บริการที่ได้รับใบอนุญาต ธปท. และมาตรฐานสากล PCI-DSS
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          11 — WHY PHOPEPHUM: Credibility & Authenticity
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 bg-slate-50/70 dark:bg-[#07172A]/40 border-y border-slate-200/80 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
            Why PHOPEPHUM
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-4">
            เปลี่ยนความเชื่อเดิมๆ ให้กลายเป็นความมั่นใจที่มีหลักการ
          </h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun max-w-2xl mx-auto mb-8">
            เราสร้าง PHOPEPHUM ขึ้นมาเพราะเชื่อว่า โหราศาสตร์โบราณมีคุณค่ามหาศาลหากถูกนำมาใช้อย่างถูกต้อง
            เป้าหมายของเราไม่ใช่การทำให้คุณหวาดกลัวหรือรอคอยโชคชะตาอย่างงอมืองอเท้า
            แต่คือการให้ “แผนที่และเวลาที่เหมาะสม” เพื่อให้คุณลุกขึ้นมาเป็นนายของชีวิตตัวเอง
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 text-xs sm:text-sm text-slate-700 dark:text-slate-200 shadow-sm font-sarabun">
            <div><strong className="text-amber-700 dark:text-[#C6A96B]">C</strong>onfident — มั่นใจในศักยภาพ</div>
            <div className="hidden sm:block text-slate-300 dark:text-white/20">|</div>
            <div><strong className="text-amber-700 dark:text-[#C6A96B]">A</strong>ction — กล้าลงมือทำในเวลาที่ใช่</div>
            <div className="hidden sm:block text-slate-300 dark:text-white/20">|</div>
            <div><strong className="text-amber-700 dark:text-[#C6A96B]">P</strong>roactive — วางแผนชีวิตเชิงรุก</div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          12 — FAQ ACCORDION SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B]">
            Frequently Asked Questions
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1 mb-3">
            คำถามที่พบบ่อย
          </h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-sarabun">
            ตอบทุกข้อสงสัยเกี่ยวกับระบบ สิทธิ์การใช้งาน และความปลอดภัยของข้อมูล
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B1528]/60 backdrop-blur-md overflow-hidden transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 font-display font-semibold text-sm sm:text-base text-slate-900 dark:text-[#F8F6F1] hover:text-[#8C6D2D] dark:hover:text-[#C6A96B] transition-colors"
                >
                  <span>{item.q}</span>
                  <span
                    className={`text-sm text-[#C6A96B] transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 pt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sarabun border-t border-slate-100 dark:border-white/5">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          13 — FINAL CALL TO ACTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B] mb-3 inline-block">
            Start Your Journey
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-[#F8F6F1] leading-tight mb-6">
            ทุกช่วงเวลาของชีวิต <br />
            <span className="text-[#8C6D2D] dark:text-[#C6A96B]">มีจังหวะที่ใช่ที่สุดรอคุณอยู่เสมอ</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 max-w-xl mx-auto font-sarabun mb-8 leading-relaxed">
            เริ่มต้นรู้จักตนเองและค้นหาช่วงเวลาทองในวันนี้ สมัครใช้งานฟรี 1 นาที โดยไม่ต้องกรอกบัตรเครดิต
          </p>

          <Link
            to={ctaTarget}
            className="inline-flex items-center gap-2 px-9 py-4 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-[#C6A96B] via-[#D9BC82] to-[#C6A96B] text-[#020617] shadow-xl shadow-[#C6A96B]/25 hover:shadow-2xl hover:scale-[1.02] transition-all"
          >
            <span>{ctaText}</span>
            <span className="text-lg">→</span>
          </Link>
        </div>
      </section>

      {/* ── JSON-LD Structured Data for SEO & AEO (AI Engines) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "PHOPEPHUM OS",
              "alternateName": ["ภพภูมิ", "PhopePhum", "Living Wisdom OS"],
              "url": "https://phopephum.com",
              "description":
                "ระบบปฏิบัติการปัญญาและกาลเวลาชีวิต (Life Guidance Platform) คำนวณสุริยยาตร์แท้และ Wisdom AI เพื่อค้นหาช่วงเวลาทอง (Golden Window) เฉพาะบุคคล",
              "inLanguage": "th",
            },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "PHOPEPHUM OS",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web, Cloudflare Pages",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "THB",
                "availability": "https://schema.org/InStock",
              },
              "description":
                "แพลตฟอร์มวิเคราะห์กาลชะตาและหน้าต่างเวลาทอง ด้วยสูตรคำนวณสุริยยาตร์แท้และระบบ Wisdom AI",
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "PHOPEPHUM OS",
              "url": "https://phopephum.com",
              "logo": "https://phopephum.com/favicon.svg",
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map((f) => ({
                "@type": "Question",
                "name": f.q,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": f.a,
                },
              })),
            },
          ]),
        }}
      />
    </PublicLayout>
  );
}
