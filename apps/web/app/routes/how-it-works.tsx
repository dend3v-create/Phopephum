import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "วิธีใช้งาน — PhoPePhum OS (ภพภูมิ)" },
  {
    name: "description",
    content: "คู่มือเริ่มต้นใช้งาน PhoPePhum OS ใน 3 ขั้นตอนง่ายๆ ถอดรหัสจังหวะชีวิต ค้นหาเวลาทอง และรับคำแนะนำ Action Plan เฉพาะบุคคลด้วย AI",
  },
  { tagName: "link", rel: "canonical", href: "https://phopephum.com/how-it-works" },
  { property: "og:title", content: "วิธีใช้งาน — PhoPePhum OS" },
  {
    property: "og:description",
    content: "เริ่มต้นชีวิตที่รู้จังหวะกาลเวลา ใน 3 ขั้นตอนง่ายๆ ด้วยระบบวิเคราะห์และเข็มทิศ AI อัจฉริยะ",
  },
  { property: "og:url", content: "https://phopephum.com/how-it-works" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function HowItWorksPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  const steps = [
    {
      step: "01",
      icon: "portal" as const,
      tag: "STEP 1 • PROFILE SETUP",
      title: "กำหนดจุดเริ่มต้นชีวิต (ตั้งค่าโปรไฟล์ & เวลาตกฟาก)",
      desc: "ระบุวัน เดือน ปีเกิด และเวลาตกฟากที่แม่นยำ เพื่อให้ระบบจัดวางผังพลังงานชีวิตเฉพาะตัวคุณได้อย่างถูกต้องเที่ยงตรง",
      highlights: [
        "คำนวณตัดรอบวันตามหลักอาทิตย์อุทัยจริง แม่นยำสำหรับผู้เกิดช่วงรอยต่อวัน",
        "ระบบเข้ารหัสข้อมูลส่วนบุคคลปลอดภัยสูงสุดตามมาตรฐาน PDPA",
        "สร้างผังวิเคราะห์อัตโนมัติ พร้อมใช้งานทันทีใน 1 นาที",
      ],
      color: "from-amber-500/20 via-[#D4AF37]/10 to-transparent",
      borderColor: "border-[#D4AF37]/40",
      tagColor: "bg-[#D4AF37]/15 text-[#F6D88C] border-[#D4AF37]/30",
    },
    {
      step: "02",
      icon: "sandglass" as const,
      tag: "STEP 2 • CHOOSE FOCUS & TIMING",
      title: "เลือกมิติชีวิตที่ต้องการวางแผน และเช็กกาลชะตา Real-time",
      desc: "เลือกโฟกัสเรื่องที่คุณกำลังตัดสินใจ ไม่ว่าจะเป็นเรื่องการงาน การเงิน การลงทุน หรือความสัมพันธ์ พร้อมตรวจดูช่วงเวลาทองประจำวัน",
      highlights: [
        "ตรวจสอบหน้าต่างเวลาทอง (Golden Window) แบบ Real-time รายชั่วโมง",
        "รู้ล่วงหน้าว่าช่วงเวลาใดควรลุยเจรจา และช่วงเวลาใดควรชะลอเพื่อลดความเสี่ยง",
        "กรองมุมมองเฉพาะด้านตามเป้าหมายที่คุณสนใจได้อย่างยืดหยุ่น",
      ],
      color: "from-sky-500/20 via-blue-500/10 to-transparent",
      borderColor: "border-sky-500/40",
      tagColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    },
    {
      step: "03",
      icon: "wisdom" as const,
      tag: "STEP 3 • ACTIONABLE GUIDANCE",
      title: "รับเข็มทิศชีวิตและ Action Plan จาก AI",
      desc: "แปลงข้อมูลสถิติที่ซับซ้อนให้เป็นบทวิเคราะห์ภาษาเข้าใจง่าย พร้อม Checklist สิ่งที่ควรทำเพื่อสร้างผลลัพธ์ที่เป็นรูปธรรม",
      highlights: [
        "สรุปภาพรวม Insight เจาะลึกจุดแข็งและโอกาสที่กำลังเปิดออก",
        "Action Plan 4 มิติ: สิ่งที่เห็น ⭢ สติรู้ทัน ⭢ กลยุทธ์ ⭢ สิ่งที่ลงมือทำได้วันนี้",
        "ยึดหลักพยากรณ์บำบัด (Forecasting Therapy) เสริมความมั่นใจ ไม่สร้างความกลัว",
      ],
      color: "from-emerald-500/20 via-teal-500/10 to-transparent",
      borderColor: "border-emerald-500/40",
      tagColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
  ];

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      {/* ── Header ── */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[#8C6D2D] dark:text-[#F6D88C] text-xs font-semibold uppercase tracking-wider mb-4">
          <AstralIcon name="compass" size="sm" />
          <span>USER GUIDE • คู่มือการใช้งาน</span>
        </div>
        <h1 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
          เริ่มต้นชีวิตที่รู้จังหวะกาลเวลา ใน 3 ขั้นตอนง่ายๆ
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-sarabun max-w-3xl mx-auto leading-relaxed">
          เปลี่ยนความกังวลและความไม่แน่นอนในชีวิต สู่ความมั่นใจและแผนปฏิบัติการที่ชัดเจน ด้วยระบบเข็มทิศ AI ส่วนบุคคล
        </p>
      </section>

      {/* ── 3 Steps Walkthrough Cards ── */}
      <section className="pb-20 px-4 sm:px-6 max-w-5xl mx-auto space-y-8">
        {steps.map((item) => (
          <div
            key={item.step}
            className={`relative p-6 sm:p-10 rounded-3xl border ${item.borderColor} bg-white/95 dark:bg-[#07172A]/90 backdrop-blur-2xl shadow-xl overflow-hidden`}
          >
            {/* Ambient Background Gradient */}
            <div
              className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl ${item.color} blur-3xl pointer-events-none -z-10`}
            />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[#8C6D2D] dark:text-[#D4AF37]">
                  <AstralIcon name={item.icon} size="md" />
                </div>
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${item.tagColor} mb-1`}>
                    {item.tag}
                  </span>
                  <h2 className="font-playfair font-bold text-xl sm:text-2xl text-slate-900 dark:text-[#F8F6F1]">
                    {item.title}
                  </h2>
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-display font-bold text-slate-300 dark:text-white/15">
                {item.step}
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-sarabun leading-relaxed mb-6">
              {item.desc}
            </p>

            {/* Checklist items */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {item.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 font-sarabun flex items-start gap-2.5"
                >
                  <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="leading-relaxed">{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Privacy & Trust Reassurance ── */}
      <section className="pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="space-y-2">
            <div className="text-amber-500 text-xl font-bold">🔒 มาตรฐาน PDPA</div>
            <h4 className="font-playfair font-bold text-slate-900 dark:text-[#F8F6F1] text-sm">ปกป้องข้อมูลส่วนบุคคล</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sarabun leading-relaxed">
              ข้อมูลวันเกิด เวลาตกฟาก และบันทึกชีวิตของคุณได้รับการเข้ารหัสและคุ้มครองความปลอดภัยสูงสุด ไม่มีการเปิดเผยสู่สาธารณะ
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-sky-500 text-xl font-bold">⏱️ รู้จังหวะก่อนใคร</div>
            <h4 className="font-playfair font-bold text-slate-900 dark:text-[#F8F6F1] text-sm">ไม่พลาดทุกจังหวะสำคัญ</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sarabun leading-relaxed">
              ตรวจเช็กยามมงคลและกาลชะตาแบบ Real-time ได้ตลอด 24 ชั่วโมง เพื่อให้คุณเลือกช่วงเวลาเจรจาหรือลงนามที่ได้เปรียบที่สุด
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-emerald-500 text-xl font-bold">🌱 พยากรณ์เชิงบำบัด</div>
            <h4 className="font-playfair font-bold text-slate-900 dark:text-[#F8F6F1] text-sm">สร้างพลังใจ ไม่สร้างความกลัว</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sarabun leading-relaxed">
              ทุกคำแนะนำมุ่งเน้นการสร้างสติ ตระหนักรู้ และแนวทางปฏิบัติเชิงบวก เพื่อให้คุณเป็นผู้กำหนดชะตาชีวิตของตนเอง
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA Bottom ── */}
      <section className="py-16 text-center px-4 max-w-3xl mx-auto border-t border-slate-200/80 dark:border-white/10">
        <h2 className="font-playfair text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-3">
          พร้อมค้นพบจังหวะเวลาชีวิตของคุณแล้วหรือยัง?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 font-sarabun text-sm mb-8">
          เริ่มต้นสร้างโปรไฟล์ชีวิตและสำรวจศักยภาพของคุณได้ฟรีวันนี้
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to={isLoggedIn ? "/dashboard" : "/register"}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] via-[#F6D88C] to-[#D4AF37] text-[#07172A] shadow-lg shadow-[#D4AF37]/25 hover:scale-102 transition-all"
          >
            <span>{isLoggedIn ? "ไปที่แดชบอร์ด" : "เริ่มต้นใช้งานฟรี"}</span>
            <span>→</span>
          </Link>
          <Link
            to="/features"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <span>สำรวจฟีเจอร์ทั้งหมด</span>
          </Link>
        </div>
      </section>

      {/* ── JSON-LD Structured Data for HowTo ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": "วิธีใช้งาน PhoPePhum OS เพื่อค้นหาจังหวะเวลาทอง",
            "description": "คู่มือ 3 ขั้นตอนเริ่มต้นใช้งาน PhoPePhum OS ในการวางแผนชีวิตและการตัดสินใจด้วยปัญญาและกาลเวลา",
            "step": steps.map((s, idx) => ({
              "@type": "HowToStep",
              "position": idx + 1,
              "name": s.title,
              "text": s.desc,
            })),
          }),
        }}
      />
    </PublicLayout>
  );
}
