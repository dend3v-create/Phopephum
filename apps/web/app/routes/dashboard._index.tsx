import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link, useRevalidator } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import {
  getCurrentYam,
  calculateMoonPhase,
  calculateKarnchata,
  calculateRahu,
  calculateHoraTaynoo,
  PLANET_INFO,
  getSunTimes,
  getYamPrediction,
} from "@phopephum/engine";
import type { Env } from "~/env.server";
import { useState, useEffect } from "react";

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface YamSlotDetail {
  yamNumber: number;
  yamName: string;
  period: "day" | "night";
  timeLabel: string;
  startTimeISO: string;
  endTimeISO: string;
  ticks: number;
  level: "bad" | "good" | "very_good" | "excellent";
  label: string;
  description: string;
  prediction: any;
}

// ─── Helper to calculate daily slots ──────────────────────────────────────────
function calculateDailyYamSlots(targetDate: Date): YamSlotDetail[] {
  const sunTimes = getSunTimes(targetDate);
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;

  const dayMs = sunset.getTime() - sunrise.getTime();
  const nightMs = 86400000 - dayMs;

  const daySlotMs = dayMs / 8;
  const nightSlotMs = nightMs / 8;

  const slots: YamSlotDetail[] = [];

  // 8 daytime slots
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunrise.getTime() + i * daySlotMs);
    const endTime = new Date(sunrise.getTime() + (i + 1) * daySlotMs);
    const midTime = new Date(startTime.getTime() + daySlotMs / 2);
    const result = getYamPrediction(midTime);

    slots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "day",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level as any,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
      prediction: result.prediction ?? null,
    });
  }

  // 8 nighttime slots
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(sunset.getTime() + i * nightSlotMs);
    const endTime = new Date(sunset.getTime() + (i + 1) * nightSlotMs);
    const midTime = new Date(startTime.getTime() + nightSlotMs / 2);
    const result = getYamPrediction(midTime);

    slots.push({
      yamNumber: i + 1,
      yamName: result.yamName,
      period: "night",
      timeLabel: `${startTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      ticks: result.travelAuspiciousness.ticks,
      level: result.travelAuspiciousness.level as any,
      label: result.travelAuspiciousness.label,
      description: result.travelAuspiciousness.description,
      prediction: result.prediction ?? null,
    });
  }

  return slots;
}

// ─── Loader ───────────────────────────────────────────────────────────────────
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  const { supabase } = createSupabaseClient(request, env);

  let pendingCount = 0;
  if (profile?.role === "admin" || profile?.role === "operator") {
    const { count } = await supabase
      .from("subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  const now       = new Date();
  const yam       = getCurrentYam();
  const moon      = calculateMoonPhase();
  const karnchata = calculateKarnchata(now);
  const rahu      = calculateRahu(now);
  const hora      = calculateHoraTaynoo({ dateAsked: now });

  const STAR_TH: Record<number, string> = { 1:"อาทิตย์",2:"จันทร์",3:"อังคาร",4:"พุธ",5:"พฤหัส",6:"ศุกร์",7:"เสาร์" };

  // Calculate slots for the timeline
  const todaySlots = calculateDailyYamSlots(now);

  return json({
    user, profile, pendingCount,
    now: now.toISOString(),
    yam: {
      name:    yam.yamName,
      number:  yam.yamNumber,
      period:  yam.period,
      level:   yam.travelAuspiciousness.level,
      label:   yam.travelAuspiciousness.label,
      ticks:   yam.travelAuspiciousness.ticks,
      shouldDo: yam.prediction?.shouldDo ?? "",
    },
    moon: {
      phase:        moon.moonPhase,
      illumination: moon.illumination,
      isWanPhra:    moon.isWanPhra,
    },
    karnchata: {
      yamYaiName:   karnchata.yamYaiName,
      yamYaiNumber: karnchata.yamYaiNumber,
      dayStar:      STAR_TH[karnchata.dayStarNumber] ?? String(karnchata.dayStarNumber),
    },
    rahu: rahu ? {
      isGood:  rahu.is_current_moment_good,
      verdict: rahu.summary.overall_verdict,
      start:   rahu.main_block.start_time,
      end:     rahu.main_block.end_time,
    } : null,
    hora: {
      yamAsked:  hora.yamAsked,
      period:    hora.period,
      yamPlanet: PLANET_INFO[hora.yamPlanet]?.thai ?? String(hora.yamPlanet),
    },
    todaySlots,
  });
}

// ─── Helpers & Design Constants ───────────────────────────────────────────────

const LEVEL_STYLE: Record<string, { bar: string; badge: string }> = {
  excellent: { bar: "bg-emerald-400", badge: "text-emerald-400 border-emerald-500/40 bg-emerald-500/8" },
  very_good: { bar: "bg-sky-400",     badge: "text-sky-400 border-sky-500/40 bg-sky-500/8" },
  good:      { bar: "bg-amber-400",   badge: "text-amber-400 border-amber-500/40 bg-amber-500/8" },
  bad:       { bar: "bg-rose-400",    badge: "text-rose-400 border-rose-500/40 bg-rose-500/8" },
};

const PERIOD_TH: Record<string, string> = { day: "กลางวัน", night: "กลางคืน" };

const PLANET_SYMBOLS: Record<string, string> = {
  สุริยะ: "☉", ระวิ:  "☉",
  จันเทา: "☽", คะศิ:  "☽",
  ภุมมะ:  "♂", ภุมโม: "♂",
  พุทธะ:  "☿", พุทโธ: "☿",
  ครู:    "♃", ชีโว:  "♃",
  ศุกระ:  "♀", ศุโกร: "♀",
  เสารี:  "♄", โสโร:  "♄",
};

// ─── Live Clock Component ──────────────────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return <span className="font-mono tabular-nums">{p(t.getHours())}:{p(t.getMinutes())}:{p(t.getSeconds())}</span>;
}

// ─── Ticks Visual Indicator ───────────────────────────────────────────────────
function Ticks({ n, bar }: { n: number; bar: string }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3].map(i => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= n ? bar : "bg-white/10"}`} />)}
    </span>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export default function DashboardIndex() {
  const d = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const { profile, yam, moon, karnchata, rahu, hora, pendingCount, todaySlots } = d;

  const displayName = profile?.display_name ?? "คุณ";
  const isPro       = profile?.role === "admin" || profile?.role === "operator" || profile?.plan === "imperial";
  const isAdminOp   = profile?.role === "admin" || profile?.role === "operator";
  const hasBirth    = !!(profile?.birth_date);

  const [greeting, setGreeting] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  
  // Interactive Timeline state
  const [timelinePeriod, setTimelinePeriod] = useState<"day" | "night">("day");
  const [selectedTimelineSlot, setSelectedTimelineSlot] = useState<typeof todaySlots[number] | null>(null);

  // Sync timeline states on client mount / time update
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "ราตรีสวัสดิ์" : h < 12 ? "อรุณสวัสดิ์" : h < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น");
    setDateLabel(new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" }));
    
    // Auto-select current slot in timeline
    const active = todaySlots.find(s => {
      const start = new Date(s.startTimeISO).getTime();
      const end = new Date(s.endTimeISO).getTime();
      const t = Date.now();
      return t >= start && t < end;
    });

    if (active) {
      setTimelinePeriod(active.period);
      setSelectedTimelineSlot(active);
    } else if (todaySlots.length > 0) {
      setSelectedTimelineSlot(todaySlots[0]);
    }
  }, [todaySlots]);

  // Periodic page revalidation
  useEffect(() => { const id = setInterval(revalidate, 60_000); return () => clearInterval(id); }, [revalidate]);

  // Find active slot for live countdown
  const activeSlot = todaySlots.find(s => {
    const start = new Date(s.startTimeISO).getTime();
    const end = new Date(s.endTimeISO).getTime();
    const t = Date.now();
    return t >= start && t < end;
  });

  // Countdown timer string state
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!activeSlot) return;
    const updateCountdown = () => {
      const end = new Date(activeSlot.endTimeISO).getTime();
      const diff = end - Date.now();
      if (diff <= 0) {
        setTimeLeft("เปลี่ยนยามแล้ว");
        return;
      }
      const min = Math.floor(diff / 60_000);
      const sec = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`ยามนี้เหลืออีก ${min} นาที ${sec} วินาที`);
    };
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [activeSlot]);

  const ls = LEVEL_STYLE[yam.level] ?? LEVEL_STYLE.good;

  return (
    <div className="max-w-xl mx-auto space-y-7 pb-12 star-field constellation-bg animate-fade-up px-1.5 sm:px-0">

      {/* ── 1. Header ── */}
      <div className="flex items-start justify-between pt-2 gap-3 animate-slide-in-1">
        <div>
          <p className="text-text-secondary text-sm sm:text-base font-semibold tracking-wide">{greeting} · {dateLabel}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mt-1 text-text-primary">
            สวัสดี, <span className="text-gold-shimmer glow-gold font-black">{displayName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1 px-3.5 py-2 rounded-full border text-xs sm:text-sm font-extrabold bg-cosmic-800/50 border-border-gold/45 text-gold-300 shadow-[0_0_15px_rgba(232,196,106,0.15)]">
          <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping" />
          <LiveClock />
        </div>
      </div>

      {/* ── 2. Active Yam Hero Card ── */}
      <Link to="/dashboard/check-yam" className="block group animate-slide-in-1">
        <div className="card-glass-gold p-6 relative overflow-hidden transition-all group-hover:border-gold-liquid group-hover:shadow-[0_0_30px_rgba(232,196,106,0.2)] active:scale-[0.99] duration-300 border-[#C6A96B]/30 bg-[#0a2240]/85">
          {/* Background decoration */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none bg-radial from-gold-500/20 to-transparent blur-xl" />
          
          <div className="relative flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gold-300 font-extrabold uppercase tracking-[0.22em] mb-2">✦ ฤกษ์ยามขณะนี้</p>
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-display text-4xl sm:text-5xl font-black text-text-primary leading-none text-shadow-gold">{yam.name}</h2>
                <span className="text-2xl sm:text-3xl text-gold-300 font-display">{PLANET_SYMBOLS[yam.name] || "✦"}</span>
              </div>
              <p className="text-sm sm:text-base text-[#F8F6F1] mt-2 font-sans-thai font-bold tracking-wide">
                ยาม {yam.number} · {PERIOD_TH[yam.period]}
                {moon.isWanPhra ? " · 🔆 วันพระ" : ` · จันทร์ ${Math.round(moon.illumination)}%`}
              </p>
              {yam.shouldDo && (
                <div className="mt-3.5 border-l-3 border-[#C6A96B] pl-3 py-1 bg-[#C6A96B]/8 rounded-r-md">
                  <p className="text-xs sm:text-sm text-[#F8F6F1] font-bold leading-relaxed">
                    "{yam.shouldDo}"
                  </p>
                </div>
              )}
              {/* Live countdown */}
              {timeLeft && (
                <div className="text-xs sm:text-sm text-gold-200 font-extrabold mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{timeLeft}</span>
                </div>
              )}
            </div>

            {/* Rotating central ring graphic */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 border-2 border-dashed border-gold-500/40 rounded-full cosmic-ring" />
              <div className="w-20 h-20 rounded-full card-glass-premium flex flex-col items-center justify-center border-2 border-[#C6A96B]/60 bg-[#0a2240] glow-gold-box">
                <span className="text-[10px] sm:text-[11px] font-black text-gold-300 uppercase tracking-widest leading-none">
                  {yam.level === "bad" ? "ระวัง" : "มงคล"}
                </span>
                <span className="text-xs sm:text-sm font-black text-text-primary mt-1.5">
                  {yam.label.split(" ")[0]}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs sm:text-sm text-gold-300 group-hover:text-gold-liquid transition-colors font-extrabold mt-5 pt-3.5 border-t border-border-gold/20">
            <span>เข้าสู่เครื่องมือวิเคราะห์ฤกษ์ยามละเอียด</span>
            <span>→</span>
          </div>
        </div>
      </Link>

      {/* ── 3. Cosmic Energy Timeline Widget ── */}
      <div className="space-y-4 animate-slide-in-2">
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-gold-300">✦ TIMELINE พลังงานรายวัน</p>
          
          {/* Day / Night Segment Toggle */}
          <div className="flex p-0.5 rounded-lg bg-cosmic-950/80 border border-border-gold/25">
            <button
              type="button"
              onClick={() => setTimelinePeriod("day")}
              className={`px-3.5 py-1 text-xs font-black rounded-md transition-all ${timelinePeriod === "day" ? "bg-gold-500 text-cosmic-950 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              ☀️ กลางวัน
            </button>
            <button
              type="button"
              onClick={() => setTimelinePeriod("night")}
              className={`px-3.5 py-1 text-xs font-black rounded-md transition-all ${timelinePeriod === "night" ? "bg-gold-500 text-cosmic-950 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              🌙 กลางคืน
            </button>
          </div>
        </div>

        {/* Horizontal scroll timeline */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {todaySlots.filter(s => s.period === timelinePeriod).map(s => {
            const isActive = activeSlot?.period === s.period && activeSlot?.yamNumber === s.yamNumber;
            const isSelected = selectedTimelineSlot?.period === s.period && selectedTimelineSlot?.yamNumber === s.yamNumber;
            const ls = LEVEL_STYLE[s.level] ?? LEVEL_STYLE.good;
            const planetSym = PLANET_SYMBOLS[s.yamName] || "✦";

            return (
              <button
                key={`${s.period}-${s.yamNumber}`}
                onClick={() => setSelectedTimelineSlot(s)}
                className={`shrink-0 w-32 p-3.5 rounded-xl border text-left transition-all duration-300 relative overflow-hidden group select-none
                  ${isActive ? "card-glass-gold border-gold-liquid/60 ring-2 ring-gold-liquid/20 shadow-md shadow-gold-500/10" : isSelected ? "card-glass border-mystic-500 bg-cosmic-800 shadow-md shadow-mystic-500/15" : "card-glass border-white/10 bg-[#0A1628]/60 hover:border-gold-500/40 hover:bg-[#0A1628]/80"}`}
              >
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-cosmic-950" title="LIVE" />
                )}
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-text-secondary font-bold">ยาม {s.yamNumber}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${ls.badge.replace("px-2.5 py-0.5", "")}`}>{s.label.split(" ")[0]}</span>
                </div>
                <p className="font-display text-base font-extrabold text-text-primary flex items-baseline gap-1.5">
                  {s.yamName} <span className="text-xs text-gold-400 font-display">{planetSym}</span>
                </p>
                <p className="text-[10px] text-text-secondary mt-1.5 font-mono font-bold tracking-tight">{s.timeLabel.replace(" - ", "-")}</p>
              </button>
            );
          })}
        </div>

        {/* Selected slot prediction details */}
        {selectedTimelineSlot && (
          <div className="card-glass p-5 border-2 border-border-gold/30 bg-[#0A1628]/95 animate-fade-up relative overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none bg-radial from-mystic-500/15 to-transparent blur-lg" />
            <div className="relative">
              <div className="flex justify-between items-start mb-3 gap-2">
                <div>
                  <h4 className="font-display font-black text-gold-300 text-base sm:text-lg flex items-center gap-2">
                    <span>✦ ยาม{selectedTimelineSlot.yamName}</span>
                    <span className="text-sm font-mono font-bold text-text-secondary">({selectedTimelineSlot.timeLabel})</span>
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 font-bold">
                    ยามลำดับที่ {selectedTimelineSlot.yamNumber} · {PERIOD_TH[selectedTimelineSlot.period]}
                  </p>
                </div>
                <span className={`text-xs font-black px-3 py-1 rounded-full border shrink-0 ${LEVEL_STYLE[selectedTimelineSlot.level].badge}`}>
                  {selectedTimelineSlot.label}
                </span>
              </div>
              
              <p className="text-sm sm:text-base text-[#F8F6F1]/95 font-semibold leading-relaxed mb-4">
                {selectedTimelineSlot.description || "สัญจรนำโชคดีงามตามกาลเทวฤกษ์"}
              </p>

              {selectedTimelineSlot.prediction?.shouldDo && (
                <div className="text-xs sm:text-sm bg-emerald-500/8 border border-emerald-500/25 rounded-lg p-3 flex items-start gap-2 text-emerald-300 font-bold shadow-sm">
                  <span className="font-black shrink-0 text-emerald-400">✓ ควรทำ:</span>
                  <span className="leading-relaxed">{selectedTimelineSlot.prediction.shouldDo}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Forecasting Tools Grid (4 items) ── */}
      <div className="animate-slide-in-3">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-300 mb-3.5">✦ เครื่องมือพยากรณ์</p>
        <div className="grid grid-cols-2 gap-3.5">

          {/* ยามอัฐกาล */}
          <Link to="/dashboard/yam" className="group flex flex-col gap-2.5 p-4.5 rounded-2xl border border-white/10 bg-[#0A1628]/60 hover:border-gold-500/40 hover:bg-cosmic-800/80 hover:shadow-lg transition-all duration-300 active:scale-[0.97] shimmer-sweep relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-gold-300 group-hover:text-gold-liquid transition-colors"><IcoYam /></span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${ls.badge}`}>{yam.label}</span>
            </div>
            <div>
              <p className="text-sm sm:text-base font-black text-text-primary">ยามอัฐกาล</p>
              <p className="text-base text-gold-300 font-extrabold mt-1">{yam.name}</p>
              <p className="text-xs text-text-secondary mt-1 font-bold">{PERIOD_TH[yam.period]} · ยาม {yam.number}</p>
            </div>
          </Link>

          {/* กาลชะตา */}
          <Link to="/dashboard/karnchata" className="group flex flex-col gap-2.5 p-4.5 rounded-2xl border border-white/10 bg-[#0A1628]/60 hover:border-gold-500/40 hover:bg-cosmic-800/80 hover:shadow-lg transition-all duration-300 active:scale-[0.97] shimmer-sweep relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-gold-300 group-hover:text-gold-liquid transition-colors"><IcoHourglass /></span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full border text-gold-300 border-gold-500/40 bg-gold-500/10">{karnchata.dayStar}</span>
            </div>
            <div>
              <p className="text-sm sm:text-base font-black text-text-primary">เลข ๗ กาลชะตา</p>
              <p className="text-base text-gold-300 font-extrabold mt-1">{karnchata.yamYaiName}</p>
              <p className="text-xs text-text-secondary mt-1 font-bold">ดาว{karnchata.dayStar} · รายวัน/ชั่วโมง/นาที</p>
            </div>
          </Link>

          {/* ยามพรายกระซิบ */}
          <Link to="/dashboard/horanu" className="group flex flex-col gap-2.5 p-4.5 rounded-2xl border border-white/10 bg-[#0A1628]/60 hover:border-mystic-400/40 hover:bg-cosmic-800/80 hover:shadow-lg transition-all duration-300 active:scale-[0.97] shimmer-sweep relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-mystic-300 group-hover:text-mystic-200 transition-colors"><IcoStarCross /></span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full border text-mystic-300 border-mystic-500/50 bg-mystic-500/10">ยาม {hora.yamAsked}</span>
            </div>
            <div>
              <p className="text-sm sm:text-base font-black text-text-primary">ยามพรายกระซิบ</p>
              <p className="text-base text-mystic-300 font-extrabold mt-1">{hora.yamPlanet}</p>
              <p className="text-xs text-text-secondary mt-1 font-bold">{PERIOD_TH[hora.period]} · ผัง ดาวลอย 11</p>
            </div>
          </Link>

          {/* ราหู */}
          <Link to="/dashboard/rahu" className={`group flex flex-col gap-2.5 p-4.5 rounded-2xl border transition-all duration-300 active:scale-[0.97] shimmer-sweep relative overflow-hidden ${rahu?.isGood ? "border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50 hover:bg-emerald-950/30" : "border-rose-500/30 bg-rose-950/15 hover:border-rose-500/40 hover:bg-rose-950/25"}`}>
            <div className="flex items-center justify-between">
              <span className={rahu?.isGood ? "text-emerald-400" : "text-rose-400"}><IcoRahu /></span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${rahu?.isGood ? "text-emerald-300 border-emerald-500/50 bg-emerald-500/10" : "text-rose-300 border-rose-500/45 bg-rose-500/10"}`}>
                {rahu?.isGood ? "ฤกษ์ดี" : "ระวัง"}
              </span>
            </div>
            <div>
              <p className="text-sm sm:text-base font-black text-text-primary">ราหูค้นทรัพย์</p>
              <p className={`text-sm sm:text-base font-extrabold mt-1 line-clamp-1 ${rahu?.isGood ? "text-emerald-300" : "text-rose-300"}`}>
                {rahu ? rahu.verdict : "คำนวณ..."}
              </p>
              <p className="text-xs text-text-secondary mt-1 font-bold">{rahu ? `${rahu.start}–${rahu.end}` : "ตารางยามมงคล"}</p>
            </div>
          </Link>

        </div>
      </div>

      {/* ── 5. Analysis Tools (4 items) ── */}
      <div className="animate-slide-in-4">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-mystic-300 mb-3.5">✦ วิเคราะห์ดวงชะตา</p>
        <div className="grid grid-cols-2 gap-3.5">

          <Link to="/dashboard/horoscope" className="group flex items-center gap-3.5 p-4 rounded-2xl border border-white/10 bg-[#0A1628]/60 hover:border-mystic-400/40 hover:bg-cosmic-800/80 hover:shadow-lg transition-all duration-300 active:scale-[0.97] shimmer-sweep relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-mystic-300 bg-mystic-500/15 border border-mystic-500/30 group-hover:border-mystic-400/50 transition-colors">
              <IcoCompass />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-black text-text-primary leading-tight">ตั้งดวงชะตา</p>
              <p className="text-xs text-text-secondary mt-1 font-bold">เลข ๗ ตัว ผังจักรพรรดิ</p>
            </div>
          </Link>

          <Link to="/dashboard/mahathaksa" className="group flex items-center gap-3.5 p-4 rounded-2xl border border-white/10 bg-[#0A1628]/60 hover:border-gold-500/40 hover:bg-cosmic-800/80 hover:shadow-lg transition-all duration-300 active:scale-[0.97] shimmer-sweep relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-gold-300 bg-gold-500/15 border border-gold-500/30 group-hover:border-gold-400/50 transition-colors">
              <IcoTaksa />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-black text-text-primary leading-tight">มหาทักษา</p>
              <p className="text-xs text-text-secondary mt-1 font-bold">พยากรณ์ชีวิต</p>
            </div>
          </Link>

          <Link to="/dashboard/mahaphuti" className="group flex items-center gap-3.5 p-4 rounded-2xl border border-white/10 bg-[#0A1628]/60 hover:border-gold-500/40 hover:bg-cosmic-800/80 hover:shadow-lg transition-all duration-300 active:scale-[0.97] shimmer-sweep relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-gold-300 bg-gold-500/15 border border-gold-500/30 group-hover:border-gold-400/50 transition-colors">
              <IcoPhuti />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-black text-text-primary leading-tight">มหาภูติ</p>
              <p className="text-xs text-text-secondary mt-1 font-bold">ธาตุกำเนิด</p>
            </div>
          </Link>

          <Link to="/dashboard/calendar" className="group flex items-center gap-3.5 p-4 rounded-2xl border border-white/10 bg-[#0A1628]/60 hover:border-white/20 hover:bg-cosmic-800/80 hover:shadow-lg transition-all duration-300 active:scale-[0.97] shimmer-sweep relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-text-secondary bg-white/10 border border-white/20 group-hover:border-white/35 transition-colors">
              <IcoList />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-black text-text-primary leading-tight">ปฏิทิน 100 ปี</p>
              <p className="text-xs text-text-secondary mt-1 font-bold">จันทรคติไทย</p>
            </div>
          </Link>

        </div>
      </div>

      {/* ── 6. Utility & Profile row ── */}
      <div className="grid grid-cols-2 gap-3 animate-slide-in-5">
        <Link to="/dashboard/planner" className="group flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-[#0A1628]/40 hover:border-[#8B7FD4]/40 hover:bg-cosmic-800/70 transition-all">
          <span className="text-[#8B7FD4]"><IcoJournal /></span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary">บันทึก</p>
            <p className="text-xs text-text-secondary mt-0.5 font-bold">วางแผน + จดบันทึก</p>
          </div>
        </Link>
        <Link to="/dashboard/settings" className="group flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-[#0A1628]/40 hover:border-white/20 hover:bg-cosmic-800/70 transition-all">
          <span className="text-text-secondary"><IcoProfile /></span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary">โปรไฟล์</p>
            <p className="text-xs text-text-secondary mt-0.5 font-bold">{hasBirth ? "ข้อมูลส่วนตัว" : "⚠ ยังไม่ได้ตั้งวันเกิด"}</p>
          </div>
        </Link>
      </div>

      {/* ── 7. Birth prompt ── */}
      {!hasBirth && (
        <Link to="/dashboard/settings" className="block group animate-slide-in-5">
          <div className="rounded-xl px-4 py-3.5 flex items-center gap-3.5 border border-dashed border-[#C6A96B]/35 bg-[#C6A96B]/6 hover:border-[#C6A96B]/50 transition-all">
            <span className="text-[#C6A96B] text-base">✦</span>
            <div className="flex-1 min-w-0 font-sans-thai">
              <p className="text-sm font-bold text-[#D9BC82]">เพิ่มวันเกิด เพื่อดวงชะตาแม่นยำ</p>
              <p className="text-xs text-[#E2E8F0]/80 mt-1 font-semibold">ใช้กับ ตั้งดวงชะตา · มหาทักษา · มหาภูติ</p>
            </div>
            <span className="text-[#C6A96B]/60 group-hover:text-[#C6A96B] transition-colors">→</span>
          </div>
        </Link>
      )}

      {/* ── 8. Upgrade prompt (free users) ── */}
      {!isPro && profile?.role !== "admin" && (
        <Link to="/dashboard/upgrade" className="block group animate-slide-in-5">
          <div className="rounded-xl px-4 py-3.5 flex items-center gap-3.5 border border-[#C6A96B]/30 transition-all group-hover:border-[#C6A96B]/50"
            style={{ background:"linear-gradient(135deg, rgba(198,169,107,0.1) 0%, rgba(10,34,64,0.5) 100%)" }}>
            <span className="text-[#C6A96B] text-lg">✦</span>
            <div className="flex-1 min-w-0 font-sans-thai">
              <p className="text-sm font-bold text-[#C6A96B]">อัปเกรด Imperial</p>
              <p className="text-xs text-[#F8F6F1]/90 mt-1 font-bold">ปลดล็อกทุกเครื่องมือ + AI วิเคราะห์เต็มรูปแบบ</p>
            </div>
            <span className="text-[#C6A96B] group-hover:text-gold-liquid text-xs sm:text-sm font-extrabold transition-colors">อัปเกรด →</span>
          </div>
        </Link>
      )}

      {/* ── 9. Admin panel ── */}
      {isAdminOp && (
        <Link to="/admin/approvals" className="block group animate-slide-in-5">
          <div className="rounded-xl px-4 py-3.5 flex items-center gap-3.5 border border-sky-500/30 bg-sky-950/20 hover:border-sky-500/50 transition-all">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background:"rgba(56,189,248,0.15)", border:"1px solid rgba(56,189,248,0.35)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth={1.8} className="w-5 h-5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 font-sans-thai">
              <p className="text-sm font-bold text-sky-400">
                Admin Panel
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-400 text-[#020617] text-[10px] font-black">
                    {pendingCount}
                  </span>
                )}
              </p>
              <p className="text-xs text-text-secondary mt-1 font-bold">
                {pendingCount > 0 ? `คำขออนุมัติ ${pendingCount} รายการ` : "อนุมัติสมาชิก · จัดการระบบ"}
              </p>
            </div>
            <span className="text-sky-400/60 group-hover:text-sky-400 transition-colors">→</span>
          </div>
        </Link>
      )}

    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoYam() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round"/><circle cx="12" cy="12" r="3"/>
  </svg>;
}
function IcoHourglass() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2M5 22v-4a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function IcoStarCross() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>;
}
function IcoRahu() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12" strokeLinecap="round"/><circle cx="12" cy="12" r="3"/>
  </svg>;
}
function IcoCompass() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M12 22V12" strokeLinecap="round"/>
    <path d="M12 12C12 12 7 9 7 5a5 5 0 0 1 10 0c0 4-5 7-5 7z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 22h14" strokeLinecap="round"/>
  </svg>;
}
function IcoTaksa() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <circle cx="12" cy="12" r="9"/><path d="M12 3v9l5 3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>;
}
function IcoPhuti() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="M7 10c0-2.761 2.239-5 5-5s5 2.239 5 5-4 6-5 7c-1-1-5-4.239-5-7z" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="10" r="1.5" fill="currentColor"/>
  </svg>;
}
function IcoList() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function IcoJournal() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 7h7M9 11h5" strokeLinecap="round"/>
  </svg>;
}
function IcoProfile() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/>
  </svg>;
}
