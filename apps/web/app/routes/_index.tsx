import type { MetaFunction } from "@remix-run/cloudflare";
import { ThemeToggle } from "~/components/ThemeToggle";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "ภพภูมิ — PhopePhum | Wisdom Guidance ที่ปรึกษาชีวิตส่วนตัวขับเคลื่อนด้วย AI" },
  { name: "description", content: "ภพภูมิ (PhopePhum) ที่ปรึกษาชีวิตส่วนตัว อ่านพลังงานวัน เข้าใจเส้นทางชีวิต และรับคำแนะนำจาก Wisdom AI ที่เข้าใจชะตาคุณ เริ่มฟรี ไม่ต้องใช้บัตรเครดิต" },

  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com" },
  { property: "og:title", content: "ภพภูมิ — PhopePhum | Wisdom Guidance ที่ปรึกษาชีวิตส่วนตัว" },
  { property: "og:description", content: "อ่านพลังงานวัน เข้าใจเส้นทางชีวิต รับคำแนะนำจาก Wisdom AI ส่วนตัว" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },

  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:url", content: "https://phopephum.com" },
  { name: "twitter:title", content: "ภพภูมิ — PhopePhum | Wisdom Guidance" },
  { name: "twitter:description", content: "ที่ปรึกษาชีวิตส่วนตัวขับเคลื่อนด้วยภูมิปัญญาโบราณและ AI" },
  { name: "twitter:image", content: "https://phopephum.com/favicon.svg" },

  { name: "keywords", content: "ภพภูมิ, PhopePhum, Wisdom Guidance, ที่ปรึกษาชีวิต, ดูดวง, เส้นทางชีวิต, พลังงานวัน, ดวงชาตา, AI ดูดวง, วางแผนชีวิต" },
  { name: "author", content: "Wisdom Guidance" },
];

const STARS = [
  { x: 8,  y: 12, s: 1.5, delay: 0,   blue: false },
  { x: 20, y: 5,  s: 1,   delay: 0.8, blue: true  },
  { x: 35, y: 18, s: 1,   delay: 1.6, blue: false },
  { x: 55, y: 6,  s: 2,   delay: 0.4, blue: false },
  { x: 72, y: 14, s: 1,   delay: 2.1, blue: true  },
  { x: 85, y: 8,  s: 1.5, delay: 1.2, blue: false },
  { x: 92, y: 22, s: 1,   delay: 0.6, blue: true  },
  { x: 6,  y: 40, s: 1,   delay: 1.9, blue: false },
  { x: 15, y: 65, s: 1.5, delay: 0.3, blue: true  },
  { x: 78, y: 55, s: 1,   delay: 2.4, blue: false },
  { x: 90, y: 70, s: 2,   delay: 0.9, blue: false },
  { x: 48, y: 82, s: 1,   delay: 1.5, blue: true  },
  { x: 28, y: 88, s: 1.5, delay: 0.2, blue: false },
  { x: 65, y: 90, s: 1,   delay: 1.1, blue: true  },
  { x: 3,  y: 80, s: 1,   delay: 2.0, blue: false },
  { x: 42, y: 30, s: 1,   delay: 0.7, blue: true  },
  { x: 60, y: 42, s: 1.5, delay: 1.3, blue: false },
  { x: 95, y: 48, s: 1,   delay: 0.5, blue: true  },
];

const FEATURES = [
  {
    icon: "✦",
    title: "รู้จักตัวเองลึกขึ้น",
    desc: "เข้าใจรหัสชะตาตนเอง บุคลิก จุดแข็ง และทิศทางชีวิตที่เหมาะกับคุณ จากวันเดือนปีเกิด",
  },
  {
    icon: "◈",
    title: "Wisdom AI ส่วนตัว",
    desc: "ที่ปรึกษา AI ที่เข้าใจชะตาคุณ ถามได้ทุกเรื่องชีวิต ความรัก การงาน และการตัดสินใจ",
  },
  {
    icon: "☽",
    title: "พลังงานแห่งวัน",
    desc: "อ่านพลังงานและจังหวะชีวิตประจำวัน real-time เพื่อเลือกเวลาที่ใช่สำหรับทุกสิ่ง",
  },
  {
    icon: "⊕",
    title: "เส้นทางชีวิต",
    desc: "ดูวาระสำคัญ ช่วงเวลาก้าวหน้า และทิศทางชีวิตในแต่ละช่วงอายุอย่างละเอียด",
  },
  {
    icon: "⟁",
    title: "บันทึก & วางแผน",
    desc: "จดบันทึกเจตนา ตั้งเป้าหมาย และสะท้อนความก้าวหน้าของชีวิตในแต่ละวัน",
  },
  {
    icon: "⌘",
    title: "ปฏิทินพลังงาน",
    desc: "ดูพลังงานล่วงหน้า 7 วัน เพื่อวางแผนการตัดสินใจสำคัญในช่วงเวลาที่เหมาะสม",
  },
];

const STEPS = [
  { num: "01", title: "สมัครฟรี 1 นาที", desc: "ใส่ชื่อและอีเมล เริ่มต้นได้ทันทีโดยไม่ต้องใช้บัตรเครดิต" },
  { num: "02", title: "กรอกวันเกิด", desc: "วัน เดือน ปี และเวลาเกิด (ถ้ามี) เพื่อความแม่นยำสูงสุด" },
  { num: "03", title: "รับคำแนะนำทันที", desc: "Wisdom AI วิเคราะห์ชะตาคุณและพร้อมตอบทุกคำถามแบบ real-time" },
];

const TESTIMONIALS = [
  { name: "คุณสุรีย์", role: "นักธุรกิจ", text: "ใช้ Wisdom AI ช่วยตัดสินใจก่อนทำสัญญาสำคัญ ผลออกมาดีกว่าที่คิดมาก แนะนำสำหรับคนที่ต้องตัดสินใจบ่อยๆ" },
  { name: "คุณมาลี", role: "แม่บ้านนักลงทุน", text: "อ่านเส้นทางชีวิตแล้วรู้สึกว่าเข้าใจตัวเองมากขึ้น ช่วยให้วางแผนชีวิตได้ดีขึ้นจริงๆ" },
  { name: "คุณวิชัย", role: "ฟรีแลนซ์", text: "ชอบฟีเจอร์พลังงานวันมาก ใช้ดูว่าวันไหนควรเริ่มงานใหม่หรือเจรจา ได้ผลดีมาก" },
];

const SCHEMA_MARKUP = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://phopephum.com/#organization",
      "name": "ภพภูมิ - PhopePhum",
      "url": "https://phopephum.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://phopephum.com/favicon.svg",
        "width": "100",
        "height": "100"
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://phopephum.com/#website",
      "url": "https://phopephum.com",
      "name": "ภพภูมิ - PhopePhum",
      "publisher": { "@id": "https://phopephum.com/#organization" },
      "description": "Wisdom Guidance Operating System — ที่ปรึกษาชีวิตส่วนตัวขับเคลื่อนด้วยภูมิปัญญาโบราณและ AI",
    },
    {
      "@type": "FAQPage",
      "@id": "https://phopephum.com/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "ภพภูมิ (PhopePhum) คืออะไร?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ภพภูมิ คือ Wisdom Guidance Operating System ที่ปรึกษาชีวิตส่วนตัวขับเคลื่อนด้วยภูมิปัญญาโบราณและ AI ช่วยให้คุณเข้าใจตัวเอง รู้จักเส้นทางชีวิต และตัดสินใจถูกเวลา"
          }
        },
        {
          "@type": "Question",
          "name": "ใช้ฟรีได้อะไรบ้าง?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "สมาชิกฟรีสามารถดู Dashboard พลังงานวันนี้ ข้อมูลชาตาส่วนตัว และใช้ Wisdom AI ได้ในระดับเบื้องต้น"
          }
        },
        {
          "@type": "Question",
          "name": "ข้อมูลส่วนตัวปลอดภัยหรือไม่?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ข้อมูลวันเกิดของคุณถูกเข้ารหัสและไม่ถูกเปิดเผยต่อสาธารณะ ระบบพัฒนาโดย PhopePhum บน Cloudflare infrastructure ที่ปลอดภัยระดับสูง"
          }
        }
      ]
    }
  ]
};

export default function Index() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "var(--bg-base)" }}>

      {/* ── Stars background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[700px] h-[700px] -top-60 -left-60 rounded-full animate-aura-pulse"
          style={{ background: "radial-gradient(circle, rgba(75,111,174,0.14) 0%, transparent 65%)" }} />
        <div className="absolute w-[500px] h-[500px] -bottom-32 -right-32 rounded-full animate-aura-pulse"
          style={{ background: "radial-gradient(circle, rgba(109,143,199,0.10) 0%, transparent 65%)", animationDelay: "2.5s" }} />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 40% at 50% 20%, rgba(232,196,106,0.06) 0%, transparent 70%)" }} />
        {STARS.map((star, i) => (
          <div key={i} className="absolute rounded-full animate-twinkle"
            style={{
              left: `${star.x}%`, top: `${star.y}%`,
              width: `${star.s}px`, height: `${star.s}px`,
              background: star.blue ? "#9AB3D9" : "#D9BC82",
              animationDelay: `${star.delay}s`,
            }} />
        ))}
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 flex items-center justify-center transition-transform group-hover:rotate-90 duration-700">
            <div className="absolute inset-0 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/5" />
            <span className="text-[#C6A96B] text-[10px] font-bold z-10 font-display">P</span>
            <div className="absolute inset-0 opacity-20">
               <svg viewBox="0 0 40 40" fill="none">
                 <circle cx="20" cy="20" r="18" stroke="#C6A96B" strokeWidth="0.5" strokeDasharray="2 2" />
               </svg>
            </div>
          </div>
          <span className="font-display text-[#F8F6F1] font-bold text-lg tracking-wide group-hover:text-[#C6A96B] transition-colors">PhopePhum</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm text-[#94A3B8]">
          <Link to="/pricing" className="hover:text-[#C6A96B] transition-colors">ราคา</Link>
          <a href="#features" className="hover:text-[#C6A96B] transition-colors">ฟีเจอร์</a>
          <a href="#how" className="hover:text-[#C6A96B] transition-colors">วิธีใช้</a>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link to="/login" className="text-sm text-[#94A3B8] hover:text-[#F8F6F1] transition-colors px-2">
            เข้าสู่ระบบ
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center max-w-4xl mx-auto px-4 pt-10 pb-24">
        <div className="flex justify-center mb-8 animate-float">
          <LogoSymbol />
        </div>

        <p className="text-[#D9BC82] text-[9px] tracking-[0.4em] uppercase mb-4 animate-fade-up"
          style={{ animationDelay: "0.1s" }}>
          Wisdom Guidance Operating System
        </p>

        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#F8F6F1] glow-gold mb-4 animate-fade-up leading-tight"
          style={{ animationDelay: "0.2s" }}>
          PhopePhum
        </h1>

        <p className="font-cormorant text-[#9AB3D9] text-2xl sm:text-3xl md:text-4xl italic mb-1 animate-fade-up"
          style={{ animationDelay: "0.28s" }}>
          เพื่อนผู้ทรงปัญญา
        </p>
        <p className="font-display text-[#D9BC82] text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide mb-6 animate-fade-up"
          style={{ animationDelay: "0.32s" }}>
          ที่นำทางชีวิตคุณ
        </p>

        <p className="text-[#94A3B8] text-base md:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-up"
          style={{ animationDelay: "0.38s" }}>
          รับคำแนะนำส่วนตัวจาก Wisdom AI อ่านพลังงานวัน<br />
          และเข้าใจเส้นทางชีวิตจากภูมิปัญญาโบราณที่ถูกปลุกชีพด้วย AI
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up"
          style={{ animationDelay: "0.44s" }}>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-bold text-[#020617] shadow-lg shadow-[#C6A96B]/25 transition-all hover:scale-105 active:scale-95 text-base"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
          >
            เริ่มต้นใช้งาน ฟรี →
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-medium border border-[#C6A96B]/40 text-[#D9BC82] hover:bg-[#C6A96B]/10 hover:border-[#C6A96B]/70 transition-all text-base"
          >
            เข้าสู่ระบบ
          </Link>
        </div>

        <p className="text-[#94A3B8]/50 text-xs mt-5 animate-fade-up" style={{ animationDelay: "0.52s" }}>
          ฟรีตลอดชีพ · ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ทุกเมื่อ
        </p>

        <div className="flex items-center justify-center gap-3 mt-14 animate-fade-up" style={{ animationDelay: "0.56s" }}>
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-[#C6A96B]/30" />
          <span className="text-[#C6A96B]/50 text-xs">✦</span>
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-[#C6A96B]/30" />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">สิ่งที่คุณจะได้รับ</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1] mb-3">
            ครบทุกสิ่งที่ชีวิตต้องการ
          </h2>
          <p className="text-[#94A3B8] text-base max-w-md mx-auto">
            ที่ปรึกษาชีวิตส่วนตัวที่เข้าใจคุณ ใช้งานได้ทันที
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="rounded-2xl border border-white/5 p-6 transition-all duration-300 hover:border-[#C6A96B]/20 group"
              style={{ backdropFilter: "blur(20px)", background: "var(--card-dark-bg)" }}>
              <div className="text-[#C6A96B] text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-display text-[#F8F6F1] font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">เริ่มต้นง่ายมาก</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1]">
            3 ขั้นตอน พร้อมใช้งาน
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div key={step.num} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 mx-auto"
                style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(198,169,107,0.3)" }}>
                <span className="font-display text-[#C6A96B] font-bold text-lg">{step.num}</span>
              </div>
              <h3 className="font-display text-[#F8F6F1] font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">เสียงจากผู้ใช้</p>
          <h2 className="font-display text-3xl font-bold text-[#F8F6F1]">ผู้ใช้พูดว่าอะไร</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name}
              className="rounded-2xl border border-white/5 p-6"
              style={{ backdropFilter: "blur(20px)", background: "var(--card-dark-bg)" }}>
              <p className="text-[#C6A96B] text-lg mb-3">"</p>
              <p className="text-[#D9CDB7] text-sm leading-relaxed mb-4">{t.text}</p>
              <div className="border-t border-white/5 pt-3">
                <p className="text-[#F8F6F1] text-sm font-semibold">{t.name}</p>
                <p className="text-[#94A3B8] text-xs">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="relative z-10 max-w-2xl mx-auto px-4 py-16">
        <div className="rounded-3xl border border-[#C6A96B]/20 p-10 text-center"
          style={{ backdropFilter: "blur(24px)", background: "rgba(198,169,107,0.05)", boxShadow: "0 0 80px rgba(198,169,107,0.08)" }}>
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">แผนราคา</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1] mb-2">
            เริ่มต้น ฿0
          </h2>
          <p className="text-[#94A3B8] text-sm mb-1">
            อัปเกรดเต็มประสิทธิภาพเพียง
          </p>
          <p className="font-display text-[#D9BC82] text-2xl font-bold mb-6">
            ฿159 / เดือน
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-bold text-[#020617] transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
            >
              เริ่มต้นใช้งาน ฟรี
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-medium border border-white/15 text-[#94A3B8] hover:border-[#C6A96B]/40 hover:text-[#D9BC82] transition-all"
            >
              ดูรายละเอียดแผน →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 mt-8 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#C6A96B] text-sm">✦</span>
            <span className="font-display text-[#F8F6F1] font-bold">PhopePhum</span>
            <span className="text-[#94A3B8] text-xs ml-2">Wisdom Guidance OS</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#94A3B8]">
            <Link to="/pricing" className="hover:text-[#C6A96B] transition-colors">ราคา</Link>
            <Link to="/login" className="hover:text-[#C6A96B] transition-colors">เข้าสู่ระบบ</Link>
            <Link to="/register" className="hover:text-[#C6A96B] transition-colors">สมัครสมาชิก</Link>
          </div>
          <p className="text-[#94A3B8]/40 text-[10px]">© 2025 PhopePhum · Wisdom Guidance OS</p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA_MARKUP) }}
      />

    </div>
  );
}

function LogoSymbol() {
  return (
    <div className="relative">
      <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="35" fill="url(#logo-glow)" opacity="0.4" />
        <defs>
          <radialGradient id="logo-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(35)">
            <stop stopColor="#C6A96B" stopOpacity="0.3" />
            <stop offset="1" stopColor="#C6A96B" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[0, 45, 90, 135].map((deg) => (
          <ellipse key={`o-${deg}`} cx="50" cy="50" rx="9" ry="32"
            stroke="#C6A96B" strokeWidth="0.8" fill="none" opacity="0.5"
            transform={`rotate(${deg} 50 50)`} />
        ))}
        {[22.5, 67.5, 112.5, 157.5].map((deg) => (
          <ellipse key={`i-${deg}`} cx="50" cy="50" rx="6" ry="24"
            stroke="#6D8FC7" strokeWidth="0.6" fill="none" opacity="0.35"
            transform={`rotate(${deg} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="14" stroke="#C6A96B" strokeWidth="0.5" fill="rgba(2, 6, 23, 0.8)" />
        <circle cx="50" cy="50" r="12" stroke="#D9BC82" strokeWidth="1" fill="none" opacity="0.8" />
        <text x="50" y="58" font-family="Cinzel, serif" font-size="22" font-weight="bold" text-anchor="middle" fill="#F8F6F1" className="drop-shadow-sm">P</text>
        {([[50,38],[62,50],[50,62],[38,50]] as [number,number][]).map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="1" fill="#C6A96B" opacity="0.6" />
        ))}
      </svg>
    </div>
  );
}
