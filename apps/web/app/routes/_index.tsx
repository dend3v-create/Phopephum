import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "ภพภูมิ — PhopePhum | ระบบปฏิบัติการนำทางชีวิตด้วยยามมงคลอัฏฐกาลและเลข 7 ตัว 9 ฐาน" },
  { name: "description", content: "ภพภูมิ (PhopePhum) ระบบปฏิบัติการจัดการชีวิตและคำนวณยามมงคลระดับนาทีด้วยศาสตร์ยามอัฏฐกาลโบราณ, เลข 7 ตัว 9 ฐาน และผังดวงจักรพรรดิ ตรวจสอบฤกษ์มงคล ค้นทรัพย์ และเจรจาได้แบบเรียลไทม์" },
  
  // Open Graph / Facebook
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://phopephum.com" },
  { property: "og:title", content: "ภพภูมิ — PhopePhum | ระบบนำทางชีวิตด้วยยามมงคลอัฏฐกาลและเลข 7 ตัว 9 ฐาน" },
  { property: "og:description", content: "คำนวณฤกษ์มงคล ยามราหูค้นทรัพย์ และชะตาชีวิตระดับนาทีด้วยสูตรโบราณดั้งเดิม พร้อมบทวิเคราะห์ชะตาชีวิตเชิงลึก" },
  { property: "og:image", content: "https://phopephum.com/favicon.svg" },

  // Twitter
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:url", content: "https://phopephum.com" },
  { name: "twitter:title", content: "ภพภูมิ — PhopePhum | ระบบนำทางชีวิตด้วยยามมงคลอัฏฐกาล" },
  { name: "twitter:description", content: "คำนวณฤกษ์มงคล ยามราหูค้นทรัพย์ และชะตาชีวิตระดับนาทีด้วยสูตรโบราณดั้งเดิม" },
  { name: "twitter:image", content: "https://phopephum.com/favicon.svg" },

  // AEO / GEO / SEO Directives
  { name: "keywords", content: "ภพภูมิ, PhopePhum, ยามอัฏฐกาล, ยามราหูค้นทรัพย์, เลข 7 ตัว 9 ฐาน, ผังดวงจักรพรรดิ, ดูดวง, ฤกษ์มงคล, ตรวจดวงชะตา, พยากรณ์ชีวิต, ตารางยามรายวัน, ศาสตร์โบราณ" },
  { name: "author", content: "ครูเด่น มาสเตอร์ฟา" },
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
    icon: "☽",
    title: "ยามอัฏฐกาลสด",
    desc: "คำนวณยามปัจจุบันแบบ real-time พร้อม countdown ถึงยามถัดไป ใช้สูตรโบราณดั้งเดิมที่แม่นยำระดับนาที",
  },
  {
    icon: "✦",
    title: "เลข 7 ตัว 9 ฐาน",
    desc: "ระบบคำนวณดวงชะตาเชิงลึกด้วยเลขฐาน 1-7 จากวัน เดือน ปีนักษัตร ตามศาสตร์ไทยแท้",
  },
  {
    icon: "⊕",
    title: "ผังดวงจักรพรรดิ",
    desc: "Emperor Chart คำนวณจักรกำเนิด วัยจร ปีจร และทิศทางชีวิตทุกช่วงอายุในรูปแบบหรูหราพรีเมียม",
  },
  {
    icon: "◈",
    title: "บทวิเคราะห์ชีวิต",
    desc: "บทวิเคราะห์ชีวิตเชิงลึก 6 ประเภท โดยผู้ทรงปัญญาแห่งศาสตร์ไทยโบราณ นำพาให้เข้าใจตนเองและเส้นทางชีวิต",
  },
  {
    icon: "⟁",
    title: "TQM Planner",
    desc: "วางแผนชีวิตสอดคล้องกับยามมงคลประจำวัน ตั้งเจตนา ลำดับความสำคัญ และสะท้อนความสำเร็จ",
  },
  {
    icon: "⌘",
    title: "ปฏิทิน 100 ปี",
    desc: "ฐานข้อมูลจันทรคติไทยครบถ้วน 121 ปี คำนวณด้วย Meeus Algorithm ±2 นาที จาก CE 1920–2040",
  },
];

const STEPS = [
  { num: "01", title: "ลงทะเบียนฟรี", desc: "ใส่ชื่อและอีเมล เริ่มต้นได้ทันทีโดยไม่ต้องใช้บัตรเครดิต" },
  { num: "02", title: "กรอกวันเกิด", desc: "วัน เดือน ปี และเวลาเกิด (ถ้ามี) เพื่อความแม่นยำสูงสุด" },
  { num: "03", title: "รับผลทันที", desc: "ระบบคำนวณดวงชะตาและยามมงคลให้คุณแบบ real-time ทันที" },
];

const TESTIMONIALS = [
  { name: "คุณสุรีย์", role: "นักธุรกิจ", text: "ใช้ยามอัฏฐกาลเลือกวันทำสัญญาสำคัญ ผลออกมาดีกว่าที่คิดมาก แนะนำสำหรับผู้ที่เชื่อในศาสตร์ไทย" },
  { name: "คุณมาลี", role: "แม่บ้านนักลงทุน", text: "บทวิเคราะห์ดวงได้ละเอียดมาก อ่านแล้วรู้สึกว่าเข้าใจตัวเองมากขึ้น ข้อมูลครบและหรูหรา" },
  { name: "คุณวิชัย", role: "โหรสมัครเล่น", text: "เลข 7 ตัวแม่นยำตามตำราที่เคยศึกษามา ระบบปฏิทินจันทรคติครบถ้วนมาก ใช้อ้างอิงได้เลย" },
];

const SCHEMA_MARKUP = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://phopephum.com/#person",
      "name": "ครูเด่น มาสเตอร์ฟา",
      "alternateName": "Kru Den Master Fa",
      "jobTitle": "Senior Digital SaaS Architect & Astro-Sage",
      "description": "ผู้เชี่ยวชาญด้านสถาปัตยกรรมเทคโนโลยีดิจิทัลและโหราศาสตร์โบราณ ผู้พัฒนาศาสตร์ระบบปฏิบัติการนำทางชีวิต ภพภูมิ (PhopePhum)",
      "url": "https://phopephum.com",
      "knowsAbout": [
        "โหราศาสตร์ไทยโบราณ",
        "ยามอัฏฐกาล",
        "เลข 7 ตัว 9 ฐาน",
        "ผังดวงจักรพรรดิ",
        "Digital Architecture",
        "SaaS Architecture"
      ]
    },
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
      "founder": {
        "@id": "https://phopephum.com/#person"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://phopephum.com/#website",
      "url": "https://phopephum.com",
      "name": "ภพภูมิ - PhopePhum",
      "publisher": {
        "@id": "https://phopephum.com/#organization"
      },
      "description": "ระบบปฏิบัติการจัดการชีวิตด้วยยามมงคลอัฏฐกาลและเลข 7 ตัว 9 ฐาน"
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
            "text": "ภพภูมิ คือระบบปฏิบัติการนำทางและจัดการชีวิตอัจฉริยะ (Living Wisdom OS) ที่ผสานการคำนวณยามมงคลโบราณระดับนาทีด้วยยามอัฏฐกาล, ยามราหูค้นทรัพย์, เลข 7 ตัว 9 ฐาน, และผังดวงจักรพรรดิ"
          }
        },
        {
          "@type": "Question",
          "name": "ยามอัฏฐกาลโบราณคำนวณอย่างไร?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ยามอัฏฐกาลคำนวณตามตำราดั้งเดิม โดยการแบ่งเวลาช่วงกลางวันและกลางคืนออกเป็น 8 ช่วงย่อย (รวม 16 ยามย่อย) อ้างอิงจากตำแหน่งดวงดาวจริงและกฎจันทรคติไทยแท้เพื่อค้นหาฤกษ์มงคลระดับนาที"
          }
        },
        {
          "@type": "Question",
          "name": "การตรวจดวงชะตาด้วยระบบ PhopePhum ปลอดภัยหรือไม่?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ระบบวิเคราะห์ชีวิตของภพภูมิ มีความปลอดภัยสูงสุด ใช้ข้อมูลดวงเกิดของท่านเพื่อการผูกดวงเฉพาะบุคคลโดยไม่เปิดเผยหรือเก็บข้อมูลส่วนตัวของท่านในรูปแบบสาธารณะ พัฒนาและควบคุมระบบโดยครูเด่น มาสเตอร์ฟา"
          }
        }
      ]
    }
  ]
};

export default function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#020617" }}>

      {/* ── Stars background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[300px] sm:w-[700px] h-[300px] sm:h-[700px] -top-20 sm:-top-60 -left-20 sm:-left-60 rounded-full animate-aura-pulse opacity-50 sm:opacity-100"
          style={{ background: "radial-gradient(circle, rgba(75,111,174,0.14) 0%, transparent 65%)" }} />
        <div className="absolute w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] -bottom-16 sm:-bottom-32 -right-16 sm:-right-32 rounded-full animate-aura-pulse opacity-40 sm:opacity-100"
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
      <nav className="relative z-50 flex items-center justify-between px-4 sm:px-6 py-4 max-w-6xl mx-auto backdrop-blur-md sm:backdrop-blur-none">
        {/* Logo */}
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

        {/* Mobile menu button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-[#C6A96B] hover:bg-[#C6A96B]/10 rounded-lg transition-colors"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-6 text-sm text-[#94A3B8]">
          <Link to="/pricing" className="hover:text-[#C6A96B] transition-colors">แผนสมาชิก</Link>
          <a href="#features" className="hover:text-[#C6A96B] transition-colors">ฟีเจอร์</a>
          <a href="#how" className="hover:text-[#C6A96B] transition-colors">วิธีใช้</a>
          <Link to="/login" className="px-5 py-2 rounded-full border border-[#C6A96B]/30 text-[#D9BC82] hover:bg-[#C6A96B]/10 transition-all ml-2 text-xs font-medium">เข้าสู่ระบบ</Link>
        </div>
      </nav>

      {/* ── Mobile menu overlay ── */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#020617]/95 backdrop-blur-xl md:hidden animate-fade-up">
          <div className="flex flex-col items-center justify-center h-full gap-8 p-6 text-center">
            <Link to="/pricing" onClick={() => setIsMenuOpen(false)} className="text-2xl font-display text-[#F8F6F1] hover:text-[#C6A96B]">แผนสมาชิก</Link>
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-2xl font-display text-[#F8F6F1] hover:text-[#C6A96B]">ฟีเจอร์</a>
            <a href="#how" onClick={() => setIsMenuOpen(false)} className="text-2xl font-display text-[#F8F6F1] hover:text-[#C6A96B]">วิธีใช้</a>
            <div className="w-full h-px bg-[#C6A96B]/20 max-w-[100px]" />
            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-xl font-medium text-[#D9BC82]">เข้าสู่ระบบ</Link>
            <Link 
              to="/register" 
              onClick={() => setIsMenuOpen(false)} 
              className="w-full max-w-xs py-4 rounded-full font-bold text-[#020617] text-lg shadow-xl shadow-[#C6A96B]/20"
              style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
            >
              เริ่มต้นใช้งาน ฟรี
            </Link>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative z-10 text-center max-w-4xl mx-auto px-4 pt-10 sm:pt-16 pb-20 sm:pb-32">
        <div className="flex justify-center mb-6 sm:mb-10 animate-float">
          <div className="scale-75 sm:scale-100 transition-transform">
            <LogoSymbol />
          </div>
        </div>

        <p className="text-[#D9BC82] text-[8px] sm:text-[10px] tracking-[0.4em] uppercase mb-4 animate-fade-up opacity-80"
          style={{ animationDelay: "0.1s" }}>
          Living Wisdom Operating System
        </p>

        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#F8F6F1] glow-gold mb-4 animate-fade-up leading-[1.1] sm:leading-tight px-2"
          style={{ animationDelay: "0.2s" }}>
          PhopePhum
        </h1>

        <div className="mb-8 animate-fade-up" style={{ animationDelay: "0.28s" }}>
          <p className="font-cormorant text-[#9AB3D9] text-xl sm:text-3xl md:text-4xl italic mb-1">
            เปิดประตูสู่อนาคตด้วย
          </p>
          <p className="font-display text-[#D9BC82] text-lg sm:text-2xl md:text-3xl font-semibold tracking-wide">
            ศาสตร์ยามอัฏฐกาลชั้นสูง
          </p>
        </div>

        <p className="text-[#94A3B8] text-sm sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-10 sm:mb-12 animate-fade-up px-4"
          style={{ animationDelay: "0.38s" }}>
          คำนวณยามมงคลและชะตาจรระดับนาทีด้วยสูตรโบราณดั้งเดิม<br className="hidden sm:block" />
          พร้อมบทวิเคราะห์ดวงชะตาเชิงลึก ส่งรายงานวิเคราะห์ชีวิตสู่มือคุณ
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up px-6 sm:px-0"
          style={{ animationDelay: "0.44s" }}>
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-bold text-[#020617] shadow-lg shadow-[#C6A96B]/25 transition-all hover:scale-105 active:scale-95 text-base"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
          >
            เริ่มต้นใช้งาน ฟรี →
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-medium border border-[#C6A96B]/40 text-[#D9BC82] hover:bg-[#C6A96B]/10 hover:border-[#C6A96B]/70 transition-all text-base backdrop-blur-sm"
          >
            เข้าสู่ระบบ
          </Link>
        </div>

        {/* Trust line */}
        <p className="text-[#94A3B8]/50 text-[10px] sm:text-xs mt-6 animate-fade-up" style={{ animationDelay: "0.52s" }}>
          ฟรีตลอดชีพ · ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ทุกเมื่อ
        </p>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 mt-14 sm:mt-20 animate-fade-up" style={{ animationDelay: "0.56s" }}>
          <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#C6A96B]/30" />
          <span className="text-[#C6A96B]/50 text-xs">✦</span>
          <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#C6A96B]/30" />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">ฟีเจอร์หลัก</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8F6F1] mb-3">
            ทุกศาสตร์ที่คุณต้องการ
          </h2>
          <p className="text-[#94A3B8] text-sm sm:text-base max-w-md mx-auto px-4">
            รวมทุกเครื่องมือโหราศาสตร์ไทยในที่เดียว ใช้งานได้ทันทีบนมือถือทุกที่ทุกเวลา
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="rounded-2xl border border-white/5 p-6 sm:p-8 transition-all duration-300 hover:border-[#C6A96B]/20 group card-glass overflow-hidden"
              style={{ background: "rgba(10,34,64,0.35)" }}>
              <div className="text-[#C6A96B] text-3xl mb-5 group-hover:scale-110 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-display text-[#F8F6F1] font-semibold text-lg sm:text-xl mb-3">{f.title}</h3>
              <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed opacity-80">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-20">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">วิธีเริ่มต้น</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8F6F1]">
            เริ่มใช้ใน 3 ขั้นตอน
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12">
          {STEPS.map((step) => (
            <div key={step.num} className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 mx-auto transition-transform group-hover:scale-110 duration-300"
                style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(198,169,107,0.3)", boxShadow: "0 0 20px rgba(198,169,107,0.05)" }}>
                <span className="font-display text-[#C6A96B] font-bold text-xl">{step.num}</span>
              </div>
              <h3 className="font-display text-[#F8F6F1] font-semibold text-xl mb-3">{step.title}</h3>
              <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed opacity-70 px-6">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">เสียงจากผู้ใช้</p>
          <h2 className="font-display text-3xl font-bold text-[#F8F6F1]">ผู้ใช้พูดว่าอะไร</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name}
              className="rounded-2xl border border-white/5 p-6 sm:p-8 card-glass"
              style={{ background: "rgba(10,34,64,0.3)" }}>
              <p className="text-[#C6A96B] text-2xl mb-4">"</p>
              <p className="text-[#D9CDB7] text-sm leading-relaxed mb-6 italic opacity-90">{t.text}</p>
              <div className="border-t border-white/10 pt-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C6A96B]/10 flex items-center justify-center text-[#C6A96B] text-[10px] font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[#F8F6F1] text-xs font-semibold">{t.name}</p>
                  <p className="text-[#94A3B8] text-[10px] tracking-wider uppercase">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="relative z-10 max-w-3xl mx-auto px-4 py-16 sm:py-32 text-center">
        <div className="rounded-3xl border border-[#C6A96B]/20 p-8 sm:p-14 overflow-hidden relative"
          style={{ backdropFilter: "blur(24px)", background: "rgba(198,169,107,0.05)", boxShadow: "0 0 80px rgba(198,169,107,0.08)" }}>
          
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] bg-[#C6A96B]/10 pointer-events-none" />
          
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-4">แผนราคา</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8F6F1] mb-4">
            เริ่มต้น ฿0 ตลอดชีพ
          </h2>
          <p className="text-[#94A3B8] text-sm sm:text-base mb-10 max-w-md mx-auto opacity-80">
            ใช้งานระบบปฏิบัติการนำทางชีวิตได้ฟรี ไม่มีวันหมดอายุ พร้อมสถิติแบบเรียลไทม์
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-full font-bold text-[#020617] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#C6A96B]/20"
              style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
            >
              เริ่มต้นใช้งาน ฟรี
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-full font-medium border border-white/10 text-[#94A3B8] hover:border-[#C6A96B]/40 hover:text-[#D9BC82] transition-all backdrop-blur-sm"
            >
              ดูแผนทั้งหมด →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 mt-12 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center sm:items-start gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[#C6A96B] text-sm">✦</span>
              <span className="font-display text-[#F8F6F1] font-bold text-xl">PhopePhum</span>
            </div>
            <p className="text-[#94A3B8]/60 text-xs tracking-widest uppercase">Living Wisdom OS</p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-xs text-[#94A3B8]">
            <Link to="/pricing" className="hover:text-[#C6A96B] transition-colors">แผนสมาชิก</Link>
            <Link to="/login" className="hover:text-[#C6A96B] transition-colors">เข้าสู่ระบบ</Link>
            <Link to="/register" className="hover:text-[#C6A96B] transition-colors">สมัครสมาชิก</Link>
            <Link to="/terms" className="hover:text-[#C6A96B] transition-colors">เงื่อนไข</Link>
          </div>
          
          <div className="text-center sm:text-right">
            <p className="text-[#94A3B8]/40 text-[10px]">© 2025 PhopePhum · ศาสตร์ไทยแท้ดั้งเดิม</p>
            <p className="text-[#C6A96B]/30 text-[9px] mt-1 tracking-tighter">Crafted with Astral Intent</p>
          </div>
        </div>
      </footer>

      {/* ── Schema JSON-LD (SEO/AEO/GEO) ── */}
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
        {/* Background glow */}
        <circle cx="50" cy="50" r="35" fill="url(#logo-glow)" opacity="0.4" />
        <defs>
          <radialGradient id="logo-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(35)">
            <stop stopColor="#C6A96B" stopOpacity="0.3" />
            <stop offset="1" stopColor="#C6A96B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer burst */}
        {[0, 45, 90, 135].map((deg) => (
          <ellipse key={`o-${deg}`} cx="50" cy="50" rx="9" ry="32"
            stroke="#C6A96B" strokeWidth="0.8" fill="none" opacity="0.5"
            transform={`rotate(${deg} 50 50)`} />
        ))}

        {/* Inner burst */}
        {[22.5, 67.5, 112.5, 157.5].map((deg) => (
          <ellipse key={`i-${deg}`} cx="50" cy="50" rx="6" ry="24"
            stroke="#6D8FC7" strokeWidth="0.6" fill="none" opacity="0.35"
            transform={`rotate(${deg} 50 50)`} />
        ))}

        {/* Center circles */}
        <circle cx="50" cy="50" r="14" stroke="#C6A96B" strokeWidth="0.5" fill="rgba(2, 6, 23, 0.8)" />
        <circle cx="50" cy="50" r="12" stroke="#D9BC82" strokeWidth="1" fill="none" opacity="0.8" />
        
        {/* The 'P' */}
        <text x="50" y="58" font-family="Cinzel, serif" font-size="22" font-weight="bold" text-anchor="middle" fill="#F8F6F1" className="drop-shadow-sm">P</text>

        {/* Floating dots */}
        {([[50,38],[62,50],[50,62],[38,50]] as [number,number][]).map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="1" fill="#C6A96B" opacity="0.6" />
        ))}
      </svg>
    </div>
  );
}
