import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "PhopePhum — ศาสตร์ยามอัฐกาลชันสูง" },
  { name: "description", content: "คำนวณยามมงคลและชะตาจรระดับนาทีด้วยสูตรโบราณดั้งเดิม พร้อมบทวิเคราะห์ดวงชะตาเชิงลึก" },
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
    title: "ยามอัฐกาลสด",
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
    title: "Life Report AI",
    desc: "รายงานวิเคราะห์ชีวิตเชิงลึก 6 ประเภท สร้างโดย AI ที่ฝึกด้วยตำราโหราศาสตร์ไทยโบราณแท้",
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
  { name: "คุณสุรีย์", role: "นักธุรกิจ", text: "ใช้ยามอัฐกาลเลือกวันทำสัญญาสำคัญ ผลออกมาดีกว่าที่คิดมาก แนะนำสำหรับผู้ที่เชื่อในศาสตร์ไทย" },
  { name: "คุณมาลี", role: "แม่บ้านนักลงทุน", text: "Life Report วิเคราะห์ดวงได้ละเอียดมาก อ่านแล้วรู้สึกว่าเข้าใจตัวเองมากขึ้น ข้อมูลครบและหรูหรา" },
  { name: "คุณวิชัย", role: "โหรสมัครเล่น", text: "เลข 7 ตัวแม่นยำตามตำราที่เคยศึกษามา ระบบปฏิทินจันทรคติครบถ้วนมาก ใช้อ้างอิงได้เลย" },
];

export default function Index() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#020617" }}>

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
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-[#C6A96B] text-lg">✦</span>
          <span className="font-display text-[#F8F6F1] font-bold text-lg tracking-wide">PhopePhum</span>
        </Link>

        {/* Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-6 text-sm text-[#94A3B8]">
          <Link to="/pricing" className="hover:text-[#C6A96B] transition-colors">แผนสมาชิก</Link>
          <a href="#features" className="hover:text-[#C6A96B] transition-colors">ฟีเจอร์</a>
          <a href="#how" className="hover:text-[#C6A96B] transition-colors">วิธีใช้</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center max-w-4xl mx-auto px-4 pt-12 pb-24">
        <div className="flex justify-center mb-8 animate-float">
          <LotusSymbol />
        </div>

        <p className="text-[#D9BC82] text-[9px] tracking-[0.4em] uppercase mb-4 animate-fade-up"
          style={{ animationDelay: "0.1s" }}>
          Living Wisdom Operating System
        </p>

        <h1 className="font-display text-6xl md:text-7xl lg:text-8xl font-bold text-[#F8F6F1] glow-gold mb-4 animate-fade-up leading-none"
          style={{ animationDelay: "0.2s" }}>
          PhopePhum
        </h1>

        <p className="font-cormorant text-[#9AB3D9] text-2xl md:text-3xl italic mb-2 animate-fade-up"
          style={{ animationDelay: "0.28s" }}>
          เปิดประตูสู่อนาคตด้วย
        </p>
        <p className="font-display text-[#D9BC82] text-xl md:text-2xl font-semibold tracking-wide mb-6 animate-fade-up"
          style={{ animationDelay: "0.32s" }}>
          ศาสตร์ยามอัฐกาลชันสูง
        </p>

        <p className="text-[#94A3B8] text-sm md:text-base leading-relaxed max-w-xl mx-auto mb-10 animate-fade-up"
          style={{ animationDelay: "0.38s" }}>
          คำนวณยามมงคลและชะตาจรระดับนาทีด้วยสูตรโบราณดั้งเดิม<br />
          พร้อมบทวิเคราะห์ดวงชะตาเชิงลึก ส่งรายงานวิเคราะห์ชีวิตสู่มือคุณ
        </p>

        {/* Hero CTAs */}
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

        {/* Trust line */}
        <p className="text-[#94A3B8]/50 text-xs mt-5 animate-fade-up" style={{ animationDelay: "0.52s" }}>
          ฟรีตลอดชีพ · ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ทุกเมื่อ
        </p>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 mt-14 animate-fade-up" style={{ animationDelay: "0.56s" }}>
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-[#C6A96B]/30" />
          <span className="text-[#C6A96B]/50 text-xs">✦</span>
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-[#C6A96B]/30" />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">ฟีเจอร์หลัก</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1] mb-3">
            ทุกศาสตร์ที่คุณต้องการ
          </h2>
          <p className="text-[#94A3B8] text-sm max-w-md mx-auto">
            รวมทุกเครื่องมือโหราศาสตร์ไทยในที่เดียว ใช้งานได้ทันที
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="rounded-2xl border border-white/5 p-6 transition-all duration-300 hover:border-[#C6A96B]/20 group"
              style={{ backdropFilter: "blur(20px)", background: "rgba(10,34,64,0.45)" }}>
              <div className="text-[#C6A96B] text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {f.icon}
              </div>
              <h3 className="font-display text-[#F8F6F1] font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-[#94A3B8] text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">วิธีเริ่มต้น</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1]">
            เริ่มใช้ใน 3 ขั้นตอน
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div key={step.num} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 mx-auto"
                style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(198,169,107,0.3)" }}>
                <span className="font-display text-[#C6A96B] font-bold text-lg">{step.num}</span>
              </div>
              <h3 className="font-display text-[#F8F6F1] font-semibold text-base mb-2">{step.title}</h3>
              <p className="text-[#94A3B8] text-xs leading-relaxed">{step.desc}</p>
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
              style={{ backdropFilter: "blur(20px)", background: "rgba(10,34,64,0.4)" }}>
              <p className="text-[#C6A96B] text-lg mb-3">"</p>
              <p className="text-[#D9CDB7] text-xs leading-relaxed mb-4">{t.text}</p>
              <div className="border-t border-white/5 pt-3">
                <p className="text-[#F8F6F1] text-xs font-semibold">{t.name}</p>
                <p className="text-[#94A3B8] text-[10px]">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="relative z-10 max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl border border-[#C6A96B]/20 p-10"
          style={{ backdropFilter: "blur(24px)", background: "rgba(198,169,107,0.05)", boxShadow: "0 0 80px rgba(198,169,107,0.08)" }}>
          <p className="text-[#C6A96B] text-[10px] tracking-[0.35em] uppercase mb-3">แผนราคา</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1] mb-3">
            เริ่มต้น ฿0 ตลอดชีพ
          </h2>
          <p className="text-[#94A3B8] text-sm mb-6 max-w-md mx-auto">
            ใช้ฟรีได้เลย ไม่มีวันหมดอายุ อัปเกรดเมื่อพร้อม
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
              ดูแผนทั้งหมด →
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
            <span className="text-[#94A3B8] text-xs ml-2">Living Wisdom OS</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#94A3B8]">
            <Link to="/pricing" className="hover:text-[#C6A96B] transition-colors">แผนสมาชิก</Link>
            <Link to="/login" className="hover:text-[#C6A96B] transition-colors">เข้าสู่ระบบ</Link>
            <Link to="/register" className="hover:text-[#C6A96B] transition-colors">สมัครสมาชิก</Link>
          </div>
          <p className="text-[#94A3B8]/40 text-[10px]">© 2025 PhopePhum · ศาสตร์ไทยแท้ดั้งเดิม</p>
        </div>
      </footer>

    </div>
  );
}

function LotusSymbol() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 45, 90, 135].map((deg) => (
        <ellipse key={`o-${deg}`} cx="40" cy="40" rx="7" ry="23"
          stroke="#C6A96B" strokeWidth="0.8" fill="none" opacity="0.5"
          transform={`rotate(${deg} 40 40)`} />
      ))}
      {[22.5, 67.5, 112.5, 157.5].map((deg) => (
        <ellipse key={`i-${deg}`} cx="40" cy="40" rx="5" ry="16"
          stroke="#6D8FC7" strokeWidth="0.6" fill="none" opacity="0.35"
          transform={`rotate(${deg} 40 40)`} />
      ))}
      <circle cx="40" cy="40" r="9"  stroke="#C6A96B" strokeWidth="0.8" fill="none" opacity="0.55" />
      <circle cx="40" cy="40" r="5"  stroke="#D9BC82" strokeWidth="0.8" fill="none" opacity="0.75" />
      <circle cx="40" cy="40" r="2"  fill="#E8C46A" opacity="0.95" />
      {([[40,31],[49,40],[40,49],[31,40]] as [number,number][]).map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="0.8" fill="#9AB3D9" opacity="0.7" />
      ))}
    </svg>
  );
}
