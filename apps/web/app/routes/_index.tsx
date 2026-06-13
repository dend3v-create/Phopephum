import type { MetaFunction } from "@remix-run/cloudflare";
import { ThemeToggle } from "~/components/ThemeToggle";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { Link } from "@remix-run/react";
import { useT } from "~/i18n/context";
import { useTranslation } from "react-i18next";

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

function LogoSymbol() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-2 border-[#C6A96B]/20 animate-[spin_10s_linear_infinite]" />
      <div className="absolute inset-2 rounded-full border border-[#C6A96B]/10 animate-[spin_15s_linear_infinite_reverse]" />
      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#C6A96B] to-[#D9BC82] flex items-center justify-center shadow-2xl shadow-[#C6A96B]/20 overflow-hidden group">
        <span className="text-[#020617] text-3xl font-bold font-display z-10 transition-transform group-hover:scale-125 duration-700">P</span>
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
      </div>
    </div>
  );
}

export default function Index() {
  const t = useT("common");
  const { t: tFull } = useTranslation("common");

  // Get dynamic arrays from translations
  const features = tFull("landing.features.items", { returnObjects: true }) as any[];
  const featureIcons = ["✦", "◈", "☽", "⊕", "⟁", "⌘"];
  
  const steps = tFull("landing.how.steps", { returnObjects: true }) as any[];

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
          </div>
          <span className="font-display text-[#F8F6F1] font-bold text-lg tracking-wide group-hover:text-[#C6A96B] transition-colors">PhopePhum</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm text-[#94A3B8]">
          <Link to="/pricing" className="hover:text-[#C6A96B] transition-colors">{t("pricing")}</Link>
          <a href="#features" className="hover:text-[#C6A96B] transition-colors">{t("features")}</a>
          <a href="#how" className="hover:text-[#C6A96B] transition-colors">{t("how_to_use")}</a>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link to="/login" className="text-sm text-[#94A3B8] hover:text-[#F8F6F1] transition-colors px-2">
            {t("login")}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center max-w-4xl mx-auto px-4 pt-10 pb-24">
        <div className="flex justify-center mb-8 animate-float">
          <LogoSymbol />
        </div>

        <p className="text-[#D9BC82] text-[11px] sm:text-xs tracking-[0.4em] uppercase mb-4 font-bold animate-fade-up"
          style={{ animationDelay: "0.1s" }}>
          Wisdom Guidance Operating System
        </p>

        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#F8F6F1] glow-gold mb-4 animate-fade-up leading-tight"
          style={{ animationDelay: "0.2s" }}>
          PhopePhum
        </h1>

        <p className="font-cormorant text-[#9AB3D9] text-2xl sm:text-3xl md:text-4xl italic mb-1 animate-fade-up"
          style={{ animationDelay: "0.28s" }}>
          {t("landing.hero.subtitle")}
        </p>
        <p className="font-display text-[#D9BC82] text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide mb-6 animate-fade-up"
          style={{ animationDelay: "0.32s" }}>
          {t("landing.hero.title_suffix")}
        </p>

        <p className="text-[#94A3B8] text-base md:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-up"
          style={{ animationDelay: "0.38s" }}>
          {t("landing.hero.desc")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up"
          style={{ animationDelay: "0.44s" }}>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-bold text-[#020617] shadow-lg shadow-[#C6A96B]/25 transition-all hover:scale-105 active:scale-95 text-base"
            style={{ background: "linear-gradient(135deg, #C6A96B, #D9BC82)" }}
          >
            {t("get_started_free")}
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-medium border border-[#C6A96B]/40 text-[#D9BC82] hover:bg-[#C6A96B]/10 hover:border-[#C6A96B]/70 transition-all text-base"
          >
            {t("login")}
          </Link>
        </div>

        <p className="text-[#94A3B8]/75 text-xs sm:text-sm mt-5 animate-fade-up" style={{ animationDelay: "0.52s" }}>
          {t("landing.hero.footer_note")}
        </p>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-[#C6A96B] text-[11px] sm:text-xs tracking-[0.35em] uppercase mb-3 font-bold">{t("landing.features.label")}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1] mb-3">
            {t("landing.features.title")}
          </h2>
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-md mx-auto">
            {t("landing.features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features && features.map((f, i) => (
            <div key={i}
              className="rounded-2xl border border-white/5 p-6 transition-all duration-300 hover:border-[#C6A96B]/20 group"
              style={{ backdropFilter: "blur(20px)", background: "var(--card-dark-bg)" }}>
              <div className="text-[#C6A96B] text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {featureIcons[i]}
              </div>
              <h3 className="font-display text-[#F8F6F1] font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-[#C6A96B] text-[11px] sm:text-xs tracking-[0.35em] uppercase mb-3 font-bold">{t("landing.how.label")}</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F8F6F1]">
            {t("landing.how.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps && steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 mx-auto"
                style={{ background: "rgba(198,169,107,0.12)", border: "1px solid rgba(198,169,107,0.3)" }}>
                <span className="text-[#D9BC82] font-display font-bold">{step.num}</span>
              </div>
              <h3 className="font-display text-[#F8F6F1] font-semibold mb-2">{step.title}</h3>
              <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 py-12 text-center border-t border-white/5">
        <p className="text-[#94A3B8] text-xs">
          © {new Date().getFullYear()} PhopePhum. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
