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

const DOMAINS = [
  { icon: "☽", label: "ยามอัฐกาล",     sub: "เลขยาม ๘ ยาม ๙ ฐาน" },
  { icon: "✦", label: "ชะตาจร",        sub: "ดาวพระเคราะห์จรราศี" },
  { icon: "⊕", label: "จักรกำเนิด",    sub: "แผนภูมิดวงดาวแรกเกิด" },
  { icon: "◈", label: "เลขศาสตร์",     sub: "เลขทักษา นพเคราะห์" },
  { icon: "⟁", label: "วาสนาชาติ",     sub: "กรรมและบุญบารมี" },
  { icon: "⌘", label: "มงคลฤกษ์",     sub: "ยามนาทีมงคลรายวัน" },
];

export default function Index() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">

      {/* ── Cosmic atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[700px] h-[700px] -top-60 -left-60 rounded-full animate-aura-pulse"
          style={{ background: "radial-gradient(circle, rgba(75,111,174,0.16) 0%, transparent 65%)" }}
        />
        <div
          className="absolute w-[500px] h-[500px] -bottom-32 -right-32 rounded-full animate-aura-pulse"
          style={{ background: "radial-gradient(circle, rgba(109,143,199,0.12) 0%, transparent 65%)", animationDelay: "2.5s" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 40% at 50% 45%, rgba(232,196,106,0.07) 0%, transparent 70%)" }}
        />
        {STARS.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.s}px`,
              height: `${star.s}px`,
              background: star.blue ? "#9AB3D9" : "#D9BC82",
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Hero ── */}
      <div className="relative text-center max-w-3xl mx-auto">

        {/* Lotus */}
        <div className="flex justify-center mb-6 animate-float">
          <LotusSymbol />
        </div>

        {/* Brand label */}
        <p
          className="text-[#D9BC82] text-[9px] tracking-[0.4em] uppercase mb-3 animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          Living Wisdom Operating System
        </p>

        {/* Main title */}
        <h1
          className="font-display text-6xl md:text-7xl font-bold text-[#F8F6F1] glow-gold mb-3 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          PhopePhum
        </h1>

        {/* Hero headline */}
        <p
          className="font-cormorant text-[#9AB3D9] text-2xl md:text-3xl italic mb-1 animate-fade-up"
          style={{ animationDelay: "0.28s" }}
        >
          เปิดประตูสู่อนาคตด้วย
        </p>
        <p
          className="font-display text-[#D9BC82] text-xl md:text-2xl font-semibold tracking-wide mb-5 animate-fade-up"
          style={{ animationDelay: "0.32s" }}
        >
          ศาสตร์ยามอัฐกาลชันสูง
        </p>

        {/* Description */}
        <p
          className="text-[#94A3B8] text-sm md:text-base leading-relaxed max-w-xl mx-auto mb-2 animate-fade-up"
          style={{ animationDelay: "0.38s" }}
        >
          คำนวณยามมงคลและชะตาจรระดับนาทีด้วยสูตรโบราณดั้งเดิม
          <br />
          พร้อมบทวิเคราะห์ดวงชะตาเชิงลึก ส่งรายงานวิเคราะห์ชีวิตสู่มือคุณอย่างหรูหราพรีเมียม
        </p>

        {/* Ornament */}
        <div
          className="flex items-center justify-center gap-3 my-7 animate-fade-up"
          style={{ animationDelay: "0.42s" }}
        >
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#C6A96B]/40" />
          <span className="text-[#C6A96B]/60 text-xs">✦</span>
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#C6A96B]/40" />
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up"
          style={{ animationDelay: "0.48s" }}
        >
          <Link
            to="/register"
            className="btn-gold-shine px-10 py-3.5 rounded-full shadow-lg shadow-[#C6A96B]/25 transition-transform hover:scale-105 active:scale-95"
          >
            คำนวณดวงชะตาของคุณ →
          </Link>
          <Link
            to="/login"
            className="border border-[#C6A96B]/40 text-[#D9BC82] font-medium px-10 py-3.5 rounded-full hover:bg-[#C6A96B]/10 hover:border-[#C6A96B]/70 transition-all"
          >
            ดูยามสดขณะนี้
          </Link>
        </div>

        {/* 6 Imperial Spiritual Domains */}
        <div
          className="mt-14 animate-fade-up"
          style={{ animationDelay: "0.62s" }}
        >
          <p className="text-[#C6A96B] text-[9px] tracking-[0.35em] uppercase mb-5 opacity-70">
            ๖ พื้นที่ทางจิตวิญญาณแห่งจักรพรรดิ
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DOMAINS.map((d) => (
              <div
                key={d.label}
                className="card-glass flex flex-col items-center gap-1.5 py-4 px-2"
              >
                <span className="text-[#C6A96B] text-xl font-light">{d.icon}</span>
                <p className="text-[#D9CDB7] text-[10px] font-medium leading-tight text-center">{d.label}</p>
                <p className="text-[#94A3B8] text-[9px] leading-tight text-center hidden sm:block">{d.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
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
      {[[40,31],[49,40],[40,49],[31,40]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="0.8" fill="#9AB3D9" opacity="0.7" />
      ))}
    </svg>
  );
}
