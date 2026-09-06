import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "ฟีเจอร์ทั้งหมด — PhopePhum (ภพภูมิ) ระบบปฏิบัติการปัญญาและกาลเวลาชีวิต" },
  {
    name: "description",
    content: "สำรวจฟีเจอร์เด่นทั้งหมดของ PhopePhum: ยามอัฏฐกาล ๑๖ ยาม, ผังดวง ๗ ตัว ๙ ฐาน, ๔ ประตูศาสตร์พยากรณ์, Wisdom AI ส่วนตัว, และระบบวางแผนชีวิต TQM",
  },
  { property: "og:title", content: "ฟีเจอร์ทั้งหมด — PhopePhum (ภพภูมิ)" },
  {
    property: "og:description",
    content: "ถอดรหัสชะตาชีวิตและกาลเวลาด้วยปฏิทินไทยแท้ 100 ปี และ Wisdom AI ส่วนตัว",
  },
  { property: "og:url", content: "https://phopephum.com/features" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function FeaturesPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

  const corePillars = [
    {
      icon: "sandglass" as const,
      name: "ยามอัฏฐกาล ๑๖ ยาม (Solar Yam Engine)",
      subtitle: "คำนวณตามพระอาทิตย์ขึ้น-ตกจริงระดับพิกัด",
      desc: "ไม่ใช้เวลาเฉลี่ยแบบเดิม แต่คำนวณช่วงเวลา 90 นาทีจริงตามตำแหน่งดวงอาทิตย์ในแต่ละวัน บอกจังหวะยามศุภโชค ยามปลอด ยามกาลกิณี พร้อมนาฬิกานับถอยหลัง",
      tags: ["Real-time", "หน้าต่างเวลาทอง", "นับถอยหลังยาม"],
    },
    {
      icon: "horanu" as const,
      name: "๔ ประตูศาสตร์พยากรณ์กาลเวลา",
      subtitle: "วิเคราะห์จังหวะคำถามฉับพลัน",
      desc: "รวม 4 ศาสตร์โบราณ: โหรทายหนู (๑๑๒ ผัง), กาลชะตาระดับนาที, ยามราหูค้นทรัพย์ & ฤกษ์ย่อย ๑๐ นาที, และยามพรายกระซิบ เพื่อตอบทุกข้อสงสัยได้อย่างทันท่วงที",
      tags: ["โหรทายหนู 112 ผัง", "ยามราหู", "กาลชะตา"],
    },
    {
      icon: "timeline" as const,
      name: "ผังดวงเลข ๗ ตัว ๙ ฐาน & ผังจักรพรรดิ",
      subtitle: "ปฏิทินจันทรคติไทยแท้ 100 ปี",
      desc: "คำนวณวันทางจันทรคติไทยแท้ ขึ้น-แรม เดือนอธิกมาส-อธิกวาร ถูกต้องตามคัมภีร์สุริยยาตร์ พร้อมผังดวงจักรพรรดิ วัยจร ปีจร และดาวเสวยอายุ",
      tags: ["เลข 7 ตัว 9 ฐาน", "ผังจักรพรรดิ", "วัยจรเสวยอายุ"],
    },
    {
      icon: "wisdom" as const,
      name: "Wisdom AI ที่ปรึกษาชีวิตส่วนตัว",
      subtitle: "AI ที่เข้าใจโครงสร้างดวงชะตาของคุณ",
      desc: "ไม่ใช่แค่ AI สนทนาทั่วไป แต่เป็น Wisdom Companion ที่นำพื้นดวงและพลังงานกาลเวลาปัจจุบันมาสังเคราะห์เป็นคำแนะนำที่ลงมือปฏิบัติได้จริง",
      tags: ["เข้าใจชะตาตนเอง", "สนทนา 24 ชม.", "วิเคราะห์ 4 มิติ"],
    },
    {
      icon: "balance" as const,
      name: "TQM Daily Life Planner",
      subtitle: "เปลี่ยนปัญญาเป็นการกระทำจริง",
      desc: "ระบบบันทึกเจตจำนงรายวัน (Morning Intention) เชื่อมโยงกับพลังงานยาม และประเมินผลลัพธ์ยามค่ำ (Evening Reflection) เพื่อยกระดับความก้าวหน้าของชีวิต",
      tags: ["Morning Intention", "Evening Reflection", "TQM Framework"],
    },
    {
      icon: "spark" as const,
      name: "Sands of Time Micro-Economy",
      subtitle: "จ่ายตามจริง ไม่ผูกมัดรายเดือน",
      desc: "ระบบเศรษฐกิจละอองทรายกาลเวลา สมาชิกรับแจกฟรีทุกวันเมื่อเข้าใช้งาน หรือซื้อเพิ่มเป็นชุดเมื่อต้องการสร้างรายงานพิเศษ โดยไม่ต้องสมัครสัญญารายเดือน",
      tags: ["รับฟรีทุกวัน", "Pay-as-you-go", "ปลดล็อกรายงาน"],
    },
  ];

  const proFeatures = [
    {
      title: "ระบบ CRM บันทึกดวงลูกค้าสำหรับโหราจารย์",
      desc: "จัดเก็บฐานข้อมูลดวงชะตาลูกค้า ค้นหา บันทึกประวัติ และวิเคราะห์ผังดวงได้ไม่จำกัดในที่เดียว",
    },
    {
      title: "มหาทักษาพยากรณ์ & มหาภูติกำเนิด/จร",
      desc: "คำนวณดาวเสวยอายุ ดาวแทรก และการเคลื่อนตัวของธาตุทั้ง 4 (ดิน น้ำ ลม ไฟ) อย่างลึกซึ้ง",
    },
    {
      title: "ส่งออกรายงานชีวิต PDF พรีเมียม",
      desc: "สร้างเอกสารรายงานวิเคราะห์ชีวิตฉบับเต็มความยาวกว่า 10 หน้า พร้อมการจัดหน้าสวยงามสำหรับส่งมอบให้ลูกค้า",
    },
  ];

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      {/* Header */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[#8C6D2D] dark:text-[#D9BC82] text-xs font-semibold uppercase tracking-wider mb-4">
          <AstralIcon name="portal" size="sm" />
          <span>PHOPEPHUM FEATURE ECOSYSTEM</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
          ฟีเจอร์และเครื่องมือทั้งหมดในระบบ
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          ออกแบบขึ้นอย่างประณีตเพื่อผสานภูมิปัญญาดึกดำบรรพ์เข้ากับวิถีชีวิตคนยุคใหม่ ใช้งานง่ายทั้งบนมือถือและคอมพิวเตอร์
        </p>
      </section>

      {/* Core Pillars */}
      <section className="pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {corePillars.map((item, idx) => (
            <div
              key={idx}
              className="p-7 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#8C6D2D] dark:text-[#C6A96B] flex items-center justify-center mb-5">
                  <AstralIcon name={item.icon} size="md" />
                </div>
                <h2 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-1">
                  {item.name}
                </h2>
                <p className="text-xs font-semibold text-[#8C6D2D] dark:text-[#C6A96B] mb-3">
                  {item.subtitle}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  {item.desc}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-100 dark:border-white/5">
                {item.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Professional Tools Section */}
      <section className="py-16 bg-slate-100/70 dark:bg-white/[0.02] border-y border-slate-200/80 dark:border-white/10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-[#8C6D2D] dark:text-[#C6A96B] uppercase tracking-wider">
              FOR PROFESSIONALS & MASTERS
            </span>
            <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] mt-2">
              เครื่องมือเฉพาะทางสำหรับโหราจารย์และผู้เชี่ยวชาญ
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {proFeatures.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#071120]/80">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#F8F6F1] mb-2">{f.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-20 text-center px-4 max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
          พร้อมใช้งานฟีเจอร์ทั้งหมดแล้วหรือยัง?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mb-8 max-w-xl mx-auto">
          เริ่มต้นได้ฟรีโดยไม่ต้องใช้บัตรเครดิต ปลดล็อกศักยภาพแห่งกาลเวลาของคุณวันนี้
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-xl shadow-[#C6A96B]/25 hover:scale-102 transition-all"
        >
          <span>เริ่มต้นใช้งานฟรี</span>
          <span>→</span>
        </Link>
      </section>

    </PublicLayout>
  );
}
