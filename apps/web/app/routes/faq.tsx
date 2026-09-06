import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { getUser } from "~/services/auth.server";
import type { Env } from "~/env.server";
import { PublicLayout } from "~/components/public/PublicLayout";
import { AstralIcon } from "~/components/ui/AstralIcon";

export const meta: MetaFunction = () => [
  { title: "คำถามที่พบบ่อย (FAQ) — PhopePhum (ภพภูมิ)" },
  {
    name: "description",
    content: "รวมคำตอบทุกข้อสงสัยเกี่ยวกับ PhopePhum: การเริ่มต้นใช้งาน, ความแม่นยำของปฏิทินไทย 100 ปี, แพ็กเกจสมาชิก, ละอองทรายกาลเวลา, และความปลอดภัยของข้อมูล",
  },
  { property: "og:title", content: "คำถามที่พบบ่อย (FAQ) — PhopePhum" },
  {
    property: "og:description",
    content: "คำตอบชัดเจนในทุกข้อสงสัยเกี่ยวกับการใช้งานและการบริการของภพภูมิ",
  },
  { property: "og:url", content: "https://phopephum.com/faq" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await getUser(request, env).catch(() => null);
  return json({ isLoggedIn: !!user });
}

export default function FaqPage() {
  const { isLoggedIn } = useLoaderData<typeof loader>();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = [
    { id: "all", label: "ทั้งหมด" },
    { id: "general", label: "การเริ่มต้นใช้งาน" },
    { id: "astrology", label: "ศาสตร์ & ความแม่นยำ" },
    { id: "pricing", label: "ราคา & ละอองทราย" },
    { id: "privacy", label: "ความปลอดภัย & ข้อมูล" },
  ];

  const faqItems = [
    {
      id: "gen-1",
      cat: "general",
      q: "ภพภูมิ (PhopePhum) คืออะไร และช่วยอะไรในชีวิตจริง?",
      a: "ภพภูมิคือระบบปฏิบัติการปัญญาและกาลเวลาชีวิต (Living Wisdom Operating System) ที่ช่วยให้คุณทราบจังหวะพลังงานของแต่ละวัน เลือกช่วงเวลาตัดสินใจสำคัญ (Golden Window) ทั้งการงาน การเงิน ความรัก และรับคำแนะนำเฉพาะตนจาก Wisdom AI เพื่อให้คุณใช้ชีวิตอย่างมีสติและไม่ประมาท",
    },
    {
      id: "gen-2",
      cat: "general",
      q: "จำเป็นต้องมีความรู้ด้านโหราศาสตร์มาก่อนหรือไม่?",
      a: "ไม่จำเป็นเลยครับ ระบบถูกออกแบบให้ใช้งานง่ายมาก โดยจะแปลงสูตรคำนวณที่ซับซ้อนให้กลายเป็นข้อความแนะนำที่เข้าใจง่าย เช่น บอกช่วงเวลามงคล กิจกรรมที่ควรทำ และสิ่งที่ควรระวังในแต่ละช่วงเวลา",
    },
    {
      id: "gen-3",
      cat: "general",
      q: "ใช้งานผ่านโทรศัพท์มือถือได้ไหม ต้องดาวน์โหลดแอปหรือไม่?",
      a: "ใช้งานผ่านเว็บบราวเซอร์บนมือถือได้ทันที 100% (Responsive Mobile Web) และยังสามารถกด 'Add to Home Screen' เพื่อเปิดใช้งานเสมือนแอปพลิเคชันได้โดยไม่ต้องดาวน์โหลดผ่าน App Store หรือ Play Store",
    },
    {
      id: "astro-1",
      cat: "astrology",
      q: "ปฏิทินจันทรคติไทย 100 ปีแท้คืออะไร และต่างจากแอปดูดวงทั่วไปอย่างไร?",
      a: "แอปดูดวงทั่วไปมักใช้ปฏิทินสากลสุริยคติ หรือปัดเศษวันแบบตะวันตก แต่ภพภูมิใช้ตารางคำนวณขึ้น-แรม อธิกมาส (เดือน ๘ สองหน) และอธิกวารตามคัมภีร์สุริยยาตร์ไทยโบราณแท้ 100 ปี ทำให้ตำแหน่งดาวและรหัสชะตาตรงตามความเป็นจริงของจันทรคติไทยอย่างแท้จริง",
    },
    {
      id: "astro-2",
      cat: "astrology",
      q: "หากเกิดช่วงหลังเที่ยงคืน (00:01 - 05:59 น.) ระบบนับเป็นวันไหน?",
      a: "ตามคติโหราศาสตร์ไทยแท้ จะเปลี่ยนวันใหม่เมื่อพระอาทิตย์ขึ้น (กฎตัดวัน 06:00 น.) ดังนั้นผู้ที่เกิดหลังเที่ยงคืนจนถึงก่อน 6 โมงเช้า ระบบจะนับเป็นวันเดิมตามหลักโหรไทย เพื่อความถูกต้องสูงสุดในการผูกดวง",
    },
    {
      id: "astro-3",
      cat: "astrology",
      q: "ยามอัฏฐกาล ๑๖ ยาม คำนวณอย่างไร?",
      a: "ระบบคำนวณเวลาพระอาทิตย์ขึ้นและพระอาทิตย์ตกจริงตามพิกัดและฤดูกาลในแต่ละวัน แล้วจึงแบ่งช่วงเวลา 8 ยามกลางวัน และ 8 ยามกลางคืน พร้อมระบุยามศุภโชค ยามปลอด และยามกาลกิณีอย่างแม่นยำ",
    },
    {
      id: "price-1",
      cat: "pricing",
      q: "แผนฟรี (Free Tier) มีค่าใช้จ่ายแอบแฝงหรือไม่?",
      a: "ไม่มีค่าใช้จ่ายแอบแฝงใดๆ ทั้งสิ้น สมาชิกสามารถใช้งานแดชบอร์ด ดูพลังงานวันนี้ และรับละอองทรายกาลเวลาฟรีทุกวันได้ตลอดชีพโดยไม่ต้องกรอกข้อมูลบัตรเครดิต",
    },
    {
      id: "price-2",
      cat: "pricing",
      q: "ละอองทรายกาลเวลา (Sands of Time) คืออะไร?",
      a: "เป็นระบบหน่วยพลังงานแบบ Micro-economy ที่เปิดโอกาสให้คุณปลดล็อกรายงานชีวิตเชิงลึกได้ตามการใช้งานจริง (เริ่มต้น 50 เม็ด = ฿59) โดยไม่ต้องผูกมัดค่าบริการรายเดือน สมาชิกทุกคนยังได้รับแจกทรายฟรีทุกวันผ่าน Daily Sands Reward อีกด้วย",
    },
    {
      id: "price-3",
      cat: "pricing",
      q: "สามารถยกเลิกแพ็กเกจสมาชิกรายเดือนได้ตลอดเวลาหรือไม่?",
      a: "คุณสามารถยกเลิกการต่ออายุแพ็กเกจรายเดือนได้ตลอดเวลาผ่านหน้าตั้งค่าโปรไฟล์ สิทธิ์การใช้งานจะคงอยู่จนครบกำหนดรอบบิลที่คุณชำระไว้",
    },
    {
      id: "priv-1",
      cat: "privacy",
      q: "ข้อมูลวันเดือนปีเกิดและเวลาตกฟากของฉันปลอดภัยแค่ไหน?",
      a: "ปลอดภัยสูงสุดด้วยระบบ Supabase Row Level Security (RLS) ที่แยกสิทธิ์ข้อมูลของสมาชิกแต่ละคนอย่างเด็ดขาด เข้ารหัสการเชื่อมต่อด้วย TLS 1.3 และปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) อย่างเคร่งครัด",
    },
    {
      id: "priv-2",
      cat: "privacy",
      q: "บทสนทนากับ Wisdom AI จะถูกนำไปเปิดเผยหรือเทรน AI หรือไม่?",
      a: "ไม่ถูกนำไปเผยแพร่และไม่ถูกนำไปใช้ฝึก (train) โมเดล AI สาธารณะ ข้อมูลสนทนาจะถูกส่งผ่าน AI Gateway ที่ปลอดภัยเพื่อประมวลผลคำตอบให้แก่คุณเท่านั้น",
    },
  ];

  const filteredFaqs = activeCategory === "all" ? faqItems : faqItems.filter((item) => item.cat === activeCategory);

  return (
    <PublicLayout isLoggedIn={isLoggedIn}>
      
      {/* Header */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[#8C6D2D] dark:text-[#D9BC82] text-xs font-semibold uppercase tracking-wider mb-4">
          <AstralIcon name="portal" size="sm" />
          <span>HELP CENTER & FAQ</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-[#F8F6F1] mb-4">
          คำถามที่พบบ่อย (FAQ)
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
          คำตอบชัดเจนในทุกมิติ ทั้งการใช้งาน ความแม่นยำของศาสตร์ แพ็กเกจสมาชิก และความปลอดภัย
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeCategory === cat.id
                  ? "bg-gradient-to-r from-[#C6A96B] to-[#D9BC82] text-[#020617] shadow-md shadow-[#C6A96B]/20"
                  : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ Items */}
      <section className="pb-20 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="space-y-4">
          {filteredFaqs.map((faq) => {
            const isOpen = !!openItems[faq.id];
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/[0.03] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-display font-bold text-base text-slate-900 dark:text-[#F8F6F1] hover:text-[#8C6D2D] dark:hover:text-[#C6A96B] transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`text-xl transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-14 p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-center">
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-[#F8F6F1] mb-2">
            ยังมีคำถามอื่นๆ ที่ไม่พบคำตอบ?
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            ทีมงานและผู้เชี่ยวชาญด้านระบบของเราพร้อมให้ความช่วยเหลือตลอดเวลา
          </p>
          <a
            href="mailto:support@phopephum.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <span>ติดต่อฝ่ายสนับสนุน support@phopephum.com</span>
            <span>→</span>
          </a>
        </div>
      </section>

    </PublicLayout>
  );
}
