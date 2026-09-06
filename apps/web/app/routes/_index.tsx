import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { captureReferralClick } from "~/services/attribution.server";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "ภพภูมิ (PhopePhum) — ผู้ช่วยชีวิต AI & ดูดวงออนไลน์ ศาสตร์โหราศาสตร์ไทยแท้" },
  {
    name: "description",
    content: "ภพภูมิ (PhopePhum) ผู้ช่วยชีวิต AI และที่ปรึกษาจังหวะกาลเวลาส่วนตัว ผสานศาสตร์โหราศาสตร์ไทยแท้ เลข 7 ตัว 9 ฐาน และยามอัฏฐกาล กับปัญญาประดิษฐ์ AI เพื่อการตัดสินใจอย่างมีสติ เริ่มต้นใช้งานฟรี ไม่ต้องใช้บัตรเครดิต",
  },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com" },
  { property: "og:title", content: "ภพภูมิ (PhopePhum) — ที่ปรึกษาชีวิต AI & เช็คฤกษ์ยาม โหราศาสตร์ไทย" },
  {
    property: "og:description",
    content: "รู้จังหวะกาลเวลา ชนะทุกการตัดสินใจ อ่านพลังงาน 4 มิติชีวิต เช็คฤกษ์ยาม และปรึกษา Wisdom AI เฉพาะตน เริ่มฟรี",
  },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "ภพภูมิ (PhopePhum) — AI ดูดวง & ที่ปรึกษาชีวิตส่วนตัว" },
  {
    name: "twitter:description",
    content: "ถอดรหัสชะตาชีวิตและกาลเวลาด้วยปฏิทินไทยแท้ 100 ปี และ Wisdom AI ส่วนตัว",
  },
  {
    name: "keywords",
    content:
      "ดูดวง AI, ดูดวงออนไลน์, โหราศาสตร์ไทย, เลข 7 ตัว 9 ฐาน, AI ดูดวง, ผู้ช่วยชีวิต AI, ยามอัฏฐกาล, เช็คฤกษ์ยาม, ภพภูมิ, PhopePhum",
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

export default function Index() {
  const { isLoggedIn } = useLoaderData<typeof loader>();
  const [activeFeatureTab, setActiveFeatureTab] = useState<"yam" | "horoscope" | "chat" | "dimensions">("yam");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const useCases = [
    {
      title: "ผู้บริหาร & คนทำงาน",
      role: "วางแผนกลยุทธ์ & ตัดสินใจ",
      desc: "รู้จังหวะเวลาทอง (Golden Window) สำหรับการเจรจาธุรกิจ พรีเซนต์โปรเจกต์ นัดหมายสำคัญ หรือเปลี่ยนสายงานอย่างมั่นใจ",
      icon: "career" as const,
      color: "from-amber-500/20 to-amber-700/5",
    },
    {
      title: "ผู้ประกอบการ & เจ้าของธุรกิจ",
      role: "จับทิศทางตลาด & ฤกษ์มงคล",
      desc: "เลือกช่วงเวลาที่ส่งเสริมการเปิดตัวผลิตภัณฑ์ การลงนามสัญญา หรือยิงแคมเปญการตลาดเพื่อผลลัพธ์ที่ดีที่สุด",
      icon: "finance" as const,
      color: "from-emerald-500/20 to-emerald-700/5",
    },
    {
      title: "ผู้ต้องการพัฒนาตนเอง",
      role: "เข้าใจรหัสชีวิต & คลายจุดติดขัด",
      desc: "ถอดรหัสจุดแข็ง ธาตุเจ้าเรือน และบททดสอบชีวิตในแต่ละช่วงอายุ พร้อมคำแนะนำจาก Wisdom AI ตลอด 24 ชม.",
      icon: "spark" as const,
      color: "from-blue-500/20 to-blue-700/5",
    },
    {
      title: "โหราจารย์ & นักพยากรณ์",
      role: "เครื่องมือวิชาชีพระดับสูง",
      desc: "คำนวณผังดวง ๗ ตัว ๙ ฐาน, ยามอัฏฐกาล, มหาทักษา, มหาภูติ และกาลชะตาระดับนาที แม่นยำตามคัมภีร์สุริยยาตร์แท้",
      icon: "horanu" as const,
      color: "from-purple-500/20 to-purple-700/5",
    },
  ];

  const whatYouGet = [
    {
      title: "ภาพรวมพลังงานวันนี้ (Daily Matrix)",
      desc: "ประเมินระดับพลังงาน 4 มิติ: การงาน การเงิน ความสัมพันธ์ สุขภาพ แบบ Real-time",
      icon: "balance" as const,
    },
    {
      title: "หน้าต่างเวลาทอง (Golden Window)",
      desc: "ระบบตรวจจับยามที่เกื้อหนุน พร้อมบอกช่วงเวลาที่ควรระวังเพื่อหลีกเลี่ยงข้อผิดพลาด",
      icon: "sandglass" as const,
    },
    {
      title: "ผังดวงเลข ๗ ตัว ๙ ฐาน & จักรพรรดิ",
      desc: "คำนวณด้วยปฏิทินจันทรคติไทย 100 ปีแท้ ละเอียดถึงตำแหน่งดาวจรและวัยจร",
      icon: "timeline" as const,
    },
    {
      title: "Wisdom AI ที่ปรึกษาชีวิตส่วนตัว",
      desc: "สนทนาและขอคำชี้แนะได้ตลอด 24 ชั่วโมง โดย AI ที่เข้าใจพื้นดวงชะตาเฉพาะตนของคุณ",
      icon: "wisdom" as const,
    },
    {
      title: "ละอองทรายกาลเวลาฟรีทุกวัน (Sands)",
      desc: "รับทรายกาลเวลาฟรีทุกวันเพื่อปลดล็อกรายงานวิเคราะห์เชิงลึก ไม่จำเป็นต้องจ่ายรายเดือน",
      icon: "sandglass" as const,
    },
  ];

  const faqs = [
    {
      q: "ภพภูมิ (PhopePhum) ใช้งานฟรีได้จริงไหม?",
      a: "ใช้งานฟรีได้จริง 100% ตลอดชีพ สมาชิกเริ่มต้นสามารถดูภาพรวมพลังงานประจำวัน เช็คข้อมูลชาตาพื้นฐาน รับทรายกาลเวลาฟรีทุกวัน และปรึกษา Wisdom AI ได้โดยไม่ต้องผูกบัตรเครดิต",
    },
    {
      q: "ภพภูมิต่างจากแอปดูดวงหรือ AI ทั่วไปอย่างไร?",
      a: "แอปดูดวงทั่วไปมักใช้การสุ่มคำทำนายกว้างๆ ขณะที่ AI ทั่วไปไม่เข้าใจกฎเกณฑ์ดาราศาสตร์ไทย ภพภูมิได้รวม 'ระบบคำนวณปฏิทินจันทรคติไทยแท้ 100 ปี' เข้ากับ Wisdom AI ทำให้บทวิเคราะห์มีความจำเพาะเจาะจงกับวันเวลาตกฟากของคุณอย่างแท้จริง และชี้แนะเพื่อการมีสติ ไม่ใช่งมงาย",
    },
    {
      q: "ถ้าไม่ทราบเวลาเกิดที่แน่นอน ยังสามารถใช้งานได้หรือไม่?",
      a: "สามารถใช้งานได้ครับ ระบบรองรับการคำนวณทั้งแบบระบุเวลาเกิดชัดเจน (ความแม่นยำระดับนาทีและยาม) และแบบระบุเพียงวันเดือนปีเกิด ซึ่งระบบจะวิเคราะห์แกนหลักของผังเลข ๗ ตัวและมหาทักษาให้อย่างสมบูรณ์",
    },
    {
      q: "ข้อมูลวันเดือนปีเกิดของฉันจะถูกเปิดเผยหรือไม่?",
      a: "ข้อมูลส่วนตัวของคุณได้รับการปกป้องอย่างสูงสุดตามมาตรฐาน PDPA ด้วยระบบ Row Level Security (RLS) ของ Supabase ข้อมูลจะไม่มีการเผยแพร่สู่สาธารณะ และไม่ถูกนำไปเทรนโมเดล AI สาธารณะเด็ดขาด",
    },
    {
      q: "ละอองทรายกาลเวลา (Sands of Time) คืออะไร?",
      a: "คือหน่วยคะแนนพลังงานที่ใช้ในการสร้างรายงานวิเคราะห์ชีวิตเชิงลึก (Life Reports) หรือขอคำแนะนำพิเศษ สมาชิกได้รับแจกฟรีทุกวัน และสามารถเลือกเติมเพิ่มได้ตามการใช้งานจริง (เริ่มต้น 50 เม็ด = ฿59) โดยไม่ต้องมีสัญญาผูกมัดรายเดือน",
    },
    {
      q: "หากต้องการใช้สำหรับลูกค้าหรือคนในครอบครัว ต้องทำอย่างไร?",
      a: "คุณสามารถอัปเกรดเป็นแพ็กเกจ Pro Master (฿289/เดือน) เพื่อบันทึกดวงคนอื่นได้ 15 รายชื่อ หรือแพ็กเกจ Imperial Emperor (฿789 ตลอดชีพ) เพื่อบันทึกดวงและดูประวัติดวงชะตาได้ไม่จำกัดจำนวน",
    },
  ];

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      {/* ── JSON-LD Structured Data for SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": "https://phopephum.com/#website",
                "url": "https://phopephum.com",
                "name": "ภพภูมิ — PhopePhum",
                "description": "ที่ปรึกษาชีวิตและจังหวะกาลเวลาส่วนตัวขับเคลื่อนด้วย AI และโหราศาสตร์ไทยแท้",
                "inLanguage": "th",
              },
              {
                "@type": "SoftwareApplication",
                "name": "PhopePhum",
                "operatingSystem": "Web, iOS, Android",
                "applicationCategory": "LifestyleApplication",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "THB",
                },
              },
              {
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
            ],
          }),
        }}
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          1. HERO SECTION (Trust & Value Prop)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 text-center px-4 sm:px-6 max-w-5xl mx-auto">
        
        {/* Sacred Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-600/30 dark:border-[#C6A96B]/30 bg-amber-50/80 dark:bg-[#C6A96B]/10 text-[#8C6D2D] dark:text-[#D9BC82] text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-up">
          <AstralIcon name="portal" size="sm" />
          <span>Living Wisdom Operating System • ระบบปฏิบัติการปัญญาและกาลเวลาชีวิต</span>
        </div>

        {/* Main Punchy Heading */}
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-[#F8F6F1] mb-6 leading-tight animate-fade-up">
          รู้จังหวะกาลเวลา<br />
          <span className="bg-gradient-to-r from-[#8C6D2D] via-[#C6A96B] to-[#D9BC82] bg-clip-text text-transparent">
            ชนะทุกการตัดสินใจ
          </span>
        </h1>

        {/* Subtitle & Value Clarity */}
        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed mb-10 animate-fade-up">
          ที่ปรึกษาชีวิตและจังหวะเวลาส่วนตัว ผสานศาสตร์ปฏิทินจันทรคติไทยแท้ 100 ปี กับ Wisdom AI อัจฉริยะ ช่วยให้คุณเลือกก้าวเดินถูกจังหวะกาลเวลา ในการงาน การเงิน ความรัก และทิศทางชีวิต
        </p>

        {/* Primary & Secondary Dual CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-fade-up">
          <Link
            to={isLoggedIn ? "/dashboard" : "/register"}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-xl shadow-[#C6A96B]/30 hover:shadow-2xl hover:scale-102 active:scale-98 transition-all"
          >
            <span>{isLoggedIn ? "เข้าสู่แดชบอร์ดของคุณ" : "เริ่มต้นใช้งานฟรี (ไม่ต้องใช้บัตรเครดิต)"}</span>
            <span className="text-lg">→</span>
          </Link>

          <Link
            to="/pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold text-base border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <span>ดูตัวอย่างแพ็กเกจ & ราคา</span>
          </Link>
        </div>

        {/* Micro-Trust Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-bold">✓</span> สมัครฟรีใน 1 นาที
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-bold">✓</span> ไม่ต้องกรอกข้อมูลบัตรเครดิต
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-bold">✓</span> ข้อมูลปลอดภัยตามมาตรฐาน PDPA
          </span>
        </div>

      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. SOCIAL PROOF & STATS STRIP
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.02] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-[#8C6D2D] dark:text-[#C6A96B]">100 ปี</p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">ปฏิทินจันทรคติไทยแท้</p>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-[#8C6D2D] dark:text-[#C6A96B]">16 ยาม</p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">ยามอัฏฐกาลตามแดดจริง</p>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-[#8C6D2D] dark:text-[#C6A96B]">24/7</p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">Wisdom AI ให้คำปรึกษา</p>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-bold text-[#8C6D2D] dark:text-[#C6A96B]">100%</p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">ความเป็นส่วนตัวของข้อมูล</p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. USE CASES (ภพภูมิ เหมาะกับใคร)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B] mb-3">
            TAILORED FOR REAL LIFE
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
            ออกแบบมาเพื่อจังหวะชีวิตจริงของคุณ
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base">
            ไม่ว่างมงาย ไม่เพ้อฝัน แต่คือเครื่องมือนำทางชีวิตที่ทำให้คุณตัดสินใจในเวลาที่เหมาะสมที่สุด
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((uc, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm hover:shadow-md hover:border-[#C6A96B]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-5 text-[#8C6D2D] dark:text-[#C6A96B]">
                  <AstralIcon name={uc.icon} size="md" />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#F8F6F1] mb-1">
                  {uc.title}
                </h3>
                <p className="text-xs font-semibold text-[#8C6D2D] dark:text-[#C6A96B] mb-3">
                  {uc.role}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {uc.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. WHAT YOU GET (สิ่งที่คุณจะได้รับทันที)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 bg-slate-50/80 dark:bg-white/[0.01] border-y border-slate-200/70 dark:border-white/5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
              สิ่งที่คุณจะได้รับเมื่อเริ่มต้นใช้งาน
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              ฟังก์ชันครบครันที่ออกแบบให้ใช้งานง่ายบนมือถือ พร้อมส่งมอบปัญญาและความกระจ่างแจ้งในทุกๆ วัน
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whatYouGet.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0A1628]/60 backdrop-blur-md flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-[#8C6D2D] dark:text-[#C6A96B] shrink-0">
                  <AstralIcon name={item.icon} size="md" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          5. HOW IT WORKS (3 ขั้นตอนง่ายๆ)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B] mb-3">
            EASY 3-STEP JOURNEY
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
            เริ่มต้นชีวิตที่รู้จังหวะใน 3 ขั้นตอน
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            ไม่ซับซ้อน ไม่ต้องมีพื้นฐานโหราศาสตร์ ระบบจะจัดการคำนวณเบื้องหลังให้ทั้งหมด
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-center relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold font-display text-lg flex items-center justify-center mx-auto mb-4 shadow-md shadow-[#C6A96B]/20">
              1
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#F8F6F1] mb-2">
              สมัครสมาชิกฟรี 1 นาที
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              กรอกชื่อและอีเมล หรือเข้าสู่ระบบด้วย Google ได้ทันทีโดยไม่ต้องใช้บัตรเครดิต
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-center relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold font-display text-lg flex items-center justify-center mx-auto mb-4 shadow-md shadow-[#C6A96B]/20">
              2
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#F8F6F1] mb-2">
              กรอกวันเวลาตกฟาก
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              ระบุวันเดือนปีเกิด และเวลาเกิด (หากมี) เพื่อให้ระบบถอดรหัสชะตาตามปฏิทินไทย 100 ปีแท้
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-center relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] text-[#020617] font-bold font-display text-lg flex items-center justify-center mx-auto mb-4 shadow-md shadow-[#C6A96B]/20">
              3
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-[#F8F6F1] mb-2">
              รับคำแนะนำ & เช็คฤกษ์ทันที
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              เปิดดูหน้าต่างเวลาทองรายวัน ปรึกษา Wisdom AI และวางแผนการตัดสินใจด้วยความมั่นใจ
            </p>
          </div>

        </div>

        <div className="mt-12 text-center">
          <Link
            to={isLoggedIn ? "/dashboard" : "/register"}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-lg shadow-[#C6A96B]/25 hover:scale-102 transition-all"
          >
            <span>ทดลองเริ่มต้นก้าวแรกได้ฟรี</span>
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          6. FEATURE SHOWCASE (Interactive Tabs Preview)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 bg-slate-100/70 dark:bg-white/[0.02] border-y border-slate-200/80 dark:border-white/10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
              สัมผัสประสบการณ์ภายในระบบจริง
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              อินเทอร์เฟซระดับพรีเมียม สบายตาทั้งโหมดสว่างและโหมดมืด ออกแบบให้เข้าใจง่ายในพริบตา
            </p>
          </div>

          {/* Feature Tab Buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            <button
              type="button"
              onClick={() => setActiveFeatureTab("yam")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeFeatureTab === "yam"
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20"
                  : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              ยามสด & หน้าต่างเวลาทอง
            </button>
            <button
              type="button"
              onClick={() => setActiveFeatureTab("dimensions")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeFeatureTab === "dimensions"
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20"
                  : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              4 มิติพลังงานชีวิต
            </button>
            <button
              type="button"
              onClick={() => setActiveFeatureTab("horoscope")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeFeatureTab === "horoscope"
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20"
                  : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              ผังดวงเลข ๗ ตัว ๙ ฐาน
            </button>
            <button
              type="button"
              onClick={() => setActiveFeatureTab("chat")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeFeatureTab === "chat"
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20"
                  : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              Wisdom AI Chat
            </button>
          </div>

          {/* Interactive Feature Mockup Display */}
          <div className="p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#071120]/80 backdrop-blur-2xl shadow-xl max-w-4xl mx-auto">
            
            {activeFeatureTab === "yam" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-[#8C6D2D] dark:text-[#C6A96B]">
                      <AstralIcon name="sandglass" size="lg" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1]">
                        ยามอัฏฐกาลสด ณ ปัจจุบัน
                      </h3>
                      <p className="text-xs text-slate-700 dark:text-slate-400">คำนวณตามพระอาทิตย์ขึ้น-ตกจริงระดับพิกัดท้องถิ่น</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>ช่วงเวลายามศุภโชค (เกื้อหนุน)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="text-xs text-slate-700 dark:text-slate-400 mb-1">กิจกรรมที่ส่งเสริมสูงสุด</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#F8F6F1]">
                      การเจรจาต่อรอง การเสนอราคา การลงนามสัญญา และการเริ่มงานใหม่
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                    <p className="text-xs text-slate-700 dark:text-slate-400 mb-1">ข้อควรระวังในเวลานี้</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#F8F6F1]">
                      หลีกเลี่ยงการใช้อารมณ์โต้แย้ง หรือการตัดสินใจลงทุนแบบกะทันหัน
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === "dimensions" && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
                  ดัชนีพลังงาน 4 มิติชีวิตประจำวัน
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-center">
                    <AstralIcon name="career" size="md" className="mx-auto mb-2 text-blue-500" />
                    <p className="text-xs text-slate-700 dark:text-slate-400">การงาน (Career)</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-[#F8F6F1] mt-1">88% (ดีเยี่ยม)</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-center">
                    <AstralIcon name="finance" size="md" className="mx-auto mb-2 text-amber-500" />
                    <p className="text-xs text-slate-700 dark:text-slate-400">การเงิน (Finance)</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-[#F8F6F1] mt-1">75% (มั่นคง)</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-center">
                    <AstralIcon name="relationship" size="md" className="mx-auto mb-2 text-rose-500" />
                    <p className="text-xs text-slate-700 dark:text-slate-400">ความสัมพันธ์</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-[#F8F6F1] mt-1">82% (ราบรื่น)</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-center">
                    <AstralIcon name="wellness" size="md" className="mx-auto mb-2 text-emerald-500" />
                    <p className="text-xs text-slate-700 dark:text-slate-400">สุขภาพ (Wellness)</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-[#F8F6F1] mt-1">90% (สมดุล)</p>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === "horoscope" && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1]">
                  ผังดวงเลข ๗ ตัว ๙ ฐาน & จักรพรรดิ
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  คำนวณตามสูตรคัมภีร์ดึกดำบรรพ์ พร้อมถอดรหัสวัยจร ปีจร เดือนจร เพื่อวางแผนชีวิตระยะยาว
                </p>
                <div className="p-4 rounded-2xl border border-[#C6A96B]/30 bg-[#C6A96B]/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AstralIcon name="timeline" size="md" />
                    <div>
                      <p className="text-xs text-slate-700 dark:text-slate-400">วัยจรปัจจุบัน</p>
                      <p className="font-bold text-sm text-slate-900 dark:text-[#F8F6F1]">ดาวพฤหัสบดี (๕) เสวยอายุ — ช่วงเวลาแห่งปัญญาและการขยับขยาย</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B]">ความแม่นยำสูง</span>
                </div>
              </div>
            )}

            {activeFeatureTab === "chat" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm">
                  <p className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] mb-1">คำถามของคุณ</p>
                  <p className="text-slate-800 dark:text-slate-200">"ช่วงสัปดาห์นี้ เหมาะกับการเปิดตัวโครงการใหม่หรือยื่นขอเงินกู้หรือไม่?"</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sm">
                  <p className="text-xs font-bold text-amber-700 dark:text-[#D9BC82] mb-1 flex items-center gap-1.5">
                    <AstralIcon name="wisdom" size="sm" />
                    <span>Wisdom AI วิเคราะห์จากชะตาและกาลเวลา</span>
                  </p>
                  <p className="text-slate-800 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                    "ตามผังชะตา ดาวพฤหัสบดีกำลังส่งพลังเกื้อหนุนในเรือนลาภะ แนะนำให้ดำเนินเรื่องในวันพุธหรือวันพฤหัสบดีช่วงยามศุภโชค (10:30 - 12:00 น.) จะได้รับความเมตตาและผ่านการพิจารณาได้ราบรื่นที่สุด..."
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          7. WISDOM × AI (ไม่ใช่งมงาย แต่คือสติและกลยุทธ์)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 p-2 rounded-2xl bg-amber-500/10 text-[#8C6D2D] dark:text-[#C6A96B] mb-6">
          <AstralIcon name="spark" size="md" />
          <span className="font-bold text-xs uppercase tracking-wider">THE PHILOSOPHY OF PHOPEPHUM</span>
        </div>

        <h2 className="font-display text-3xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-6 leading-tight">
          ไม่ใช่การงมงายในโชคชะตา<br />
          แต่คือการ "รู้จังหวะ" เพื่อลงมือทำอย่างมีสติ
        </h2>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl mx-auto mb-10">
          ศาสตร์กาลเวลาโบราณคือการอ่าน "คลื่นพลังงานธรรมชาติ" เช่นเดียวกับการที่ชาวประมงต้องอ่านกระแสน้ำและทิศทางลมก่อนออกเรือ ภพภูมินำพลังของ AI มาเป็นเครื่องมือถอดรหัสคลื่นพลังงานเหล่านี้ ให้คุณเตรียมความพร้อม ไม่ประมาท และเลือกเวลาลงมือทำที่ให้ผลสัมฤทธิ์สูงสุด
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02]">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-2">
              1. สติและความตระหนักรู้
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              ช่วยให้คุณมองเห็นอารมณ์และจุดเปราะบางล่วงหน้า ไม่ตกเป็นทาสของความกลัวหรือความโลภ
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02]">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-2">
              2. จังหวะเวลาที่เกื้อหนุน
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              ทำงานชิ้นสำคัญในเวลาที่พลังงานส่งเสริม และใช้เวลาที่พลังงานตึงเครียดในการพักผ่อนหรือทบทวน
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02]">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-2">
              3. ทางออกที่ลงมือทำได้จริง
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Wisdom AI เปลี่ยนข้อคิดโบราณเป็นแผนการลงมือทำเชิงปฏิบัติที่เข้ากับยุคปัจจุบัน
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          8. CANONICAL PRICING & VALUE COMPARISON
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 bg-slate-50/90 dark:bg-white/[0.01] border-y border-slate-200/80 dark:border-white/10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B] mb-3">
              TRANSPARENT & FAIR PRICING
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
              แผนการใช้งานที่โปร่งใส ชัดเจน
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              เริ่มต้นได้ฟรีตลอดชีพ หรือยกระดับสู่เครื่องมือมืออาชีพตามความต้องการของคุณ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Free */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#071120]/80 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">เริ่มต้นทดลอง</span>
                <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mt-1 mb-2">ฟรีตลอดชีพ</h3>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold text-slate-900 dark:text-[#F8F6F1]">฿0</span>
                  <span className="text-xs text-slate-700 dark:text-slate-400 ml-1">/ ตลอดชีพ</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 mb-6">
                  <li className="flex items-center gap-2"><span>✓</span> Dashboard พลังงานวันนี้</li>
                  <li className="flex items-center gap-2"><span>✓</span> ข้อมูลชาตาส่วนตัวเบื้องต้น</li>
                  <li className="flex items-center gap-2"><span>✓</span> Wisdom AI (3 ครั้ง/เดือน)</li>
                  <li className="flex items-center gap-2"><span>✓</span> รับทรายกาลเวลาฟรีทุกวัน</li>
                </ul>
              </div>
              <Link
                to="/register"
                className="w-full text-center py-3 rounded-xl font-bold text-xs border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                สมัครใช้งานฟรี
              </Link>
            </div>

            {/* Basic */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#071120]/80 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">ยกระดับชีวิต</span>
                <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mt-1 mb-2">Basic Sage</h3>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold text-slate-900 dark:text-[#F8F6F1]">฿89</span>
                  <span className="text-xs text-slate-700 dark:text-slate-400 ml-1">/ เดือน</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 mb-6">
                  <li className="flex items-center gap-2"><span>✓</span> ยามอัฏฐกาล & ราหู วันนี้</li>
                  <li className="flex items-center gap-2"><span>✓</span> ผัง 7 ตัว 9 ฐาน (ตนเอง)</li>
                  <li className="flex items-center gap-2"><span>✓</span> ปฏิทินพลังงานรายวัน</li>
                  <li className="flex items-center gap-2"><span>✓</span> Wisdom AI (10 ครั้ง/เดือน)</li>
                  <li className="flex items-center gap-2"><span>✓</span> บันทึกดวงตนเอง + 3 คน</li>
                </ul>
              </div>
              <Link
                to="/pricing"
                className="w-full text-center py-3 rounded-xl font-bold text-xs bg-slate-900 text-white dark:bg-white/10 dark:text-white hover:bg-slate-800 transition-colors"
              >
                เลือกแผน Basic
              </Link>
            </div>

            {/* Pro Master */}
            <div className="p-6 rounded-3xl border-2 border-[#C6A96B] bg-white dark:bg-[#0A182E]/90 backdrop-blur-xl flex flex-col justify-between relative shadow-xl shadow-[#C6A96B]/15">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617]">
                แนะนำยอดนิยม
              </div>
              <div>
                <span className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase tracking-wider">มืออาชีพ</span>
                <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mt-1 mb-2">Pro Master</h3>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold text-slate-900 dark:text-[#F8F6F1]">฿289</span>
                  <span className="text-xs text-slate-700 dark:text-slate-400 ml-1">/ เดือน</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 mb-6">
                  <li className="flex items-center gap-2"><span className="text-[#8C6D2D] dark:text-[#C6A96B]">✓</span> ยามล่วงหน้า 7 วัน</li>
                  <li className="flex items-center gap-2"><span className="text-[#8C6D2D] dark:text-[#C6A96B]">✓</span> ระบบวิเคราะห์จรสมบูรณ์</li>
                  <li className="flex items-center gap-2"><span className="text-[#8C6D2D] dark:text-[#C6A96B]">✓</span> Wisdom AI ไม่จำกัด</li>
                  <li className="flex items-center gap-2"><span className="text-[#8C6D2D] dark:text-[#C6A96B]">✓</span> บันทึกดวงคนอื่น 15 คน</li>
                  <li className="flex items-center gap-2"><span className="text-[#8C6D2D] dark:text-[#C6A96B]">✓</span> รับ Sands +150 เม็ด/เดือน</li>
                </ul>
              </div>
              <Link
                to="/pricing"
                className="w-full text-center py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20 hover:scale-102 transition-all"
              >
                เลือกแผน Pro Master
              </Link>
            </div>

            {/* Imperial */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#071120]/80 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">สัจจะสูงสุด</span>
                <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-[#F8F6F1] mt-1 mb-2">Imperial</h3>
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold text-slate-900 dark:text-[#F8F6F1]">฿789</span>
                  <span className="text-xs text-slate-700 dark:text-slate-400 ml-1">/ ตลอดชีพ</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 mb-6">
                  <li className="flex items-center gap-2"><span>✓</span> ทุกฟีเจอร์ไม่จำกัดตลอดชีพ</li>
                  <li className="flex items-center gap-2"><span>✓</span> ปฏิทิน 100 ปี & ดวงสมพงษ์</li>
                  <li className="flex items-center gap-2"><span>✓</span> ส่งออกรายงาน PDF พรีเมียม</li>
                  <li className="flex items-center gap-2"><span>✓</span> บันทึกดวงไม่จำกัดจำนวน</li>
                  <li className="flex items-center gap-2"><span>✓</span> รับ Sands +500 เม็ดโบนัส</li>
                </ul>
              </div>
              <Link
                to="/pricing"
                className="w-full text-center py-3 rounded-xl font-bold text-xs bg-slate-900 text-white dark:bg-white/10 dark:text-white hover:bg-slate-800 transition-colors"
              >
                เลือกแผน Imperial
              </Link>
            </div>

          </div>

          <div className="mt-8 text-center">
            <Link to="/pricing" className="text-xs sm:text-sm font-semibold text-[#8C6D2D] dark:text-[#C6A96B] hover:underline">
              ดูตารางเปรียบเทียบฟีเจอร์อย่างละเอียดและตัวเลือก Pro รายปี (฿2,790/ปี ประหยัด 20%) →
            </Link>
          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          9. SANDS OF TIME (Micro-Economy)
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="sands" className="relative z-10 py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl border border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-500/[0.02] backdrop-blur-xl">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[#8C6D2D] dark:text-[#C6A96B] font-bold text-xs uppercase tracking-wider mb-2">
              <AstralIcon name="sandglass" size="sm" />
              <span>SANDS OF TIME MICRO-ECONOMY</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-3">
              เศรษฐกิจละอองทรายกาลเวลา — จ่ายตามจริง ไม่ผูกมัด
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              หากคุณไม่ต้องการจ่ายค่าสมาชิกรายเดือน คุณสามารถใช้ "ละอองทรายกาลเวลา" เพื่อปลดล็อกรายงานวิเคราะห์ชีวิตเชิงลึกเป็นครั้งคราวได้ตามสะดวก โดยสมาชิกทุกคนจะได้รับทรายแจกฟรีทุกวันเมื่อเข้าใช้งาน
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5">
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">ชุดเริ่มต้น</p>
              <p className="text-xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1">50 เม็ด</p>
              <p className="text-xs text-[#8C6D2D] dark:text-[#C6A96B] font-bold mt-1">฿59</p>
            </div>
            <div className="p-4 rounded-2xl border-2 border-[#C6A96B] bg-white/90 dark:bg-[#0A182E] relative">
              <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[#C6A96B] text-[#020617]">ยอดนิยม</span>
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">ชุดสุดคุ้ม</p>
              <p className="text-xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1">150 เม็ด</p>
              <p className="text-xs text-[#8C6D2D] dark:text-[#C6A96B] font-bold mt-1">฿149</p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5">
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">ชุดจุใจ (ประหยัด 32%)</p>
              <p className="text-xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-1">500 เม็ด</p>
              <p className="text-xs text-[#8C6D2D] dark:text-[#C6A96B] font-bold mt-1">฿399</p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          10. SECURITY, PRIVACY & COMPLIANCE
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 bg-slate-50 dark:bg-white/[0.01] border-y border-slate-200/80 dark:border-white/10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="p-6 rounded-3xl bg-slate-900 text-white dark:bg-white/5 border border-slate-800 dark:border-white/10 shrink-0 text-center w-full md:w-72">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-[#C6A96B] flex items-center justify-center mx-auto mb-4">
              <AstralIcon name="balance" size="lg" />
            </div>
            <h3 className="font-display font-bold text-lg mb-1">PDPA Compliant</h3>
            <p className="text-xs text-slate-400">มาตรฐานคุ้มครองข้อมูลส่วนบุคคลและธุรกรรมปลอดภัย 100%</p>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F8F6F1]">
              ความปลอดภัยและความเป็นส่วนตัวคือหัวใจของเรา
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              เราเข้าใจดีว่าข้อมูลวันเกิดและเวลาตกฟากเป็นเรื่องส่วนตัวอย่างยิ่ง สถาปัตยกรรมของ PhopePhum จึงถูกออกแบบด้วยแนวคิด Zero-Knowledge Personal Privacy:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>ข้อมูลตกฟากถูกล็อกด้วย Supabase RLS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>ไม่มีการขายข้อมูลส่วนบุคคลให้บุคคลที่สาม</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>เข้ารหัสการเชื่อมต่อด้วย Bank-Grade SSL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>ไม่นำข้อมูลของคุณไปเทรน AI สาธารณะ</span>
              </div>
            </div>
            <div className="pt-2">
              <Link to="/security" className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] hover:underline">
                อ่านมาตรฐานความปลอดภัยและสิทธิในข้อมูลของคุณ →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          11. FAQ ACCORDION SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#8C6D2D] dark:text-[#C6A96B] mb-3">
            FREQUENTLY ASKED QUESTIONS
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-3">
            คำถามที่พบบ่อย
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            คำตอบชัดเจนในทุกข้อสงสัยเกี่ยวกับการใช้งานและการบริการ
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-display font-bold text-base text-slate-900 dark:text-[#F8F6F1] hover:text-[#8C6D2D] dark:hover:text-[#C6A96B] transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`text-xl transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link to="/faq" className="text-xs sm:text-sm font-semibold text-[#8C6D2D] dark:text-[#C6A96B] hover:underline">
            ดูคำถามและคำตอบทั้งหมดในศูนย์ช่วยเหลือ (FAQ Hub) →
          </Link>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          12. FINAL CALL-TO-ACTION (Conversion Anchor)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-slate-900 to-[#0B1528] text-white border border-[#C6A96B]/30 shadow-2xl relative overflow-hidden">
          
          {/* Subtle glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C6A96B]/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="font-display text-3xl sm:text-5xl font-bold mb-4 relative z-10 text-[#F8F6F1] leading-tight">
            พร้อมเริ่มต้นชีวิตที่ก้าวถูกจังหวะแล้วหรือยัง?
          </h2>

          <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto mb-8 relative z-10 leading-relaxed">
            สัมผัสประสบการณ์แห่งปัญญาและกาลเวลาชีวิตที่จะเปลี่ยนทุกการตัดสินใจของคุณให้แม่นยำและมั่นใจยิ่งขึ้น
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 mb-6">
            <Link
              to={isLoggedIn ? "/dashboard" : "/register"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-xl shadow-[#C6A96B]/30 hover:scale-105 active:scale-95 transition-all"
            >
              <span>{isLoggedIn ? "ไปที่ Dashboard ของคุณ" : "เริ่มต้นใช้งานฟรีทันที"}</span>
              <span>→</span>
            </Link>
          </div>

          <p className="text-xs text-slate-400 relative z-10">
            ไม่ต้องกรอกบัตรเครดิต • สมัครใน 1 นาที • เริ่มต้นฟรีตลอดชีพ
          </p>

        </div>
      </section>

    </PublicLayout>
  );
}
