import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { getCurrentYam, calculateMoonPhase } from "@phopephum/engine";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  const { supabase } = createSupabaseClient(request, env);
  
  try {
    // 1. ดึงจำนวนรายงานทั้งหมดของผู้ใช้
    const { count: reportCount } = await supabase
      .from("ai_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // 2. ดึงจำนวนคำขอรออนุมัติของระบบ (หากเป็นแอดมินหรือโอเปอเรเตอร์)
    let pendingRequestsCount = 0;
    if (profile?.role === "admin" || profile?.role === "operator") {
      const { count } = await supabase
        .from("subscription_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      pendingRequestsCount = count ?? 0;
    }

    const yam  = getCurrentYam();
    const moon = calculateMoonPhase();

    const PLANET_SYMBOLS: Record<string, string> = {
      สุริยะ:"☉", ระวิ:"☉", จันเทา:"☽", คะศิ:"☽", ภุมมะ:"♂", ภุมโม:"♂",
      พุทธะ:"☿", พุทโธ:"☿", ครู:"♃", ชีโว:"♃", ศุกระ:"♀", ศุโกร:"♀", เสารี:"♄", โสโร:"♄",
    };

    let daysRemaining = 0;
    if (profile?.membership_expires_at) {
      const expiresAt = new Date(profile.membership_expires_at).getTime();
      const now = Date.now();
      daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    }

    const now = new Date();
    const hour = now.getHours();
    const greeting =
      hour < 12 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
    const dateLabel = now.toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });

    return json({
      user,
      profile,
      reportCount: reportCount ?? 0,
      pendingRequestsCount,
      daysRemaining,
      greeting,
      dateLabel,
      yam: {
        yamName:   yam.yamName,
        yamNumber: yam.yamNumber,
        period:    yam.period,
        symbol:    PLANET_SYMBOLS[yam.yamName] ?? "✦",
      },
      moon: {
        ...moon,
        moonPhase:    moon.moonPhase,
        illumination: moon.illumination,
        isWanPhra:    moon.isWanPhra,
        guidance:     moon.guidance,
      },
    });
  } catch (err) {
    console.error("Dashboard Loader Error:", err);
    return json({
      user,
      profile,
      reportCount: 0,
      pendingRequestsCount: 0,
      daysRemaining: 0,
      greeting: "สวัสดี",
      dateLabel: "",
      yam: { yamName: "N/A", yamNumber: 0, period: "day", symbol: "✦" },
      moon: { moonPhase: "N/A", illumination: 0, isWanPhra: false, guidance: "" },
    });
  }
}

export default function DashboardIndex() {
  const { 
    user, 
    profile, 
    reportCount, 
    pendingRequestsCount, 
    daysRemaining, 
    greeting: initialGreeting, 
    dateLabel: initialDateLabel, 
    yam, 
    moon 
  } = useLoaderData<typeof loader>();

  const displayName = profile?.display_name ?? "ผู้ใช้งาน";

  const [greeting, setGreeting] = useState(initialGreeting);
  const [dateLabel, setDateLabel] = useState(initialDateLabel);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setGreeting(
      hour < 5 
        ? "ราตรีสวัสดิ์" 
        : hour < 12 
        ? "อรุณสวัสดิ์" 
        : hour < 17 
        ? "สวัสดีตอนบ่าย" 
        : "สวัสดีตอนเย็น"
    );
    setDateLabel(
      now.toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "short",
      })
    );
  }, []);

  const membershipType = profile?.plan || profile?.membership_type || profile?.subscription || "free";

  return (
    <div className="space-y-8 animate-fade-up">

      {/* ═══════════════════════════════════════════════════════
          1. HEADER & GREETING — Gold Shimmer + Star Motif
      ═══════════════════════════════════════════════════════ */}
      <div className="relative animate-slide-in-1">
        {/* Ambient glow behind header */}
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-3/4 h-24 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(232,196,106,0.07) 0%, transparent 70%)",
          }}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 relative"
          style={{ borderBottom: "1px solid rgba(198,169,107,0.14)" }}
        >
          <div className="relative">
            {/* Decorative stars */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#C6A96B]/40 text-xs animate-twinkle">✦</span>
              <p className="text-[#94A3B8] text-xs md:text-sm tracking-widest uppercase font-medium">
                {greeting} &nbsp;·&nbsp; {dateLabel}
              </p>
              <span className="text-[#C6A96B]/40 text-xs animate-twinkle" style={{ animationDelay: "1.5s" }}>✦</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">
                <span className="text-[#F8F6F1]">ยินดีต้อนรับ, </span>
                <span className="text-gold-shimmer">{displayName}</span>
              </h1>
            </div>
            <p className="text-[14px] text-[#94A3B8]/60 mt-1 tracking-wide">
              Astral Imperial Living Wisdom OS · พร้อมให้บริการ
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Membership badge */}
            <div
              className="relative overflow-hidden flex items-center gap-2 text-xs font-semibold tracking-widest px-4 py-2 rounded-full font-display shimmer-sweep"
              style={{
                background: membershipType === "imperial"
                  ? "linear-gradient(135deg, rgba(198,169,107,0.15), rgba(232,196,106,0.08))"
                  : membershipType === "pro"
                  ? "linear-gradient(135deg, rgba(139,127,212,0.15), rgba(139,127,212,0.06))"
                  : "linear-gradient(135deg, rgba(75,111,174,0.12), rgba(75,111,174,0.05))",
                border: membershipType === "imperial"
                  ? "1px solid rgba(232,196,106,0.35)"
                  : membershipType === "pro"
                  ? "1px solid rgba(139,127,212,0.30)"
                  : "1px solid rgba(75,111,174,0.25)",
                color: membershipType === "imperial" ? "#F2D49B"
                  : membershipType === "pro" ? "#B0A4E8"
                  : "#9AB3D9",
              }}
            >
              <span className="text-base leading-none">
                {membershipType === "imperial" ? "✦" : membershipType === "pro" ? "◈" : "⚡"}
              </span>
              <span className="uppercase">
                {membershipType === "imperial" ? "Imperial" : membershipType === "pro" ? "Pro" : "Basic"}
              </span>
            </div>
            {/* Active status */}
            <span className="flex items-center gap-1.5 text-xs text-[#4DB8A0] bg-[#4DB8A0]/8 border border-[#4DB8A0]/25 px-3 py-2 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4DB8A0] animate-ping" />
              <span className="font-semibold font-display">Live</span>
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          2. HERO STATISTICS STRIP — Staggered + Glowing Cards
      ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1: Reports — Gold glow */}
        <Link to="/dashboard/reports" id="stat-reports-link" className="group block animate-slide-in-1">
          <div className="relative overflow-hidden card-glass-premium p-5 rounded-2xl transition-all duration-300 hover:border-[#C6A96B]/40 hover:-translate-y-1 aura-pulse-gold shimmer-sweep star-field"
            style={{ minHeight: "120px" }}
          >
            {/* Deep orb */}
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all duration-300 group-hover:opacity-60"
              style={{ background: "radial-gradient(circle, rgba(232,196,106,0.18) 0%, transparent 70%)", opacity: 0.3 }}
            />
            <div className="absolute right-4 top-4 text-[#C6A96B]/8 opacity-20 group-hover:opacity-45 transition-opacity duration-400">
              <IconSparklesLarge />
            </div>
            <div className="text-[13px] tracking-widest text-[#94A3B8] uppercase font-bold mb-2">รายงานทั้งหมด</div>
            <div className="font-display text-5xl font-bold text-[#C6A96B] leading-none mb-2 glow-gold animate-number-count group-hover:scale-105 transition-transform origin-left">
              {reportCount}
            </div>
            <div className="text-xs text-[#94A3B8]/70">บทวิเคราะห์ชีวิตที่บันทึกไว้</div>
            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(198,169,107,0.35), transparent)" }}
            />
          </div>
        </Link>

        {/* Card 2: Package Plan — Crown radial */}
        <div className="relative overflow-hidden card-glass-premium p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 shimmer-sweep animate-slide-in-2"
          style={{ minHeight: "120px" }}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(232,212,155,0.14) 0%, transparent 70%)" }}
          />
          <div className="absolute right-4 top-4 text-[#F2D49B]/8 opacity-25 group-hover:opacity-50 transition-opacity">
            <IconCrown />
          </div>
          <div className="text-[13px] tracking-widest text-[#94A3B8] uppercase font-bold mb-2">แพ็กเกจสมาชิก</div>
          <div className="font-display text-3xl font-bold leading-none tracking-widest uppercase glow-gold animate-number-count"
            style={{ color: "#F2D49B" }}
          >
            {membershipType === "imperial" ? "IMPERIAL" : membershipType === "pro" ? "PRO" : "BASIC"}
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-xs text-[#F2D49B]/80 font-semibold flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[#F2D49B]" />
              {profile?.membership_expires_at ? (
                <>เหลืออีก <span className="text-xl mx-0.5">{daysRemaining}</span> วัน</>
              ) : (
                "สมาชิกตลอดชีพ"
              )}
            </div>
            {profile?.membership_expires_at && (
              <p className="text-[13px] text-[#94A3B8]/60">
                หมดอายุ: {new Date(profile.membership_expires_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(232,212,155,0.30), transparent)" }}
          />
        </div>

        {/* Card 3: Moon Phase — Mystic glow */}
        <div className="relative overflow-hidden card-glass-premium p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 shimmer-sweep animate-slide-in-3"
          style={{ minHeight: "120px" }}
        >
          <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full blur-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(109,143,199,0.20) 0%, transparent 70%)" }}
          />
          <div className="absolute right-3 top-3 text-[#4DB8A0]/8 opacity-20 animate-float">
            <IconMoonPhase />
          </div>
          <div className="text-[13px] tracking-widest text-[#94A3B8] uppercase font-bold mb-2">ดิถีจันทรคติวันนี้</div>
          <div className="font-medium text-xl text-[#F8F6F1] leading-tight font-display animate-number-count truncate">
            {moon.moonPhase}
          </div>
          <div className="text-xs font-medium flex items-center gap-1.5 mt-2">
            {moon.isWanPhra ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4DB8A0] animate-pulse" />
                <span className="text-[#4DB8A0] glow-mystic">วันพระ — พลังวิญญาณสูง</span>
              </>
            ) : (
              <span className="text-[#9AB3D9]">สว่างส่องฟ้า {Math.round(moon.illumination)}%</span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(109,143,199,0.30), transparent)" }}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          3. ASTRO-YAM & MOON BAR — Cosmic Ring + Lunar Arc
      ═══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden card-glass-premium rounded-2xl animate-slide-in-3"
        style={{
          background: "linear-gradient(135deg, rgba(7,20,39,0.80) 0%, rgba(10,34,64,0.65) 50%, rgba(18,53,91,0.45) 100%)",
          padding: "1.5px",
        }}
      >
        {/* Gold gradient border wrapper */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(198,169,107,0.30) 0%, rgba(198,169,107,0.06) 50%, rgba(198,169,107,0.22) 100%)",
            borderRadius: "inherit",
          }}
        />
        <div className="relative rounded-2xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 md:gap-4"
          style={{ background: "rgba(7,20,39,0.78)", backdropFilter: "blur(32px)" }}
        >
          {/* ── Yam Column ── */}
          <div className="flex-1 flex items-center gap-4">
            {/* Animated cosmic ring icon */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              {/* Rotating dashed ring */}
              <svg
                viewBox="0 0 56 56"
                className="absolute inset-0 w-full h-full cosmic-ring"
                fill="none"
              >
                <circle
                  cx="28" cy="28" r="26"
                  stroke="rgba(198,169,107,0.35)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                  strokeLinecap="round"
                />
              </svg>
              {/* Static outer ring */}
              <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full" fill="none">
                <circle cx="28" cy="28" r="22" stroke="rgba(198,169,107,0.12)" strokeWidth="1" />
              </svg>
              {/* Center icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center z-10"
                style={{
                  background: "rgba(198,169,107,0.12)",
                  border: "1px solid rgba(198,169,107,0.25)",
                  boxShadow: "0 0 16px rgba(232,196,106,0.15)",
                }}
              >
                <IconClock className="w-5 h-5 text-[#C6A96B]" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] tracking-widest text-[#94A3B8] uppercase font-bold mb-1">ยามอัฏฐกาลขณะนี้</p>
              <p className="font-display text-xl font-bold text-[#C6A96B] leading-snug glow-gold">
                ยาม{yam.yamName} {yam.symbol}
              </p>
              <p className="text-[14px] text-[#94A3B8] mt-0.5">
                ยามที่ {yam.yamNumber} &nbsp;·&nbsp; {yam.period === "day" ? "กลางวัน" : "กลางคืน"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-[13px] font-bold text-[#4DB8A0] bg-[#4DB8A0]/10 border border-[#4DB8A0]/25 px-3 py-1.5 rounded-full">
                ฤกษ์ดี
              </span>
              <Link
                to="/dashboard/yam"
                id="yam-live-link"
                className="text-[13px] text-[#C6A96B] bg-[#C6A96B]/10 border border-[#C6A96B]/25 px-3 py-1.5 rounded-full hover:bg-[#C6A96B]/20 transition-colors font-medium whitespace-nowrap"
              >
                ดูสด →
              </Link>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-14 shrink-0"
            style={{ background: "linear-gradient(180deg, transparent, rgba(198,169,107,0.20), transparent)" }}
          />
          <hr className="block md:hidden border-t w-full" style={{ borderColor: "rgba(198,169,107,0.12)" }} />

          {/* ── Moon Column ── */}
          <div className="flex-1 flex items-center gap-4">
            {/* Lunar arc icon */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              {/* Illumination arc */}
              <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full" fill="none">
                <circle cx="28" cy="28" r="22" stroke="rgba(139,127,212,0.12)" strokeWidth="1" />
                <circle
                  cx="28" cy="28" r="22"
                  stroke="rgba(139,127,212,0.40)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(moon.illumination / 100) * 138} 138`}
                  transform="rotate(-90 28 28)"
                  className="animate-aura-pulse"
                />
              </svg>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center z-10"
                style={{
                  background: "rgba(139,127,212,0.12)",
                  border: "1px solid rgba(139,127,212,0.25)",
                  boxShadow: "0 0 16px rgba(139,127,212,0.15)",
                }}
              >
                <IconPlanetBig />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] tracking-widest text-[#94A3B8] uppercase font-bold mb-1">จันทรคติวันนี้</p>
              <p className="font-display text-base font-semibold text-[#9AB3D9] leading-snug glow-mystic">
                {moon.isWanPhra ? "เพ็ญเดือน — วันพระพลังสูง" : moon.moonPhase}
              </p>
              <p className="text-[14px] text-[#94A3B8] mt-0.5 line-clamp-1">{moon.guidance}</p>
            </div>
            <span
              className={`shrink-0 text-[13px] font-bold px-3 py-1.5 rounded-full border ${
                moon.isWanPhra
                  ? "text-[#9AB3D9] bg-[#8B7FD4]/10 border-[#8B7FD4]/25"
                  : "text-[#94A3B8] bg-[#94A3B8]/8 border-[#94A3B8]/20"
              }`}
            >
              {moon.isWanPhra ? "วันพระ" : `${Math.round(moon.illumination)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          4. QUICK START — Holographic Shimmer + Constellation
      ═══════════════════════════════════════════════════════ */}
      <div className="animate-slide-in-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xs tracking-[0.28em] uppercase font-semibold flex items-center gap-2.5" style={{ color: "#C6A96B" }}>
            <span className="flex h-4 w-4 items-center justify-center">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6A96B] opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C6A96B]" />
              </span>
            </span>
            เริ่มต้นวิเคราะห์ชะตาชีวิต
          </h2>
          <Link to="/dashboard/reports" id="see-all-reports-link" className="text-[14px] text-[#8B6F45] hover:text-[#C6A96B] flex items-center gap-1 transition-colors">
            ดูทั้งหมด <IconArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Left: คำนวณดวงชะตา */}
          <Link to="/dashboard/horoscope" id="quick-horoscope-link" className="group block">
            <div className="relative overflow-hidden card-glass-gold p-6 rounded-2xl hover:border-[#C6A96B]/50 hover:bg-[#0a2240]/45 transition-all duration-350 h-full flex flex-col justify-between shimmer-sweep constellation-bg"
              style={{ borderLeft: "3px solid rgba(198,169,107,0.60)" }}
            >
              {/* Multi-layer orb */}
              <div className="absolute top-0 right-0 w-40 h-40 -mr-10 -mt-10 rounded-full blur-3xl pointer-events-none transition-all duration-300 group-hover:opacity-70"
                style={{ background: "radial-gradient(circle, rgba(232,196,106,0.12) 0%, transparent 70%)", opacity: 0.4 }}
              />
              <div className="absolute top-2 right-2 w-20 h-20 -mr-4 -mt-4 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "radial-gradient(circle, rgba(232,196,106,0.18) 0%, transparent 70%)" }}
              />

              <div>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#C6A96B] bg-[#C6A96B]/12 border border-[#C6A96B]/20 px-2.5 py-1 rounded-md tracking-wider uppercase mb-3 font-display">
                  <span>✦</span> ยามอัฏฐกาล
                </span>
                <h3 className="text-lg font-bold text-[#F8F6F1] group-hover:text-[#F2D49B] transition-colors duration-200 leading-snug">
                  คำนวณดวงชะตาและวัฏจักรชีวิต
                </h3>
                <p className="text-xs text-[#94A3B8] mt-2.5 leading-relaxed">
                  เลข 7 ตัว 9 ฐาน + ผังดวงจักรพรรดิ วิเคราะห์พลังชีวิต วัยจร และโอกาสทองตามดวงดาว
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4"
                style={{ borderTop: "1px solid rgba(198,169,107,0.10)" }}
              >
                <span className="text-[14px] text-[#94A3B8] group-hover:text-[#F8F6F1] transition-colors">
                  วิเคราะห์ดวงจักรกำเนิดด่วน
                </span>
                <span className="text-[#C6A96B] transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                  <IconArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card Right: AI วิเคราะห์ชีวิต */}
          <Link to="/dashboard/reports/new" id="quick-report-new-link" className="group block">
            <div className="relative overflow-hidden card-glass-premium p-6 rounded-2xl hover:border-[#C6A96B]/35 hover:bg-[#0a2240]/45 transition-all duration-350 h-full flex flex-col justify-between shimmer-sweep constellation-bg"
              style={{
                borderLeft: "3px solid rgba(224,107,107,0.55)",
                border: "1px solid rgba(198,169,107,0.15)",
                borderLeftWidth: "3px",
                borderLeftColor: "rgba(224,107,107,0.55)",
              }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 -mr-10 -mt-10 rounded-full blur-3xl pointer-events-none transition-all duration-300 group-hover:opacity-70"
                style={{ background: "radial-gradient(circle, rgba(224,107,107,0.10) 0%, transparent 70%)", opacity: 0.35 }}
              />
              <div className="absolute top-2 right-2 w-20 h-20 -mr-4 -mt-4 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "radial-gradient(circle, rgba(224,107,107,0.15) 0%, transparent 70%)" }}
              />

              <div>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#E06B6B] bg-[#E06B6B]/10 border border-[#E06B6B]/20 px-2.5 py-1 rounded-md tracking-wider uppercase mb-3 font-display">
                  <span>◈</span> ภูมิปัญญาพยากรณ์
                </span>
                <h3 className="text-lg font-bold text-[#F8F6F1] group-hover:text-[#F9B4B4] transition-colors duration-200 leading-snug">
                  ถอดรหัสชีวิตพรีเมียม
                </h3>
                <p className="text-xs text-[#94A3B8] mt-2.5 leading-relaxed">
                  บทวิเคราะห์ชีวิตเชิงลึกจากปัญญาศาสตร์โหราไทยประยุกต์ ครอบคลุมการงาน การเงิน และโชคลาภ
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4"
                style={{ borderTop: "1px solid rgba(224,107,107,0.10)" }}
              >
                <span className="text-[14px] text-[#94A3B8] group-hover:text-[#F8F6F1] transition-colors">
                  สร้างบทวิเคราะห์ชีวิตใหม่
                </span>
                <span className="text-[#E06B6B] transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                  <IconArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          5. MINI FEATURE LINKS — Premium SVG Icons + Hover Glow
      ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-in-4">
        <MiniFeatureLink to="/dashboard/yam"     icon={<IconYamMini />}      label="ฤกษ์ยามดี"       color="#C6A96B" />
        <MiniFeatureLink to="/dashboard/rahu"    icon={<IconRahuMini />}     label="ราหูค้นทรัพย์"   color="#E09B45" />
        <MiniFeatureLink to="/dashboard/planner" icon={<IconPlannerMini />}  label="วางแผนชีวิต TQM" color="#8B7FD4" />
        <MiniFeatureLink to="/dashboard/settings" icon={<IconSettingsMini />} label="ตั้งค่าโปรไฟล์"  color="#9AB3D9" />
      </div>

      {/* ═══════════════════════════════════════════════════════
          6. ALL FEATURES GRID — Multi-depth Aura + Feature Colors
      ═══════════════════════════════════════════════════════ */}
      <div className="animate-slide-in-5">
        <div className="flex items-center justify-between mb-5 pb-2"
          style={{ borderBottom: "1px solid rgba(198,169,107,0.07)" }}
        >
          <h2 className="font-display text-xs tracking-[0.28em] uppercase font-semibold flex items-center gap-2.5" style={{ color: "#C6A96B" }}>
            <span className="text-base">🌟</span>
            เครื่องมือและบริการทั้งหมด
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <FeatureCard
            to="/dashboard/yam"
            tag="ฤกษ์ยาม"
            tagColor="#C6A96B"
            orbColor="rgba(198,169,107,"
            title="ฤกษ์งามยามดี"
            desc="วิเคราะห์ยามอัฏฐกาลมงคล ประเมินช่วงเวลาที่ดีที่สุดในการเจรจาธุรกิจ ทำธุรกรรม หรือเริ่มต้นกิจการใหม่"
            icon={<IconClock className="w-4 h-4" />}
            id="feature-yam"
          />
          <FeatureCard
            to="/dashboard/rahu"
            tag="ราหูค้นทรัพย์"
            tagColor="#E09B45"
            orbColor="rgba(224,155,69,"
            title="ยามราหูค้นทรัพย์"
            desc="คำนวณพยากรณ์เวลาทองของดาวราหูที่เกื้อหนุนเรื่องโชคลาภการเงิน ค้าขายเด่น และมีลาภลอยอย่างอัศจรรย์"
            icon={<IconRahuMini className="w-4 h-4" />}
            id="feature-rahu"
          />
          <FeatureCard
            to="/dashboard/horoscope"
            tag="ดวงชะตา"
            tagColor="#4DB8A0"
            orbColor="rgba(77,184,160,"
            title="ตรวจชะตารายบุคคล"
            desc="เจาะลึกจักรราศีกำเนิด เส้นพลังชีวิต ทิศมงคลประจำตัว และตำแหน่งวัยจรที่ทรงคุณค่าสำหรับคุณ"
            icon={<IconPlanetSmall className="w-4 h-4" />}
            id="feature-horoscope"
          />
          <FeatureCard
            to="/dashboard/karnchata"
            tag="กาลชะตา"
            tagColor="#C6A96B"
            orbColor="rgba(198,169,107,"
            title="ทำนายกาลชะตา"
            desc="วิเคราะห์รหัสชะตาชีวิตระดับวินาทีด้วย 7 ตัว 9 ฐาน ผสมผสานระบบ Q&A แชทอัจฉริยะ"
            icon={<IconHourglassMini className="w-4 h-4" />}
            id="feature-karnchata"
          />
          <FeatureCard
            to="/dashboard/horanu"
            tag="โหรทายหนู"
            tagColor="#E09B45"
            orbColor="rgba(224,155,69,"
            title="โหรทายหนู"
            desc="พยากรณ์กาลชะตาระดับนาทีด้วยระบบยามอัฐกาลและดาวลอยโบราณ แม่นยำและรวดเร็ว"
            icon={<IconHoraNuMini className="w-4 h-4" />}
            id="feature-horanu"
          />
          <FeatureCard
            to="/dashboard/planner"
            tag="วางแผนชีวิต"
            tagColor="#8B7FD4"
            orbColor="rgba(139,127,212,"
            title="วางแผนชีวิต TQM"
            desc="กำหนดทิศทางเป้าหมาย จัดลำดับความสำคัญประจำวัน และสะท้อนผลลัพธ์ยามค่ำคืนควบคู่กับพลังงานดวงดาว"
            icon={<IconCalendar className="w-4 h-4" />}
            id="feature-planner"
          />
          <FeatureCard
            to="/dashboard/reports"
            tag="ภูมิปัญญา"
            tagColor="#E06B6B"
            orbColor="rgba(224,107,107,"
            title="คลังบทวิเคราะห์ชีวิต"
            desc="ศูนย์รวมคลังบทรายงานพยากรณ์ชีวิตส่วนบุคคลที่เรียบเรียงอย่างเป็นระบบด้วยปัญญาศาสตร์ประยุกต์"
            icon={<IconSparkles className="w-4 h-4" />}
            id="feature-reports"
          />
          <FeatureCard
            to="/dashboard/settings"
            tag="โปรไฟล์"
            tagColor="#9AB3D9"
            orbColor="rgba(154,179,217,"
            title="ตั้งค่าโปรไฟล์และเกิด"
            desc="บันทึกข้อมูล วันเกิด เวลาตกฟาก และสถานที่เกิด เพื่อใช้คำนวณฐานดวงและยามอัฏฐกาลด้วยความแม่นยำสูงสุด"
            icon={<IconSettings className="w-4 h-4" />}
            id="feature-settings"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          7. OPERATOR & ADMIN PANEL
      ═══════════════════════════════════════════════════════ */}
      {(profile?.role === "admin" || profile?.role === "operator") && (
        <div className="pt-2 animate-slide-in-5">
          <h2 className="text-[#38BDF8] font-display text-xs tracking-[0.25em] uppercase mb-4 font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
            ระบบผู้จัดการระบบ (Admin Panel)
          </h2>
          <Link to="/admin/approvals" id="admin-approvals-link" className="group block">
            <div
              className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 transition-all duration-300 hover:-translate-y-0.5 shimmer-sweep"
              style={{
                background: "linear-gradient(135deg, rgba(14,30,55,0.85), rgba(22,48,88,0.7))",
                border: "1px solid rgba(56,189,248,0.28)",
                boxShadow: "0 0 30px rgba(56,189,248,0.06)",
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)" }}
              >
                <IconShieldAdmin />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#38BDF8] font-bold text-base mb-0.5 group-hover:text-sky-300 transition-colors flex items-center gap-2">
                  <span>แผงควบคุมหลักแอดมิน</span>
                  {pendingRequestsCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#38BDF8] text-[#020617] text-xs font-bold font-display animate-bounce">
                      {pendingRequestsCount}
                    </span>
                  )}
                </p>
                <p className="text-[#94A3B8] text-xs md:text-sm">
                  ระบบผู้ช่วยดำเนินการอนุมัติแพ็กเกจสมาชิก ตรวจเช็กธุรกรรม และเฝ้าระวังสถิติสำคัญ
                </p>
              </div>
              <div className="flex items-center gap-2.5 ml-auto shrink-0 mt-3 sm:mt-0">
                {pendingRequestsCount > 0 && (
                  <span className="text-[13px] text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/20 px-2.5 py-0.5 rounded-full font-bold">
                    มีคำขอใหม่ {pendingRequestsCount} รายการ
                  </span>
                )}
                <span className="text-[#38BDF8] text-sm opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                  <IconArrowRight />
                </span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          8. UPGRADE BANNER — Premium Gold Frame + Shine Button
      ═══════════════════════════════════════════════════════ */}
      {membershipType === "free" && (
        <div className="relative overflow-hidden rounded-2xl animate-slide-in-5 shimmer-sweep star-field"
          style={{
            background: "linear-gradient(135deg, rgba(20,14,8,0.92) 0%, rgba(16,11,6,0.88) 60%, rgba(22,16,9,0.90) 100%)",
            border: "1px solid rgba(198,169,107,0.32)",
            boxShadow: "0 12px 60px rgba(0,0,0,0.50), 0 0 60px rgba(198,169,107,0.06), inset 0 1px 0 rgba(232,196,106,0.12)",
          }}
        >
          {/* Background orbs */}
          <div className="absolute right-0 top-0 w-64 h-64 -mr-16 -mt-16 rounded-full blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(198,169,107,0.10) 0%, transparent 70%)" }}
          />
          <div className="absolute left-0 bottom-0 w-40 h-40 -ml-8 -mb-8 rounded-full blur-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(109,143,199,0.08) 0%, transparent 70%)" }}
          />

          <div className="relative z-10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              {/* Crown + Title */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#C6A96B] text-lg">✦</span>
                <h3 className="font-display text-[#F2D49B] font-semibold text-base tracking-wide glow-gold">
                  อัปเกรดสู่ระดับ Imperial
                </h3>
              </div>
              <p className="text-[#D9CDB7] text-xs md:text-sm leading-relaxed max-w-md">
                เปิดขอบเขตการเข้าถึงอย่างสมบูรณ์แบบ: ปลดล็อกการสร้างรายงานวิเคราะห์ชีวิตได้ไม่จำกัดครั้ง
                และวิเคราะห์ฐานดวงจักรพรรดิคู่วัยจรเชิงลึกรายปีอย่างคุ้มค่าสูงสุด
              </p>
              {/* Feature bullets */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {["รายงาน AI ไม่จำกัด", "ผังดวงจักรพรรดิ", "วิเคราะห์วัยจร", "สิทธิ์ทุกฟีเจอร์"].map((f) => (
                  <span key={f} className="text-[13px] text-[#C6A96B]/80 flex items-center gap-1">
                    <span className="text-[#C6A96B]/50">✓</span> {f}
                  </span>
                ))}
              </div>
            </div>

            <Link
              to="/pricing"
              id="upgrade-cta-link"
              className="btn-gold-shine shrink-0 px-7 py-3 rounded-full text-sm font-display tracking-wide hover:shadow-[0_0_24px_rgba(242,212,155,0.35)] transition-shadow duration-300"
            >
              ดูแพ็กเกจ Imperial →
            </Link>
          </div>

          {/* Bottom shimmer line */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(198,169,107,0.40), rgba(232,196,106,0.25), transparent)" }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Inline Premium Icons ───────────────────────────────────────────────────

function IconSparklesLarge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="w-14 h-14">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 17l.75 2.25L22 20l-2.25.75L19 23l-.75-2.25L16 20l2.25-.75L19 17z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCrown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="w-14 h-14">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" strokeLinecap="round" />
    </svg>
  );
}

function IconMoonPhase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="w-14 h-14">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlanetBig() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-[#8B7FD4]">
      <circle cx="12" cy="12" r="4" />
      <ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(-15 12 12)" />
    </svg>
  );
}

function IconPlanetSmall({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="8" ry="2.5" transform="rotate(-15 12 12)" />
    </svg>
  );
}

function IconCalendar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrowUpRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className={className}>
      <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSparkles({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShieldAdmin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth={1.8} className="w-6 h-6">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Mini Feature Icons ───────────────────────────────────────────────────────

function IconYamMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconHourglassMini({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHoraNuMini({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round" />
    </svg>
  );
}

function IconRahuMini({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconPlannerMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      <path d="M8 14h4M8 18h8" strokeLinecap="round" />
    </svg>
  );
}

function IconSettingsMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MiniFeatureLink({
  to,
  icon,
  label,
  color,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <Link to={to} className="group block h-full">
      <div
        className="relative overflow-hidden card-glass py-4 px-3 rounded-2xl transition-all duration-250 text-center flex flex-col items-center justify-center gap-2 h-full shimmer-sweep hover:-translate-y-0.5"
        style={{
          border: "1px solid rgba(217,188,130,0.14)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${color}14, 0 8px 40px rgba(0,0,0,0.35)`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(217,188,130,0.14)";
          (e.currentTarget as HTMLElement).style.boxShadow = "";
        }}
      >
        {/* Icon with glow ring */}
        <div
          className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-250 group-hover:scale-110"
          style={{
            color,
            background: `${color}12`,
            border: `1px solid ${color}22`,
          }}
        >
          {icon}
        </div>
        <span className="text-[13px] md:text-xs text-[#94A3B8] group-hover:text-[#F8F6F1] font-medium leading-tight transition-colors">
          {label}
        </span>
      </div>
    </Link>
  );
}

function FeatureCard({
  to,
  tag,
  tagColor,
  orbColor,
  title,
  desc,
  icon,
  id,
}: {
  to: string;
  tag: string;
  tagColor: string;
  orbColor: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  id: string;
}) {
  return (
    <Link
      to={to}
      id={id}
      className="group relative block overflow-hidden card-glass p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 shimmer-sweep"
      style={{ border: "1px solid rgba(217,188,130,0.14)" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${tagColor}35`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 28px ${tagColor}12, 0 12px 50px rgba(0,0,0,0.40)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(217,188,130,0.14)";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      {/* Multi-depth orb layers */}
      <div
        className="absolute -right-5 -top-5 w-20 h-20 rounded-full blur-xl pointer-events-none opacity-20 group-hover:opacity-50 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${orbColor}0.22) 0%, transparent 70%)` }}
      />
      <div
        className="absolute -right-2 -top-2 w-10 h-10 rounded-full blur-md pointer-events-none opacity-0 group-hover:opacity-60 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${orbColor}0.30) 0%, transparent 70%)` }}
      />

      <div className="flex flex-col justify-between h-full">
        <div>
          <span
            className="inline-block text-[12px] font-bold tracking-widest uppercase px-2.5 py-1 rounded mb-3 font-display"
            style={{
              color: tagColor,
              background: `${tagColor}14`,
              border: `1px solid ${tagColor}22`,
            }}
          >
            {tag}
          </span>
          <h4 className="text-sm font-bold text-[#F8F6F1] leading-snug transition-colors duration-200"
            style={{}}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = tagColor)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "")}
          >
            {title}
          </h4>
          <p className="text-[14px] text-[#94A3B8] mt-1.5 leading-relaxed">{desc}</p>
        </div>
        <div className="flex items-center justify-between mt-5 pt-3"
          style={{ borderTop: `1px solid ${tagColor}0F` }}
        >
          <span style={{ color: `${tagColor}55` }} className="group-hover:opacity-100 transition-opacity">
            {icon}
          </span>
          <span className="text-[13px] text-[#94A3B8] group-hover:text-[#F8F6F1] flex items-center gap-1 transition-colors">
            <span>เข้าใช้งาน</span>
            <span className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" style={{ color: tagColor }}>
              <IconArrowUpRight className="w-3 h-3" />
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
